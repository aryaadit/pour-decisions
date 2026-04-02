import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-muted text-muted-foreground border-border',
};

export default function ScanMenu() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { impact, ImpactStyle } = useHaptics();
  const isNative = Capacitor.isNativePlatform();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [menuText, setMenuText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoCapture = async (dataUrl: string) => {
    setImagePreview(dataUrl);
    // Extract base64 from data URL
    const base64 = dataUrl.split(',')[1];
    setImageBase64(base64);
    setError(null);
    setResult(null);
  };

  const handleTakePhoto = async () => {
    impact(ImpactStyle.Light);
    try {
      const photo = await takePhoto();
      if (photo) {
        handlePhotoCapture(photo.dataUrl);
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
        handlePhotoCapture(photo.dataUrl);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to access photos');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      handlePhotoCapture(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setImageBase64(null);
    setImagePreview(null);
    setMenuText('');
    setResult(null);
    setError(null);
    setShowTextInput(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!user) return;
    if (!imageBase64 && !menuText.trim()) return;

    impact(ImpactStyle.Medium);
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('scan-menu', {
        body: {
          image: imageBase64 || undefined,
          menuText: menuText.trim() || undefined,
        },
      });

      if (fnError) {
        throw new Error(data?.error || fnError.message || 'Failed to analyze menu');
      }

      if (data?.success && data?.data) {
        setResult(data.data as ScanResult);
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

  // Results view
  if (result) {
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

          {result.generalNote && (
            <p className="text-xs text-muted-foreground italic">{result.generalNote}</p>
          )}

          {/* Recommendations */}
          <div className="space-y-3">
            {result.recommendations
              .sort((a, b) => a.rank - b.rank)
              .map((rec) => (
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
                        <h3 className="font-semibold text-foreground">{rec.name}</h3>
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
                        'text-xs font-medium px-2 py-0.5 rounded-full border',
                        MATCH_COLORS[rec.matchScore]
                      )}
                    >
                      {rec.matchScore}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {rec.reason}
                  </p>
                </div>
              ))}
          </div>

          {/* Full menu extract */}
          {result.drinks.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Full Menu ({result.drinks.length} drinks)
              </h3>
              <div className="rounded-xl border border-border bg-card divide-y divide-border">
                {result.drinks.map((drink, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <span className="text-sm text-foreground">{drink.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{drink.type}</span>
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

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Image capture area */}
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
        ) : !showTextInput ? (
          <div className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors bg-muted/30">
            <div className="flex flex-col items-center justify-center gap-3 py-8 px-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ScanLine className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Take a photo of a drink menu
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
              <p className="text-xs text-muted-foreground text-center">
                AI will read the menu and give you personalized picks
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
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

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Analyze button */}
        <Button
          className="w-full h-12"
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
      </main>
    </div>
  );
}
