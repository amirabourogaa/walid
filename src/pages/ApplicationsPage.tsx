import { useState, useEffect } from 'react';
import { Plus, Search, Filter, FileText, Eye, Calendar, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ApplicationTimeline, TimelineStep } from '@/components/ApplicationTimeline';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { countries } from '@/lib/countries';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Application {
  id: string;
  client_id: string | null;
  client_name: string;
  visa_type: string;
  application_number: string;
  status: string;
  submitted_date: string;
  expected_date: string | null;
  documents_required: number;
  documents_submitted: number;
  embassy: string;
  progress: number;
  assigned_employee: string | null;
  deadline: string | null;
  timeline: any; // JSONB from database
}

const statusColors: { [key: string]: string } = {
  'جديد': 'bg-blue-500',
  'قيد المراجعة': 'bg-yellow-500',
  'مطلوب مستندات': 'bg-orange-500',
  'مقدم للسفارة': 'bg-purple-500',
  'مؤكد': 'bg-green-500',
  'مرفوض': 'bg-red-500'
};

const visaTypes = [
  'تأشيرة سياحية',
  'تأشيرة عمل',
  'تأشيرة دراسة',
  'تأشيرة لم الشمل',
  'تأشيرة علاج',
  'تأشيرة عبور',
  'مرافق'
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isTimelineDialogOpen, setIsTimelineDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    service_type: '',
    visa_type: '',
    destination: '',
    china_visa_type: '',
    amount: '',
    currency: 'TND',
    embassy: '',
    submitted_date: '',
    expected_date: ''
  });
  const [openClientCombobox, setOpenClientCombobox] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState('');

  useEffect(() => {
    fetchApplications();
    fetchClients();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('submitted_date', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('خطأ في تحميل الملفات');
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

  const generateApplicationNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `APP-${year}-${random}`;
  };

  const handleSubmit = async () => {
    try {
      const selectedClient = clients.find(c => c.id === formData.client_id);
      const applicationNumber = generateApplicationNumber();

      const visaTypeDisplay = formData.destination === 'الصين' && formData.china_visa_type
        ? `${formData.visa_type} - ${formData.destination} - ${formData.china_visa_type}`
        : `${formData.visa_type} - ${formData.destination}`;

      const { error } = await supabase
        .from('applications')
        .insert({
          client_id: formData.client_id || null,
          client_name: selectedClient?.full_name || formData.client_name,
          visa_type: visaTypeDisplay,
          application_number: applicationNumber,
          embassy: formData.embassy,
          submitted_date: formData.submitted_date,
          expected_date: formData.expected_date || null,
          status: 'جديد',
          progress: 0,
          documents_required: 0,
          documents_submitted: 0,
          timeline: [
            {
              id: '1',
              title: 'إيداع الملف',
              description: 'تم إنشاء الملف',
              status: 'completed',
              date: formData.submitted_date
            }
          ]
        });

      if (error) throw error;

      toast.success('تم إنشاء الملف بنجاح');
      setIsAddDialogOpen(false);
      setFormData({
        client_id: '',
        client_name: '',
        service_type: '',
        visa_type: '',
        destination: '',
        china_visa_type: '',
        amount: '',
        currency: 'TND',
        embassy: '',
        submitted_date: '',
        expected_date: ''
      });
      setClientSearchValue('');
      fetchApplications();
    } catch (error) {
      console.error('Error creating application:', error);
      toast.error('خطأ في إنشاء الملف');
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.application_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.visa_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || !statusFilter || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: applications.length,
    underReview: applications.filter(app => app.status === 'قيد المراجعة').length,
    atEmbassy: applications.filter(app => app.status === 'مقدم للسفارة').length,
    approved: applications.filter(app => app.status === 'مؤكد').length,
    missingDocs: applications.filter(app => app.status === 'مطلوب مستندات').length
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة الملفات</h1>
          <p className="text-muted-foreground">متابعة طلبات التأشيرات والمستندات</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="space-x-2 space-x-reverse">
              <Plus className="h-4 w-4" />
              <span>ملف جديد</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="font-arabic" dir="rtl">
            <DialogHeader>
              <DialogTitle>إنشاء ملف تأشيرة جديد</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل طلب التأشيرة الجديد
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>العميل</Label>
                <Popover open={openClientCombobox} onOpenChange={setOpenClientCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openClientCombobox}
                      className="w-full justify-between"
                    >
                      {formData.client_id
                        ? clients.find((client) => client.id === formData.client_id)?.full_name
                        : "اختر العميل"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="ابحث عن عميل..." value={clientSearchValue} onValueChange={setClientSearchValue} />
                      <CommandEmpty>لا يوجد عميل</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {clients
                          .filter((client) => 
                            client.full_name.toLowerCase().includes(clientSearchValue.toLowerCase())
                          )
                          .map((client) => (
                            <CommandItem
                              key={client.id}
                              value={client.full_name}
                              onSelect={() => {
                                setFormData({...formData, client_id: client.id});
                                setOpenClientCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.client_id === client.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {client.full_name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-type">نوع الخدمة</Label>
                <Select value={formData.service_type} onValueChange={(value) => setFormData({...formData, service_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الخدمة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="تأشيرات">تأشيرات</SelectItem>
                    <SelectItem value="حجز الفنادق">حجز الفنادق</SelectItem>
                    <SelectItem value="حجز الطيران">حجز الطيران</SelectItem>
                    <SelectItem value="معالجة">معالجة</SelectItem>
                    <SelectItem value="سياحة">سياحة</SelectItem>
                    <SelectItem value="دراسة">دراسة</SelectItem>
                    <SelectItem value="تصديق">تصديق</SelectItem>
                    <SelectItem value="أخرى">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visa-type">نوع التأشيرة</Label>
                <Select value={formData.visa_type} onValueChange={(value) => setFormData({...formData, visa_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع التأشيرة" />
                  </SelectTrigger>
                  <SelectContent>
                    {visaTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">الدولة المسافر إليها</Label>
                <Select value={formData.destination} onValueChange={(value) => setFormData({...formData, destination: value, china_visa_type: ''})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الدولة" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.nameAr}>
                        <span className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.nameAr}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.destination === 'الصين' && (
                <div className="space-y-2">
                  <Label htmlFor="china-visa-type">نوع التأشيرة الصينية</Label>
                  <Select value={formData.china_visa_type} onValueChange={(value) => setFormData({...formData, china_visa_type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع التأشيرة الصينية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L - سياحية">L - سياحية</SelectItem>
                      <SelectItem value="M - تجارية">M - تجارية</SelectItem>
                      <SelectItem value="F - زيارة">F - زيارة</SelectItem>
                      <SelectItem value="Z - عمل">Z - عمل</SelectItem>
                      <SelectItem value="X1 - دراسة طويلة المدى">X1 - دراسة طويلة المدى</SelectItem>
                      <SelectItem value="X2 - دراسة قصيرة المدى">X2 - دراسة قصيرة المدى</SelectItem>
                      <SelectItem value="Q1 - لم شمل">Q1 - لم شمل</SelectItem>
                      <SelectItem value="Q2 - زيارة عائلية">Q2 - زيارة عائلية</SelectItem>
                      <SelectItem value="S1 - إقامة خاصة">S1 - إقامة خاصة</SelectItem>
                      <SelectItem value="S2 - زيارة قصيرة">S2 - زيارة قصيرة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">المبلغ المطلوب</Label>
                  <Input 
                    id="amount" 
                    type="number"
                    step="0.01"
                    placeholder="0.00" 
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">العملة</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData({...formData, currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TND">TND - دينار تونسي</SelectItem>
                      <SelectItem value="USD">USD - دولار أمريكي</SelectItem>
                      <SelectItem value="EUR">EUR - يورو</SelectItem>
                      <SelectItem value="GBP">GBP - جنيه إسترليني</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="embassy">السفارة</Label>
                <Input 
                  id="embassy" 
                  placeholder="اسم السفارة" 
                  value={formData.embassy}
                  onChange={(e) => setFormData({...formData, embassy: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="submit-date">تاريخ التقديم</Label>
                  <Input 
                    id="submit-date" 
                    type="date" 
                    value={formData.submitted_date}
                    onChange={(e) => setFormData({...formData, submitted_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected-date">التاريخ المتوقع</Label>
                  <Input 
                    id="expected-date" 
                    type="date" 
                    value={formData.expected_date}
                    onChange={(e) => setFormData({...formData, expected_date: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 space-x-reverse">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSubmit}>
                إنشاء الملف
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الملفات</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">قيد المراجعة</p>
                <p className="text-2xl font-bold">{stats.underReview}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">بالسفارة</p>
                <p className="text-2xl font-bold">{stats.atEmbassy}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">مؤكدة</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-orange-100 rounded-lg">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">مستندات ناقصة</p>
                <p className="text-2xl font-bold">{stats.missingDocs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-professional">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="البحث في الملفات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="فلترة بالحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="جديد">جديد</SelectItem>
                  <SelectItem value="قيد المراجعة">قيد المراجعة</SelectItem>
                  <SelectItem value="مطلوب مستندات">مطلوب مستندات</SelectItem>
                  <SelectItem value="مقدم للسفارة">مقدم للسفارة</SelectItem>
                  <SelectItem value="مؤكد">مؤكد</SelectItem>
                  <SelectItem value="مرفوض">مرفوض</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="space-x-2 space-x-reverse">
              <Filter className="h-4 w-4" />
              <span>فلاتر متقدمة</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      <div className="grid gap-6">
        {filteredApplications.length > 0 ? (
          filteredApplications.map((application) => (
            <Card key={application.id} className="card-professional hover-scale">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4 space-x-reverse">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{application.client_name}</h3>
                      <p className="text-muted-foreground">{application.visa_type}</p>
                      <p className="text-sm text-muted-foreground">رقم الطلب: {application.application_number}</p>
                    </div>
                  </div>
                  <Badge className={`${statusColors[application.status] || 'bg-gray-500'} text-white`}>
                    {application.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                  {application.assigned_employee && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">الموظف المسؤول</p>
                      <div className="flex items-center space-x-2 space-x-reverse text-sm">
                        <User className="h-4 w-4 text-primary" />
                        <span>{application.assigned_employee}</span>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">السفارة</p>
                    <p className="text-sm">{application.embassy}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">تاريخ التقديم</p>
                    <p className="text-sm">{application.submitted_date}</p>
                  </div>
                  {application.deadline && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">الموعد النهائي</p>
                      <div className="flex items-center space-x-1 space-x-reverse">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <p className="text-sm font-medium text-orange-600">{application.deadline}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">تقدم الملف</span>
                      <span className="text-sm text-muted-foreground">{application.progress}%</span>
                    </div>
                    <Progress value={application.progress} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-3 space-x-reverse text-sm">
                      <span className="text-muted-foreground">
                        المستندات: {application.documents_submitted}/{application.documents_required}
                      </span>
                    </div>
                    <div className="flex space-x-2 space-x-reverse">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedApplication(application);
                          setIsTimelineDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 ml-2" />
                        عرض التفاصيل
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="card-professional">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">لا توجد ملفات</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Timeline Dialog */}
      <Dialog open={isTimelineDialogOpen} onOpenChange={setIsTimelineDialogOpen}>
        <DialogContent className="max-w-4xl font-arabic" dir="rtl">
          <DialogHeader>
            <DialogTitle>تتبع الملف</DialogTitle>
            <DialogDescription>
              {selectedApplication?.application_number} - {selectedApplication?.client_name}
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && Array.isArray(selectedApplication.timeline) && (
            <ApplicationTimeline steps={selectedApplication.timeline as TimelineStep[]} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}