import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useSocialProfile } from '@/hooks/useSocialProfile';
import { useProfile } from '@/hooks/useProfile';
import { useDebounce } from '@/hooks/useDebounce';

const WelcomeCarousel = lazy(() =>
  import('@/components/WelcomeCarousel').then(mod => ({ default: mod.WelcomeCarousel }))
);
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassWater, Mail, Lock, Loader2, Eye, EyeOff, AtSign, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const emailSchema = z.string().email('Please enter a valid email');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

type AuthMode = 'login' | 'signup' | 'forgot';

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<{ field: 'email' | 'password' | 'general'; message: string } | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [signupStep, setSignupStep] = useState<'auth' | 'carousel' | 'profile-setup'>('auth');

  // Profile setup state
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const { signIn, signUp, resetPassword, user, isLoading } = useAuth();
  const { trackEvent } = useAnalytics();
  const { checkUsernameAvailable } = useSocialProfile();
  const { updateProfile } = useProfile();
  const navigate = useNavigate();

  const debouncedUsername = useDebounce(username, 300);
  const isValidUsernameFormat = /^[a-z0-9_]{3,26}$/.test(username);

  useEffect(() => {
    if (user && signupStep === 'auth') {
      navigate('/');
    }
  }, [user, navigate, signupStep]);

  // Check username availability
  useEffect(() => {
    if (signupStep !== 'profile-setup') return;

    if (debouncedUsername.length < 3 || !isValidUsernameFormat) {
      setIsUsernameAvailable(null);
      return;
    }

    let cancelled = false;
    setIsCheckingUsername(true);

    checkUsernameAvailable(debouncedUsername).then((available) => {
      if (!cancelled) {
        setIsUsernameAvailable(available);
        setIsCheckingUsername(false);
      }
    });

    return () => { cancelled = true; };
  }, [debouncedUsername, signupStep, checkUsernameAvailable, isValidUsernameFormat]);

  const validateForm = (checkPassword = true) => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    if (checkPassword) {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'forgot') {
      if (!validateForm(false)) return;
      
      setIsSubmitting(true);
      try {
        const { error } = await resetPassword(email);
        if (error) {
          toast.error('Reset failed', { description: error.message });
        } else {
          setResetSent(true);
          toast.success('Check your email', { description: 'We sent you a password reset link.' });
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          trackEvent('sign_in_error', 'error', { error: error.message });
          if (error.message.includes('Invalid login credentials')) {
            setServerError({ field: 'password', message: 'Invalid email or password' });
          } else {
            toast.error('Login failed', { description: error.message });
          }
        } else {
          trackEvent('sign_in', 'action', { method: 'email' });
          toast.success('Welcome back!', { description: 'You have successfully logged in.' });
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          trackEvent('sign_up_error', 'error', { error: error.message });
          if (error.message.includes('User already registered')) {
            setServerError({ field: 'email', message: 'An account with this email already exists' });
          } else {
            toast.error('Sign up failed', { description: error.message });
          }
        } else {
          trackEvent('sign_up', 'action', { method: 'email' });
          setSignupStep('carousel');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSetup = async () => {
    if (!isUsernameAvailable || !isValidUsernameFormat) return;

    setIsSavingProfile(true);
    const { error } = await updateProfile({
      username,
      bio: bio.trim() || null,
      isPublic: true,
      activityVisibility: 'followers',
      hasSeenWelcome: true,
    });

    if (error) {
      toast.error('Failed to save profile');
      setIsSavingProfile(false);
      return;
    }

    toast.success('Profile set up successfully!');
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (signupStep === 'carousel') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <WelcomeCarousel onComplete={() => setSignupStep('profile-setup')} />
      </Suspense>
    );
  }

  if (signupStep === 'profile-setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="w-full max-w-md">
          <Card className="gradient-card border-border/50">
            <CardHeader className="text-center">
              <CardTitle className="font-display text-xl">Set up your profile</CardTitle>
              <CardDescription>Choose a username so friends can find you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Username Input */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="drinkexplorer"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    className={cn(
                      "pl-10 pr-10",
                      isUsernameAvailable === true && "border-green-500 focus-visible:ring-green-500",
                      isUsernameAvailable === false && "border-destructive focus-visible:ring-destructive"
                    )}
                    maxLength={26}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingUsername && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {!isCheckingUsername && isUsernameAvailable === true && <Check className="h-4 w-4 text-green-500" />}
                    {!isCheckingUsername && isUsernameAvailable === false && <X className="h-4 w-4 text-destructive" />}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {username.length === 0
                    ? "3-26 characters: letters, numbers, underscores"
                    : username.length < 3
                      ? "Must be at least 3 characters"
                      : !isValidUsernameFormat
                        ? "Only lowercase letters, numbers, and underscores"
                        : isCheckingUsername
                          ? "Checking availability..."
                          : isUsernameAvailable === false
                            ? "This username is taken"
                            : isUsernameAvailable === true
                              ? "Username is available!"
                              : ""}
                </p>
              </div>

              {/* Bio Input */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio (optional)</Label>
                <Textarea
                  id="bio"
                  placeholder="Wine lover, craft beer enthusiast..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={160}
                  autoCapitalize="sentences"
                  enterKeyHint="done"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {bio.length}/160
                </p>
              </div>

              <Button
                variant="glow"
                className="w-full"
                onClick={handleProfileSetup}
                disabled={!isUsernameAvailable || !isValidUsernameFormat || isSavingProfile}
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow mb-4">
            <GlassWater className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Pour Decisions
          </h1>
          <p className="text-muted-foreground mt-1">Track your favorite drinks</p>
        </div>

        <Card className="gradient-card border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-xl">
              {mode === 'login' ? 'Welcome' : mode === 'signup' ? 'Create an account' : 'Reset password'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Sign in to access your drink collection'
                : mode === 'signup'
                ? 'Sign up to start tracking your drinks'
                : 'Enter your email to receive a reset link'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === 'forgot' && resetSent ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  Check your email for a password reset link.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMode('login');
                    setResetSent(false);
                    setEmail('');
                  }}
                >
                  Back to login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setServerError(null); }}
                      className="pl-10"
                      autoComplete="email"
                      autoCorrect="off"
                      autoCapitalize="off"
                      enterKeyHint={mode === 'forgot' ? 'go' : 'next'}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                  {serverError?.field === 'email' && (
                    <p className="text-sm text-destructive">{serverError.message}</p>
                  )}
                </div>

                {mode !== 'forgot' && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setServerError(null); }}
                        className="pl-10 pr-10"
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        enterKeyHint="go"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                    {serverError?.field === 'password' && (
                      <p className="text-sm text-destructive">{serverError.message}</p>
                    )}
                  </div>
                )}

                {mode === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrors({});
                      }}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="glow"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {mode === 'login' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending...'}
                    </>
                  ) : (
                    mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center space-y-2">
              {mode === 'forgot' && !resetSent ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrors({});
                    setServerError(null);
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Back to login
                </button>
              ) : mode !== 'forgot' && (
                <>
                  <div className="flex items-center gap-3 my-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-sm text-muted-foreground">or</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setMode(mode === 'login' ? 'signup' : 'login');
                      setErrors({});
                      setServerError(null);
                    }}
                  >
                    {mode === 'login' ? 'Create an account' : 'Sign in instead'}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
