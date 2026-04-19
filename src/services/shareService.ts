/**
 * 分享服务：支持 Web Share API、微信内置浏览器检测及兜底复制逻辑
 * 在 Capacitor 原生环境中使用原生分享/剪贴板插件
 */

import { isNative } from '../utils/platform';

export interface ShareOptions {
  title: string;
  text: string;
  url: string;
}

export const shareService = {
  /**
   * 检测是否在微信内置浏览器中
   */
  isWeChat: (): boolean => {
    const ua = navigator.userAgent.toLowerCase();
    return ua.indexOf('micromessenger') !== -1;
  },

  /**
   * 检测是否为移动端设备
   */
  isMobile: (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  /**
   * 复制文本到剪贴板
   */
  copyToClipboard: async (text: string): Promise<boolean> => {
    try {
      if (isNative()) {
        const { Clipboard } = await import('@capacitor/clipboard');
        await Clipboard.write({ string: text });
        return true;
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      
      // 兜底方案：使用传统的 execCommand('copy')
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('复制失败:', err);
      return false;
    }
  },

  /**
   * 执行分享逻辑
   */
  share: async (options: ShareOptions): Promise<{ success: boolean; method: 'native' | 'wechat' | 'copy' }> => {
    // Capacitor 原生分享
    if (isNative()) {
      try {
        const { Share } = await import('@capacitor/share');
        await Share.share({
          title: options.title,
          text: options.text,
          url: options.url,
          dialogTitle: options.title,
        });
        return { success: true, method: 'native' };
      } catch (err) {
        if ((err as Error).message?.includes('canceled')) {
          return { success: false, method: 'native' };
        }
        console.error('原生分享失败:', err);
      }
    }

    // 1. 优先尝试系统原生分享 (Web Share API)
    if (shareService.isWeChat()) {
      return { success: true, method: 'wechat' };
    }

    if (navigator.share && shareService.isMobile()) {
      try {
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url,
        });
        return { success: true, method: 'native' };
      } catch (err) {
        // 用户取消分享不视为失败
        if ((err as Error).name === 'AbortError') {
          return { success: false, method: 'native' };
        }
        console.error('原生分享失败:', err);
      }
    }

    // 2. 兜底逻辑：复制链接
    const shareText = `${options.title}\n${options.text}\n${options.url}`;
    const copied = await shareService.copyToClipboard(shareText);
    return { success: copied, method: 'copy' };
  }
};
