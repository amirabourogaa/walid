import { useState, useEffect } from 'react';
import { StatsCard } from '@/components/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Calendar, 
  FileText, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/lib/auth';
import EmployeeDashboard from '@/components/EmployeeDashboard';

interface RevenueByDevise {
  TND: number;
  USD: number;
  EUR: number;
  DLY: number;
}

interface ExpensesByDevise {
  TND: number;
  USD: number;
  EUR: number;
  DLY: number;
}

interface DashboardStats {
  totalClients: number;
  newClients: number;
  inProgressClients: number;
  completedClients: number;
  delayedClients: number;
  todayAppointments: number;
  monthlyRevenue: RevenueByDevise;
  monthlyExpenses: ExpensesByDevise;
  clientsGrowth: string;
  newClientsGrowth: string;
  pendingAppointments: number;
  revenueGrowth: string;
}

interface RecentActivity {
  id: string;
  type: 'client' | 'appointment' | 'application' | 'payment';
  title: string;
  description: string;
  time: string;
  status: 'pending' | 'completed' | 'urgent';
}

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    newClients: 0,
    inProgressClients: 0,
    completedClients: 0,
    delayedClients: 0,
    todayAppointments: 0,
    monthlyRevenue: { TND: 0, USD: 0, EUR: 0, DLY: 0 },
    monthlyExpenses: { TND: 0, USD: 0, EUR: 0, DLY: 0 },
    clientsGrowth: '+0%',
    newClientsGrowth: '+0%',
    pendingAppointments: 0,
    revenueGrowth: '+0%'
  });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const user = authService.getCurrentUser();
    setUserRole(user?.role || '');
    
    // Si l'utilisateur est un employé, on ne charge pas les données financières
    if (user?.role !== 'employee') {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch total clients count
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Fetch new clients (status = جديد)
      const { count: newClientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'جديد');

      // Fetch all clients to calculate counts accurately
      const { data: allClientsForProgress } = await supabase
        .from('clients')
        .select('status, created_at, updated_at');

      // Calculate in-progress clients with status normalization
      const inProgressCount = allClientsForProgress?.filter(client => {
        const status = client.status?.replace(/ /g, '_');
        return status === 'قيد_المعالجة';
      }).length || 0;

      // Calculate completed clients with status normalization
      const completedCount = allClientsForProgress?.filter(client => {
        const status = client.status?.replace(/ /g, '_');
        return status === 'اكتملت_العملية';
      }).length || 0;

      // Use same data for delayed calculation
      const allClientsData = allClientsForProgress;

      // Calculate delayed clients (more than 10 days without update and not completed)
      const delayedCount = allClientsData?.filter(client => {
        // Check if completed
        const status = client.status?.replace(/ /g, '_');
        if (status === 'اكتملت_العملية') return false;
        
        // Check delay
        const checkDate = client.updated_at || client.created_at;
        if (!checkDate) return false;
        
        const lastUpdate = new Date(checkDate);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff > 10;
      }).length || 0;

      // Fetch today's appointments
      const today = new Date().toISOString().split('T')[0];
      const { count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('date', today);

      // Fetch pending appointments today
      const { count: pendingCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .eq('status', 'مجدولة');

      // Calculate monthly revenue and expenses by currency
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Fetch monthly revenue from transactions (type = 'entree') of current month
      const { data: revenueTransactions } = await supabase
        .from('transactions')
        .select('montant, devise')
        .eq('type', 'entree')
        .gte('date_transaction', startOfMonth.toISOString().split('T')[0]);

      const monthlyRevenue: RevenueByDevise = { TND: 0, USD: 0, EUR: 0, DLY: 0 };
      if (revenueTransactions) {
        revenueTransactions.forEach(t => {
          const currency = t.devise as 'TND' | 'USD' | 'EUR' | 'DLY';
          if (currency in monthlyRevenue) {
            monthlyRevenue[currency] += Number(t.montant);
          }
        });
      }

      // Fetch monthly expenses from transactions (type = 'sortie')
      const { data: expenseTransactions } = await supabase
        .from('transactions')
        .select('montant, devise')
        .eq('type', 'sortie')
        .gte('date_transaction', startOfMonth.toISOString().split('T')[0]);

      const monthlyExpenses: ExpensesByDevise = { TND: 0, USD: 0, EUR: 0, DLY: 0 };
      if (expenseTransactions) {
        expenseTransactions.forEach(t => {
          const currency = t.devise as 'TND' | 'USD' | 'EUR' | 'DLY';
          if (currency in monthlyExpenses) {
            monthlyExpenses[currency] += Number(t.montant);
          }
        });
      }

      // Calculate growth percentages
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      
      const { count: lastMonthClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', lastMonth.toISOString())
        .lt('created_at', startOfMonth.toISOString());

      const { count: thisMonthClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      const clientsGrowth = lastMonthClients && lastMonthClients > 0
        ? `+${Math.round((thisMonthClients! / lastMonthClients) * 100)}%`
        : '+0%';

      const { count: lastMonthNewClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'جديد')
        .gte('created_at', lastMonth.toISOString())
        .lt('created_at', startOfMonth.toISOString());

      const { count: thisMonthNewClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'جديد')
        .gte('created_at', startOfMonth.toISOString());

      const newClientsGrowth = lastMonthNewClients && lastMonthNewClients > 0
        ? `+${Math.round((thisMonthNewClients! / lastMonthNewClients) * 100)}%`
        : '+0%';

      setStats({
        totalClients: clientsCount || 0,
        newClients: newClientsCount || 0,
        inProgressClients: inProgressCount || 0,
        completedClients: completedCount || 0,
        delayedClients: delayedCount,
        todayAppointments: appointmentsCount || 0,
        monthlyRevenue,
        monthlyExpenses,
        clientsGrowth: clientsGrowth + ' هذا الشهر',
        newClientsGrowth: newClientsGrowth + ' هذا الشهر',
        pendingAppointments: pendingCount || 0,
        revenueGrowth: '+0% من الشهر الماضي'
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'client': return Users;
      case 'appointment': return Calendar;
      case 'application': return FileText;
      case 'payment': return TrendingUp;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'urgent': return 'bg-destructive text-destructive-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'urgent': return 'عاجل';
      case 'pending': return 'في الانتظار';
      default: return status;
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

  // Si l'utilisateur est un employé, afficher le tableau de bord des employés
  if (userRole === 'employee') {
    return <EmployeeDashboard />;
  }

  return (
    <div className="p-6 space-y-6 font-arabic" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">لوحة التحكم</h1>
          <p className="text-muted-foreground">نظرة عامة على نشاطك</p>
        </div>
        <div className="flex space-x-3 space-x-reverse">
          <Button 
            onClick={() => navigate('/manager/clients')}
            className="bg-gradient-primary transition-smooth hover:shadow-glow"
          >
            <Plus className="h-4 w-4 ml-2" />
            عميل جديد
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard
          title="إجمالي العملاء"
          value={stats.totalClients}
          change={stats.clientsGrowth}
          changeType="positive"
          icon={Users}
        />
        <StatsCard
          title="عميل جديد"
          value={stats.newClients}
          change={stats.newClientsGrowth}
          changeType="positive"
          icon={Plus}
        />
        <StatsCard
          title="الطلبات النشطة"
          value={stats.inProgressClients}
          change="قيد المعالجة"
          changeType="neutral"
          icon={FileText}
        />
        <StatsCard
          title="العمليات المكتملة"
          value={stats.completedClients}
          change="اكتملت العملية"
          changeType="positive"
          icon={CheckCircle}
        />
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">عملاء متأخرة</p>
                <p className="text-2xl font-bold text-orange-600">{stats.delayedClients}</p>
                <p className="text-xs text-orange-600 mt-1">أكثر من 10 أيام</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-6">
        <StatsCard
          title="مواعيد اليوم"
          value={stats.todayAppointments}
          change={`${stats.pendingAppointments} في الانتظار`}
          changeType="neutral"
          icon={Calendar}
        />
      </div>

      {/* Revenue and Expenses by Currency - Only for Admin and Manager */}
      {(userRole === 'admin' || userRole === 'manager') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="card-professional">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <TrendingUp className="h-5 w-5 text-success" />
                <span>الإيرادات الشهرية</span>
              </CardTitle>
              <CardDescription>حسب نوع العملة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gradient-subtle rounded-lg">
                <span className="text-muted-foreground">دينار تونسي (TND)</span>
                <span className="text-xl font-bold text-success">{stats.monthlyRevenue.TND.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-subtle rounded-lg">
                <span className="text-muted-foreground">دولار أمريكي (USD)</span>
                <span className="text-xl font-bold text-success">{stats.monthlyRevenue.USD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-subtle rounded-lg">
                <span className="text-muted-foreground">يورو (EUR)</span>
                <span className="text-xl font-bold text-success">{stats.monthlyRevenue.EUR.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-subtle rounded-lg">
                <span className="text-muted-foreground">دينار ليبي (DLY)</span>
                <span className="text-xl font-bold text-success">{stats.monthlyRevenue.DLY.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="card-professional">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span>المصروفات الشهرية</span>
              </CardTitle>
              <CardDescription>حسب نوع العملة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gradient-subtle rounded-lg">
                <span className="text-muted-foreground">دينار تونسي (TND)</span>
                <span className="text-xl font-bold text-destructive">{stats.monthlyExpenses.TND.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-subtle rounded-lg">
                <span className="text-muted-foreground">دولار أمريكي (USD)</span>
                <span className="text-xl font-bold text-destructive">{stats.monthlyExpenses.USD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-subtle rounded-lg">
                <span className="text-muted-foreground">يورو (EUR)</span>
                <span className="text-xl font-bold text-destructive">{stats.monthlyExpenses.EUR.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gradient-subtle rounded-lg">
                <span className="text-muted-foreground">دينار ليبي (DLY)</span>
                <span className="text-xl font-bold text-destructive">{stats.monthlyExpenses.DLY.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="card-professional">
          <CardHeader>
            <CardTitle>إجراءات سريعة</CardTitle>
            <CardDescription>
              اختصارات للمهام الشائعة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start space-x-reverse transition-smooth hover:bg-primary hover:text-primary-foreground"
              onClick={() => navigate('/manager/clients')}
            >
              <Plus className="h-4 w-4 ml-2" />
              عميل جديد
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start space-x-reverse transition-smooth hover:bg-primary hover:text-primary-foreground"
              onClick={() => navigate('/manager/appointments')}
            >
              <Calendar className="h-4 w-4 ml-2" />
              جدولة موعد
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start space-x-reverse transition-smooth hover:bg-primary hover:text-primary-foreground"
              onClick={() => navigate('/manager/applications')}
            >
              <FileText className="h-4 w-4 ml-2" />
              إنشاء ملف
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start space-x-reverse transition-smooth hover:bg-primary hover:text-primary-foreground"
              onClick={() => navigate('/manager/statistics')}
            >
              <TrendingUp className="h-4 w-4 ml-2" />
              عرض الإحصائيات
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity Placeholder */}
        <Card className="lg:col-span-2 card-professional">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Clock className="h-5 w-5" />
              <span>النشاط الأخير</span>
            </CardTitle>
            <CardDescription>
              آخر الأحداث والعمليات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>سيتم عرض النشاط الأخير هنا</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}