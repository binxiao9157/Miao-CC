import { isNative } from './platform';

/**
 * Deep Link 处理
 * 监听 miao:// URL scheme，将用户引导到对应页面
 */
export function setupDeepLinks(navigate: (path: string) => void) {
  if (!isNative()) return;

  import('@capacitor/app').then(({ App }) => {
    App.addListener('appUrlOpen', (event) => {
      try {
        const url = new URL(event.url);
        if (url.pathname === '/friend-invite' || url.host === 'friend-invite') {
          const uid = url.searchParams.get('uid');
          if (uid) {
            navigate(`/scan-friend?uid=${uid}`);
          }
        }
      } catch (e) {
        console.warn('Deep link parse error:', e);
      }
    });
  });
}
