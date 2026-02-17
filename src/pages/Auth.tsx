import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassWater, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

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
  
  const { signIn, signUp, resetPassword, user, isLoading } = useAuth();
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

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
          toast.success('Account created!', { description: 'You have successfully signed up.' });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
