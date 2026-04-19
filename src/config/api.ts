import { isNative } from '../utils/platform';

/**
 * API 基础 URL 配置
 * 原生 App 需要完整的远程 URL（WebView 无同源服务器）
 * Web PWA 使用相对路径（同源 Express 服务）
 */
export const API_BASE_URL = isNative()
  ? 'https://www.mmdd10.tech'
  : '';
