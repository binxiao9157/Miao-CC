import axios from 'axios';

/**
 * 火山引擎配置中心 (方舟 Ark 平台)
 */
export const VolcanoConfig = {
  // 开启 API 调用
  MOCK_MODE: false, 
  
  // 凭证信息 (从环境变量读取)
  AccessKey: import.meta.env.VITE_VOLC_ACCESS_KEY,
  SecretKey: import.meta.env.VITE_VOLC_SECRET_KEY,
  
  ApiKey: import.meta.env.VITE_VOLC_API_KEY,
  ModelId: import.meta.env.VITE_VOLC_MODEL_ID || 'doubao-seedance-1-5-pro-251215',
  T2IModelId: import.meta.env.VITE_VOLC_T2I_MODEL_ID || 'doubao-t2i-v2',
  BaseUrl: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
};

/**
 * 互动动作对应的 Prompt 模版 (Seedance 高精度指令)
 */
export const ACTION_PROMPTS = {
  rubbing: "基于输入猫咪照片，首帧严格固定：猫咪蹲坐在温馨家庭场景的地毯中央，正视镜头，姿态、场景、光线、构图完全统一，缓慢站起走向镜头轻蹭后退回蹲坐，尾帧回归初始蹲坐姿态，与首帧画面一致；保留原始毛色与真实质感，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；超写实风格，固定摄像头。",
  petting: "基于输入猫咪照片，首帧严格固定：猫咪蹲坐在温馨家庭场景的地毯中央，正视镜头，姿态、场景、光线、构图完全统一，镜头拉近聚焦面部，虚拟手轻摸头顶，猫咪眯眼、耳朵后贴呈现享受状态，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；随后镜头拉远，尾帧回归初始蹲坐姿态，与首帧画面一致；超写实风格。",
  feeding: "基于输入猫咪照片，首帧严格固定：猫咪蹲坐在温馨家庭场景的地毯中央，正视镜头，姿态、场景、光线、构图完全统一，镜头拉近，猫咪缓慢放松躺平、自然露出肚皮，虚拟手轻柔抚摸腹部，猫咪姿态放松舒适，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；随后猫咪起身恢复蹲坐、镜头拉远，尾帧回归初始蹲坐姿态，与首帧画面一致；超写实风格，固定摄像头，480P，5 秒无音频，种子值 12345。",
  teasing: "基于输入猫咪照片，首帧严格固定：猫咪蹲坐在温馨家庭场景的地毯中央，正视镜头，姿态、场景、光线、构图完全统一，镜头拉近，主人手从右侧伸入持羽毛逗猫棒晃动，猫咪兴奋抬头、挥爪、原地小跳 2 次，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；随后逗猫棒移开、镜头拉远，尾帧回归初始蹲坐姿态，与首帧画面一致；超写实风格。"
};

/**
 * 形象生成对应的 Prompt 模版
 */
export const IMAGE_PROMPTS = {
  anchor: (breed: string, color: string) => 
    `A ultra-realistic, high-detail portrait of a ${breed} cat with ${color} fur, sitting comfortably in a soft cat nest, cinematic lighting, 4k resolution, looking at the camera.`
};

/** 构建 API 请求通用 Headers */
function buildHeaders(options?: { includeT2I?: boolean }) {
  const apiKey = localStorage.getItem('VOLC_API_KEY') || VolcanoConfig.ApiKey;
  const accessKey = localStorage.getItem('VOLC_ACCESS_KEY') || VolcanoConfig.AccessKey;
  const secretKey = localStorage.getItem('VOLC_SECRET_KEY') || VolcanoConfig.SecretKey;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Volc-API-Key': apiKey,
    'X-Volc-Access-Key': accessKey,
    'X-Volc-Secret-Key': secretKey,
  };

  if (options?.includeT2I) {
    headers['X-Volc-T2I-Model-Id'] = localStorage.getItem('VOLC_T2I_MODEL_ID') || VolcanoConfig.T2IModelId;
  } else {
    headers['X-Volc-Model-Id'] = localStorage.getItem('VOLC_MODEL_ID') || VolcanoConfig.ModelId;
  }

  return headers;
}

/**
 * 火山引擎方舟视频生成服务
 */
export class VolcanoService {
  /**
   * 提交视频生成任务 (SubmitTask)
   */
  public static async submitTask(imageBase64: string, prompt?: string) {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: 'mock_task_' + Date.now() };
    }

    try {
      const response = await axios.post("/api/generate-video", {
        prompt: prompt || "A high quality video of this cat, cinematic lighting, realistic.",
        image_base64: imageBase64,
        parameters: {
          seed: 12345,
          resolution: "480p",
          duration: 5,
          audio: false
        }
      }, {
        timeout: 310000,
        headers: buildHeaders()
      });
      
      console.log("[DEBUG] Submit task response:", response.data);
      
      // 兼容不同的返回结构 (id 或 task_id)
      const taskId = response.data?.id || response.data?.task_id || response.data?.data?.id;
      
      if (!taskId) {
        console.error("[DEBUG] Invalid response structure:", response.data);
        throw new Error("服务器返回数据格式错误，未获取到任务 ID");
      }

      return {
        ...response.data,
        id: taskId
      };
    } catch (error: any) {
      if (error.response) {
        console.error("提交失败详情 (HTTP Error):", error.response.status, error.response.data);
        throw new Error(error.response.data.error || `提交失败 (${error.response.status})`);
      } else if (error.request) {
        console.error("网络错误 (No Response):", error.request);
        throw new Error("网络错误: 无法连接到服务器，请检查网络或稍后重试");
      } else {
        console.error("请求配置错误:", error.message);
        throw new Error(`请求错误: ${error.message}`);
      }
    }
  }

  /**
   * 查询任务结果 (GetTaskResult)
   */
  public static async getTaskResult(taskId: string) {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const progress = Math.random();
      if (progress > 0.8) {
        return {
          status: 'succeeded',
          content: {
            video_url: 'https://www.w3schools.com/html/mov_bbb.mp4'
          }
        };
      }
      return { status: 'running' };
    }

    try {
      const response = await axios.get(`/api/video-status/${taskId}`, {
        timeout: 60000,
        headers: buildHeaders()
      });
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error("查询状态超时，请检查网络连接或稍后重试");
      }
      if (error.response) {
        console.error("查询失败详情 (HTTP Error):", error.response.status, error.response.data);
        throw new Error(error.response.data.error || `查询失败 (${error.response.status})`);
      } else if (error.request) {
        console.error("网络错误 (No Response):", error.request);
        throw new Error("网络错误: 无法连接到服务器");
      } else {
        throw new Error(`查询错误: ${error.message}`);
      }
    }
  }

  /**
   * 提交文生图任务 (Text-to-Image)
   */
  public static async submitImageTask(prompt: string) {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id: 'mock_img_task_' + Date.now() };
    }

    try {
      const response = await axios.post("/api/generate-image", {
        prompt,
      }, {
        timeout: 60000,
        headers: buildHeaders({ includeT2I: true })
      });
      
      const taskId = response.data?.id || response.data?.task_id || response.data?.data?.id;
      
      if (!taskId) {
        throw new Error("文生图任务提交失败，未获取到 ID");
      }

      return { id: taskId };
    } catch (error: any) {
      let errorMsg = "文生图提交失败";
      if (error.response?.data) {
        const data = error.response.data;
        // Handle nested error object from server.ts
        const innerError = data.error?.error || data.error || data;
        errorMsg = typeof innerError === 'string' ? innerError : (innerError.message || JSON.stringify(innerError));
      } else {
        errorMsg = error.message;
      }
      throw new Error(errorMsg);
    }
  }

  /**
   * 轮询文生图结果（指数退避：初始 2s，×1.5，上限 10s）
   */
  public static async pollImageResult(taskId: string, signal?: AbortSignal): Promise<string> {
    if (VolcanoConfig.MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return 'https://picsum.photos/seed/cat/800/800';
    }

    let delay = 2000;
    const MAX_DELAY = 10000;
    const BACKOFF_FACTOR = 1.5;
    const maxWaitTimeMs = 120000; // 2 分钟超时
    const startTime = Date.now();

    while (true) {
      if (signal?.aborted) throw new Error("任务中止");
      if (Date.now() - startTime > maxWaitTimeMs) throw new Error("图片生成超时");

      await new Promise<void>((resolve, reject) => {
        const onAbort = () => { clearTimeout(timerId); reject(new Error("任务中止")); };
        const timerId = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, delay);
        signal?.addEventListener('abort', onAbort, { once: true });
      });

      try {
        const response = await axios.get(`/api/image-status/${taskId}`, {
          headers: {
            'X-Volc-API-Key': localStorage.getItem('VOLC_API_KEY') || VolcanoConfig.ApiKey
          }
        });

        const result = response.data;
        if (result.status === 'succeeded') {
          const imageUrl = result.output?.image_url || result.data?.image_url || result.image_url;
          if (imageUrl) return imageUrl;
          throw new Error("任务成功但未获取到图片地址");
        } else if (result.status === 'failed') {
          const errorInfo = result.error || result.message || "未知错误";
          throw new Error(`图片生成失败: ${typeof errorInfo === 'string' ? errorInfo : JSON.stringify(errorInfo)}`);
        }
      } catch (error: any) {
        // 网络超时/连接错误 → 允许重试（continue 回到 while 循环）
        const isNetworkError = error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.code === 'ERR_NETWORK';
        if (isNetworkError) {
          console.warn("pollImageResult 网络错误，将重试:", error.message);
          // 继续循环，走到下面的退避逻辑
        } else {
          // 业务错误（任务失败、数据异常等）直接抛出
          throw error;
        }
      }

      delay = Math.min(delay * BACKOFF_FACTOR, MAX_DELAY);
    }
  }

  /**
   * 轮询逻辑 (Polling Logic)
   * 使用指数退避策略：初始 3s，每次 ×1.5，上限 15s
   */
  public static async pollTaskResult(
    taskId: string,
    onProgress?: (status: string) => void,
    signal?: AbortSignal,
    maxWaitTimeMs: number = 300000 // 默认 5 分钟超时
  ): Promise<string> {
    const startTime = Date.now();
    let delay = 3000; // 初始 3s
    const MAX_DELAY = 15000;
    const BACKOFF_FACTOR = 1.5;

    while (true) {
      if (signal?.aborted) throw new Error("任务轮询已中止");
      if (Date.now() - startTime > maxWaitTimeMs) throw new Error("任务轮询超时 (5分钟)");

      await new Promise<void>((resolve, reject) => {
        const onAbort = () => { clearTimeout(timerId); reject(new Error("任务轮询已中止")); };
        const timerId = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, delay);
        signal?.addEventListener('abort', onAbort, { once: true });
      });

      const result = await this.getTaskResult(taskId);
      console.log(`[DEBUG] Task ${taskId} status: ${result.status}`);

      const status = result.status;
      if (onProgress) onProgress(status);

      if (status === 'succeeded') {
        console.log("[DEBUG] Task succeeded. Full result:", JSON.stringify(result, null, 2));

        let videoUrl =
          result.output?.video_url ||
          result.content?.video_url ||
          result.data?.video_url ||
          result.video_url;

        if (!videoUrl && result.response?.video?.uri) {
          videoUrl = result.response.video.uri;
        }

        if (videoUrl && (videoUrl.startsWith('http') || videoUrl.startsWith('/api'))) {
          return videoUrl;
        }
        throw new Error("任务成功但未获取到有效的视频播放地址。");
      } else if (status === 'failed' || status === 'cancelled') {
        throw new Error(`任务失败，状态: ${status}, 错误: ${JSON.stringify(result.error || result.message)}`);
      }

      // 指数退避
      delay = Math.min(delay * BACKOFF_FACTOR, MAX_DELAY);
    }
  }
}
