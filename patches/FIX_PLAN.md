# Miao V1.0 修复方案

> 基于代码审查报告，按优先级分 6 步修复
> 每步包含 diff 文件和 .diff.txt 备份

## 修复原则
1. **不影响现有功能** — 每个补丁仅修复目标问题
2. **不影响系统稳定性** — 变更最小化，保守修复
3. **可独立应用** — 每个 diff 可单独 `git apply`
4. **可回滚** — 每步修改范围明确，便于 revert

## Step 1: Critical — 运行时崩溃修复
| 补丁 | 文件 | 说明 |
|------|------|------|
| 01-home-useCallback | src/pages/Home.tsx | 添加缺失的 useCallback import |
| 02-authcontext-session | src/context/AuthContext.tsx | 恢复会话替代强制登出 |

## Step 2: Critical — 安全漏洞修复
| 补丁 | 文件 | 说明 |
|------|------|------|
| 03-vite-gemini-key | vite.config.ts, GenerationProgress.tsx | 移除客户端 API Key 注入 |
| 04-server-ssrf | server.ts | 限制 url: 前缀为合法 HTTPS URL |
| 05-server-error-sanitize | server.ts | 生产环境不返回上游错误详情 |
| 06-reset-password-verify | src/pages/ResetPassword.tsx | 添加验证码校验逻辑 |
| 07-volcano-remove-unused-creds | src/services/volcanoService.ts | 移除无用的 Secret Key 传输 |

## Step 3: High — 资源泄漏修复
| 补丁 | 文件 | 说明 |
|------|------|------|
| 08-catservice-audiocontext | src/services/catService.ts | AudioContext 单例复用 |
| 09-service-worker-headers | public/service-worker.js | 修复 Headers 展开 |
| 10-service-worker-cache-limit | public/service-worker.js | 缓存大小限制 |

## Step 4: High — 业务逻辑修复
| 补丁 | 文件 | 说明 |
|------|------|------|
| 11-generation-points-precheck | src/pages/GenerationProgress.tsx | 积分扣减前置 |
| 12-generation-abort-cleanup | src/pages/GenerationProgress.tsx | AbortController 生命周期管理 |

## Step 5: Medium — 质量改善
| 补丁 | 文件 | 说明 |
|------|------|------|
| 13-index-html-lang | index.html | lang 属性改为 zh-CN |
| 14-package-json-cleanup | package.json | 清理依赖和 name |
| 15-storage-locale-date | src/services/storage.ts | 日期格式统一 |

## Step 6: Low — 代码清理
| 补丁 | 文件 | 说明 |
|------|------|------|
| 16-home-stale-closures | src/pages/Home.tsx | 修复闭包依赖 |
| 17-dead-code-cleanup | fileManager.ts, package.json, server.ts | 死代码和脚本修复 |

## 应用方式
```bash
# 逐步应用
cd D:/Workspace/AICode/Miao_V1.0
git apply patches/step1-critical-runtime/01-home-useCallback.diff
git apply patches/step1-critical-runtime/02-authcontext-session.diff
# ... 以此类推

# 或一次性应用某一步
for f in patches/step1-critical-runtime/*.diff; do git apply "$f"; done
```
