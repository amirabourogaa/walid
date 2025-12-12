import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authService } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, FileText, Smartphone, Monitor } from 'lucide-react';
import heroImage from '@/assets/visa-background.png';
import logo from '@/assets/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user is already logged in
    if (authService.isAuthenticated()) {
      const user = authService.getCurrentUser();
      if (user?.role === 'admin' || user?.role === 'manager' || user?.role === 'employee') {
        navigate('/manager');
      } else {
        navigate('/client');
      }
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const user = await authService.login(email, password);
      
      // Redirect based on role
      if (user.role === 'admin' || user.role === 'manager' || user.role === 'employee') {
        navigate('/manager');
      } else {
        navigate('/client');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message?.includes('Invalid login credentials')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else {
        setError(err.message || 'خطأ في تسجيل الدخول');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      setLoading(false);
      return;
    }

    try {
      await authService.signup(email, password, {
        firstName,
        lastName,
        role: 'client'
      });
      
      // Send notification email
      try {
        await supabase.functions.invoke('notify-new-user', {
          body: {
            email,
            firstName,
            lastName,
            role: 'client'
          }
        });
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
      }
      
      setSuccess('تم إنشاء الحساب بنجاح! سيتم مراجعة طلبك وستتمكن من تسجيل الدخول بعد الموافقة.');
      // Reset form
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setConfirmPassword('');
      
      // Switch to login tab after 3 seconds
      setTimeout(() => {
        const loginTab = document.querySelector('[value="login"]') as HTMLElement;
        loginTab?.click();
      }, 3000);
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err.message?.includes('already registered')) {
        setError('هذا البريد الإلكتروني مسجل بالفعل');
      } else {
        setError(err.message || 'خطأ في إنشاء الحساب');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="grid lg:grid-cols-2 min-h-screen">
        {/* Hero Section */}
        <div 
          className="hidden lg:flex flex-col justify-center items-center p-12 text-white relative"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(30, 64, 175, 0.9), rgba(245, 158, 11, 0.8)), url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="max-w-lg text-center space-y-8 animate-fade-in">
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4 space-x-reverse">
                <div className="w-20 h-20 flex items-center justify-center bg-white/10 rounded-xl backdrop-blur-sm p-2">
                  <img src={logo} alt="شركة تونس للإستشارات والمساعدة" className="w-full h-full object-contain" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl font-bold font-arabic mb-1">شركة تونس للإستشارات والمساعدة</h1>
                </div>
              </div>
              <p className="text-xl text-white/90 font-arabic text-center">
                حلول و خدمات متنوعة في التأشيرات و التجارة الدولية
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center space-y-3">
                  <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm mx-auto w-fit">
                    <Monitor className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold font-arabic">واجهة المدير</h3>
                    <p className="text-sm text-white/80 font-arabic">ويب وموبايل</p>
                  </div>
                </div>
                <div className="text-center space-y-3">
                  <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm mx-auto w-fit">
                    <Smartphone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold font-arabic">واجهة العميل</h3>
                    <p className="text-sm text-white/80 font-arabic">موبايل أولاً</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center space-y-2">
                  <div className="p-2 bg-white/10 rounded-lg w-fit mx-auto backdrop-blur-sm">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm text-white/80 font-arabic">آمن</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="p-2 bg-white/10 rounded-lg w-fit mx-auto backdrop-blur-sm">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm text-white/80 font-arabic">متعدد المستخدمين</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="p-2 bg-white/10 rounded-lg w-fit mx-auto backdrop-blur-sm">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm text-white/80 font-arabic">إدارة شاملة</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Login/Signup Form */}
        <div className="flex items-center justify-center p-6 lg:p-12">
          <Card className="w-full max-w-md card-professional animate-slide-up">
            <CardHeader className="text-center space-y-2">
              <div className="lg:hidden flex items-center justify-center space-x-3 space-x-reverse mb-4">
                <div className="w-12 h-12 flex items-center justify-center bg-gradient-primary rounded-xl p-2">
                  <img src={logo} alt="شركة تونس للإستشارات والمساعدة" className="w-full h-full object-contain" />
                </div>
                <h1 className="text-lg font-bold font-arabic text-center leading-tight">تونس للإستشارات</h1>
              </div>
              <CardTitle className="text-2xl font-bold font-arabic">مرحبا بك</CardTitle>
              <CardDescription className="font-arabic">
                سجل الدخول أو أنشئ حساب جديد
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login" className="font-arabic">تسجيل الدخول</TabsTrigger>
                  <TabsTrigger value="signup" className="font-arabic">حساب جديد</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        type="email"
                        placeholder="البريد الإلكتروني"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="transition-smooth text-right font-arabic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="password"
                        placeholder="كلمة المرور"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="transition-smooth text-right font-arabic"
                      />
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription className="font-arabic">{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert>
                        <AlertDescription className="font-arabic text-green-600">{success}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-gradient-primary transition-smooth hover:shadow-glow font-arabic"
                      disabled={loading}
                    >
                      {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        type="text"
                        placeholder="الاسم الأول"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="transition-smooth text-right font-arabic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="text"
                        placeholder="اسم العائلة"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="transition-smooth text-right font-arabic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="email"
                        placeholder="البريد الإلكتروني"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="transition-smooth text-right font-arabic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="password"
                        placeholder="كلمة المرور (6 أحرف على الأقل)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="transition-smooth text-right font-arabic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="password"
                        placeholder="تأكيد كلمة المرور"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="transition-smooth text-right font-arabic"
                      />
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription className="font-arabic">{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert>
                        <AlertDescription className="font-arabic text-green-600">{success}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-gradient-primary transition-smooth hover:shadow-glow font-arabic"
                      disabled={loading}
                    >
                      {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}