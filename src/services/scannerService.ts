import { isNative } from '../utils/platform';

/**
 * QR 扫码抽象层
 * 原生环境使用 Capacitor Camera 拍照 + html5-qrcode 解码
 * Web 环境返回 null，由调用方使用 html5-qrcode 内联扫描
 */
export async function scanQRFromCamera(): Promise<string | null> {
  if (!isNative()) return null;

  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  const photo = await Camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Camera,
  });

  if (!photo.dataUrl) return null;

  // 使用 html5-qrcode 解码拍到的照片
  const { Html5Qrcode } = await import('html5-qrcode');
  try {
    const blob = await fetch(photo.dataUrl).then(r => r.blob());
    const file = new File([blob], 'scan.jpg', { type: 'image/jpeg' });
    const html5QrCode = new Html5Qrcode('__qr-decode-tmp', /* verbose= */ false);
    const decodedText = await html5QrCode.scanFile(file, /* showImage= */ false);
    return decodedText;
  } catch {
    return null; // 未识别到二维码
  }
}

/**
 * 从相册图片解码 QR（原生环境）
 */
export async function scanQRFromGallery(): Promise<string | null> {
  if (!isNative()) return null;

  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  const photo = await Camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Photos,
  });

  if (!photo.dataUrl) return null;

  const { Html5Qrcode } = await import('html5-qrcode');
  try {
    const blob = await fetch(photo.dataUrl).then(r => r.blob());
    const file = new File([blob], 'gallery.jpg', { type: 'image/jpeg' });
    const html5QrCode = new Html5Qrcode('__qr-decode-tmp', /* verbose= */ false);
    const decodedText = await html5QrCode.scanFile(file, /* showImage= */ false);
    return decodedText;
  } catch {
    return null;
  }
}
