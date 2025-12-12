import { useState, useEffect } from 'react';
import { Search, Download, Eye, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateInvoiceHTML } from '@/lib/invoiceHtmlGenerator';

interface ArchivedInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  total_amount: number;
  currency: string;
  status: string;
  issue_date: string;
  archived_at: string;
  fiscal_year: number;
  services: any[];
  client_whatsapp?: string;
  client_tax_id?: string;
  client_email?: string;
  subtotal: number;
  tva_rate?: number;
  tva_amount?: number;
  discount_amount?: number;
  timbre_fiscal?: number;
  due_date?: string;
  notes?: string;
  flight_departure_city?: string;
  flight_arrival_city?: string;
  flight_departure_date?: string;
  flight_return_date?: string;
  flight_traveler_name?: string;
  hotel_name?: string;
  hotel_city?: string;
  hotel_checkin_date?: string;
  hotel_checkout_date?: string;
  hotel_guest_name?: string;
  hotel_room_type?: string;
}

const statusColors = {
  'مسودة': 'bg-gray-500',
  'مرسلة': 'bg-blue-500',
  'مدفوعة': 'bg-green-500',
  'متأخرة': 'bg-red-500',
  'ملغية': 'bg-gray-400'
};

export default function InvoicesArchivePage() {
  const [archivedInvoices, setArchivedInvoices] = useState<ArchivedInvoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchivedInvoices();
  }, []);

  const fetchArchivedInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices_archive')
        .select('*')
        .order('archived_at', { ascending: false });

      if (error) throw error;
      setArchivedInvoices((data || []).map(invoice => ({
        ...invoice,
        services: (invoice.services as any) || []
      })));
    } catch (error) {
      console.error('Error fetching archived invoices:', error);
      toast.error('حدث خطأ أثناء تحميل الفواتير المؤرشفة');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async (invoice: ArchivedInvoice, language: "FR" | "AR" = "FR") => {
    try {
      const invoiceData = {
        invoice_number: invoice.invoice_number,
        client_name: invoice.client_name,
        client_whatsapp: invoice.client_whatsapp,
        client_tax_id: invoice.client_tax_id,
        client_email: invoice.client_email,
        services: invoice.services.map((s: any) => ({
          description: s.description,
          quantity: s.quantity,
          unit_price: s.unitPrice || s.unit_price,
          amount: s.total || s.amount
        })),
        subtotal: invoice.subtotal,
        tva_rate: invoice.tva_rate,
        tva_amount: invoice.tva_amount,
        discount_amount: invoice.discount_amount,
        timbre_fiscal: invoice.timbre_fiscal,
        total_amount: invoice.total_amount,
        currency: invoice.currency,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        notes: invoice.notes,
        language: language,
        flight_departure_city: invoice.flight_departure_city,
        flight_arrival_city: invoice.flight_arrival_city,
        flight_departure_date: invoice.flight_departure_date,
        flight_return_date: invoice.flight_return_date,
        flight_traveler_name: invoice.flight_traveler_name,
        hotel_name: invoice.hotel_name,
        hotel_city: invoice.hotel_city,
        hotel_checkin_date: invoice.hotel_checkin_date,
        hotel_checkout_date: invoice.hotel_checkout_date,
        hotel_guest_name: invoice.hotel_guest_name,
        hotel_room_type: invoice.hotel_room_type
      };

      const htmlContent = generateInvoiceHTML(invoiceData);
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      }
      
      toast.success('تم فتح الفاتورة - يمكنك الطباعة أو حفظ PDF');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('حدث خطأ أثناء إنشاء الفاتورة');
    }
  };

  const filteredInvoices = archivedInvoices.filter(invoice => {
    const matchesSearch = invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = yearFilter === 'all' || invoice.fiscal_year.toString() === yearFilter;
    return matchesSearch && matchesYear;
  });

  const availableYears = [...new Set(archivedInvoices.map(inv => inv.fiscal_year))].sort((a, b) => b - a);

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
        <h1 className="text-3xl font-bold">أرشيف الفواتير</h1>
        <p className="text-muted-foreground">الفواتير المؤرشفة حسب السنة المالية</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-professional">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الفواتير المؤرشفة</p>
                <p className="text-2xl font-bold">{archivedInvoices.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-professional">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">السنوات المتاحة</p>
                <p className="text-2xl font-bold">{availableYears.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-professional">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المبلغ</p>
                <p className="text-2xl font-bold">
                  {archivedInvoices.reduce((sum, inv) => sum + inv.total_amount, 0).toLocaleString()} د.ت
                </p>
              </div>
              <Download className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن فاتورة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10"
          />
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="تصفية حسب السنة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع السنوات</SelectItem>
            {availableYears.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">لا توجد فواتير مؤرشفة</p>
          </Card>
        ) : (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="card-professional hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">{invoice.invoice_number}</span>
                      <Badge className={statusColors[invoice.status as keyof typeof statusColors]}>
                        {invoice.status}
                      </Badge>
                      <Badge variant="outline">السنة المالية {invoice.fiscal_year}</Badge>
                    </div>
                    <p className="text-sm font-medium">{invoice.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      تاريخ الإصدار: {new Date(invoice.issue_date).toLocaleDateString('ar-TN')}
                      {' | '}
                      تاريخ الأرشفة: {new Date(invoice.archived_at).toLocaleDateString('ar-TN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <p className="text-2xl font-bold">{invoice.total_amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{invoice.currency}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGeneratePDF(invoice, "FR")}
                      >
                        <Eye className="h-4 w-4 ml-2" />
                        FR
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGeneratePDF(invoice, "AR")}
                      >
                        <Eye className="h-4 w-4 ml-2" />
                        AR
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
