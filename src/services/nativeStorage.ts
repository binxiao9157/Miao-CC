import { isNative } from '../utils/platform';

/**
 * 原生安全存储适配层
 * 原生环境使用 Capacitor Preferences（独立于 WebView，不会被清除）
 * Web 环境回退到 localStorage
 *
 * 仅用于关键数据（auth token、当前用户信息）
 * 批量数据（日记、猫咪列表等）仍使用 localStorage（WebView 中性能更好）
 */

let preferencesModule: typeof import('@capacitor/preferences') | null = null;

async function getPreferences() {
  if (!isNative()) return null;
  if (!preferencesModule) {
    preferencesModule = await import('@capacitor/preferences');
  }
  return preferencesModule.Preferences;
}

export const nativeStorage = {
  async getItem(key: string): Promise<string | null> {
    const Preferences = await getPreferences();
    if (Preferences) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    const Preferences = await getPreferences();
    if (Preferences) {
      await Preferences.set({ key, value });
    }
    // 同时写入 localStorage 保持同步（WebView 中的代码也能读到）
    try { localStorage.setItem(key, value); } catch {}
  },

  async removeItem(key: string): Promise<void> {
    const Preferences = await getPreferences();
    if (Preferences) {
      await Preferences.remove({ key });
    }
    try { localStorage.removeItem(key); } catch {}
  },
};
