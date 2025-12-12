import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUpRight, ArrowDownRight, ArrowLeft, FileText, FolderOpen, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { generateTransactionExtractPDF } from "@/lib/transactionExtractPdfGenerator";
import { toast } from "@/hooks/use-toast";

const categories = [
  { value: "loyer", label: "إيجار" },
  { value: "steg", label: "STEG - الكهرباء والغاز" },
  { value: "sonede", label: "SONEDE - الماء" },
  { value: "internet", label: "الإنترنت" },
  { value: "mobile", label: "الهاتف المحمول" },
  { value: "bon_cadeau", label: "بطاقة هدايا / طعام" },
  { value: "fournisseur", label: "موردون" },
  { value: "ambassade", label: "سفارات" },
  { value: "transport", label: "نقل" },
  { value: "salaire", label: "رواتب" },
  { value: "avance_salaire", label: "تسبقة علي الراتب" },
  { value: "cnss", label: "CNSS - الضمان الاجتماعي" },
  { value: "finance", label: "إيرادات مالية" },
  { value: "autre", label: "أخرى" },
];

const paymentMethods = [
  { value: "espece", label: "نقدا" },
  { value: "cheque", label: "شيك" },
  { value: "virement", label: "تحويل بنكي" },
  { value: "carte_bancaire", label: "بطاقة بنكية" },
  { value: "traite", label: "كمبيالة" },
];

export default function TransactionsArchivePage() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [archiveFilePath, setArchiveFilePath] = useState<string | null>(null);

  const { data: archivedTransactions = [] } = useQuery({
    queryKey: ["transactions-archive", selectedYear, selectedMonth],
    queryFn: async () => {
      let query = supabase
        .from("transactions_archive")
        .select("*")
        .eq("archive_year", parseInt(selectedYear))
        .order("date_transaction", { ascending: false });

      if (selectedMonth && selectedMonth !== "all") {
        query = query.eq("archive_month", parseInt(selectedMonth));
      }

      const { data: transactionsData, error } = await query;
      if (error) throw error;
      
      // Get the archive file path from the first transaction
      if (transactionsData && transactionsData.length > 0 && transactionsData[0].archive_file_path) {
        setArchiveFilePath(transactionsData[0].archive_file_path);
      } else {
        setArchiveFilePath(null);
      }

      // Fetch related data separately
      const sourceIds = [...new Set(transactionsData.map(t => t.source_id).filter(Boolean))];
      
      if (sourceIds.length === 0) return transactionsData;

      const [caissesData, comptesData] = await Promise.all([
        supabase.from("caisses").select("id, nom").in("id", sourceIds),
        supabase.from("comptes_bancaires").select("id, nom_banque").in("id", sourceIds),
      ]);

      // Map the data
      const enrichedTransactions = transactionsData.map(t => ({
        ...t,
        caisses: t.source_type === 'caisse' ? caissesData.data?.find(c => c.id === t.source_id) : null,
        comptes_bancaires: t.source_type === 'compte_bancaire' ? comptesData.data?.find(c => c.id === t.source_id) : null,
      }));
      
      return enrichedTransactions;
    },
  });

  const years = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = [
    { value: "1", label: "جانفي" },
    { value: "2", label: "فيفري" },
    { value: "3", label: "مارس" },
    { value: "4", label: "أفريل" },
    { value: "5", label: "ماي" },
    { value: "6", label: "جوان" },
    { value: "7", label: "جويلية" },
    { value: "8", label: "أوت" },
    { value: "9", label: "سبتمبر" },
    { value: "10", label: "أكتوبر" },
    { value: "11", label: "نوفمبر" },
    { value: "12", label: "ديسمبر" },
  ];

  const filteredTransactions = archivedTransactions.filter((t: any) =>
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    categories.find(c => c.value === t.categorie)?.label.includes(searchTerm)
  );

  const handleGeneratePDF = async () => {
    const totalEntree = filteredTransactions
      .filter((t: any) => t.type === 'entree')
      .reduce((sum: number, t: any) => sum + parseFloat(t.montant), 0);

    const totalSortie = filteredTransactions
      .filter((t: any) => t.type === 'sortie')
      .reduce((sum: number, t: any) => sum + parseFloat(t.montant), 0);

    const solde = totalEntree - totalSortie;

    // Calculate details by source
    const detailsByCaisse: { [key: string]: { entree: number; sortie: number } } = {};
    const detailsByBankAccount: { [key: string]: { entree: number; sortie: number } } = {};

    filteredTransactions.forEach((t: any) => {
      const montant = parseFloat(t.montant);
      
      if (t.source_type === 'caisse' && t.caisses) {
        const caisseName = t.caisses.nom;
        if (!detailsByCaisse[caisseName]) {
          detailsByCaisse[caisseName] = { entree: 0, sortie: 0 };
        }
        if (t.type === 'entree') {
          detailsByCaisse[caisseName].entree += montant;
        } else {
          detailsByCaisse[caisseName].sortie += montant;
        }
      } else if (t.source_type === 'compte_bancaire' && t.comptes_bancaires) {
        const accountName = t.comptes_bancaires.nom_banque;
        if (!detailsByBankAccount[accountName]) {
          detailsByBankAccount[accountName] = { entree: 0, sortie: 0 };
        }
        if (t.type === 'entree') {
          detailsByBankAccount[accountName].entree += montant;
        } else {
          detailsByBankAccount[accountName].sortie += montant;
        }
      }
    });

    const transactions = filteredTransactions.map((t: any) => {
      let sourceName = '-';
      if (t.source_type === 'caisse' && t.caisses) {
        sourceName = t.caisses.nom;
      } else if (t.source_type === 'compte_bancaire' && t.comptes_bancaires) {
        sourceName = t.comptes_bancaires.nom_banque;
      }

      return {
        type: t.type,
        categorie: t.categorie,
        description: t.description || '',
        montant: parseFloat(t.montant),
        devise: t.devise,
        mode_paiement: t.mode_paiement,
        date_transaction: t.date_transaction,
        created_by_name: '-',
        source_type: t.source_type,
        source_name: sourceName,
      };
    });

    const monthLabel = selectedMonth && selectedMonth !== "all" ? months.find(m => m.value === selectedMonth)?.label : "جميع الأشهر";
    
    await generateTransactionExtractPDF({
      title: 'كشف المعاملات المؤرشفة',
      filterType: 'الفترة',
      filterValue: `${monthLabel} ${selectedYear}`,
      transactions,
      totalEntree,
      totalSortie,
      solde,
      detailsByCaisse,
      detailsByBankAccount,
    });

    toast({ title: "تم إنشاء الكشف بنجاح" });
  };

  const handleDownloadArchiveFile = async () => {
    if (!archiveFilePath) {
      toast({ 
        title: "خطأ", 
        description: "لا يوجد ملف أرشيف لهذه الفترة",
        variant: "destructive" 
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('transaction-archives')
        .download(archiveFilePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = archiveFilePath.split('/').pop() || 'archive.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "تم تحميل ملف الأرشيف بنجاح" });
    } catch (error) {
      console.error('Error downloading archive file:', error);
      toast({ 
        title: "خطأ", 
        description: "فشل في تحميل ملف الأرشيف",
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">أرشيف المعاملات</h1>
          {archiveFilePath && (
            <p className="text-sm text-muted-foreground mt-1">
              <FolderOpen className="inline h-4 w-4 mr-1" />
              Dossier: {archiveFilePath.split('/')[0]}/{archiveFilePath.split('/')[1]}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {archiveFilePath && (
            <Button variant="outline" onClick={handleDownloadArchiveFile}>
              <Download className="ml-2 h-4 w-4" />
              تحميل ملف JSON
            </Button>
          )}
          <Button variant="outline" onClick={handleGeneratePDF} disabled={filteredTransactions.length === 0}>
            <FileText className="ml-2 h-4 w-4" />
            استخراج كشف PDF
          </Button>
          <Button variant="outline" onClick={() => navigate("/manager/transactions")}>
            <ArrowLeft className="ml-2 h-4 w-4" />
            رجوع
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <Label>السنة</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>الشهر (اختياري)</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="جميع الأشهر" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأشهر</SelectItem>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>بحث</Label>
          <Input
            placeholder="ابحث في الوصف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            لا توجد معاملات مؤرشفة للفترة المحددة
          </Card>
        ) : (
          filteredTransactions.map((transaction: any) => (
            <Card key={transaction.id} className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {transaction.type === "entree" ? (
                    <ArrowDownRight className="h-5 w-5 text-green-600" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-bold">
                      {categories.find((c) => c.value === transaction.categorie)?.label}
                    </p>
                    {transaction.description && (
                      <p className="text-sm text-muted-foreground">{transaction.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {transaction.type === "entree" ? "+" : "-"}
                    {parseFloat(transaction.montant).toFixed(3)} {transaction.devise}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {paymentMethods.find((m) => m.value === transaction.mode_paiement)?.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(transaction.date_transaction), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
