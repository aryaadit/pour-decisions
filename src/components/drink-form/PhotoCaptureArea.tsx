import { useRef } from 'react';
import { StorageImage } from '@/components/StorageImage';
import { Button } from '@/components/ui/button';
import { Camera, ImagePlus, Loader2, RotateCcw, Upload } from 'lucide-react';
import { takePhoto, pickFromGallery, dataUrlToBlob } from '@/hooks/useCamera';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import { useHaptics } from '@/hooks/useHaptics';
import * as drinkService from '@/services/drinkService';
import { toast } from 'sonner';

interface PhotoCaptureAreaProps {
  imageUrl: string | undefined;
  onImageChange: (url: string | undefined) => void;
  isUploading: boolean;
  onUploadingChange: (uploading: boolean) => void;
  isAnalyzing?: boolean;
  isCameraActiveRef?: React.MutableRefObject<boolean>;
}

export function PhotoCaptureArea({
  imageUrl,
  onImageChange,
  isUploading,
  onUploadingChange,
  isAnalyzing = false,
  isCameraActiveRef,
}: PhotoCaptureAreaProps) {
  const { user } = useAuth();
  const { impact, ImpactStyle } = useHaptics();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isNative = Capacitor.isNativePlatform();

  const uploadFile = async (file: File | Blob) => {
    if (!user) return;
    onUploadingChange(true);
    try {
      const storagePath = await drinkService.uploadDrinkImage(user.id, file);
      onImageChange(storagePath);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      onUploadingChange(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    await uploadFile(file);
  };

  const handleTakePhoto = async () => {
    impact(ImpactStyle.Light);
    if (isCameraActiveRef) isCameraActiveRef.current = true;
    try {
      const photo = await takePhoto();
      if (photo) {
        const blob = dataUrlToBlob(photo.dataUrl);
        await uploadFile(blob);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      toast.error(error?.message || 'Failed to take photo. Please check camera permissions.');
    } finally {
      if (isCameraActiveRef) {
        setTimeout(() => {
          isCameraActiveRef.current = false;
        }, 500);
      }
    }
  };

  const handlePickFromGallery = async () => {
    impact(ImpactStyle.Light);
    if (isCameraActiveRef) isCameraActiveRef.current = true;
    try {
      const photo = await pickFromGallery();
      if (photo) {
        const blob = dataUrlToBlob(photo.dataUrl);
        await uploadFile(blob);
      }
    } catch (error: any) {
      console.error('Gallery error:', error);
      toast.error(error?.message || 'Failed to access photos. Please check photo library permissions.');
    } finally {
      if (isCameraActiveRef) {
        setTimeout(() => {
          isCameraActiveRef.current = false;
        }, 500);
      }
    }
  };

  const handleRetake = () => {
    onImageChange(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Photo captured state
  if (imageUrl) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden border border-border bg-muted">
        <StorageImage
          storagePath={imageUrl}
          alt="Drink photo"
          className="w-full h-40 object-cover"
        />
        {/* Analyzing overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
            <span className="text-sm font-medium text-white">Identifying your drink...</span>
          </div>
        )}
        {/* Retake button */}
        {!isAnalyzing && (
          <button
            type="button"
            onClick={handleRetake}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // Uploading state
  if (isUploading) {
    return (
      <div className="w-full h-40 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 bg-muted/50">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Uploading photo...</span>
      </div>
    );
  }

  // Empty state
  return (
    <div className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors bg-muted/30">
      <div className="flex flex-col items-center justify-center gap-3 py-8 px-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Camera className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Take a photo or choose from gallery
        </p>
        <div className="flex gap-2">
          {isNative ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTakePhoto}
                className="gap-1.5"
              >
                <Camera className="w-4 h-4" />
                Camera
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePickFromGallery}
                className="gap-1.5"
              >
                <ImagePlus className="w-4 h-4" />
                Gallery
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5"
            >
              <Upload className="w-4 h-4" />
              Upload Photo
            </Button>
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
}
