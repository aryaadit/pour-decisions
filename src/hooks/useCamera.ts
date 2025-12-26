import { Camera, CameraResultType, CameraSource, CameraPermissionState } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export interface CameraPhoto {
  dataUrl: string;
  format: string;
}

export interface CameraError {
  type: 'permission_denied' | 'cancelled' | 'unavailable' | 'unknown';
  message: string;
}

async function checkAndRequestPermissions(): Promise<boolean> {
  // On web, permissions are handled by the browser
  if (!Capacitor.isNativePlatform()) {
    return true;
  }

  try {
    const permissions = await Camera.checkPermissions();
    
    // If camera permission is not granted, request it
    if (permissions.camera !== 'granted') {
      const requested = await Camera.requestPermissions({ permissions: ['camera'] });
      if (requested.camera !== 'granted') {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error checking camera permissions:', error);
    return false;
  }
}

async function checkAndRequestPhotosPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }

  try {
    const permissions = await Camera.checkPermissions();
    
    if (permissions.photos !== 'granted') {
      const requested = await Camera.requestPermissions({ permissions: ['photos'] });
      if (requested.photos !== 'granted' && requested.photos !== 'limited') {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error checking photos permissions:', error);
    return false;
  }
}

export async function takePhoto(): Promise<CameraPhoto | null> {
  try {
    // Check permissions first
    const hasPermission = await checkAndRequestPermissions();
    if (!hasPermission) {
      throw new Error('Camera permission denied. Please enable camera access in your device settings.');
    }

    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      saveToGallery: false,
      promptLabelHeader: 'Take Photo',
      promptLabelPhoto: 'Choose from Gallery',
      promptLabelPicture: 'Take Photo',
    });

    if (photo.dataUrl) {
      return {
        dataUrl: photo.dataUrl,
        format: photo.format,
      };
    }
    return null;
  } catch (error: any) {
    // User cancelled - this is not an error
    if (error?.message?.includes('cancelled') || error?.message?.includes('User cancelled')) {
      console.log('Photo capture cancelled by user');
      return null;
    }
    console.error('Error taking photo:', error);
    throw error;
  }
}

export async function pickFromGallery(): Promise<CameraPhoto | null> {
  try {
    // Check photos permission first
    const hasPermission = await checkAndRequestPhotosPermission();
    if (!hasPermission) {
      throw new Error('Photo library permission denied. Please enable photo access in your device settings.');
    }

    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    });

    if (photo.dataUrl) {
      return {
        dataUrl: photo.dataUrl,
        format: photo.format,
      };
    }
    return null;
  } catch (error: any) {
    // User cancelled - not an error
    if (error?.message?.includes('cancelled') || error?.message?.includes('User cancelled')) {
      console.log('Gallery selection cancelled by user');
      return null;
    }
    console.error('Error picking from gallery:', error);
    throw error;
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
