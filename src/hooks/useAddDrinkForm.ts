import { useState, useRef, useCallback } from 'react';
import { DrinkType } from '@/types/drink';
import { useHaptics } from '@/hooks/useHaptics';
import * as drinkService from '@/services/drinkService';
import { LookupInfo } from '@/components/drink-form/LookupResultsPanel';
import { detectDrinkType } from '@/lib/drinkTypeKeywords';
import { toast } from 'sonner';

interface UseAddDrinkFormOptions {
  name: string;
  type: DrinkType;
  brand: string;
  notes: string;
  price: string;
  imageUrl: string | undefined;
  setName: (v: string) => void;
  setType: (v: DrinkType) => void;
  setBrand: (v: string) => void;
  setNotes: (v: string) => void;
  setPrice: (v: string) => void;
  setDetailsOpen: (v: boolean) => void;
  userSetTypeRef: React.MutableRefObject<boolean>;
}

export function useAddDrinkForm(opts: UseAddDrinkFormOptions) {
  const {
    name, type, brand, notes, price, imageUrl,
    setName, setType, setBrand, setNotes, setPrice, setDetailsOpen,
    userSetTypeRef,
  } = opts;

  const { impact, notification, ImpactStyle, NotificationType } = useHaptics();
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupInfo, setLookupInfo] = useState<LookupInfo | null>(null);

  const autoLookupFromImage = async (imgUrl: string): Promise<void> => {
    impact(ImpactStyle.Light);
    setIsLookingUp(true);
    setLookupInfo(null);

    try {
      const data = await drinkService.lookupDrink({
        drinkName: name.trim() || undefined,
        drinkType: type,
        brand: brand.trim() || undefined,
        imageUrl: imgUrl,
      });

      if (data?.success && data?.data) {
        notification(NotificationType.Success);
        const info = data.data;

        if (info.drinkName && !name.trim()) setName(info.drinkName);
        if (info.drinkBrand && !brand.trim()) setBrand(info.drinkBrand);
        if (info.drinkType && !userSetTypeRef.current) setType(info.drinkType as DrinkType);

        const combinedNotes = [info.tastingNotes, info.brandInfo, info.suggestions]
          .filter(Boolean).join('\n\n');
        if (combinedNotes && !notes.trim()) setNotes(combinedNotes);
        if (info.priceRange && !price.trim()) setPrice(info.priceRange);

        if ((info.drinkBrand && !brand.trim()) || combinedNotes || info.priceRange) {
          setDetailsOpen(true);
        }

        setLookupInfo(info);
        toast.success(`Identified: ${info.drinkName || 'drink'}!`);
      }
    } catch (error: unknown) {
      console.error('Lookup error:', error);
      toast.error('Failed to identify drink');
    } finally {
      setIsLookingUp(false);
    }
  };

  const autoLookupRef = useRef(autoLookupFromImage);
  autoLookupRef.current = autoLookupFromImage;

  const handleImageChange = useCallback((url: string | undefined, setImageUrl: (v: string | undefined) => void) => {
    setImageUrl(url);
    if (url) {
      setTimeout(() => {
        autoLookupRef.current(url);
      }, 100);
    }
  }, []);

  const handleLookup = async (useImage = false): Promise<void> => {
    const hasName = name.trim();
    const hasImage = useImage && imageUrl;

    if (!hasName && !hasImage) {
      toast.error('Enter a drink name or add a photo first');
      return;
    }

    impact(ImpactStyle.Light);
    setIsLookingUp(true);
    setLookupInfo(null);

    try {
      const data = await drinkService.lookupDrink({
        drinkName: hasName ? name.trim() : undefined,
        drinkType: type,
        brand: brand.trim() || undefined,
        imageUrl: hasImage ? imageUrl : undefined,
      });

      if (data?.success && data?.data) {
        notification(NotificationType.Success);
        const info = data.data;
        setLookupInfo(info);

        if (useImage) {
          if (info.drinkName && !name.trim()) setName(info.drinkName);
          if (info.drinkBrand && !brand.trim()) setBrand(info.drinkBrand);
          if (info.drinkType && !userSetTypeRef.current) setType(info.drinkType as DrinkType);
        }

        toast.success(useImage ? 'Identified drink from photo!' : 'Found drink information!');
      }
    } catch (error: unknown) {
      console.error('Lookup error:', error);
      toast.error('Failed to look up drink info');
    } finally {
      setIsLookingUp(false);
    }
  };

  const applyLookupInfo = (field: 'notes' | 'price' | 'all'): void => {
    if (!lookupInfo) return;

    if (field === 'notes' || field === 'all') {
      const combinedNotes = [lookupInfo.tastingNotes, lookupInfo.brandInfo, lookupInfo.suggestions]
        .filter(Boolean).join('\n\n');
      if (combinedNotes) setNotes(combinedNotes);
    }

    if (field === 'price' || field === 'all') {
      if (lookupInfo.priceRange) setPrice(lookupInfo.priceRange);
    }

    if (field === 'all') {
      setDetailsOpen(true);
      setLookupInfo(null);
      toast.success('Applied drink info');
    }
  };

  const handleNameBlur = (): void => {
    if (!name.trim() || userSetTypeRef.current) return;
    const detected = detectDrinkType(name);
    if (detected) setType(detected);
  };

  const handleTypeChange = (v: string): void => {
    userSetTypeRef.current = true;
    setType(v as DrinkType);
  };

  return {
    isLookingUp,
    lookupInfo,
    setLookupInfo,
    autoLookupFromImage,
    handleImageChange,
    handleLookup,
    applyLookupInfo,
    handleNameBlur,
    handleTypeChange,
  };
}
