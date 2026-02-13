import { useState } from 'react';
import { Wine, Star, FolderHeart, Users, Sparkles, Copy, Check, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const SHORT_DESCRIPTION = "Your personal drink journal. Track, rate & discover your favorite drinks.";

const FULL_DESCRIPTION = `Pour Decisions is the ultimate companion for drink enthusiasts. Whether you're a whiskey connoisseur, wine lover, or craft beer explorer, build a curated library of every pour.

🥃 LOG WITH DETAIL
Save ratings (1-5 stars), tasting notes, prices, and locations for every drink you try. Never forget that amazing whiskey you had on vacation.

📚 STAY ORGANIZED
Create custom collections to group your drinks for any occasion—"Summer Favorites," "Gift Ideas," "Date Night Picks," or "Bucket List Bottles."

💫 WISHLIST
Keep track of bottles you want to try with the built-in Wishlist. Spot something at a bar or store? Add it instantly for later.

👥 SOCIAL DISCOVERY
Follow friends to see their latest ratings and discoveries. Your feed shows what people in your circle are drinking.

🔗 COMPARE & DISCOVER
See how your palate overlaps with friends. Find trending drinks in your network and get personalized recommendations based on what similar tastes have loved.

🎨 PERSONALIZED EXPERIENCE
Custom drink types with your own colors and icons. Light and dark themes. Make it yours.

DRINK TYPES SUPPORTED:
• Whiskey & Bourbon
• Wine (Red, White, Rosé, Sparkling)
• Beer & Craft Brews
• Cocktails & Mixed Drinks
• Spirits (Vodka, Gin, Rum, Tequila)
• And any custom type you create!

Download Pour Decisions today and never lose track of a great drink again.`;

const FEATURES = [
  {
    icon: Wine,
    title: "Detailed Logging",
    description: "Rate drinks 1-5 stars, add tasting notes, prices, brands, and where you found them."
  },
  {
    icon: FolderHeart,
    title: "Custom Collections",
    description: "Organize drinks into themed groups. Built-in Wishlist tracks bottles you want to try."
  },
  {
    icon: Users,
    title: "Social Discovery",
    description: "Follow friends, see their ratings, and discover trending drinks in your circle."
  },
  {
    icon: Sparkles,
    title: "Smart Recommendations",
    description: "Compare tastes with friends and get personalized suggestions based on your network."
  }
];

const SCREENSHOTS = [
  { id: 1, title: "Home Library", description: "Browse your personal drink collection" },
  { id: 2, title: "Add a Drink", description: "Log details, ratings, and notes" },
  { id: 3, title: "Collections", description: "Organize into custom groups" },
  { id: 4, title: "Social Feed", description: "See what friends are drinking" },
  { id: 5, title: "Profile Stats", description: "Track your drinking journey" },
];

const STORE_INFO = {
  category: "Food & Drink",
  contentRating: "Teen (Alcohol Reference)",
  tags: ["Drink Tracker", "Wine Journal", "Whiskey Log", "Beer Diary", "Cocktail App", "Social", "Collection Manager"],
};

export default function StoreListing() {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [currentScreenshot, setCurrentScreenshot] = useState(0);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const nextScreenshot = () => {
    setCurrentScreenshot((prev) => (prev + 1) % SCREENSHOTS.length);
  };

  const prevScreenshot = () => {
    setCurrentScreenshot((prev) => (prev - 1 + SCREENSHOTS.length) % SCREENSHOTS.length);
  };

  return (
      <div className="min-h-screen bg-background pb-8">
        {/* Header */}
        <div className="bg-gradient-to-b from-primary/20 to-background pt-[env(safe-area-inset-top)] pb-8">
          <div className="max-w-4xl mx-auto px-4 pt-6">
            <Badge variant="secondary" className="mb-4">Google Play Store Assets</Badge>
            <div className="flex items-center gap-4">
              <img 
                src="/app-icon.png" 
                alt="Pour Decisions" 
                className="w-20 h-20 rounded-2xl shadow-lg"
              />
              <div>
                <h1 className="font-display text-2xl font-bold">Pour Decisions</h1>
                <p className="text-muted-foreground">Your Personal Drink Journal</p>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-sm text-muted-foreground ml-1">5.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 space-y-6">
          {/* Quick Info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{STORE_INFO.category}</Badge>
            <Badge variant="outline">{STORE_INFO.contentRating}</Badge>
          </div>

          <Tabs defaultValue="copy" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="copy">Store Copy</TabsTrigger>
              <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>

            {/* Store Copy Tab */}
            <TabsContent value="copy" className="space-y-6 mt-6">
              {/* Short Description */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Short Description</CardTitle>
                    <Badge variant="secondary">{SHORT_DESCRIPTION.length}/80 chars</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground mb-3">{SHORT_DESCRIPTION}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(SHORT_DESCRIPTION, 'short')}
                  >
                    {copiedField === 'short' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    Copy
                  </Button>
                </CardContent>
              </Card>

              {/* Full Description */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Full Description</CardTitle>
                    <Badge variant="secondary">{FULL_DESCRIPTION.length}/4000 chars</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-foreground text-sm whitespace-pre-wrap font-sans mb-3 max-h-64 overflow-y-auto">
                    {FULL_DESCRIPTION}
                  </pre>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(FULL_DESCRIPTION, 'full')}
                  >
                    {copiedField === 'full' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    Copy
                  </Button>
                </CardContent>
              </Card>

              {/* Feature Bullets */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Key Features</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {FEATURES.map((feature) => (
                    <div key={feature.title} className="flex gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <feature.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{feature.title}</h3>
                        <p className="text-muted-foreground text-xs">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Screenshots Tab */}
            <TabsContent value="screenshots" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">App Screenshots</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Take these screenshots from your device and upload to Play Console
                  </p>
                </CardHeader>
                <CardContent>
                  {/* Screenshot Carousel */}
                  <div className="relative">
                    <div className="aspect-[9/19] max-w-[280px] mx-auto bg-muted rounded-3xl border-4 border-foreground/10 overflow-hidden shadow-xl">
                      <div className="h-full flex items-center justify-center p-4">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                            <Wine className="w-8 h-8 text-primary" />
                          </div>
                          <h3 className="font-semibold mb-1">{SCREENSHOTS[currentScreenshot].title}</h3>
                          <p className="text-sm text-muted-foreground">{SCREENSHOTS[currentScreenshot].description}</p>
                          <p className="text-xs text-muted-foreground mt-4">
                            Screenshot {currentScreenshot + 1} of {SCREENSHOTS.length}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Navigation */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute left-0 top-1/2 -translate-y-1/2"
                      onClick={prevScreenshot}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-0 top-1/2 -translate-y-1/2"
                      onClick={nextScreenshot}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  </div>

                  {/* Screenshot dots */}
                  <div className="flex justify-center gap-2 mt-4">
                    {SCREENSHOTS.map((_, idx) => (
                      <button
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentScreenshot ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                        onClick={() => setCurrentScreenshot(idx)}
                      />
                    ))}
                  </div>

                  {/* Instructions */}
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">📱 How to capture screenshots:</h4>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Run the app on your phone or emulator</li>
                      <li>Navigate to each screen listed above</li>
                      <li>Add sample data for realistic screenshots</li>
                      <li>Capture at 1080x1920 or higher resolution</li>
                      <li>Upload 2-8 screenshots to Play Console</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              {/* Graphic Assets */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Graphic Assets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-1">App Icon</h4>
                      <p className="text-xs text-muted-foreground mb-3">512x512 PNG, 32-bit</p>
                      <a href="/app-icon-1024.png" download className="inline-block">
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download Icon
                        </Button>
                      </a>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-1">Feature Graphic</h4>
                      <p className="text-xs text-muted-foreground mb-3">1024x500 PNG/JPG</p>
                      <p className="text-xs text-amber-500">Create in design tool with app branding</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Metadata Tab */}
            <TabsContent value="metadata" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Store Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">App Name</label>
                      <p className="font-medium">Pour Decisions</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Package Name</label>
                      <p className="font-mono text-sm">com.pourdecisions.barkeeply</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Category</label>
                      <p>{STORE_INFO.category}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Content Rating</label>
                      <p>{STORE_INFO.contentRating}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Keywords / Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {STORE_INFO.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(STORE_INFO.tags.join(', '), 'tags')}
                  >
                    {copiedField === 'tags' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    Copy Tags
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Privacy Policy URL</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    Required for apps with user accounts. Create a privacy policy and host it at:
                  </p>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    https://barkeeply.lovable.app/privacy
                  </code>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
  );
}
