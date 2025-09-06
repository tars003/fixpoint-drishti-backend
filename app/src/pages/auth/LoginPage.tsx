import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import RegistrationForm from '../../components/auth/RegistrationForm';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Phone, Shield } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { sendOTP, login } = useAuth();
  
  // Form states
  const [isLogin, setIsLogin] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOTP] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // UI states
  const [step, setStep] = useState<'phone' | 'registration' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [, setOtpSent] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState<string | null>(null);
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [requiresRegistration, setRequiresRegistration] = useState(false);

  // Handlers
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    // Basic phone validation
    const phoneRegex = /^[+]?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    
    try {
      const result = await sendOTP(phoneNumber, 'login'); // Always start with login attempt
      
      if (result) {
        setOtpSent(true);
        
        // Check if registration is required directly from the response
        if (result.requiresRegistration) {
          setRequiresRegistration(true);
          setStep('registration');
        } else {
          setStep('otp');
        }
        
        // Store OTP for the dialog as backup
        if (result.otp) {
          setGeneratedOTP(result.otp);
        }
      }
    } catch (error) {
      console.error('Send OTP error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp.trim()) {
      toast.error('Please enter the OTP');
      return;
    }

    if (otp.length !== 6) {
      toast.error('OTP must be 6 digits');
      return;
    }

    setLoading(true);
    
    try {
      const purpose = requiresRegistration ? 'registration' : 'login';
      const success = await login(
        phoneNumber, 
        otp, 
        purpose,
        requiresRegistration ? name : undefined,
        requiresRegistration ? email : undefined
      );
      
      if (!success) {
        setOTP(''); // Clear OTP on error
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      setOTP('');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationComplete = (data: {name: string; email: string}) => {
    setName(data.name);
    setEmail(data.email);
    setStep('otp');
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setRequiresRegistration(false);
    setName('');
    setEmail('');
    setOTP('');
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setOTP('');
    
    try {
      const purpose = requiresRegistration ? 'registration' : 'login';
      const result = await sendOTP(phoneNumber, purpose);
      if (result?.otp) {
        setGeneratedOTP(result.otp);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('phone');
    setOTP('');
    setRequiresRegistration(false);
    setName('');
    setEmail('');
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  // Show registration form if needed
  if (step === 'registration') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
        <RegistrationForm
          phoneNumber={phoneNumber}
          onSubmit={handleRegistrationComplete}
          onBack={handleBackToPhone}
          loading={loading}
        />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {step === 'phone' ? (isLogin ? 'Sign In' : 'Create Account') : 'Enter OTP'}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 'phone' 
                ? (isLogin ? 'Welcome back to Drishti Tracker' : 'Join Drishti Tracker today')
                : `We've sent a verification code to ${phoneNumber}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 'phone' && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      className="pl-10"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email (Optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send OTP
                </Button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit code"
                      className="pl-10 text-center text-lg tracking-widest font-mono"
                      value={otp}
                      onChange={(e) => setOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      disabled={loading}
                      maxLength={6}
                      required
                    />
                  </div>
                  <p className="text-sm text-gray-500 text-center">
                    {requiresRegistration 
                      ? `Creating account for ${phoneNumber}` 
                      : `Signing in to ${phoneNumber}`
                    }
                  </p>
                </div>

                <div className="space-y-3">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={loading || otp.length !== 6}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {requiresRegistration ? 'Create Account' : 'Sign In'}
                  </Button>

                  <div className="flex justify-between text-sm">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resetForm}
                      disabled={loading}
                    >
                      ← Back
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleResendOTP}
                      disabled={loading}
                    >
                      Resend OTP
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* Toggle between Login/Register - only show on phone step */}
            {step === 'phone' && (
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-gray-600">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                </p>
                <Button
                  type="button"
                  variant="link"
                  onClick={toggleMode}
                  disabled={loading}
                  className="font-semibold"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Development OTP Dialog */}
      <AlertDialog open={showOTPDialog} onOpenChange={setShowOTPDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>OTP Generated</AlertDialogTitle>
            <AlertDialogDescription>
              For development purposes, your OTP is displayed below. In production, this would be sent via SMS.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="text-center py-4">
            <div className="text-3xl font-mono font-bold text-blue-600 bg-blue-50 rounded-lg p-4">
              {generatedOTP}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowOTPDialog(false)}>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LoginPage;