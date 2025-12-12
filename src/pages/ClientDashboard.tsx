import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Calendar, 
  MessageCircle, 
  Bell,
  Upload,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Phone,
  Mail,
  MapPin,
  LogOut
} from 'lucide-react';
import { authService } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';

interface ClientApplication {
  id: string;
  type: string;
  status: 'قيد_المعالجة' | 'وثائق_مطلوبة' | 'قيد_المراجعة' | 'موافق_عليه' | 'مرفوض';
  progress: number;
  submittedDate: Date;
  expectedDate?: Date;
  documents: { name: string; status: 'تم_الرفع' | 'تم_التحقق' | 'مفقود' }[];
}

export default function ClientDashboard() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [application, setApplication] = useState<ClientApplication | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // Simulate loading client data
    setApplication({
      id: '1',
      type: 'تأشيرة شنغن سياحة',
      status: 'وثائق_مطلوبة',
      progress: 65,
      submittedDate: new Date('2024-01-15'),
      expectedDate: new Date('2024-02-15'),
      documents: [
        { name: 'جواز السفر', status: 'تم_التحقق' },
        { name: 'صورة شخصية', status: 'تم_التحقق' },
        { name: 'كشف حساب بنكي', status: 'تم_الرفع' },
        { name: 'حجز فندق', status: 'مفقود' },
        { name: 'تأمين سفر', status: 'مفقود' }
      ]
    });

    setNotifications([
      {
        id: '1',
        title: 'وثائق مطلوبة',
        message: 'يرجى تقديم حجز الفندق الخاص بك',
        time: 'منذ ساعتين',
        type: 'warning'
      },
      {
        id: '2',
        title: 'موعد مؤكد',
        message: 'موعد في 25 يناير الساعة 2:00 مساءً',
        time: 'أمس',
        type: 'info'
      }
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'موافق_عليه': return 'bg-success text-success-foreground';
      case 'مرفوض': return 'bg-destructive text-destructive-foreground';
      case 'قيد_المراجعة': return 'bg-warning text-warning-foreground';
      case 'وثائق_مطلوبة': return 'bg-warning text-warning-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'قيد_المعالجة': return 'قيد المعالجة';
      case 'وثائق_مطلوبة': return 'وثائق مطلوبة';
      case 'قيد_المراجعة': return 'قيد المراجعة';
      case 'موافق_عليه': return 'موافق عليه';
      case 'مرفوض': return 'مرفوض';
      default: return status;
    }
  };

  const getDocumentIcon = (status: string) => {
    switch (status) {
      case 'تم_التحقق': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'تم_الرفع': return <Clock className="h-4 w-4 text-warning" />;
      case 'مفقود': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background font-arabic" dir="rtl">
      {/* Mobile Header */}
      <div className="bg-gradient-primary text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg">
                {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-sm text-white/80">مساحة العميل</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/20">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Application Status */}
        {application && (
          <Card className="card-professional">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{application.type}</CardTitle>
                  <CardDescription>
                    تم التقديم في {application.submittedDate.toLocaleDateString('ar-SA')}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(application.status)}>
                  {getStatusLabel(application.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>التقدم</span>
                  <span>{application.progress}%</span>
                </div>
                <Progress value={application.progress} className="h-2" />
              </div>
              {application.expectedDate && (
                <div className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>التاريخ المتوقع: {application.expectedDate.toLocaleDateString('ar-SA')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        <Card className="card-professional">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <FileText className="h-5 w-5" />
              <span>الوثائق</span>
            </CardTitle>
            <CardDescription>
              حالة الوثائق المقدمة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {application?.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    {getDocumentIcon(doc.status)}
                    <span className="font-medium text-sm">{doc.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    {doc.status === 'مفقود' ? (
                      <Button size="sm" className="bg-gradient-primary">
                        <Upload className="h-3 w-3 ml-1" />
                        رفع
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm">
                        <Download className="h-3 w-3 ml-1" />
                        عرض
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full">
                <Upload className="h-4 w-4 ml-2" />
                إضافة وثيقة
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="card-professional">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Bell className="h-5 w-5" />
              <span>الإشعارات</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div key={notif.id} className="flex items-start space-x-3 space-x-reverse p-3 rounded-lg bg-secondary/30">
                  <div className={`p-1 rounded-full ${
                    notif.type === 'warning' ? 'bg-warning' : 'bg-primary'
                  }`}>
                    {notif.type === 'warning' ? 
                      <AlertTriangle className="h-3 w-3 text-white" /> : 
                      <Bell className="h-3 w-3 text-white" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{notif.title}</p>
                    <p className="text-sm text-muted-foreground">{notif.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" className="h-16 transition-smooth">
            <div className="text-center">
              <MessageCircle className="h-6 w-6 mx-auto mb-1" />
              <span className="text-sm">تواصل</span>
            </div>
          </Button>
          <Button variant="outline" className="h-16 transition-smooth">
            <div className="text-center">
              <Calendar className="h-6 w-6 mx-auto mb-1" />
              <span className="text-sm">موعد</span>
            </div>
          </Button>
        </div>

        {/* Contact Information */}
        <Card className="card-professional">
          <CardHeader>
            <CardTitle>معلومات التواصل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-3 space-x-reverse">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">+33 1 23 45 67 89</span>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">contact@tcavisa.com</span>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">123 شارع الشانزليزيه، باريس</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}