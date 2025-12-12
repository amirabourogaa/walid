import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, FileText, Phone, Mail, MapPin, Clock as ClockIcon, Download, Receipt, AlertCircle, Ban, QrCode, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SecureImage } from '@/components/SecureImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ClientProgressTimeline, ProgressStep } from '@/components/ClientProgressTimeline';
import { AddClientDialog } from '@/components/AddClientDialog';
import { EditClientDialog } from '@/components/EditClientDialog';
import { ClientQRCode } from '@/components/ClientQRCode';

import { generateClientPDF } from '@/lib/pdfGenerator';
import { generateClientListPDF } from '@/lib/clientsPdfGenerator';
import { VisaStatusTracker } from '@/components/VisaStatusTracker';
import { sendUrgentMessage, sendCantonCompletedMessage, sendPersonalAttendanceMessage, sendPaymentReminderMessage } from '@/lib/whatsappHelpers';
import { PersonalAttendanceDialog } from '@/components/PersonalAttendanceDialog';
import { generateQRCodeData } from '@/lib/qrCodeHelpers';
import { useClientFilters } from '@/hooks/useClientFilters';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { WhatsAppMessageHistory } from '@/components/WhatsAppMessageHistory';

interface Client {
  id: string;
  full_name: string;
  client_id_number?: string;
  whatsapp_number?: string;
  passport_number?: string;
  email?: string;
  nationality?: string;
  passport_status?: string;
  visa_tracking_status?: string;
  assigned_employee?: string;
  service_type?: string;
  destination_country?: string;
  china_visa_type?: string;
  visa_type?: string;
  profession?: string;
  tax_id?: string;
  personal_photo_url?: string;
  passport_photo_url?: string;
  documents_urls?: string[];
  amount?: number;
  currency?: string;
  entry_status?: string;
  submission_date?: string;
  embassy_receipt_date?: string;
  visa_start_date?: string;
  visa_end_date?: string;
  submitted_by?: string;
  summary?: string;
  notes?: string;
  qr_code_data?: string;
  invoice_status?: string;
  progress?: ProgressStep[];
  status: 'جديد' | 'قيد المعالجة' | 'اكتملت العملية' | 'مرفوضة';
  created_at: string;
  updated_at: string;
  daysRemaining?: number;
}

const statusColors = {
  'جديد': 'bg-blue-500',
  'قيد المعالجة': 'bg-yellow-500',
  'اكتملت العملية': 'bg-green-500',
  'مرفوضة': 'bg-red-500'
};

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [nationalityFilter, setNationalityFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [passportStatusFilter, setPassportStatusFilter] = useState<string>('all');
  const [whatsappFilter, setWhatsappFilter] = useState<string>('all');
  const [passportNumberFilter, setPassportNumberFilter] = useState<string>('all');
  const [visaStatusFilter, setVisaStatusFilter] = useState<string>('all');
  const [summaryFilter, setSummaryFilter] = useState<string>('all');
  const [noteFilter, setNoteFilter] = useState<string>('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [showUnvalidated, setShowUnvalidated] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [attendanceClient, setAttendanceClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    processing: 0,
    completed: 0,
    newThisMonth: 0,
  });
  
  const { filterClients, unvalidatedStats } = useClientFilters(clients);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const clientsData = data.map(client => ({
        ...client,
        progress: (client.progress as unknown as ProgressStep[]) || [],
        status: (client.status || 'جديد') as 'جديد' | 'قيد المعالجة' | 'اكتملت العملية' | 'مرفوضة',
        daysRemaining: calculateDaysRemaining(client.visa_start_date, client.visa_end_date),
      }));

      setClients(clientsData as Client[]);
      calculateStats(clientsData as Client[]);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('حدث خطأ أثناء تحميل العملاء');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDaysRemaining = (visaStartDate?: string, visaEndDate?: string): number => {
    if (!visaStartDate || !visaEndDate) return 0;
    const startDate = new Date(visaStartDate);
    const endDate = new Date(visaEndDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateStats = (clientsData: Client[]) => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    setStats({
      total: clientsData.length,
      processing: clientsData.filter(c => c.status === 'قيد المعالجة' || c.visa_tracking_status === 'قيد المعالجة').length,
      completed: clientsData.filter(c => c.status === 'اكتملت العملية' || c.visa_tracking_status === 'اكتملت العملية').length,
      newThisMonth: clientsData.filter(c => new Date(c.created_at) >= firstDayOfMonth).length,
    });
  };

  const handleDownloadPDF = async (client: Client) => {
    try {
      await generateClientPDF(client);
      toast.success('تم تنزيل ملف PDF بنجاح');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('حدث خطأ أثناء إنشاء ملف PDF');
    }
  };

  const handlePrintClientList = async () => {
    try {
      await generateClientListPDF(filteredClients, 'قائمة العملاء');
      toast.success('تم إنشاء ملف PDF للعملاء بنجاح');
    } catch (error) {
      console.error('Error generating clients list PDF:', error);
      toast.error('حدث خطأ أثناء إنشاء ملف PDF');
    }
  };

  const handleGenerateQRCode = async (client: Client) => {
    try {
      // Generate QR code data with client information
      const qrCodeData = generateQRCodeData({
        full_name: client.full_name,
        client_id_number: client.client_id_number,
        passport_number: client.passport_number,
        whatsapp_number: client.whatsapp_number
      });
      
      const { error } = await supabase
        .from('clients')
        .update({ qr_code_data: qrCodeData })
        .eq('id', client.id);

      if (error) throw error;

      toast.success('تم إنشاء رمز QR بنجاح');
      fetchClients();
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('حدث خطأ أثناء إنشاء رمز QR');
    }
  };

  const handleDownloadQRCode = (client: Client) => {
    try {
      const qrElement = document.getElementById(`qrcode-${client.id}`);
      if (!qrElement) {
        toast.error('رمز QR غير متوفر');
        return;
      }

      const svg = qrElement.querySelector('svg');
      if (!svg) {
        toast.error('رمز QR غير متوفر');
        return;
      }

      // Convert SVG to canvas and download
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `qrcode_${client.client_id_number || client.id}.png`;
        link.href = url;
        link.click();
        
        toast.success('تم تنزيل رمز QR بنجاح');
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('حدث خطأ أثناء تنزيل رمز QR');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;

    try {
      // Check for related data before deleting
      const [invoicesCheck, foldersCheck, appointmentsCheck, applicationsCheck] = await Promise.all([
        supabase.from('invoices').select('id').eq('client_id', clientId).limit(1),
        supabase.from('client_folders').select('id').eq('client_id', clientId).limit(1),
        supabase.from('appointments').select('id').eq('client_id', clientId).limit(1),
        supabase.from('applications').select('id').eq('client_id', clientId).limit(1)
      ]);

      const hasRelatedData = [
        invoicesCheck.data?.length,
        foldersCheck.data?.length,
        appointmentsCheck.data?.length,
        applicationsCheck.data?.length
      ].some(count => count && count > 0);

      if (hasRelatedData) {
        const relatedItems = [];
        if (invoicesCheck.data?.length) relatedItems.push('فواتير');
        if (foldersCheck.data?.length) relatedItems.push('ملفات');
        if (appointmentsCheck.data?.length) relatedItems.push('مواعيد');
        if (applicationsCheck.data?.length) relatedItems.push('طلبات');
        
        toast.error(
          `⚠ يوجد بيانات مرتبطة: ${relatedItems.join('، ')}. سيتم حذفها جميعاً مع العميل`,
          { duration: 5000 }
        );
      }

      // Delete the client (all related data will be automatically deleted via CASCADE)
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      toast.success('تم حذف العميل بنجاح');
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('حدث خطأ أثناء حذف العميل');
    }
  };

  const handleDeleteAllClients = async () => {
    try {
      // Delete all clients (CASCADE will handle all related data)
      const { error } = await supabase
        .from('clients')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) throw error;

      toast.success('تم حذف جميع العملاء بنجاح');
      fetchClients();
    } catch (error: any) {
      console.error('Error deleting all clients:', error);
      toast.error('حدث خطأ: ' + (error.message || 'خطأ غير معروف'));
    }
  };

  const basicFilteredClients = clients.filter(client => {
    // Exclude completed clients from active view
    if (client.status === 'اكتملت العملية') {
      return false;
    }
    
    const matchesSearch = client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.whatsapp_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.passport_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.client_id_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredClients = filterClients(
    statusFilter,
    nationalityFilter,
    employeeFilter,
    passportStatusFilter,
    whatsappFilter,
    passportNumberFilter,
    visaStatusFilter,
    summaryFilter,
    noteFilter,
    invoiceStatusFilter,
    showUnvalidated
  ).filter(client => {
    // Apply basic search filter
    const matchesSearch = client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.whatsapp_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.passport_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.client_id_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-6 space-y-6 font-arabic" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة العملاء</h1>
          <p className="text-muted-foreground">إدارة بيانات العملاء وملفاتهم</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handlePrintClientList} 
            variant="outline"
            className="space-x-2 space-x-reverse"
          >
            <Download className="h-4 w-4" />
            <span>طباعة القائمة</span>
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="space-x-2 space-x-reverse">
            <Plus className="h-4 w-4" />
            <span>إضافة عميل جديد</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي العملاء</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FileText className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">قيد المعالجة</p>
                <p className="text-2xl font-bold">{stats.processing}</p>
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
                <p className="text-sm font-medium text-muted-foreground">مكتملة</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Plus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">جديد هذا الشهر</p>
                <p className="text-2xl font-bold">{stats.newThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-professional">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="البحث في العملاء..."
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
                    <SelectItem value="قيد المعالجة">قيد المعالجة</SelectItem>
                    <SelectItem value="اكتملت العملية">اكتملت العملية</SelectItem>
                    <SelectItem value="مرفوضة">مرفوضة</SelectItem>
                    <SelectItem value="متأخرة">متأخرة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="space-x-2 space-x-reverse">
                    <Filter className="h-4 w-4" />
                    <span>{showAdvancedFilters ? 'إخفاء' : 'إظهار'} فلاتر متقدمة</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <Label className="text-xs mb-2">الجنسية</Label>
                      <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="كل الجنسيات" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">كل الجنسيات</SelectItem>
                          <SelectItem value="ليبي">ليبي</SelectItem>
                          <SelectItem value="تونسي">تونسي</SelectItem>
                          <SelectItem value="مصري">مصري</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs mb-2">الموظف المسؤول</Label>
                      <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="كل الموظفين" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">كل الموظفين</SelectItem>
                          {Array.from(new Set(clients.map(c => c.assigned_employee).filter(Boolean))).map(emp => (
                            <SelectItem key={emp} value={emp!}>{emp}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs mb-2">حالة الجواز</Label>
                      <Select value={passportStatusFilter} onValueChange={setPassportStatusFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="كل الحالات" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">كل الحالات</SelectItem>
                          <SelectItem value="موجود">موجود</SelectItem>
                          <SelectItem value="غير موجود">غير موجود</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs mb-2">رقم الواتساب</Label>
                      <Select value={whatsappFilter} onValueChange={setWhatsappFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="الكل" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="has_whatsapp">يوجد رقم</SelectItem>
                          <SelectItem value="no_whatsapp">لا يوجد رقم</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs mb-2">رقم الجواز</Label>
                      <Select value={passportNumberFilter} onValueChange={setPassportNumberFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="الكل" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="has_passport_number">يوجد رقم</SelectItem>
                          <SelectItem value="no_passport_number">لا يوجد رقم</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs mb-2">الملخص</Label>
                      <Select value={summaryFilter} onValueChange={setSummaryFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="الكل" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="has_summary">يوجد ملخص</SelectItem>
                          <SelectItem value="no_summary">لا يوجد ملخص</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs mb-2">الملاحظات</Label>
                      <Select value={noteFilter} onValueChange={setNoteFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="الكل" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="has_note">يوجد ملاحظات</SelectItem>
                          <SelectItem value="no_note">لا يوجد ملاحظات</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs mb-2">حالة الفاتورة</Label>
                      <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="الكل" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          <SelectItem value="مدفوعة">مدفوعة</SelectItem>
                          <SelectItem value="غير مدفوعة">غير مدفوعة</SelectItem>
                          <SelectItem value="متأخرة">متأخرة (+30 يوم)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-end">
                      <Button
                        variant={showUnvalidated ? 'default' : 'outline'}
                        onClick={() => setShowUnvalidated(!showUnvalidated)}
                        className="w-full h-9"
                        size="sm"
                      >
                        غير مكتملة ({unvalidatedStats.count})
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <div className="grid gap-6">
        {isLoading ? (
          <div className="text-center py-8">جاري التحميل...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-8">لا توجد عملاء</div>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id} className="card-professional hover-scale">
              <CardContent className="p-6">
                <div className="grid lg:grid-cols-[1fr,auto] gap-6">
                  {/* Main Info Section */}
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4 space-x-reverse">
                        <SecureImage
                          src={client.personal_photo_url}
                          alt={client.full_name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                          fallback={
                            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-lg">
                                {client.full_name?.split(' ')[0][0]}{client.full_name?.split(' ')[1]?.[0]}
                              </span>
                            </div>
                          }
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{client.full_name}</h3>
                          {client.client_id_number && (
                            <Badge variant="outline" className="mb-2 font-mono">
                              معرف العميل: {client.client_id_number}
                            </Badge>
                          )}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{client.whatsapp_number || 'غير محدد'}</span>
                            </div>
                            {client.email && (
                              <div className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span>{client.email}</span>
                              </div>
                            )}
                            {client.passport_number && (
                              <div className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground">
                                <FileText className="h-3 w-3" />
                                <span>جواز: {client.passport_number}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge className={`${statusColors[client.status]} text-white`}>
                        {client.status}
                      </Badge>
                    </div>

                    {/* Additional Client Info */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
                      {client.passport_status && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">حالة جواز السفر</p>
                          <p className="text-sm font-semibold">{client.passport_status}</p>
                        </div>
                      )}
                      {client.assigned_employee && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">الموظف المسؤول</p>
                          <p className="text-sm font-semibold">{client.assigned_employee}</p>
                        </div>
                      )}
                      {client.service_type && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">نوع الخدمة</p>
                          <p className="text-sm font-semibold">{client.service_type}</p>
                        </div>
                      )}
                      {client.submission_date && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">تاريخ التقديم</p>
                          <p className="text-sm font-semibold">{new Date(client.submission_date).toLocaleDateString('ar')}</p>
                        </div>
                      )}
                      {client.embassy_receipt_date && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">تاريخ استلام السفارة</p>
                          <p className="text-sm font-semibold">{new Date(client.embassy_receipt_date).toLocaleDateString('ar')}</p>
                        </div>
                      )}
                      {client.invoice_status && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">حالة الفاتورة</p>
                          <Badge variant={client.invoice_status === 'مدفوعة' ? 'default' : 'destructive'}>
                            {client.invoice_status}
                          </Badge>
                        </div>
                      )}
                      {client.amount && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">المبلغ المطلوب</p>
                          <p className="text-sm font-semibold">{client.amount} {client.currency || 'TND'}</p>
                        </div>
                      )}
                      {client.visa_start_date && client.visa_end_date && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">الأيام المتبقية</p>
                          <p className={`text-sm font-semibold ${calculateDaysRemaining(client.visa_start_date, client.visa_end_date) < 0 ? 'text-destructive' : 'text-success'}`}>
                            {calculateDaysRemaining(client.visa_start_date, client.visa_end_date)} يوم
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* QR Code Section */}
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold">رمز QR</h4>
                        {client.qr_code_data && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownloadQRCode(client)}
                          >
                            <Download className="h-4 w-4 ml-1" />
                            <span className="text-xs">تحميل</span>
                          </Button>
                        )}
                      </div>
                      {client.qr_code_data ? (
                        <div id={`qrcode-${client.id}`} className="flex justify-center">
                          <ClientQRCode value={client.qr_code_data} size={150} />
                        </div>
                      ) : (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          <p>رمز QR غير متوفر</p>
                          <p className="text-xs mt-1">انقر على "إنشاء رمز QR" لإنشاء الرمز</p>
                        </div>
                      )}
                    </div>

                    {/* WhatsApp Message History */}
                    <div className="mb-4">
                      <WhatsAppMessageHistory clientId={client.id} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">تم الإنشاء في</p>
                        <p className="text-sm">{new Date(client.created_at).toLocaleDateString('ar')}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => navigate('/manager/invoices', { state: { selectedClient: client } })}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Receipt className="h-4 w-4 ml-2" />
                        <span>إنشاء فاتورة</span>
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={async () => {
                          if (!client.whatsapp_number) {
                            toast.error('رقم الواتساب غير متوفر لهذا العميل');
                            return;
                          }
                          try {
                            await sendUrgentMessage(client);
                            toast.success('تم إرسال الرسالة العاجلة بنجاح');
                          } catch (error) {
                            toast.error('حدث خطأ في إرسال الرسالة');
                            console.error(error);
                          }
                        }}
                      >
                        <AlertCircle className="h-4 w-4 ml-2" />
                        <span>رسالة عاجلة</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-orange-500 text-orange-600 hover:bg-orange-50"
                        onClick={async () => {
                          if (!client.whatsapp_number) {
                            toast.error('رقم الواتساب غير متوفر لهذا العميل');
                            return;
                          }
                          try {
                            await sendCantonCompletedMessage(client);
                            toast.success('تم إرسال إشعار نهاية المعرض بنجاح');
                          } catch (error) {
                            toast.error('حدث خطأ في إرسال الرسالة');
                            console.error(error);
                          }
                        }}
                      >
                        <Ban className="h-4 w-4 ml-2" />
                        <span>نهاية المعرض</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-blue-500 text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          if (!client.whatsapp_number) {
                            toast.error('رقم الواتساب غير متوفر لهذا العميل');
                            return;
                          }
                          setAttendanceClient(client);
                          setIsAttendanceDialogOpen(true);
                        }}
                      >
                        <ClockIcon className="h-4 w-4 ml-2" />
                        <span>رسالة الحضور الشخصي</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                        onClick={async () => {
                          if (!client.whatsapp_number) {
                            toast.error('رقم الواتساب غير متوفر لهذا العميل');
                            return;
                          }
                          try {
                            await sendPaymentReminderMessage(client);
                            toast.success('تم إرسال رسالة التذكير بالدفع بنجاح');
                          } catch (error) {
                            toast.error('حدث خطأ في إرسال الرسالة');
                            console.error(error);
                          }
                        }}
                      >
                        <DollarSign className="h-4 w-4 ml-2" />
                        <span>رسالة تذكير بالدفع</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(client)}>
                        <Download className="h-4 w-4 ml-2" />
                        <span>تنزيل PDF</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleGenerateQRCode(client)}>
                        <QrCode className="h-4 w-4 ml-2" />
                        <span>إنشاء رمز QR</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedClient(client);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteClient(client.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Visa Status Tracker Section */}
                  <div className="lg:border-r lg:pr-6 lg:min-w-[280px]">
                    <VisaStatusTracker 
                      clientId={client.id}
                      clientName={client.full_name}
                      whatsappNumber={client.whatsapp_number}
                      currentStatus={client.visa_tracking_status}
                      onStatusChange={fetchClients}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AddClientDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
        onClientAdded={fetchClients}
      />

      <EditClientDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        client={selectedClient}
        onClientUpdated={fetchClients}
      />

      {attendanceClient && (
        <PersonalAttendanceDialog
          open={isAttendanceDialogOpen}
          onOpenChange={setIsAttendanceDialogOpen}
          clientName={attendanceClient.full_name}
          onSend={async (date, time) => {
            try {
              await sendPersonalAttendanceMessage(attendanceClient, date, time);
              toast.success('تم إرسال رسالة الحضور الشخصي بنجاح');
            } catch (error) {
              toast.error('حدث خطأ في إرسال الرسالة');
              console.error(error);
            }
          }}
        />
      )}
    </div>
  );
}