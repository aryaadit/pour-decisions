import { useRef } from 'react';
import { StorageImage } from '@/components/StorageImage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Camera, X, Loader2, ImagePlus } from 'lucide-react';
import { takePhoto, pickFromGallery, dataUrlToBlob } from '@/hooks/useCamera';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import { useHaptics } from '@/hooks/useHaptics';
import * as drinkService from '@/services/drinkService';
import { toast } from 'sonner';

interface DrinkImageUploaderProps {
  imageUrl: string | undefined;
  onImageChange: (url: string | undefined) => void;
  isUploading: boolean;
  onUploadingChange: (uploading: boolean) => void;
  isCameraActiveRef: React.MutableRefObject<boolean>;
}

export function DrinkImageUploader({
  imageUrl,
  onImageChange,
  isUploading,
  onUploadingChange,
  isCameraActiveRef,
}: DrinkImageUploaderProps) {
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
    isCameraActiveRef.current = true;
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
      setTimeout(() => {
        isCameraActiveRef.current = false;
      }, 500);
    }
  };

  const handlePickFromGallery = async () => {
    impact(ImpactStyle.Light);
    isCameraActiveRef.current = true;
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
      setTimeout(() => {
        isCameraActiveRef.current = false;
      }, 500);
    }
  };

  const removeImage = () => {
    onImageChange(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (imageUrl) {
    return (
      <div className="relative flex-shrink-0">
        <StorageImage
          storagePath={imageUrl}
          alt="Drink preview"
          className="w-10 h-10 object-cover rounded-lg border border-border"
        />
        <button
          type="button"
          onClick={removeImage}
          className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <>
      {isNative ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={isUploading}
              className="w-10 h-10 flex-shrink-0 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-popover z-[60]">
            <DropdownMenuItem onClick={handleTakePhoto}>
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePickFromGallery}>
              <ImagePlus className="w-4 h-4 mr-2" />
              Choose from Gallery
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-10 h-10 flex-shrink-0 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </>
  );
}
