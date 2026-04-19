import { useEffect } from 'react';
import { isAndroid } from '../utils/platform';

/**
 * Android 硬件返回键处理
 * 有历史记录时后退，否则最小化应用
 */
export function useBackButton() {
  useEffect(() => {
    if (!isAndroid()) return;

    let listener: { remove: () => void } | undefined;

    (async () => {
      const { App } = await import('@capacitor/app');
      const handle = await App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.minimizeApp();
        }
      });
      listener = handle;
    })();

    return () => {
      listener?.remove();
    };
  }, []);
}
