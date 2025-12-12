import { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, User, MapPin, Search, Bell, AlertTriangle, Building2, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppointmentReminders } from '@/components/AppointmentReminders';

interface Appointment {
  id: string;
  client_id: string | null;
  client_name: string;
  appointment_type: string;
  date: string;
  time: string;
  status: string;
  location: string;
  notes?: string | null;
  embassy_receipt_date?: string | null;
  visa_end_date?: string | null;
}

const statusColors: { [key: string]: string } = {
  'مجدولة': 'bg-blue-500',
  'مؤكدة': 'bg-green-500',
  'مكتملة': 'bg-gray-500',
  'ملغية': 'bg-red-500'
};

const appointmentTypes = [
  'استشارة تأشيرة سياحية',
  'استشارة تأشيرة عمل',
  'استشارة تأشيرة دراسة',
  'تسليم الوثائق',
  'مراجعة الملف',
  'متابعة الحالة',
  'استلام جواز السفر'
];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [autoAppointments, setAutoAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    appointment_type: '',
    date: '',
    time: '',
    location: '',
    notes: ''
  });

  useEffect(() => {
    fetchAppointments();
    fetchClients();
    fetchAutoAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          clients!appointments_client_id_fkey (
            embassy_receipt_date,
            visa_end_date
          )
        `)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      
      // Transform data to flatten client info
      const transformedData = data?.map(appointment => ({
        ...appointment,
        embassy_receipt_date: appointment.clients?.embassy_receipt_date,
        visa_end_date: appointment.clients?.visa_end_date
      })) || [];
      
      setAppointments(transformedData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('خطأ في تحميل المواعيد');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchAutoAppointments = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, embassy_receipt_date, visa_end_date, whatsapp_number')
        .or(`embassy_receipt_date.gte.${today},visa_end_date.gte.${today}`);

      if (error) throw error;

      const generatedAppointments: Appointment[] = [];

      data?.forEach(client => {
        // Add embassy receipt date appointment
        if (client.embassy_receipt_date && client.embassy_receipt_date >= today) {
          generatedAppointments.push({
            id: `auto-embassy-${client.id}`,
            client_id: client.id,
            client_name: client.full_name,
            appointment_type: 'استلام من السفارة',
            date: client.embassy_receipt_date,
            time: '09:00',
            status: 'مجدولة',
            location: 'السفارة',
            notes: 'موعد تلقائي - تاريخ استلام السفارة',
            embassy_receipt_date: client.embassy_receipt_date,
            visa_end_date: client.visa_end_date
          });
        }

        // Add visa end date appointment
        if (client.visa_end_date && client.visa_end_date >= today) {
          generatedAppointments.push({
            id: `auto-visa-${client.id}`,
            client_id: client.id,
            client_name: client.full_name,
            appointment_type: 'انتهاء التأشيرة',
            date: client.visa_end_date,
            time: '10:00',
            status: 'مجدولة',
            location: 'تذكير',
            notes: 'موعد تلقائي - تاريخ نهاية التأشيرة',
            embassy_receipt_date: client.embassy_receipt_date,
            visa_end_date: client.visa_end_date
          });
        }
      });

      setAutoAppointments(generatedAppointments);
    } catch (error) {
      console.error('Error fetching auto appointments:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const selectedClient = clients.find(c => c.id === formData.client_id);
      
      const { error } = await supabase
        .from('appointments')
        .insert({
          client_id: formData.client_id || null,
          client_name: selectedClient?.full_name || formData.client_name,
          appointment_type: formData.appointment_type,
          date: formData.date,
          time: formData.time,
          location: formData.location,
          notes: formData.notes || null,
          status: 'مجدولة'
        });

      if (error) throw error;

      toast.success('تم إضافة الموعد بنجاح');
      setIsAddDialogOpen(false);
      setFormData({
        client_id: '',
        client_name: '',
        appointment_type: '',
        date: '',
        time: '',
        location: '',
        notes: ''
      });
      fetchAppointments();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('خطأ في إضافة الموعد');
    }
  };

  // Combine manual and auto appointments
  const allAppointments = [...appointments, ...autoAppointments].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });

  const filteredAppointments = allAppointments.filter(appointment => {
    const matchesSearch = appointment.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.appointment_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || appointment.date === dateFilter;
    const matchesStatus = statusFilter === "all" || !statusFilter || appointment.status === statusFilter;
    return matchesSearch && matchesDate && matchesStatus;
  });

  const todayAppointments = allAppointments.filter(app => app.date === new Date().toISOString().split('T')[0]);
  
  // Calculate stats
  const stats = {
    total: allAppointments.length,
    thisWeek: allAppointments.filter(app => {
      const appDate = new Date(app.date);
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return appDate >= today && appDate <= weekFromNow;
    }).length,
    confirmed: allAppointments.filter(app => app.status === 'مؤكدة').length,
    cancelled: allAppointments.filter(app => app.status === 'ملغية').length
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">إدارة المواعيد</h1>
          <p className="text-muted-foreground">جدولة ومتابعة مواعيد العملاء</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="space-x-2 space-x-reverse">
              <Plus className="h-4 w-4" />
              <span>موعد جديد</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="font-arabic" dir="rtl">
            <DialogHeader>
              <DialogTitle>إضافة موعد جديد</DialogTitle>
              <DialogDescription>
                حدد تفاصيل الموعد الجديد مع العميل
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client">العميل</Label>
                <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">نوع الموعد</Label>
                <Select value={formData.appointment_type} onValueChange={(value) => setFormData({...formData, appointment_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الموعد" />
                  </SelectTrigger>
                  <SelectContent>
                    {appointmentTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">التاريخ</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">الوقت</Label>
                  <Input 
                    id="time" 
                    type="time" 
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">المكان</Label>
                <Select value={formData.location} onValueChange={(value) => setFormData({...formData, location: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المكان" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="المكتب الرئيسي">المكتب الرئيسي</SelectItem>
                    <SelectItem value="المكتب الفرعي">المكتب الفرعي</SelectItem>
                    <SelectItem value="عبر الإنترنت">عبر الإنترنت</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea 
                  id="notes" 
                  placeholder="ملاحظات إضافية" 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 space-x-reverse">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSubmit}>
                حفظ الموعد
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Appointment Reminders */}
      <AppointmentReminders />

      {/* Today's Appointments */}
      <Card className="card-professional">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 space-x-reverse">
            <Calendar className="h-5 w-5" />
            <span>مواعيد اليوم</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAppointments.length > 0 ? (
            <div className="space-y-3">
              {todayAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{appointment.client_name}</p>
                      <p className="text-sm text-muted-foreground">{appointment.appointment_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <Badge className={`${statusColors[appointment.status] || 'bg-gray-500'} text-white`}>
                      {appointment.status}
                    </Badge>
                    <span className="text-sm font-medium">{appointment.time}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">لا توجد مواعيد اليوم</p>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي المواعيد</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-green-100 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">هذا الأسبوع</p>
                <p className="text-2xl font-bold">{stats.thisWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <User className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">مؤكدة</p>
                <p className="text-2xl font-bold">{stats.confirmed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-red-100 rounded-lg">
                <MapPin className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">ملغية</p>
                <p className="text-2xl font-bold">{stats.cancelled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-professional">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="البحث في المواعيد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full lg:w-48"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="فلترة بالحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="مجدولة">مجدولة</SelectItem>
                <SelectItem value="مؤكدة">مؤكدة</SelectItem>
                <SelectItem value="مكتملة">مكتملة</SelectItem>
                <SelectItem value="ملغية">ملغية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      <div className="grid gap-4">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((appointment) => {
            const today = new Date();
            const visaEndDate = appointment.visa_end_date ? new Date(appointment.visa_end_date) : null;
            const daysUntilExpiry = visaEndDate ? Math.floor((visaEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
            const isVisaExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
            const isVisaExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
            
            return (
              <Card key={appointment.id} className="card-professional hover-scale">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 space-x-reverse flex-1">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{appointment.client_name}</h3>
                          {appointment.id.startsWith('auto-') && (
                            <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200">
                              <Bell className="h-3 w-3" />
                              <span>تلقائي</span>
                            </Badge>
                          )}
                          {(isVisaExpiringSoon || isVisaExpired) && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{isVisaExpired ? 'منتهية' : 'تنتهي قريباً'}</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-3">{appointment.appointment_type}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center space-x-4 space-x-reverse text-sm">
                            <div className="flex items-center space-x-1 space-x-reverse text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>{appointment.date}</span>
                            </div>
                            <div className="flex items-center space-x-1 space-x-reverse text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{appointment.time}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 space-x-reverse text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{appointment.location}</span>
                          </div>
                        </div>
                        
                        {/* Client Important Dates */}
                        {(appointment.embassy_receipt_date || appointment.visa_end_date) && (
                          <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {appointment.embassy_receipt_date && (
                                <div className="flex items-center space-x-2 space-x-reverse text-sm">
                                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                                    <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">تاريخ استلام السفارة</p>
                                    <p className="font-medium">{appointment.embassy_receipt_date}</p>
                                  </div>
                                </div>
                              )}
                              
                              {appointment.visa_end_date && (
                                <div className="flex items-center space-x-2 space-x-reverse text-sm">
                                  <div className={`p-1.5 rounded ${
                                    isVisaExpired 
                                      ? 'bg-red-100 dark:bg-red-900/30' 
                                      : isVisaExpiringSoon 
                                      ? 'bg-orange-100 dark:bg-orange-900/30' 
                                      : 'bg-green-100 dark:bg-green-900/30'
                                  }`}>
                                    <FileCheck className={`h-4 w-4 ${
                                      isVisaExpired 
                                        ? 'text-red-600 dark:text-red-400' 
                                        : isVisaExpiringSoon 
                                        ? 'text-orange-600 dark:text-orange-400' 
                                        : 'text-green-600 dark:text-green-400'
                                    }`} />
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">تاريخ نهاية التأشيرة</p>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{appointment.visa_end_date}</p>
                                      {daysUntilExpiry !== null && (
                                        <span className={`text-xs font-medium ${
                                          isVisaExpired 
                                            ? 'text-red-600' 
                                            : isVisaExpiringSoon 
                                            ? 'text-orange-600' 
                                            : 'text-green-600'
                                        }`}>
                                          {isVisaExpired 
                                            ? `منتهية منذ ${Math.abs(daysUntilExpiry)} يوم` 
                                            : `باقي ${daysUntilExpiry} يوم`}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {appointment.notes && (
                          <p className="mt-3 text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                            {appointment.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={`${statusColors[appointment.status] || 'bg-gray-500'} text-white h-fit`}>
                      {appointment.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="card-professional">
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد مواعيد مطابقة للبحث</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}