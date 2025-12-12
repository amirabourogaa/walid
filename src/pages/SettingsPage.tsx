import { useState, useEffect, useRef } from 'react';
import { Save, User, Lock, Bell, Globe, Palette, Database, Shield, Download, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PushNotificationSettings } from '@/components/PushNotificationSettings';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('تم حفظ التغييرات بنجاح');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('خطأ في حفظ البيانات');
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('database-backup', {
        body: { action: 'backup' }
      });

      if (error) throw error;

      if (data?.success && data?.backup) {
        // Create and download the backup file
        const backupBlob = new Blob([JSON.stringify(data.backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(backupBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_complete_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        const recordsCount = data.backup.metadata?.totalRecords || 0;
        const filesCount = data.backup.metadata?.totalFilesCount || 0;
        toast.success(`تم إنشاء النسخة الاحتياطية الكاملة - ${recordsCount} سجل و ${filesCount} ملف`);
      } else {
        throw new Error(data?.error || 'حدث خطأ أثناء إنشاء النسخة الاحتياطية');
      }
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('حدث خطأ أثناء إنشاء النسخة الاحتياطية');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.version || !backupData.tables) {
        toast.error('ملف النسخة الاحتياطية غير صالح');
        return;
      }

      setPendingRestoreData(backupData);
      setRestoreDialogOpen(true);
    } catch (error) {
      console.error('Error reading backup file:', error);
      toast.error('حدث خطأ أثناء قراءة ملف النسخة الاحتياطية');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreData) return;

    setRestoreLoading(true);
    setRestoreDialogOpen(false);

    try {
      const { data, error } = await supabase.functions.invoke('database-backup', {
        body: { action: 'restore', backupData: pendingRestoreData }
      });

      if (error) throw error;

      if (data?.success) {
        const fileResults = data.fileResults || {};
        const totalFilesRestored = Object.values(fileResults).reduce((acc: number, r: any) => acc + (r.restored || 0), 0);
        toast.success(`تمت استعادة البيانات والملفات بنجاح (${totalFilesRestored} ملف) - يرجى تحديث الصفحة`);
      } else {
        throw new Error(data?.error || 'حدث خطأ أثناء استعادة البيانات');
      }
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('حدث خطأ أثناء استعادة البيانات');
    } finally {
      setRestoreLoading(false);
      setPendingRestoreData(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 font-arabic" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">إعدادات النظام</h1>
        <p className="text-muted-foreground">إدارة إعدادات التطبيق والحساب</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile" className="space-x-2 space-x-reverse">
            <User className="h-4 w-4" />
            <span>الملف الشخصي</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="space-x-2 space-x-reverse">
            <Shield className="h-4 w-4" />
            <span>الأمان</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="space-x-2 space-x-reverse">
            <Bell className="h-4 w-4" />
            <span>التنبيهات</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="space-x-2 space-x-reverse">
            <Globe className="h-4 w-4" />
            <span>عام</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="space-x-2 space-x-reverse">
            <Palette className="h-4 w-4" />
            <span>المظهر</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="space-x-2 space-x-reverse">
            <Database className="h-4 w-4" />
            <span>النظام</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card className="card-professional">
            <CardHeader>
              <CardTitle>معلومات الملف الشخصي</CardTitle>
              <CardDescription>إدارة معلومات الحساب الشخصية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">الاسم الأول</Label>
                  <Input 
                    id="first-name" 
                    value={profile?.first_name || ''} 
                    onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">اسم العائلة</Label>
                  <Input 
                    id="last-name" 
                    value={profile?.last_name || ''} 
                    onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" type="email" value={profile?.email || ''} disabled />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input 
                    id="phone" 
                    value={profile?.phone || ''} 
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">المنصب</Label>
                  <Input id="position" value={profile?.role || ''} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">نبذة تعريفية</Label>
                <Textarea id="bio" placeholder="أدخل نبذة تعريفية..." />
              </div>
              <Button className="space-x-2 space-x-reverse" onClick={handleSaveProfile}>
                <Save className="h-4 w-4" />
                <span>حفظ التغييرات</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card className="card-professional">
              <CardHeader>
                <CardTitle>تغيير كلمة المرور</CardTitle>
                <CardDescription>قم بتحديث كلمة المرور لحماية حسابك</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">كلمة المرور الحالية</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
                  <Input id="confirm-password" type="password" />
                </div>
                <Button className="space-x-2 space-x-reverse">
                  <Lock className="h-4 w-4" />
                  <span>تغيير كلمة المرور</span>
                </Button>
              </CardContent>
            </Card>

            <Card className="card-professional">
              <CardHeader>
                <CardTitle>المصادقة الثنائية</CardTitle>
                <CardDescription>تعزيز أمان الحساب بالمصادقة الثنائية</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>تفعيل المصادقة الثنائية</Label>
                    <p className="text-sm text-muted-foreground">
                      طبقة حماية إضافية لحسابك
                    </p>
                  </div>
                  <Switch 
                    checked={twoFactorAuth} 
                    onCheckedChange={setTwoFactorAuth} 
                  />
                </div>
                {twoFactorAuth && (
                  <div className="space-y-2">
                    <Label htmlFor="phone-2fa">رقم الهاتف للمصادقة</Label>
                    <Input id="phone-2fa" placeholder="+216 XX XXX XXX" />
                    <Button variant="outline" size="sm">
                      إرسال رمز التحقق
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <div className="space-y-6">
            {/* Push Notifications */}
            <PushNotificationSettings />

            <Card className="card-professional">
              <CardHeader>
                <CardTitle>إعدادات التنبيهات</CardTitle>
                <CardDescription>إدارة التنبيهات والإشعارات</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>إشعارات البريد الإلكتروني</Label>
                  <p className="text-sm text-muted-foreground">
                    تلقي إشعارات عبر البريد الإلكتروني
                  </p>
                </div>
                <Switch 
                  checked={emailNotifications} 
                  onCheckedChange={setEmailNotifications} 
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>إشعارات SMS</Label>
                  <p className="text-sm text-muted-foreground">
                    تلقي إشعارات عبر الرسائل النصية
                  </p>
                </div>
                <Switch 
                  checked={smsNotifications} 
                  onCheckedChange={setSmsNotifications} 
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>أنواع التنبيهات</Label>
                <div className="space-y-3">
                  {[
                    { id: 'new-clients', label: 'عملاء جدد', checked: true },
                    { id: 'appointments', label: 'مواعيد قادمة', checked: true },
                    { id: 'payments', label: 'مدفوعات جديدة', checked: true },
                    { id: 'document-expiry', label: 'انتهاء صلاحية الوثائق', checked: false },
                    { id: 'system-updates', label: 'تحديثات النظام', checked: false }
                  ].map((item) => (
                    <div key={item.id} className="flex items-center space-x-2 space-x-reverse">
                      <Switch defaultChecked={item.checked} />
                      <Label>{item.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button className="space-x-2 space-x-reverse">
                <Bell className="h-4 w-4" />
                <span>حفظ إعدادات التنبيهات</span>
              </Button>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="general">
          <Card className="card-professional">
            <CardHeader>
              <CardTitle>الإعدادات العامة</CardTitle>
              <CardDescription>إعدادات التطبيق العامة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">اللغة</Label>
                  <Select defaultValue="ar">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">المنطقة الزمنية</Label>
                  <Select defaultValue="tunisia">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tunisia">تونس (GMT+1)</SelectItem>
                      <SelectItem value="morocco">المغرب (GMT+0)</SelectItem>
                      <SelectItem value="algeria">الجزائر (GMT+1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="currency">العملة الافتراضية</Label>
                <Select defaultValue="tnd">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tnd">دينار تونسي (TND)</SelectItem>
                    <SelectItem value="eur">يورو (EUR)</SelectItem>
                    <SelectItem value="usd">دولار أمريكي (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-info">معلومات الشركة</Label>
                <Textarea 
                  id="company-info" 
                  placeholder="أدخل معلومات الشركة..."
                  defaultValue="شركة تونس للإستشارات والمساعدة - حلول و خدمات متنوعة في التأشيرات و التجارة الدولية"
                />
              </div>

              <Button className="space-x-2 space-x-reverse">
                <Save className="h-4 w-4" />
                <span>حفظ الإعدادات</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Card className="card-professional">
            <CardHeader>
              <CardTitle>إعدادات المظهر</CardTitle>
              <CardDescription>تخصيص مظهر التطبيق</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>السمة</Label>
                <Select defaultValue="system">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">فاتح</SelectItem>
                    <SelectItem value="dark">داكن</SelectItem>
                    <SelectItem value="system">تلقائي (حسب النظام)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>حجم الخط</Label>
                <Select defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">صغير</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="large">كبير</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>اللون الأساسي</Label>
                <div className="flex space-x-2 space-x-reverse">
                  {[
                    { name: 'أزرق', color: '#3B82F6' },
                    { name: 'أخضر', color: '#10B981' },
                    { name: 'بنفسجي', color: '#8B5CF6' },
                    { name: 'أحمر', color: '#EF4444' },
                    { name: 'برتقالي', color: '#F59E0B' }
                  ].map((color) => (
                    <button
                      key={color.name}
                      className="w-8 h-8 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: color.color }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <Button className="space-x-2 space-x-reverse">
                <Palette className="h-4 w-4" />
                <span>حفظ المظهر</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <div className="space-y-6">
            <Card className="card-professional">
              <CardHeader>
                <CardTitle>النسخ الاحتياطي والاستعادة</CardTitle>
                <CardDescription>إنشاء نسخة احتياطية كاملة واستعادة البيانات</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>النسخ الاحتياطي التلقائي</Label>
                    <p className="text-sm text-muted-foreground">
                      إنشاء نسخة احتياطية يومية تلقائياً
                    </p>
                  </div>
                  <Switch 
                    checked={autoBackup} 
                    onCheckedChange={setAutoBackup} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>تكرار النسخ الاحتياطي</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">يومي</SelectItem>
                      <SelectItem value="weekly">أسبوعي</SelectItem>
                      <SelectItem value="monthly">شهري</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Database className="h-5 w-5 text-primary" />
                      إنشاء نسخة احتياطية كاملة
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      سيتم تنزيل ملف JSON يحتوي على جميع بيانات النظام بما في ذلك:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mr-4">
                      <li>جميع جداول قاعدة البيانات (العملاء، الفواتير، المعاملات، الصناديق...)</li>
                      <li>جميع ملفات ووثائق العملاء (صور، مستندات)</li>
                      <li>ملفات أرشيف المعاملات</li>
                    </ul>
                    <Button 
                      onClick={handleCreateBackup} 
                      disabled={backupLoading}
                      className="w-full sm:w-auto"
                      size="lg"
                    >
                      {backupLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                          جاري إنشاء النسخة الكاملة...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 ml-2" />
                          إنشاء نسخة احتياطية كاملة الآن
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="p-4 bg-destructive/10 rounded-lg space-y-3">
                    <h4 className="font-medium text-destructive flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      استعادة من نسخة احتياطية كاملة
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      <span className="text-destructive font-medium">تحذير:</span> ستقوم هذه العملية بحذف جميع البيانات الحالية واستبدالها بالبيانات من النسخة الاحتياطية بما في ذلك جميع الملفات والوثائق.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button 
                      variant="destructive"
                      onClick={handleRestoreClick}
                      disabled={restoreLoading}
                      className="w-full sm:w-auto"
                      size="lg"
                    >
                      {restoreLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                          جاري استعادة البيانات والملفات...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 ml-2" />
                          استعادة من نسخة احتياطية كاملة
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-professional">
              <CardHeader>
                <CardTitle>معلومات النظام</CardTitle>
                <CardDescription>تفاصيل النظام والصيانة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">إصدار التطبيق</p>
                    <p className="text-muted-foreground">v2.1.0</p>
                  </div>
                  <div>
                    <p className="font-medium">آخر تحديث</p>
                    <p className="text-muted-foreground">2024-01-20</p>
                  </div>
                  <div>
                    <p className="font-medium">قاعدة البيانات</p>
                    <p className="text-muted-foreground">متصلة</p>
                  </div>
                  <div>
                    <p className="font-medium">مساحة التخزين</p>
                    <p className="text-muted-foreground">2.3 GB / 10 GB</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex space-x-2 space-x-reverse">
                  <Button variant="outline" size="sm">
                    فحص التحديثات
                  </Button>
                  <Button variant="outline" size="sm">
                    مسح ذاكرة التخزين المؤقت
                  </Button>
                  <Button variant="outline" size="sm">
                    تصدير البيانات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد استعادة البيانات</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="text-destructive font-medium">تحذير: هذا الإجراء لا يمكن التراجع عنه!</p>
              <p>سيتم حذف جميع البيانات الحالية واستبدالها بالبيانات من النسخة الاحتياطية.</p>
              {pendingRestoreData && (
                <div className="mt-4 p-3 bg-muted rounded-lg text-sm space-y-1">
                  <p><strong>تاريخ النسخة:</strong> {new Date(pendingRestoreData.timestamp).toLocaleString('ar-TN')}</p>
                  <p><strong>إصدار النسخة:</strong> {pendingRestoreData.version || '1.0'}</p>
                  <p><strong>عدد السجلات:</strong> {pendingRestoreData.metadata?.totalRecords || 'غير محدد'}</p>
                  <p><strong>عدد الجداول:</strong> {pendingRestoreData.metadata?.tablesCount || 'غير محدد'}</p>
                  <p><strong>عدد الملفات:</strong> {pendingRestoreData.metadata?.totalFilesCount || 0}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction 
              onClick={handleConfirmRestore}
              className="bg-destructive hover:bg-destructive/90"
            >
              نعم، استعادة البيانات
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => setPendingRestoreData(null)}>
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}