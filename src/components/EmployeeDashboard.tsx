import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, FileText, Calendar, AlertCircle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface DashboardStats {
  totalClients: number;
  activeApplications: number;
  todayAppointments: number;
  overdueClients: number;
}

interface ClientFolder {
  id: string;
  full_name: string;
  status: string;
  visa_tracking_status: string;
  created_at: string;
  embassy_receipt_date: string | null;
  assigned_employee: string;
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeApplications: 0,
    todayAppointments: 0,
    overdueClients: 0
  });
  const [todayFolders, setTodayFolders] = useState<ClientFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState<string>('');

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      const name = `${profile.first_name} ${profile.last_name}`.trim();
      setEmployeeName(name);

      // Fetch stats for this employee
      await fetchEmployeeStats(name, profile.email);
      await fetchTodayFolders(name, profile.email);
    } catch (error) {
      console.error('Error loading employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeStats = async (name: string, email: string) => {
    // Fetch clients assigned to this employee (RLS automatically filters)
    const { data: clients } = await supabase
      .from('clients')
      .select('*');

    const totalClients = clients?.length || 0;

    // Count active applications (clients with visa_tracking_status not completed)
    const activeApplications = clients?.filter(
      c => c.visa_tracking_status && c.visa_tracking_status !== 'اكتملت العملية'
    ).length || 0;

    // Count overdue clients (embassy_receipt_date passed and not completed)
    const today = new Date();
    const overdueClients = clients?.filter(
      c => c.embassy_receipt_date && 
           isPast(parseISO(c.embassy_receipt_date)) && 
           c.visa_tracking_status !== 'اكتملت العملية'
    ).length || 0;

    // Fetch today's appointments
    const todayDate = format(new Date(), 'yyyy-MM-dd');
    const { count: appointmentsCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('date', todayDate)
      .or(`client_name.eq.${name},client_name.ilike.%${email}%`);

    setStats({
      totalClients,
      activeApplications,
      todayAppointments: appointmentsCount || 0,
      overdueClients
    });
  };

  const fetchTodayFolders = async (name: string, email: string) => {
    const todayDate = format(new Date(), 'yyyy-MM-dd');
    
    // Fetch clients received/created today (RLS automatically filters by assigned employee)
    const { data: folders } = await supabase
      .from('clients')
      .select('id, full_name, status, visa_tracking_status, created_at, embassy_receipt_date, assigned_employee')
      .gte('created_at', `${todayDate}T00:00:00`)
      .lte('created_at', `${todayDate}T23:59:59`)
      .order('created_at', { ascending: false });

    setTodayFolders(folders || []);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'مكتمل': return 'bg-success text-success-foreground';
      case 'قيد المعالجة': return 'bg-warning text-warning-foreground';
      case 'جديد': return 'bg-primary text-primary-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const isOverdue = (client: ClientFolder) => {
    if (!client.embassy_receipt_date) return false;
    return isPast(parseISO(client.embassy_receipt_date)) && 
           client.visa_tracking_status !== 'اكتملت العملية';
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
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground">نظرة عامة على نشاطك</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="إجمالي العملاء"
          value={stats.totalClients}
          change="+0% هذا الشهر"
          changeType="positive"
          icon={Users}
        />
        <StatsCard
          title="الطلبات النشطة"
          value={stats.activeApplications}
          change="+0% هذا الأسبوع"
          changeType="positive"
          icon={FileText}
        />
        <StatsCard
          title="مواعيد اليوم"
          value={stats.todayAppointments}
          change={`${stats.todayAppointments} مجدولة`}
          changeType="neutral"
          icon={Calendar}
        />
        <StatsCard
          title="ملفات متأخرة"
          value={stats.overdueClients}
          change="تحتاج متابعة"
          changeType={stats.overdueClients > 0 ? "negative" : "neutral"}
          icon={AlertCircle}
        />
      </div>

      {/* Today's Folders */}
      <Card className="card-professional">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <FileText className="h-5 w-5" />
            <span>ملفات اليوم ({todayFolders.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayFolders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد ملفات جديدة اليوم</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayFolders.map((folder) => (
                <div
                  key={folder.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    isOverdue(folder) 
                      ? 'bg-destructive/10 border-destructive' 
                      : 'bg-card hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{folder.full_name}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusColor(folder.status)}>
                          {folder.status}
                        </Badge>
                        {folder.visa_tracking_status && (
                          <Badge variant="outline">
                            {folder.visa_tracking_status}
                          </Badge>
                        )}
                        {isOverdue(folder) && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            متأخر
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/manager/clients`)}
                    >
                      <Eye className="h-4 w-4 ml-2" />
                      عرض
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          variant="outline"
          className="h-24 flex-col space-y-2"
          onClick={() => navigate('/manager/clients')}
        >
          <Users className="h-6 w-6" />
          <span>العملاء</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex-col space-y-2"
          onClick={() => navigate('/manager/appointments')}
        >
          <Calendar className="h-6 w-6" />
          <span>المواعيد</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex-col space-y-2"
          onClick={() => navigate('/manager/clients')}
        >
          <FileText className="h-6 w-6" />
          <span>الملفات</span>
        </Button>
      </div>
    </div>
  );
}
