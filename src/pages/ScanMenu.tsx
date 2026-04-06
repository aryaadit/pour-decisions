import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/PageHeader';
import {
  Camera,
  ImagePlus,
  Upload,
  Loader2,
  ScanLine,
  RotateCcw,
  Trophy,
  Users,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { takePhoto, pickFromGallery } from '@/hooks/useCamera';
import { useAuth } from '@/hooks/useAuth';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface MenuDrink {
  name: string;
  type: string;
  price: string | null;
}

interface Recommendation {
  name: string;
  rank: number;
  reason: string;
  matchScore: 'high' | 'medium' | 'low';
  networkRating: number | null;
}

interface ScanResult {
  drinks: MenuDrink[];
  recommendations: Recommendation[];
  tasteProfileUsed: boolean;
  drinkCount: number;
  generalNote: string | null;
}

const MATCH_COLORS: Record<string, string> = {
  high: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-muted text-muted-foreground border-border',
};

type DrinkTypeFilter = 'All' | 'Wine' | 'Whiskey' | 'Beer' | 'Cocktail' | 'Other';
const DRINK_TYPE_FILTERS: DrinkTypeFilter[] = ['All', 'Wine', 'Whiskey', 'Beer', 'Cocktail', 'Other'];

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_PDF_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const IMAGE_TOO_LARGE_MESSAGE = 'Image too large. Please use an image under 5MB.';
const PDF_TOO_LARGE_MESSAGE = 'PDF too large. Please use a PDF under 2MB (roughly 10 pages).';

/** Approximate raw byte size of a base64 string (ignoring padding slop). */
function base64Bytes(base64: string): number {
  // 4 base64 chars = 3 bytes
  return Math.floor((base64.length * 3) / 4);
}

function ReasonText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <p
        className={cn(
          'text-sm text-muted-foreground leading-relaxed',
          !expanded && 'line-clamp-2'
        )}
      >
        {text}
      </p>
      {text.length > 120 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary mt-0.5"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

export default function ScanMenu() {
  const { user } = useAuth();
  const { impact, ImpactStyle } = useHaptics();
  const isNative = Capacitor.isNativePlatform();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadMimeType, setUploadMimeType] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [menuText, setMenuText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [selectedType, setSelectedType] = useState<DrinkTypeFilter>('All');
  const [appliedMaxPrice, setAppliedMaxPrice] = useState<number | null>(null);
  const [appliedType, setAppliedType] = useState<DrinkTypeFilter>('All');

  const handlePhotoCapture = async (dataUrl: string, mimeType: string) => {
    const base64 = dataUrl.split(',')[1];
    if (base64Bytes(base64) > MAX_IMAGE_SIZE_BYTES) {
      setError(IMAGE_TOO_LARGE_MESSAGE);
      return;
    }
    setImagePreview(dataUrl);
    setImageBase64(base64);
    setUploadMimeType(mimeType);
    setPdfFileName(null);
    setError(null);
    setResult(null);
  };

  const handleTakePhoto = async () => {
    impact(ImpactStyle.Light);
    try {
      const photo = await takePhoto();
      if (photo) {
        handlePhotoCapture(photo.dataUrl, photo.dataUrl.match(/^data:([^;]+);/)?.[1] || 'image/jpeg');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to take photo');
    }
  };

  const handlePickFromGallery = async () => {
    impact(ImpactStyle.Light);
    try {
      const photo = await pickFromGallery();
      if (photo) {
        handlePhotoCapture(photo.dataUrl, photo.dataUrl.match(/^data:([^;]+);/)?.[1] || 'image/jpeg');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to access photos');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf';
    const limit = isPdf ? MAX_PDF_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    if (file.size > limit) {
      setError(isPdf ? PDF_TOO_LARGE_MESSAGE : IMAGE_TOO_LARGE_MESSAGE);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setImageBase64(base64);
      setUploadMimeType(file.type || (isPdf ? 'application/pdf' : 'image/jpeg'));
      if (isPdf) {
        setPdfFileName(file.name);
        setImagePreview(null);
      } else {
        setImagePreview(dataUrl);
        setPdfFileName(null);
      }
      setError(null);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PDF_SIZE_BYTES) {
      setError(PDF_TOO_LARGE_MESSAGE);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setImageBase64(base64);
      setUploadMimeType('application/pdf');
      setPdfFileName(file.name);
      setImagePreview(null);
      setError(null);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setImageBase64(null);
    setImagePreview(null);
    setUploadMimeType(null);
    setPdfFileName(null);
    setMenuText('');
    setResult(null);
    setError(null);
    setShowTextInput(false);
    setMaxPrice('');
    setSelectedType('All');
    setAppliedMaxPrice(null);
    setAppliedType('All');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!user) return;
    if (!imageBase64 && !menuText.trim()) return;

    impact(ImpactStyle.Medium);
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    const parsedPrice = maxPrice.trim() ? Number(maxPrice.trim()) : null;
    const priceArg = typeof parsedPrice === 'number' && !isNaN(parsedPrice) && parsedPrice > 0
      ? parsedPrice
      : null;
    const typeArg = selectedType === 'All' ? null : selectedType.toLowerCase();

    try {
      const { data, error: fnError } = await supabase.functions.invoke('scan-menu', {
        body: {
          image: imageBase64 || undefined,
          mimeType: imageBase64 ? uploadMimeType || undefined : undefined,
          menuText: menuText.trim() || undefined,
          maxPrice: priceArg,
          drinkType: typeArg,
        },
      });

      if (fnError) {
        throw new Error(data?.error || fnError.message || 'Failed to analyze menu');
      }

      if (data?.success && data?.data) {
        setResult(data.data as ScanResult);
        setAppliedMaxPrice(priceArg);
        setAppliedType(selectedType);
      } else {
        setError(data?.error || 'Failed to analyze menu');
      }
    } catch (err: any) {
      console.error('Scan menu error:', err);
      setError(err?.message || 'Failed to analyze menu. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPersonalizationLabel = (): string => {
    if (!result) return '';
    if (!result.tasteProfileUsed) return 'General recommendations';
    if (result.drinkCount >= 15) return `Personalized from ${result.drinkCount} drinks`;
    return `Based on your ${result.drinkCount} logged drinks`;
  };

  const findPrice = (recName: string): string | null => {
    if (!result) return null;
    const match = result.drinks.find(
      (d) => d.name.toLowerCase() === recName.toLowerCase()
    );
    return match?.price || null;
  };

  // Results view
  if (result) {
    // Check if all menu drinks share the same type
    const allTypes = result.drinks.map((d) => d.type);
    const uniqueTypes = new Set(allTypes);
    const showDrinkType = uniqueTypes.size > 1;

    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader
          title="Menu Picks"
          icon={<ScanLine className="h-5 w-5" />}
          showBack={true}
        />

        <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Personalization tier */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="w-4 h-4" />
            <span>{getPersonalizationLabel()}</span>
          </div>

          {/* Active filters */}
          {(appliedMaxPrice != null || appliedType !== 'All') && (
            <div className="flex flex-wrap gap-2">
              {appliedMaxPrice != null && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Under ${appliedMaxPrice}
                </span>
              )}
              {appliedType !== 'All' && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {appliedType} only
                </span>
              )}
            </div>
          )}

          {result.generalNote && (
            <p className="text-xs text-muted-foreground italic">{result.generalNote}</p>
          )}

          {/* Recommendations */}
          <div className="space-y-3">
            {result.recommendations
              .sort((a, b) => a.rank - b.rank)
              .map((rec) => {
                const price = findPrice(rec.name);
                return (
                  <div
                    key={rec.rank}
                    className="rounded-xl border border-border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                          {rec.rank}
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2">
                            <h3 className="font-semibold text-foreground">{rec.name}</h3>
                            {price && (
                              <span className="text-sm text-muted-foreground">{price}</span>
                            )}
                          </div>
                          {rec.networkRating != null && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Users className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {rec.networkRating.toFixed(1)}/5 from your network
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0',
                          MATCH_COLORS[rec.matchScore]
                        )}
                      >
                        {rec.matchScore}
                      </span>
                    </div>
                    <ReasonText text={rec.reason} />
                  </div>
                );
              })}
          </div>

          {/* Full menu extract */}
          {result.drinks.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Full menu &middot; {result.drinks.length} drinks
              </h3>
              <div className="rounded-xl border border-border bg-card divide-y divide-border">
                {result.drinks.map((drink, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <span className="text-sm text-foreground">{drink.name}</span>
                      {showDrinkType && (
                        <span className="text-xs text-muted-foreground ml-2">{drink.type}</span>
                      )}
                    </div>
                    {drink.price && (
                      <span className="text-sm text-muted-foreground">{drink.price}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scan another */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleReset}
          >
            <ScanLine className="w-4 h-4 mr-2" />
            Scan Another Menu
          </Button>
        </main>
      </div>
    );
  }

  // Input view
  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Scan Menu"
        icon={<ScanLine className="h-5 w-5" />}
        showBack={true}
      />

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-2">
        {/* Image or PDF preview */}
        {imagePreview ? (
          <div className="relative w-full rounded-xl overflow-hidden border border-border bg-muted">
            <img
              src={imagePreview}
              alt="Menu photo"
              className="w-full max-h-64 object-contain"
            />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
                <span className="text-sm font-medium text-white">Analyzing menu...</span>
              </div>
            )}
            {!isAnalyzing && (
              <button
                type="button"
                onClick={handleReset}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : pdfFileName ? (
          <div className="relative w-full rounded-xl overflow-hidden border border-border bg-muted">
            <div className="flex items-center gap-3 px-4 py-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{pdfFileName}</p>
                <p className="text-xs text-muted-foreground">PDF menu</p>
              </div>
            </div>
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
                <span className="text-sm font-medium text-white">Analyzing menu...</span>
              </div>
            )}
            {!isAnalyzing && (
              <button
                type="button"
                onClick={handleReset}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : !showTextInput ? (
          <div className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors bg-muted/30">
            <div className="flex flex-col items-center justify-center gap-3 py-8 px-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ScanLine className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Take a photo of a drink menu
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => pdfInputRef.current?.click()}
                      className="gap-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      Upload PDF
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
                    Upload Photo or PDF
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                AI will read the menu and give you personalized picks
              </p>
              <p className="text-xs text-muted-foreground/60 text-center">
                PDFs under 2MB / ~10 pages work best
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              onChange={handlePdfUpload}
              className="hidden"
            />
          </div>
        ) : null}

        {/* Text input toggle */}
        {!imagePreview && !showTextInput && (
          <button
            type="button"
            onClick={() => setShowTextInput(true)}
            className="text-sm text-muted-foreground hover:text-primary transition-colors w-full text-center"
          >
            Enter text instead
          </button>
        )}

        {showTextInput && (
          <div className="space-y-2">
            <Textarea
              value={menuText}
              onChange={(e) => setMenuText(e.target.value)}
              placeholder="Paste or type the menu items here..."
              rows={6}
              className="bg-secondary/50 text-base"
            />
            <button
              type="button"
              onClick={() => {
                setShowTextInput(false);
                setMenuText('');
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Use camera instead
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="space-y-3 mt-4">
          <div className="space-y-1.5">
            <label htmlFor="max-price" className="text-sm text-muted-foreground">
              Max price per drink
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="max-price"
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="e.g. 50"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="pl-7 bg-secondary/50 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm text-muted-foreground">Drink type</span>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
              {DRINK_TYPE_FILTERS.map((t) => {
                const active = selectedType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      impact(ImpactStyle.Light);
                      setSelectedType(t);
                    }}
                    className={cn(
                      'flex-shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary/50 text-muted-foreground border-border hover:text-foreground'
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 mt-4">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Analyze button */}
        <Button
          className="w-full h-12 mt-4"
          onClick={handleAnalyze}
          disabled={isAnalyzing || (!imageBase64 && !menuText.trim())}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <ScanLine className="w-4 h-4 mr-2" />
              Get Recommendations
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Works with wine lists, whiskey menus, cocktail menus, and bottle shop shelves
        </p>
      </main>
    </div>
  );
}
