import { isNative, isIOS } from './platform';
import { initNativeStorage } from '../services/storage';

export async function initNativePlugins() {
  if (!isNative()) return;

  // 先从 Capacitor Preferences 恢复 auth 数据到 localStorage
  await initNativeStorage();

  const { StatusBar, Style } = await import('@capacitor/status-bar');
  const { SplashScreen } = await import('@capacitor/splash-screen');

  await StatusBar.setStyle({ style: Style.Light });
  await StatusBar.setBackgroundColor({ color: '#FFF5F0' });

  if (!isIOS()) {
    await StatusBar.setOverlaysWebView({ overlay: true });
  }

  await SplashScreen.hide();
}
