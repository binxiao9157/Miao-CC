import { isNative } from '../utils/platform';

/**
 * 相机/相册选择抽象层
 * 原生环境使用 Capacitor Camera 插件
 * Web 环境返回 null，由调用方使用 <input type="file">
 */
export async function pickImage(
  source: 'camera' | 'gallery' = 'gallery'
): Promise<string | null> {
  if (!isNative()) return null;

  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  const image = await Camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.DataUrl,
    source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
    width: 1280,
    height: 1280,
  });

  return image.dataUrl ?? null;
}
