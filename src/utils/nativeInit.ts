import { isNative, isIOS } from './platform';

export async function initNativePlugins() {
  if (!isNative()) return;

  const { StatusBar, Style } = await import('@capacitor/status-bar');
  const { SplashScreen } = await import('@capacitor/splash-screen');

  await StatusBar.setStyle({ style: Style.Light });
  await StatusBar.setBackgroundColor({ color: '#FFF5F0' });

  if (!isIOS()) {
    await StatusBar.setOverlaysWebView({ overlay: true });
  }

  await SplashScreen.hide();
}
