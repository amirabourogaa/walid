import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Calendar, 
  FileText, 
  CreditCard, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  Wallet,
  Landmark,
  ArrowLeftRight,
  MessageSquare,
  Download,
  FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { authService } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/NotificationBell';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.success('تم تسجيل الخروج بنجاح');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    }
  };

  // Filter navigation items based on user role
  const allNavigationItems = [
    { icon: Home, label: 'لوحة التحكم', href: '/manager', roles: ['admin', 'manager', 'employee'] },
    { icon: Download, label: 'جلب وتقسيم الأعمال', href: '/manager/work-distribution', roles: ['admin', 'manager'] },
    { icon: Users, label: 'العملاء', href: '/manager/clients', roles: ['admin', 'manager', 'employee'] },
    { icon: Calendar, label: 'المواعيد', href: '/manager/appointments', roles: ['admin', 'manager', 'employee'] },
    { icon: FolderOpen, label: 'الملفات', href: '/manager/folders', roles: ['admin', 'manager', 'employee'] },
    { icon: FileText, label: 'الطلبات', href: '/manager/applications', roles: ['admin', 'manager', 'employee'] },
    { icon: CreditCard, label: 'الفواتير', href: '/manager/invoices', roles: ['admin', 'manager'] },
    { icon: Wallet, label: 'الصناديق', href: '/manager/caisses', roles: ['admin', 'manager'] },
    { icon: Landmark, label: 'الحسابات البنكية', href: '/manager/bank-accounts', roles: ['admin', 'manager'] },
    { icon: ArrowLeftRight, label: 'المعاملات', href: '/manager/transactions', roles: ['admin', 'manager'] },
    { icon: BarChart3, label: 'الإحصائيات', href: '/manager/statistics', roles: ['admin', 'manager'] },
    { icon: MessageSquare, label: 'اختبار WhatsApp', href: '/manager/whatsapp-test', roles: ['admin', 'manager'] },
    { icon: Settings, label: 'الإعدادات', href: '/manager/settings', roles: ['admin', 'manager'] },
  ];

  const navigationItems = allNavigationItems.filter(item => 
    user?.role && item.roles.includes(user.role)
  );

  return (
    <div className={cn(
      "flex flex-col h-screen bg-gradient-card border-l border-border transition-all duration-300 font-arabic",
      collapsed ? "w-16" : "w-64",
      className
    )} dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-12 h-12 flex items-center justify-center">
              <img src={logo} alt="شركة تونس للإستشارات والمساعدة" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h2 className="font-bold text-sm leading-tight">شركة تونس للإستشارات والمساعدة</h2>
              <p className="text-xs text-muted-foreground">إدارة</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="p-2"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.role === 'admin' ? 'مدير عام' : 
                 user?.role === 'manager' ? 'مدير' : 
                 user?.role === 'employee' ? 'موظف' : user?.role}
              </p>
            </div>
            {user?.role === 'employee' && <NotificationBell />}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navigationItems.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center space-x-3 space-x-reverse px-3 py-2 rounded-lg transition-smooth text-sm",
                    "hover:bg-secondary/50",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground",
                    collapsed && "justify-center"
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full justify-start space-x-3 space-x-reverse text-muted-foreground hover:text-foreground transition-smooth",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>تسجيل خروج</span>}
        </Button>
      </div>
    </div>
  );
}