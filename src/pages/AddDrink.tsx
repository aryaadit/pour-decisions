import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Drink, DrinkType, builtInDrinkTypes, drinkTypeLabels, drinkTypeIcons, isBuiltInDrinkType } from '@/types/drink';
import { StarRating } from '@/components/StarRating';
import { StorageImage } from '@/components/StorageImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHaptics } from '@/hooks/useHaptics';
import { useDrinks } from '@/hooks/useDrinks';
import { useCustomDrinkTypes } from '@/hooks/useCustomDrinkTypes';
import { Camera, X, Loader2, ImagePlus, Search, Sparkles, ChevronDown, ChevronLeft } from 'lucide-react';
import { takePhoto, pickFromGallery, dataUrlToBlob } from '@/hooks/useCamera';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

export default function AddDrink() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const defaultTypeParam = searchParams.get('type') as DrinkType | null;
  
  const { user } = useAuth();
  const { drinks, addDrink, updateDrink } = useDrinks();
  const { impact, notification, ImpactStyle, NotificationType } = useHaptics();
  const { customTypes } = useCustomDrinkTypes();
  
  const [name, setName] = useState('');
  const [type, setType] = useState<DrinkType>(defaultTypeParam || 'whiskey');
  const [brand, setBrand] = useState('');
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lookupInfo, setLookupInfo] = useState<{
    tastingNotes?: string | null;
    brandInfo?: string | null;
    priceRange?: string | null;
    suggestions?: string | null;
  } | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load edit drink data
  useEffect(() => {
    if (editId && drinks) {
      const editDrink = drinks.find(d => d.id === editId);
      if (editDrink) {
        setName(editDrink.name);
        setType(editDrink.type);
        setBrand(editDrink.brand || '');
        setRating(editDrink.rating);
        setNotes(editDrink.notes || '');
        setLocation(editDrink.location || '');
        setPrice(editDrink.price || '');
        setImageUrl(editDrink.imageUrl);
        setDetailsOpen(!!(editDrink.brand || editDrink.notes || editDrink.location || editDrink.price));
      }
    }
  }, [editId, drinks]);

  const handleLookup = async (useImage = false) => {
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
      const { data, error } = await supabase.functions.invoke('lookup-drink', {
        body: { 
          drinkName: hasName ? name.trim() : undefined, 
          drinkType: type, 
          brand: brand.trim() || undefined,
          imageUrl: hasImage ? imageUrl : undefined
        }
      });

      if (error) {
        console.error('Lookup error:', error);
        toast.error('Failed to look up drink info');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.success && data?.data) {
        notification(NotificationType.Success);
        const info = data.data;
        setLookupInfo(info);
        
        if (useImage) {
          if (info.drinkName && !name.trim()) {
            setName(info.drinkName);
          }
          if (info.drinkBrand && !brand.trim()) {
            setBrand(info.drinkBrand);
          }
          if (info.drinkType) {
            setType(info.drinkType);
          }
        }
        
        toast.success(useImage ? 'Identified drink from photo!' : 'Found drink information!');
      }
    } catch (err) {
      console.error('Lookup error:', err);
      toast.error('Failed to look up drink info');
    } finally {
      setIsLookingUp(false);
    }
  };

  const applyLookupInfo = (field: 'notes' | 'price' | 'all') => {
    impact(ImpactStyle.Light);
    if (!lookupInfo) return;
    
    if (field === 'notes' || field === 'all') {
      const combinedNotes = [
        lookupInfo.tastingNotes,
        lookupInfo.brandInfo,
        lookupInfo.suggestions
      ].filter(Boolean).join('\n\n');
      if (combinedNotes) setNotes(combinedNotes);
    }
    
    if (field === 'price' || field === 'all') {
      if (lookupInfo.priceRange) setPrice(lookupInfo.priceRange);
    }
    
    if (field === 'all') {
      setLookupInfo(null);
      toast.success('Applied drink info');
    }
  };

  const uploadFile = async (file: File | Blob) => {
    if (!user) return;
    
    setIsUploading(true);
    const fileExt = file instanceof File ? file.name.split('.').pop() : 'jpg';
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('drink-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      setIsUploading(false);
      return;
    }

    // Store the path in format "bucket/path" for signed URL generation
    const storagePath = `drink-images/${filePath}`;

    setImageUrl(storagePath);
    setIsUploading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    await uploadFile(file);
  };

  const handleTakePhoto = async () => {
    impact(ImpactStyle.Light);
    try {
      const photo = await takePhoto();
      if (photo) {
        const blob = dataUrlToBlob(photo.dataUrl);
        await uploadFile(blob);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      toast.error(error?.message || 'Failed to take photo. Please check camera permissions.');
    }
  };

  const handlePickFromGallery = async () => {
    impact(ImpactStyle.Light);
    try {
      const photo = await pickFromGallery();
      if (photo) {
        const blob = dataUrlToBlob(photo.dataUrl);
        await uploadFile(blob);
      }
    } catch (error: any) {
      console.error('Gallery error:', error);
      toast.error(error?.message || 'Failed to access photos. Please check photo library permissions.');
    }
  };

  const removeImage = () => {
    setImageUrl(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isNative = Capacitor.isNativePlatform();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    notification(NotificationType.Success);

    const drinkData = {
      name: name.trim(),
      type,
      brand: brand.trim() || undefined,
      rating,
      notes: notes.trim() || undefined,
      location: location.trim() || undefined,
      price: price.trim() || undefined,
      imageUrl,
    };

    try {
      if (editId) {
        await updateDrink(editId, drinkData);
        toast.success('Drink updated');
        navigate(-1);
      } else {
        const result = await addDrink(drinkData);
        
        if (result && 'isDuplicate' in result && result.isDuplicate) {
          toast.error('This drink already exists in your collection', {
            description: 'You can edit the existing drink or use a different name.',
            duration: 5000,
          });
          setIsSaving(false);
          return;
        }
        
        toast.success('Drink added');
        navigate(-1);
      }
    } catch (error) {
      console.error('Error saving drink:', error);
      toast.error('Failed to save drink');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    impact(ImpactStyle.Light);
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border safe-area-inset-top">
        <div className="flex items-center justify-between px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="min-w-[44px] min-h-[44px]"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-semibold">
            {editId ? 'Edit Drink' : 'Add Drink'}
          </h1>
          <div className="w-11" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
        <div className="p-4 space-y-5">
          {/* Name with Photo */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <div className="flex gap-2 items-center">
              {imageUrl ? (
                <div className="relative flex-shrink-0">
                  <StorageImage
                    storagePath={imageUrl}
                    alt="Drink preview"
                    className="w-12 h-12 object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : isNative ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={isUploading}
                      className="w-12 h-12 flex-shrink-0 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-popover z-[60]">
                    <DropdownMenuItem onClick={handleTakePhoto} className="min-h-[44px]">
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePickFromGallery} className="min-h-[44px]">
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
                  className="w-12 h-12 flex-shrink-0 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
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
              
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Lagavulin 16"
                required
                className="bg-secondary/50 flex-1 h-12 text-base"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleLookup(!!imageUrl)}
                disabled={isLookingUp || (!name.trim() && !imageUrl)}
                title={imageUrl ? "Identify drink from photo" : "Look up drink info"}
                className="min-w-[44px] min-h-[44px]"
              >
                {isLookingUp ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : imageUrl ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as DrinkType)}>
              <SelectTrigger className="bg-secondary/50 h-12">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <span>{isBuiltInDrinkType(type) ? drinkTypeIcons[type] : (customTypes.find(c => c.name === type)?.icon || '🍹')}</span>
                    <span>{isBuiltInDrinkType(type) ? drinkTypeLabels[type] : type}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {builtInDrinkTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="flex items-center gap-2">
                      <span>{drinkTypeIcons[t]}</span>
                      <span>{drinkTypeLabels[t]}</span>
                    </span>
                  </SelectItem>
                ))}
                {customTypes.map((ct) => (
                  <SelectItem key={ct.id} value={ct.name}>
                    <span className="flex items-center gap-2">
                      <span>{ct.icon}</span>
                      <span>{ct.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="pt-1">
              <StarRating rating={rating} onChange={setRating} size="lg" />
            </div>
          </div>

          {/* Lookup Results */}
          {lookupInfo && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Sparkles className="w-4 h-4" />
                  Found Info
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => applyLookupInfo('all')}
                  className="text-xs h-8 min-h-[44px]"
                >
                  Apply All
                </Button>
              </div>
              {lookupInfo.tastingNotes && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  <strong>Taste:</strong> {lookupInfo.tastingNotes}
                </p>
              )}
              {lookupInfo.priceRange && (
                <p className="text-sm text-muted-foreground">
                  <strong>Price:</strong> {lookupInfo.priceRange}
                </p>
              )}
            </div>
          )}

          {/* Collapsible More Details */}
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-3 min-h-[44px]"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
                <span>{detailsOpen ? 'Less details' : 'More details'}</span>
                {!detailsOpen && (brand || notes || location || price) && (
                  <span className="text-xs text-primary">(has data)</span>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand / Producer</Label>
                <Input
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g., Lagavulin, The Alchemist"
                  className="bg-secondary/50 h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Tasting Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What did you like about it? Flavor profile, aromas..."
                  rows={3}
                  className="bg-secondary/50 resize-none text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where did you have it?"
                  className="bg-secondary/50 h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g., $45, $$"
                  className="bg-secondary/50 h-12 text-base"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-background border-t border-border p-4 safe-area-inset-bottom">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="flex-1 h-12"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="glow"
              className="flex-1 h-12"
              disabled={!name.trim() || isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editId ? 'Save Changes' : 'Add Drink'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
