import { isNative } from '../utils/platform';

/**
 * QR 扫码抽象层
 * 原生环境使用 Capacitor Camera 插件拍照后解码
 * Web 环境返回 null，由调用方使用 html5-qrcode 内联扫描
 */
export async function scanQRCode(): Promise<string | null> {
  if (!isNative()) return null;

  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  const photo = await Camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Camera,
  });

  // 在原生端拍照后返回 dataUrl，由调用方解析 QR 内容
  // Phase 1: 原生端暂时仍走 html5-qrcode 的 WebView 实现
  // 未来可接入 @capawesome/capacitor-mlkit-barcode-scanning
  return photo.dataUrl ?? null;
}
