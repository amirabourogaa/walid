import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Share, Plus, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Detect Android
    const android = /Android/.test(navigator.userAgent);
    setIsAndroid(android);

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
    }

    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
              <Download className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-2xl">تم التثبيت بنجاح!</CardTitle>
            <CardDescription>
              التطبيق مثبت الآن على جهازك
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/manager')} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              الذهاب إلى لوحة التحكم
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl mb-2">
            ثبّت التطبيق على جهازك
          </CardTitle>
          <CardDescription className="text-base">
            استمتع بتجربة أفضل مع إشعارات فورية وعمل بدون اتصال
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Android/Desktop Installation */}
          {isInstallable && (
            <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                تثبيت سريع
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                اضغط على الزر أدناه لتثبيت التطبيق مباشرة
              </p>
              <Button onClick={handleInstallClick} size="lg" className="w-full">
                <Download className="mr-2 h-5 w-5" />
                تثبيت التطبيق
              </Button>
            </div>
          )}

          {/* iOS Installation Instructions */}
          {isIOS && (
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Share className="h-5 w-5 text-blue-600" />
                تعليمات التثبيت لـ iPhone/iPad
              </h3>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>
                    اضغط على زر <strong>المشاركة</strong> <Share className="inline h-4 w-4" /> في Safari
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>
                    اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong> <Plus className="inline h-4 w-4" />
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>اضغط على <strong>"إضافة"</strong> للتأكيد</span>
                </li>
              </ol>
            </div>
          )}

          {/* Android Manual Instructions */}
          {isAndroid && !isInstallable && (
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-green-600" />
                تعليمات التثبيت لـ Android
              </h3>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>اضغط على القائمة (⋮) في Chrome</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>اختر <strong>"تثبيت التطبيق"</strong> أو <strong>"إضافة إلى الشاشة الرئيسية"</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>اضغط على <strong>"تثبيت"</strong> للتأكيد</span>
                </li>
              </ol>
            </div>
          )}

          {/* Features */}
          <div className="pt-4">
            <h3 className="font-semibold text-lg mb-4 text-center">مميزات التطبيق</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  🔔
                </div>
                <h4 className="font-semibold text-sm mb-1">إشعارات فورية</h4>
                <p className="text-xs text-muted-foreground">
                  استقبل إشعارات عند تعيين عملاء جدد
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  📱
                </div>
                <h4 className="font-semibold text-sm mb-1">وصول سريع</h4>
                <p className="text-xs text-muted-foreground">
                  افتح التطبيق مباشرة من الشاشة الرئيسية
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  ⚡
                </div>
                <h4 className="font-semibold text-sm mb-1">أداء ممتاز</h4>
                <p className="text-xs text-muted-foreground">
                  تحميل أسرع وتجربة أفضل
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 text-center">
            <Button variant="outline" onClick={() => navigate('/manager')}>
              الاستمرار بدون تثبيت
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
