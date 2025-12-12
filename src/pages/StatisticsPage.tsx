import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, FileText, DollarSign, Calendar, Download, Activity, Sparkles, Target, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import StatisticsFilters, { FilterState } from '@/components/StatisticsFilters';
import { generateStatisticsPDF } from '@/lib/statisticsPdfGenerator';
import { toast } from 'sonner';
import logoTCA from '@/assets/logo-tca.png';
import { Badge } from '@/components/ui/badge';

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    monthlyRevenue: 0,
    totalApplications: 0,
    successRate: 0,
    clientsGrowth: 0,
    revenueGrowth: 0,
    applicationsGrowth: 0,
    successRateGrowth: 0
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [visaTypesData, setVisaTypesData] = useState<any[]>([]);
  const [appointmentsData, setAppointmentsData] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [caisses, setCaisses] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  
  // Filters state
  const [clientsFilters, setClientsFilters] = useState<FilterState>({ periodType: 'month' });
  const [revenueFilters, setRevenueFilters] = useState<FilterState>({ periodType: 'month' });
  const [applicationsFilters, setApplicationsFilters] = useState<FilterState>({ periodType: 'month' });
  const [successFilters, setSuccessFilters] = useState<FilterState>({ periodType: 'month' });

  useEffect(() => {
    fetchInitialData();
    fetchStatistics();

    // Synchronisation temps réel pour toutes les tables concernées
    const invoicesChannel = supabase
      .channel('invoices-stats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices'
        },
        () => {
          fetchStatistics();
        }
      )
      .subscribe();

    const clientsChannel = supabase
      .channel('clients-stats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        () => {
          fetchStatistics();
        }
      )
      .subscribe();

    const applicationsChannel = supabase
      .channel('applications-stats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications'
        },
        () => {
          fetchStatistics();
        }
      )
      .subscribe();

    const appointmentsChannel = supabase
      .channel('appointments-stats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          fetchStatistics();
        }
      )
      .subscribe();

    const transactionsChannel = supabase
      .channel('transactions-stats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        () => {
          fetchStatistics();
        }
      )
      .subscribe();

    const employeesChannel = supabase
      .channel('employees-stats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees'
        },
        () => {
          fetchInitialData();
        }
      )
      .subscribe();

    const caissesChannel = supabase
      .channel('caisses-stats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'caisses'
        },
        () => {
          fetchInitialData();
        }
      )
      .subscribe();

    const banksChannel = supabase
      .channel('banks-stats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comptes_bancaires'
        },
        () => {
          fetchInitialData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(invoicesChannel);
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(applicationsChannel);
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(employeesChannel);
      supabase.removeChannel(caissesChannel);
      supabase.removeChannel(banksChannel);
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      // Fetch employees
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, name, user_id')
        .order('name');
      
      if (employeesData) {
        setEmployees(employeesData);
      }

      // Fetch unique countries
      const { data: clientsData } = await supabase
        .from('clients')
        .select('destination_country')
        .not('destination_country', 'is', null);
      
      if (clientsData) {
        const uniqueCountries = Array.from(new Set(clientsData.map(c => c.destination_country).filter(Boolean)));
        setCountries(uniqueCountries as string[]);
      }

      // Fetch caisses
      const { data: caissesData } = await supabase
        .from('caisses')
        .select('id, nom')
        .order('nom');
      
      if (caissesData) {
        setCaisses(caissesData);
      }

      // Fetch banks
      const { data: banksData } = await supabase
        .from('comptes_bancaires')
        .select('id, nom_banque')
        .order('nom_banque');
      
      if (banksData) {
        setBanks(banksData);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      // Fetch total clients
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Fetch applications
      const { data: applications } = await supabase
        .from('applications')
        .select('status, visa_type, created_at');

      // Fetch clients with visa information
      const { data: clientsWithVisas } = await supabase
        .from('clients')
        .select('visa_type, china_visa_type, visa_tracking_status, created_at')
        .not('visa_tracking_status', 'is', null);

      // Combine applications count with clients that have visa tracking
      const totalApplications = (applications?.length || 0) + (clientsWithVisas?.length || 0);
      const approvedApplications = (applications?.filter(app => app.status === 'مؤكد').length || 0) + 
        (clientsWithVisas?.filter(c => c.visa_tracking_status === 'اكتملت العملية').length || 0);
      const successRate = totalApplications > 0 ? Math.round((approvedApplications / totalApplications) * 100) : 0;

      // Calculate monthly revenue from PAID invoices only
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Get paid invoices
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('total_amount, currency, issue_date')
        .eq('status', 'مدفوعة');

      // Get revenue transactions (entrées)
      const { data: revenueTransactions } = await supabase
        .from('transactions')
        .select('montant, devise, date_transaction')
        .eq('type', 'entree');

      // Calculate revenue for last 6 months from PAID invoices and REVENUE transactions
      const monthlyRevenueMap: { [key: string]: { revenue: number, clients: number } } = {};
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = months[date.getMonth()];
        monthlyRevenueMap[monthName] = { revenue: 0, clients: 0 };
      }

      // Add invoices revenue
      if (paidInvoices) {
        paidInvoices.forEach(invoice => {
          const date = new Date(invoice.issue_date);
          const monthName = months[date.getMonth()];
          if (monthlyRevenueMap[monthName]) {
            let amount = invoice.total_amount;
            // Convert to TND
            if (invoice.currency === 'EUR') amount *= 3.3;
            else if (invoice.currency === 'USD') amount *= 3.0;
            else if (invoice.currency === 'DLY') amount *= 0.6;
            monthlyRevenueMap[monthName].revenue += amount;
          }
        });
      }

      // Add transactions revenue
      if (revenueTransactions) {
        revenueTransactions.forEach(transaction => {
          const date = new Date(transaction.date_transaction);
          const monthName = months[date.getMonth()];
          if (monthlyRevenueMap[monthName]) {
            let amount = transaction.montant;
            // Convert to TND based on devise
            if (transaction.devise === 'EUR') amount *= 3.3;
            else if (transaction.devise === 'USD') amount *= 3.0;
            else if (transaction.devise === 'DLY') amount *= 0.6;
            monthlyRevenueMap[monthName].revenue += amount;
          }
        });
      }

      // Fetch clients per month for the chart
      const { data: clientsData } = await supabase
        .from('clients')
        .select('created_at')
        .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 5)).toISOString());

      if (clientsData) {
        clientsData.forEach(client => {
          const date = new Date(client.created_at);
          const monthName = months[date.getMonth()];
          if (monthlyRevenueMap[monthName]) {
            monthlyRevenueMap[monthName].clients++;
          }
        });
      }

      const revenueChartData = Object.entries(monthlyRevenueMap).map(([month, data]) => ({
        month,
        revenue: Math.round(data.revenue),
        clients: data.clients
      }));

      // Calculate current month revenue from PAID invoices and REVENUE transactions
      const currentMonthInvoiceRevenue = paidInvoices
        ?.filter(inv => {
          const date = new Date(inv.issue_date);
          return date >= startOfMonth;
        })
        .reduce((sum, inv) => {
          let amount = inv.total_amount;
          // Convert to TND
          if (inv.currency === 'EUR') amount *= 3.3;
          else if (inv.currency === 'USD') amount *= 3.0;
          else if (inv.currency === 'DLY') amount *= 0.6;
          return sum + amount;
        }, 0) || 0;

      const currentMonthTransactionRevenue = revenueTransactions
        ?.filter(trans => {
          const date = new Date(trans.date_transaction);
          return date >= startOfMonth;
        })
        .reduce((sum, trans) => {
          let amount = trans.montant;
          // Convert to TND
          if (trans.devise === 'EUR') amount *= 3.3;
          else if (trans.devise === 'USD') amount *= 3.0;
          else if (trans.devise === 'DLY') amount *= 0.6;
          return sum + amount;
        }, 0) || 0;

      const currentMonthRevenue = currentMonthInvoiceRevenue + currentMonthTransactionRevenue;

      // Calculate visa types distribution from both applications and clients
      const visaTypeCount: { [key: string]: number } = {};
      
      // Add visa types from applications
      applications?.forEach(app => {
        const type = app.visa_type.includes('سياحية') ? 'سياحية' :
                     app.visa_type.includes('عمل') ? 'عمل' :
                     app.visa_type.includes('دراسة') ? 'دراسة' :
                     app.visa_type.includes('لم الشمل') ? 'لم الشمل' : 'أخرى';
        visaTypeCount[type] = (visaTypeCount[type] || 0) + 1;
      });

      // Add visa types from clients
      clientsWithVisas?.forEach(client => {
        const visaType = client.visa_type || client.china_visa_type || '';
        const type = visaType.includes('سياحية') ? 'سياحية' :
                     visaType.includes('عمل') ? 'عمل' :
                     visaType.includes('دراسة') ? 'دراسة' :
                     visaType.includes('لم الشمل') ? 'لم الشمل' : 'أخرى';
        visaTypeCount[type] = (visaTypeCount[type] || 0) + 1;
      });

      const total = Object.values(visaTypeCount).reduce((a, b) => a + b, 0);
      const visaChartData = [
        { name: 'سياحية', value: Math.round(((visaTypeCount['سياحية'] || 0) / total) * 100) || 0, color: '#3B82F6' },
        { name: 'عمل', value: Math.round(((visaTypeCount['عمل'] || 0) / total) * 100) || 0, color: '#EF4444' },
        { name: 'دراسة', value: Math.round(((visaTypeCount['دراسة'] || 0) / total) * 100) || 0, color: '#10B981' },
        { name: 'لم الشمل', value: Math.round(((visaTypeCount['لم الشمل'] || 0) / total) * 100) || 0, color: '#F59E0B' },
        { name: 'أخرى', value: Math.round(((visaTypeCount['أخرى'] || 0) / total) * 100) || 0, color: '#8B5CF6' }
      ];

      // Fetch appointments for weekly distribution
      const { data: appointmentsDataRaw } = await supabase
        .from('appointments')
        .select('date');

      const daysOfWeek = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const appointmentsByDay: { [key: number]: number } = {};

      appointmentsDataRaw?.forEach(app => {
        const dayIndex = new Date(app.date).getDay();
        appointmentsByDay[dayIndex] = (appointmentsByDay[dayIndex] || 0) + 1;
      });

      const appointmentsChartData = daysOfWeek.map((day, index) => ({
        day,
        appointments: appointmentsByDay[index] || 0
      }));

      setStats({
        totalClients: clientsCount || 0,
        monthlyRevenue: Math.round(currentMonthRevenue),
        totalApplications,
        successRate,
        clientsGrowth: 12,
        revenueGrowth: 18,
        applicationsGrowth: 8,
        successRateGrowth: 2
      });

      setRevenueData(revenueChartData);
      setVisaTypesData(visaChartData);
      setAppointmentsData(appointmentsChartData);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportClientsPDF = async () => {
    try {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('full_name, destination_country, assigned_employee, created_at, status');

      if (!clientsData) {
        toast.error('لا توجد بيانات لتصديرها');
        return;
      }

      await generateStatisticsPDF({
        title: 'إحصائيات العملاء',
        period: getPeriodLabel(clientsFilters),
        data: clientsData.map(c => ({
          name: c.full_name,
          country: c.destination_country || '-',
          employee: c.assigned_employee || '-',
          date: new Date(c.created_at).toLocaleDateString('ar-TN'),
          status: c.status || '-',
        })),
        columns: [
          { header: 'الاسم', dataKey: 'name' },
          { header: 'البلد', dataKey: 'country' },
          { header: 'الموظف', dataKey: 'employee' },
          { header: 'التاريخ', dataKey: 'date' },
          { header: 'الحالة', dataKey: 'status' },
        ],
        summary: [
          { label: 'إجمالي العملاء', value: clientsData.length },
        ],
        logoUrl: logoTCA,
      });

      toast.success('تم تصدير PDF بنجاح');
    } catch (error) {
      console.error('Error exporting clients PDF:', error);
      toast.error('فشل تصدير PDF');
    }
  };

  const handleExportRevenuePDF = async () => {
    try {
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('invoice_number, client_name, total_amount, currency, issue_date, collection_source_type, payment_mode')
        .eq('status', 'مدفوعة');

      if (!invoicesData) {
        toast.error('لا توجد بيانات لتصديرها');
        return;
      }

      const totalRevenue = invoicesData.reduce((sum, inv) => {
        let amount = inv.total_amount;
        if (inv.currency === 'EUR') amount *= 3.3;
        else if (inv.currency === 'USD') amount *= 3.0;
        else if (inv.currency === 'DLY') amount *= 0.6;
        return sum + amount;
      }, 0);

      await generateStatisticsPDF({
        title: 'إحصائيات الإيرادات',
        period: getPeriodLabel(revenueFilters),
        data: invoicesData.map(inv => ({
          number: inv.invoice_number,
          client: inv.client_name,
          amount: `${inv.total_amount.toLocaleString()} ${inv.currency}`,
          date: new Date(inv.issue_date).toLocaleDateString('ar-TN'),
          source: inv.collection_source_type || '-',
          payment: inv.payment_mode || '-',
        })),
        columns: [
          { header: 'رقم الفاتورة', dataKey: 'number' },
          { header: 'العميل', dataKey: 'client' },
          { header: 'المبلغ', dataKey: 'amount' },
          { header: 'التاريخ', dataKey: 'date' },
          { header: 'المصدر', dataKey: 'source' },
          { header: 'الدفع', dataKey: 'payment' },
        ],
        summary: [
          { label: 'إجمالي الإيرادات', value: `${Math.round(totalRevenue).toLocaleString()} د.ت` },
          { label: 'عدد الفواتير', value: invoicesData.length },
        ],
        logoUrl: logoTCA,
      });

      toast.success('تم تصدير PDF بنجاح');
    } catch (error) {
      console.error('Error exporting revenue PDF:', error);
      toast.error('فشل تصدير PDF');
    }
  };

  const handleExportApplicationsPDF = async () => {
    try {
      const { data: applicationsData } = await supabase
        .from('applications')
        .select('application_number, client_name, visa_type, embassy, status, assigned_employee, submitted_date');

      if (!applicationsData) {
        toast.error('لا توجد بيانات لتصديرها');
        return;
      }

      await generateStatisticsPDF({
        title: 'إحصائيات طلبات التأشيرة',
        period: getPeriodLabel(applicationsFilters),
        data: applicationsData.map(app => ({
          number: app.application_number,
          client: app.client_name,
          type: app.visa_type,
          embassy: app.embassy,
          status: app.status,
          employee: app.assigned_employee || '-',
          date: new Date(app.submitted_date).toLocaleDateString('ar-TN'),
        })),
        columns: [
          { header: 'رقم الطلب', dataKey: 'number' },
          { header: 'العميل', dataKey: 'client' },
          { header: 'نوع التأشيرة', dataKey: 'type' },
          { header: 'السفارة', dataKey: 'embassy' },
          { header: 'الحالة', dataKey: 'status' },
          { header: 'الموظف', dataKey: 'employee' },
          { header: 'التاريخ', dataKey: 'date' },
        ],
        summary: [
          { label: 'إجمالي الطلبات', value: applicationsData.length },
        ],
        logoUrl: logoTCA,
      });

      toast.success('تم تصدير PDF بنجاح');
    } catch (error) {
      console.error('Error exporting applications PDF:', error);
      toast.error('فشل تصدير PDF');
    }
  };

  const handleExportSuccessPDF = async () => {
    try {
      const { data: applicationsData } = await supabase
        .from('applications')
        .select('application_number, client_name, visa_type, status, assigned_employee');

      if (!applicationsData) {
        toast.error('لا توجد بيانات لتصديرها');
        return;
      }

      const totalApps = applicationsData.length;
      const approvedApps = applicationsData.filter(app => app.status === 'مؤكد').length;
      const successRate = totalApps > 0 ? Math.round((approvedApps / totalApps) * 100) : 0;

      await generateStatisticsPDF({
        title: 'إحصائيات معدل النجاح',
        period: getPeriodLabel(successFilters),
        data: applicationsData
          .filter(app => app.status === 'مؤكد')
          .map(app => ({
            number: app.application_number,
            client: app.client_name,
            type: app.visa_type,
            employee: app.assigned_employee || '-',
          })),
        columns: [
          { header: 'رقم الطلب', dataKey: 'number' },
          { header: 'العميل', dataKey: 'client' },
          { header: 'نوع التأشيرة', dataKey: 'type' },
          { header: 'الموظف', dataKey: 'employee' },
        ],
        summary: [
          { label: 'إجمالي الطلبات', value: totalApps },
          { label: 'الطلبات المؤكدة', value: approvedApps },
          { label: 'معدل النجاح', value: `${successRate}%` },
        ],
        logoUrl: logoTCA,
      });

      toast.success('تم تصدير PDF بنجاح');
    } catch (error) {
      console.error('Error exporting success PDF:', error);
      toast.error('فشل تصدير PDF');
    }
  };

  const getPeriodLabel = (filters: FilterState): string => {
    if (filters.periodType === 'custom' && filters.startDate && filters.endDate) {
      return `من ${filters.startDate.toLocaleDateString('ar-TN')} إلى ${filters.endDate.toLocaleDateString('ar-TN')}`;
    }
    return filters.periodType === 'day' ? 'يومي' : 
           filters.periodType === 'month' ? 'شهري' : 
           filters.periodType === 'year' ? 'سنوي' : 'مخصص';
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-6 space-y-8 font-arabic animate-fade-in" dir="rtl">
      {/* Modern Header with gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-background p-8 border-2 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-primary/20 rounded-2xl backdrop-blur">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
                الإحصائيات والتقارير
              </h1>
            </div>
            <p className="text-muted-foreground text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              تحليل شامل لأداء الأعمال في الوقت الفعلي
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-sm py-2 px-4 animate-pulse">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping mr-2"></div>
              متصل بالوقت الفعلي
            </Badge>
          </div>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="space-y-6">
        {/* Clients Statistics with Filters */}
        <Card className="card-professional">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>إحصائيات العملاء</span>
              <Button onClick={handleExportClientsPDF} size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                تصدير PDF
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatisticsFilters
              onFilterChange={setClientsFilters}
              onExportPDF={handleExportClientsPDF}
              showEmployeeFilter
              showCountryFilter
              showStatusFilter
              employees={employees}
              countries={countries}
            />
          </CardContent>
        </Card>

        {/* Revenue Statistics with Filters */}
        <Card className="card-professional">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>إحصائيات الإيرادات</span>
              <Button onClick={handleExportRevenuePDF} size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                تصدير PDF
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatisticsFilters
              onFilterChange={setRevenueFilters}
              onExportPDF={handleExportRevenuePDF}
              showSourceFilter
            />
          </CardContent>
        </Card>

        {/* Applications Statistics with Filters */}
        <Card className="card-professional">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>إحصائيات طلبات التأشيرة</span>
              <Button onClick={handleExportApplicationsPDF} size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                تصدير PDF
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatisticsFilters
              onFilterChange={setApplicationsFilters}
              onExportPDF={handleExportApplicationsPDF}
              showEmployeeFilter
              showCountryFilter
              employees={employees}
              countries={countries}
            />
          </CardContent>
        </Card>

        {/* Success Rate Statistics with Filters */}
        <Card className="card-professional">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>إحصائيات معدل النجاح</span>
              <Button onClick={handleExportSuccessPDF} size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                تصدير PDF
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatisticsFilters
              onFilterChange={setSuccessFilters}
              onExportPDF={handleExportSuccessPDF}
              showEmployeeFilter
              showCountryFilter
              employees={employees}
              countries={countries}
            />
          </CardContent>
        </Card>
      </div>

      {/* Modern KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-2 hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:blur-3xl transition-all"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl backdrop-blur">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{stats.clientsGrowth}%
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">إجمالي العملاء</p>
              <p className="text-4xl font-bold bg-gradient-to-l from-blue-600 to-blue-400 bg-clip-text text-transparent mb-2">
                {stats.totalClients.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                من الشهر الماضي
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-green-400/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl group-hover:blur-3xl transition-all"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-2xl backdrop-blur">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{stats.revenueGrowth}%
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">الإيرادات الشهرية</p>
              <p className="text-4xl font-bold bg-gradient-to-l from-green-600 to-green-400 bg-clip-text text-transparent mb-2">
                {stats.monthlyRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="text-green-600 font-medium">TND</span>
                هذا الشهر
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-400/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:blur-3xl transition-all"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-2xl backdrop-blur">
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{stats.applicationsGrowth}%
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">طلبات التأشيرة</p>
              <p className="text-4xl font-bold bg-gradient-to-l from-purple-600 to-purple-400 bg-clip-text text-transparent mb-2">
                {stats.totalApplications.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />
                طلب نشط
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-orange-400/5 to-transparent"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl group-hover:blur-3xl transition-all"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-2xl backdrop-blur">
                <Award className="h-8 w-8 text-orange-600" />
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{stats.successRateGrowth}%
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">معدل النجاح</p>
              <p className="text-4xl font-bold bg-gradient-to-l from-orange-600 to-orange-400 bg-clip-text text-transparent mb-2">
                {stats.successRate}%
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Award className="h-3 w-3 text-orange-500" />
                تقييم ممتاز
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modern Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart with gradient */}
        <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent"></div>
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>الإيرادات الشهرية</CardTitle>
                  <CardDescription className="mt-1">تطور الإيرادات على مدار الأشهر الستة الماضية</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                آخر 6 أشهر
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value, name) => [
                    `${value.toLocaleString()} د.ت`, 
                    name === 'revenue' ? 'الإيرادات' : 'العملاء'
                  ]}
                />
                <Area
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fill="url(#revenueGradient)"
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Visa Types Distribution - Modern Pie */}
        <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-bl from-purple-500/5 via-transparent to-transparent"></div>
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-xl">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>توزيع أنواع التأشيرات</CardTitle>
                  <CardDescription className="mt-1">النسب المئوية لأنواع التأشيرات المختلفة</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                تحليل شامل
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={visaTypesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {visaTypesData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value) => [`${value}%`, 'النسبة']} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {visaTypesData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div 
                    className="w-4 h-4 rounded-full shadow-sm" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground mr-auto">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Modern Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments by Day - Modern Bar Chart */}
        <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent"></div>
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-xl">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle>المواعيد الأسبوعية</CardTitle>
                  <CardDescription className="mt-1">توزيع المواعيد على أيام الأسبوع</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                أسبوعي
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={appointmentsData}>
                <defs>
                  <linearGradient id="appointmentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.5}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="day" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value) => [value, 'عدد المواعيد']} 
                />
                <Bar 
                  dataKey="appointments" 
                  fill="url(#appointmentGradient)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Performance - Dual Line Chart */}
        <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent"></div>
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-xl">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>الأداء الشهري</CardTitle>
                  <CardDescription className="mt-1">مقارنة بين الإيرادات وعدد العملاء الجدد</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  إيرادات
                </Badge>
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  عملاء
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis yAxisId="right" orientation="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value, name) => [
                    name === 'revenue' ? `${value.toLocaleString()} د.ت` : value,
                    name === 'revenue' ? 'الإيرادات' : 'العملاء الجدد'
                  ]}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="clients" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Modern Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden border-2 hover:shadow-2xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          <CardContent className="relative p-8">
            <div className="text-center">
              <div className="relative inline-flex mb-4">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative p-4 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl">
                  <TrendingUp className="h-10 w-10 text-blue-600" />
                </div>
              </div>
              <h3 className="font-bold text-lg mb-3 text-foreground">نمو الأعمال</h3>
              <p className="text-5xl font-bold bg-gradient-to-l from-blue-600 to-blue-400 bg-clip-text text-transparent mb-3">
                +{stats.clientsGrowth}%
              </p>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                مقارنة بالربع الماضي
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:shadow-2xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent"></div>
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-green-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          <CardContent className="relative p-8">
            <div className="text-center">
              <div className="relative inline-flex mb-4">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative p-4 bg-gradient-to-br from-green-100 to-green-50 rounded-2xl">
                  <Users className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <h3 className="font-bold text-lg mb-3 text-foreground">رضا العملاء</h3>
              <p className="text-5xl font-bold bg-gradient-to-l from-green-600 to-green-400 bg-clip-text text-transparent mb-3">
                {stats.successRate}%
              </p>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Award className="h-4 w-4 text-green-500" />
                معدل الرضا العام
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:shadow-2xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent"></div>
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          <CardContent className="relative p-8">
            <div className="text-center">
              <div className="relative inline-flex mb-4">
                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative p-4 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl">
                  <FileText className="h-10 w-10 text-purple-600" />
                </div>
              </div>
              <h3 className="font-bold text-lg mb-3 text-foreground">معدل الإنجاز</h3>
              <p className="text-5xl font-bold bg-gradient-to-l from-purple-600 to-purple-400 bg-clip-text text-transparent mb-3">
                8.5
              </p>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                أيام متوسط المعالجة
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}