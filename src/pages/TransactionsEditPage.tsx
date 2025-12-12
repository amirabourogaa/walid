import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Download, Archive } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Separator } from "@/components/ui/separator";

interface ArchivePeriod {
  month: number;
  year: number;
  label: string;
  value: string;
}

interface Transaction {
  id: string;
  type: 'entree' | 'sortie';
  categorie: string;
  montant: number;
  devise: 'TND' | 'EUR' | 'USD' | 'DLY';
  mode_paiement: 'espece' | 'cheque' | 'virement' | 'carte_bancaire' | 'traite';
  description?: string;
  date_transaction: string;
  source_type?: string;
  source_id?: string;
  created_at?: string;
  updated_at?: string;
}

const categories = [
  { value: "autre", label: "أخرى" },
  { value: "salaire", label: "راتب" },
  { value: "achat", label: "شراء" },
  { value: "vente", label: "بيع" },
];

const paymentMethods = [
  { value: "espece", label: "نقدا" },
  { value: "cheque", label: "شيك" },
  { value: "virement", label: "تحويل بنكي" },
  { value: "carte_bancaire", label: "بطاقة بنكية" },
  { value: "traite", label: "كمبيالة" },
];

const currencies = [
  { value: "TND", label: "TND - دينار تونسي" },
  { value: "EUR", label: "EUR - يورو" },
  { value: "USD", label: "USD - دولار أمريكي" },
];

export default function TransactionsEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<string>("");
  const [archives, setArchives] = useState<ArchivePeriod[]>([]);

  useEffect(() => {
    if (id) {
      fetchTransaction();
      fetchArchives();
    }
  }, [id]);

  const fetchTransaction = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTransaction(data);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      toast.error('حدث خطأ أثناء تحميل المعاملة');
      navigate('/manager/transactions-history');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchArchives = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions_archive')
        .select('archive_month, archive_year')
        .order('archive_year', { ascending: false })
        .order('archive_month', { ascending: false });

      if (error) throw error;

      // Get unique month/year combinations
      const uniqueArchives = new Map<string, ArchivePeriod>();
      
      data?.forEach((archive) => {
        const key = `${archive.archive_year}-${archive.archive_month}`;
        if (!uniqueArchives.has(key)) {
          const date = new Date(archive.archive_year, archive.archive_month - 1);
          const monthName = date.toLocaleDateString('ar-TN', { month: 'long', year: 'numeric' });
          uniqueArchives.set(key, {
            month: archive.archive_month,
            year: archive.archive_year,
            label: monthName,
            value: key,
          });
        }
      });

      setArchives(Array.from(uniqueArchives.values()));
    } catch (error) {
      console.error('Error fetching archives:', error);
    }
  };

  const handleSave = async () => {
    if (!transaction) return;

    setIsSaving(true);
    try {
      // Fetch original transaction to compare date
      const { data: originalData, error: fetchError } = await supabase
        .from('transactions')
        .select('date_transaction')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('transactions')
        .update({
          type: transaction.type,
          categorie: transaction.categorie as any,
          montant: transaction.montant,
          devise: transaction.devise,
          mode_paiement: transaction.mode_paiement,
          description: transaction.description,
          date_transaction: transaction.date_transaction,
        })
        .eq('id', id);

      if (error) throw error;

      // Check if date was changed
      const originalDate = new Date(originalData.date_transaction);
      const newDate = new Date(transaction.date_transaction);
      const dateChanged = originalDate.getTime() !== newDate.getTime();

      if (dateChanged) {
        const originalMonth = originalDate.toLocaleDateString('ar-TN', { month: 'long', year: 'numeric' });
        const newMonth = newDate.toLocaleDateString('ar-TN', { month: 'long', year: 'numeric' });
        toast.success(`تم نقل المعاملة من ${originalMonth} إلى ${newMonth}`);
      } else {
        toast.success('تم حفظ التغييرات بنجاح');
      }
      
      navigate('/manager/transactions-history');
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('حدث خطأ أثناء حفظ التغييرات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveTransfer = async () => {
    if (!transaction || !selectedArchive) {
      toast.error('يرجى اختيار أرشيف من القائمة');
      return;
    }

    setIsArchiving(true);
    try {
      // Parse selected archive value (format: "year-month")
      const [year, month] = selectedArchive.split('-').map(Number);
      
      // Use first day of the selected month as the date_transaction
      const archiveDate = new Date(year, month - 1, 1).toISOString().split('T')[0];

      // Insert into transactions_archive
      const archiveData = {
        original_transaction_id: transaction.id,
        type: transaction.type,
        categorie: transaction.categorie,
        montant: transaction.montant,
        devise: transaction.devise as string,
        mode_paiement: transaction.mode_paiement,
        description: transaction.description || null,
        date_transaction: archiveDate,
        source_type: transaction.source_type || null,
        source_id: transaction.source_id || null,
        created_by: null,
        created_at: transaction.created_at || new Date().toISOString(),
        updated_at: transaction.updated_at || new Date().toISOString(),
        archive_month: month,
        archive_year: year,
      };

      const { error: archiveError } = await supabase
        .from('transactions_archive')
        .insert(archiveData as any);

      if (archiveError) throw archiveError;

      // Delete from transactions
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      const selectedArchiveData = archives.find(a => a.value === selectedArchive);
      toast.success(`تم نقل المعاملة إلى أرشيف ${selectedArchiveData?.label}`);
      navigate('/manager/transactions-history');
    } catch (error) {
      console.error('Error archiving transaction:', error);
      toast.error('حدث خطأ أثناء أرشفة المعاملة');
    } finally {
      setIsArchiving(false);
    }
  };

  const generatePDF = () => {
    if (!transaction) return;

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('تفاصيل المعاملة', 105, 20, { align: 'center' });
    
    // Add transaction details
    doc.setFontSize(12);
    const details = [
      ['النوع', transaction.type === 'entree' ? 'إيراد' : 'مصروف'],
      ['الفئة', categories.find(c => c.value === transaction.categorie)?.label || transaction.categorie],
      ['المبلغ', `${transaction.montant} ${transaction.devise}`],
      ['طريقة الدفع', paymentMethods.find(p => p.value === transaction.mode_paiement)?.label || transaction.mode_paiement],
      ['التاريخ', new Date(transaction.date_transaction).toLocaleDateString('ar-TN')],
      ['الوصف', transaction.description || '-'],
    ];

    (doc as any).autoTable({
      startY: 40,
      head: [['الحقل', 'القيمة']],
      body: details,
      styles: { font: 'helvetica', fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`transaction-${transaction.id}.pdf`);
    toast.success('تم تحميل PDF بنجاح');
  };

  if (isLoading) {
    return <div className="container mx-auto p-6">جاري التحميل...</div>;
  }

  if (!transaction) {
    return <div className="container mx-auto p-6">المعاملة غير موجودة</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/manager/transactions-history')}>
            <ArrowLeft className="h-4 w-4 ml-2" />
            رجوع
          </Button>
          <h1 className="text-3xl font-bold">تعديل المعاملة</h1>
        </div>
        <Button variant="outline" onClick={generatePDF}>
          <Download className="h-4 w-4 ml-2" />
          تحميل PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات المعاملة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>النوع *</Label>
              <Select
                value={transaction.type}
                onValueChange={(value: 'entree' | 'sortie') =>
                  setTransaction({ ...transaction, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entree">إيراد</SelectItem>
                  <SelectItem value="sortie">مصروف</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>الفئة *</Label>
              <Select
                value={transaction.categorie}
                onValueChange={(value: any) =>
                  setTransaction({ ...transaction, categorie: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>المبلغ *</Label>
              <Input
                type="number"
                value={transaction.montant}
                onChange={(e) =>
                  setTransaction({ ...transaction, montant: parseFloat(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>العملة *</Label>
              <Select
                value={transaction.devise}
                onValueChange={(value: 'TND' | 'EUR' | 'USD') =>
                  setTransaction({ ...transaction, devise: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>طريقة الدفع *</Label>
              <Select
                value={transaction.mode_paiement}
                onValueChange={(value: any) =>
                  setTransaction({ ...transaction, mode_paiement: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>تاريخ المعاملة - نقل إلى شهر آخر *</Label>
              <Input
                type="date"
                value={transaction.date_transaction}
                onChange={(e) =>
                  setTransaction({ ...transaction, date_transaction: e.target.value })
                }
                className="border-2"
              />
              <p className="text-xs text-muted-foreground">
                💡 تغيير التاريخ سينقل المعاملة إلى الشهر المحدد
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>الوصف</Label>
            <Textarea
              value={transaction.description || ''}
              onChange={(e) =>
                setTransaction({ ...transaction, description: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => navigate('/manager/transactions-history')}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>

          <Separator className="my-6" />

          <div className="space-y-4 bg-muted/50 p-6 rounded-lg border-2 border-primary/20">
            <div className="flex items-center gap-2 mb-4">
              <Archive className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">نقل إلى الأرشيف</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              نقل هذه المعاملة إلى أرشيف محدد. المعاملة لن تظهر في القائمة الحالية وسيتم نقلها إلى الأرشيف المحدد.
            </p>
            {archives.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label>اختر الأرشيف *</Label>
                  <Select
                    value={selectedArchive}
                    onValueChange={setSelectedArchive}
                  >
                    <SelectTrigger className="border-2 border-primary/30">
                      <SelectValue placeholder="اختر شهر الأرشيف..." />
                    </SelectTrigger>
                    <SelectContent>
                      {archives.map((archive) => (
                        <SelectItem key={archive.value} value={archive.value}>
                          {archive.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    💡 اختر الأرشيف الذي تريد نقل المعاملة إليه
                  </p>
                </div>
                <Button 
                  onClick={handleArchiveTransfer} 
                  disabled={isArchiving || !selectedArchive}
                  variant="destructive"
                  className="w-full"
                >
                  <Archive className="h-4 w-4 ml-2" />
                  {isArchiving ? 'جاري النقل...' : 'نقل إلى الأرشيف المحدد'}
                </Button>
              </>
            ) : (
              <div className="text-center p-4 bg-background rounded-lg border">
                <p className="text-sm text-muted-foreground">
                  لا توجد أرشيفات متاحة حالياً. سيتم إنشاء أرشيف تلقائياً في بداية كل شهر.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
