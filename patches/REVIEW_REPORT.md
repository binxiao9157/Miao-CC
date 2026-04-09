# Miao V1.0 代码审查报告

> 审查日期: 2026-04-09
> 审查范围: 全量代码（server.ts, services, pages, components, config）

## 统计摘要

| 严重级别 | 数量 | 说明 |
|----------|------|------|
| Critical | 8 | 运行时崩溃、安全漏洞 |
| High | 12 | 资源泄漏、业务逻辑缺陷 |
| Medium | 28 | 质量问题、UX 缺陷 |
| Low | 22 | 代码清理、规范化 |
| **总计** | **70** | |

---

## Critical（致命，8 项）

### C-01: Home.tsx 缺少 useCallback import
- **文件**: `src/pages/Home.tsx:1`
- **问题**: 第 319 行使用了 `useCallback`，但 import 中未包含，运行时 `ReferenceError` 导致页面白屏
- **修复**: Step 1

### C-02: AuthContext 每次刷新强制登出
- **文件**: `src/context/AuthContext.tsx:29`
- **问题**: `useEffect` 中无条件调用 `storage.clearCurrentUser()`，页面刷新即丢失登录态
- **修复**: Step 1

### C-03: 明文密码存储与比对
- **文件**: `src/context/AuthContext.tsx:35`, `src/services/storage.ts:9`
- **问题**: 用户密码以明文存于 localStorage，XSS 可窃取全部密码
- **说明**: 作为演示应用的已知限制，本次不修改架构，但在报告中标记

### C-04: API 密钥存储在 localStorage
- **文件**: `src/pages/Welcome.tsx:145-149`
- **问题**: DebugDialog 将 `VOLC_API_KEY`/`VOLC_ACCESS_KEY`/`VOLC_SECRET_KEY` 写入 localStorage
- **说明**: 调试功能，本次标记为风险项

### C-05: 无用凭证通过 Header 传输
- **文件**: `src/services/volcanoService.ts:25-32`
- **问题**: `buildHeaders` 发送 Access-Key/Secret-Key，但服务端从未读取，纯属泄露
- **修复**: Step 2

### C-06: Gemini API Key 注入客户端包
- **文件**: `vite.config.ts:11`
- **问题**: `process.env.GEMINI_API_KEY` 通过 Vite define 静态替换到前端 JS，可被提取
- **修复**: Step 2

### C-07: 重置密码验证码未校验
- **文件**: `src/pages/ResetPassword.tsx:36-44`
- **问题**: mock 验证码通过 alert 显示但 `handleReset` 不检查输入是否匹配，任意 4 位数通过
- **修复**: Step 2

### C-08: server.ts SSRF/反射型 XSS
- **文件**: `server.ts:131`
- **问题**: `isValidTaskId` 对 `url:` 前缀无验证，允许注入任意 URL
- **修复**: Step 2

---

## High（高危，12 项）

### H-01: 无 API 限流
- **文件**: `server.ts:81-255`
- **说明**: 所有代理端点无 rate limiting，本次标记（需引入中间件，范围较大）

### H-02: 错误响应泄露上游敏感信息
- **文件**: `server.ts:33-77`
- **修复**: Step 2

### H-03: volcanoService API Key 存 localStorage
- **文件**: `src/services/volcanoService.ts:24`
- **说明**: 调试功能已知限制

### H-04: AudioContext 泄漏
- **文件**: `src/services/catService.ts:58-76`
- **问题**: 每次 playMeow 创建新 AudioContext 不释放，浏览器限 6 个
- **修复**: Step 3

### H-05: Home.tsx 空依赖数组闭包过期
- **文件**: `src/pages/Home.tsx:89`
- **修复**: Step 6

### H-06: Home.tsx handleTimeUpdate 导致视频 DOM 重建
- **文件**: `src/pages/Home.tsx:319-331`
- **说明**: useCallback 已正确使用（待 import 修复后），影响有限

### H-07: GenerationProgress AbortController 未管理
- **文件**: `src/pages/GenerationProgress.tsx:344-346`
- **修复**: Step 4

### H-08: 积分扣减后置
- **文件**: `src/pages/GenerationProgress.tsx:147-153`
- **修复**: Step 4

### H-09: ScanFriend.tsx useEffect 闭包过期
- **文件**: `src/pages/ScanFriend.tsx:154-195`
- **说明**: 标记为已知问题（修改影响范围较大）

### H-10: storage.ts 用户缓存可能过期
- **文件**: `src/services/storage.ts:140-144`
- **说明**: Step 1 AuthContext 修复后可缓解

### H-11: Service Worker Headers 展开无效
- **文件**: `public/service-worker.js:22-26`
- **修复**: Step 3

### H-12: Service Worker 无缓存大小限制
- **文件**: `public/service-worker.js:48-51`
- **修复**: Step 3

---

## Medium（中等，28 项）

| # | 文件 | 问题概要 | 修复 |
|---|------|----------|------|
| M-01 | Home.tsx | `startGreetingTimer` 不在依赖数组 | Step 6 |
| M-02 | Home.tsx | `triggerPointToast` setTimeout 未清理 | 标记 |
| M-03 | GenerationProgress.tsx | `process.env.GEMINI_API_KEY` 浏览器为 undefined | Step 2 |
| M-04 | CreateCompanion.tsx | `URL.createObjectURL` 未 revoke | 标记 |
| M-05 | CatPlayer.tsx | `parseInt(cat.id.split('_')[1])` NaN 风险 | 标记 |
| M-06 | Diary.tsx | setTimeout 无清理；评论 ID 冲突风险 | 标记 |
| M-07 | ScanFriend.tsx | Html5Qrcode 实例未清理 | 标记 |
| M-08 | EditProfile.tsx | 嵌套 setTimeout 未清理 | 标记 |
| M-09 | ChangePassword.tsx | 明文存储新密码 | 已知限制 |
| M-10 | Register.tsx | 残留数据路由错误 | 标记 |
| M-11 | SwitchCompanion.tsx | 2 秒轮询 localStorage | 标记 |
| M-12 | Points.tsx | 渲染时读 localStorage | 标记 |
| M-13 | CatHistory.tsx | hover 自动播放无节制 | 标记 |
| M-14 | storage.ts | `toLocaleDateString()` locale 不一致 | Step 5 |
| M-15 | storage.ts | 剪枝逻辑顺序问题 | 标记 |
| M-16 | volcanoService.ts | seed 硬编码 | 标记 |
| M-17 | volcanoService.ts | pollImageResult header 不一致 | 标记 |
| M-18 | fileManager.ts | downloadVideos 未真正下载 | 标记 |
| M-19 | shareService.ts | 微信分享 no-op | 标记 |
| M-20 | mockFriendService.ts | 数据被覆盖 | 标记 |
| M-21 | AuthContext.tsx | 函数未 useCallback | 标记 |
| M-22 | CommentItem.tsx | touch+mouse 双触发 | 标记 |
| M-23 | CommentItem.tsx | clipboard 未 await | 标记 |
| M-24 | MainLayout.tsx | 绕过 lazy loading | 标记 |
| M-25 | ErrorBoundary.tsx | 重置不重新挂载 | 标记 |
| M-26 | index.html | lang="en" 应为 zh-CN | Step 5 |
| M-27 | index.html | 外部 favicon URL | 标记 |
| M-28 | package.json | vite 重复依赖 | Step 5 |

---

## Low（低风险，22 项）

包括死代码、未使用 import、console.log 残留、package name 为 "react-example"、start 脚本无法运行 .ts、tsconfig 未启用 strict、`@` 别名指向项目根、uncaughtException 未 exit 等。

部分在 Step 5/6 中修复，其余标记为后续优化项。
