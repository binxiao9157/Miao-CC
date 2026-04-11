import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // H-01: 简易内存限流 — 每 IP 每分钟最多 30 次请求
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT_WINDOW = 60_000; // 1 分钟
  const RATE_LIMIT_MAX = 30;

  app.use('/api/', (req: any, res: any, next: any) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
      return next();
    }

    entry.count++;
    if (entry.count > RATE_LIMIT_MAX) {
      return res.status(429).json({ error: "请求过于频繁，请稍后再试", code: "RATE_LIMITED" });
    }
    next();
  });

  // 定期清理过期条目防止内存泄漏
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(ip);
    }
  }, RATE_LIMIT_WINDOW);

  const ARK_API_KEY = process.env.VOLC_API_KEY;
  const ARK_MODEL_ID = process.env.VOLC_MODEL_ID || "doubao-seedance-1-5-pro-251215";
  const ARK_T2I_MODEL_ID = process.env.VOLC_T2I_MODEL_ID || "doubao-t2i-v2";
  // 还原为用户确认可用的 Seedance 专用任务接口端点
  const ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks";

  console.log("Server Config:", {
    hasApiKey: !!ARK_API_KEY,
    modelId: ARK_MODEL_ID,
    t2iModelId: ARK_T2I_MODEL_ID,
    isEndpointId: ARK_MODEL_ID.startsWith("ep-"),
    baseUrl: ARK_BASE_URL,
    nodeEnv: process.env.NODE_ENV
  });

  const ARK_T2I_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";

  // Helper to send standardized error responses
  const sendError = (res: express.Response, error: any, defaultMessage: string) => {
    const status = error.response?.status || 500;
    const isProduction = process.env.NODE_ENV === 'production';
    const errorData = error.response?.data;
    
    // Check for specific Volcengine error codes
    const errorCode = errorData?.error?.code || errorData?.code;
    const errorMessage = errorData?.error?.message || errorData?.message || error.message;

    if (errorCode === "AccountBalanceInsufficient" || errorMessage?.toLowerCase().includes("balance")) {
      return res.status(403).json({ 
        error: "账户余额不足，请联系管理员充值",
        code: "BALANCE_INSUFFICIENT"
      });
    }

    if (errorCode === "QuotaExceeded" || errorMessage?.toLowerCase().includes("quota")) {
      return res.status(403).json({ 
        error: "API 额度已耗尽，请检查资源包状态",
        code: "QUOTA_EXCEEDED"
      });
    }

    if (errorCode === "InvalidParameter") {
      return res.status(400).json({
        error: `参数错误: ${errorMessage}`,
        code: "INVALID_PARAMETER"
      });
    }

    if (status === 404) {
      return res.status(404).json({
        error: "API 端点未找到 (404)。请检查推理接入点 ID 是否正确。",
        code: "NOT_FOUND"
      });
    }

    res.status(status).json({
      error: defaultMessage,
      // 仅开发环境返回上游错误详情，生产环境隐藏
      ...(isProduction ? {} : { message: errorMessage })
    });
  };

  // API Route for Image Generation (Ark T2I)
  app.post("/api/generate-image", async (req, res) => {
    const { prompt } = req.body;

    // 恢复前置校验，防止空指针
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: "缺少必要参数: prompt", code: "INVALID_PARAMETER" });
    }

    try {
      if (!ARK_API_KEY) {
        return res.status(500).json({ error: "服务器未配置 API Key" });
      }

      const requestBody = {
        model: ARK_T2I_MODEL_ID,
        prompt: prompt,
        size: "1024x1024"
      };

      console.log("Submitting T2I task to Ark:", {
        model: ARK_T2I_MODEL_ID,
        url: ARK_T2I_URL,
        prompt: prompt.substring(0, 50) + "..."
      });

      const response = await axios.post(ARK_T2I_URL, requestBody, {
        headers: {
          'Authorization': `Bearer ${ARK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      const imageUrl = response.data?.data?.[0]?.url;
      if (imageUrl) {
        console.log("Ark T2I Success (Sync):", imageUrl.substring(0, 50) + "...");
        res.json({ id: `url:${imageUrl}`, status: 'succeeded', image_url: imageUrl });
      } else {
        throw new Error("未获取到生成的图片地址");
      }
    } catch (error: any) {
      console.error("Ark T2I API Error:", error.message);
      sendError(res, error, "生成图片失败");
    }
  });

  // SSRF Protection: Validate taskId format
  const isValidTaskId = (id: string) => {
    if (id.startsWith('url:')) {
      const url = id.substring(4);
      // 仅允许 HTTPS URL，且必须以 https:// 开头
      if (!/^https:\/\/[a-zA-Z0-9]/.test(url)) return false;
      return true;
    }
    // 修复正则漏洞：支持下划线并严格限制 128 位长度
    return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
  };

  // Image status polling
  app.get("/api/image-status/:taskId", async (req, res) => {
    const { taskId } = req.params;

    if (!isValidTaskId(taskId)) {
      return res.status(400).json({ error: "无效的任务 ID 格式" });
    }
    
    if (taskId.startsWith('url:')) {
      const url = taskId.substring(4);
      return res.json({ status: 'succeeded', image_url: url });
    }

    try {
      const response = await axios.get(`${ARK_BASE_URL}/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${ARK_API_KEY}`
        }
      });
      res.json(response.data);
    } catch (error: any) {
      sendError(res, error, "查询图片状态失败");
    }
  });

  // API Route for Video Generation (Ark Task API)
  app.post("/api/generate-video", async (req, res) => {
    const { prompt, negative_prompt, image_base64, parameters } = req.body;

    // 恢复 image_base64 非空校验
    if (!image_base64) {
      return res.status(400).json({ error: "缺少必要参数: image_base64", code: "INVALID_PARAMETER" });
    }

    try {
      if (!ARK_API_KEY) {
        console.error("Missing VOLC_API_KEY environment variable");
        return res.status(500).json({ error: "服务器未配置 API Key，请检查环境变量" });
      }

      let dataUrl = "";
      if (image_base64) {
        let cleanBase64 = image_base64.replace(/\s/g, '');
        
        if (cleanBase64.startsWith('http')) {
          dataUrl = cleanBase64;
        } else {
          let mimeType = 'image/png';
          if (cleanBase64.includes('base64,')) {
            const parts = cleanBase64.split('base64,');
            const header = parts[0];
            cleanBase64 = parts[1];
            const match = header.match(/data:([^;]+);/);
            if (match) mimeType = match[1];
          }
          dataUrl = `data:${mimeType};base64,${cleanBase64}`;
        }
      }

      const contentArray: any[] = [];
      if (dataUrl) {
        contentArray.push({
          type: "image_url",
          image_url: { url: dataUrl }
        });
      }
      contentArray.push({
        type: "text",
        text: prompt || "A high quality video of this cat, cinematic lighting, realistic."
      });

      const requestBody: any = {
        model: ARK_MODEL_ID,
        content: contentArray,
        parameters: {
          size: parameters?.resolution === "480p" ? "854x480" : (parameters?.size || "854x480"),
          seed: parameters?.seed || 12345,
          duration: parameters?.duration || 5,
          audio: parameters?.audio || false,
          first_frame_constraint: true,
          negative_prompt: negative_prompt || ""
        }
      };

      console.log("Submitting task to Ark:", {
        model: ARK_MODEL_ID,
        url: ARK_BASE_URL
      });

      const response = await axios.post(
        ARK_BASE_URL,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${ARK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 300000
        }
      );

      console.log("Ark Submit Success:", response.data.id || "No ID");
      res.json(response.data);
    } catch (error: any) {
      console.error("Ark API Error:", error.message);
      sendError(res, error, "提交任务失败");
    }
  });

  // Polling endpoint
  app.get("/api/video-status/:taskId", async (req, res) => {
    const { taskId } = req.params;

    if (!isValidTaskId(taskId)) {
      return res.status(400).json({ error: "无效的任务 ID 格式" });
    }

    try {
      const response = await axios.get(
        `${ARK_BASE_URL}/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${ARK_API_KEY}`
          },
          timeout: 60000
        }
      );
      
      console.log(`Ark Status for ${taskId}:`, response.data.status);
      res.json(response.data);
    } catch (error: any) {
      console.error("Ark Status Error:", error.message);
      sendError(res, error, "查询状态失败");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // 不立即 exit，让进程管理器（pm2/docker）负责重启
  });
}

startServer();
