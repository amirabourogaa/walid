import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateTransactionExtractPDF } from "@/lib/transactionExtractPdfGenerator";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface TransactionExtractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionExtractDialog({ open, onOpenChange }: TransactionExtractDialogProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [caisses, setCaisses] = useState<any[]>([]);
  const [comptesbancaires, setComptesBancaires] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'day' | 'month' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCaisse, setSelectedCaisse] = useState<string>('all');
  const [selectedCompteBancaire, setSelectedCompteBancaire] = useState<string>('all');
  const [selectedDevise, setSelectedDevise] = useState<string>('all');

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

  // Fetch transactions, caisses and bank accounts when dialog opens
  useEffect(() => {
    if (open) {
      fetchTransactions();
      fetchCaisses();
      fetchComptesBancaires();
    }
  }, [open]);

  const fetchCaisses = async () => {
    const { data, error } = await supabase
      .from("caisses")
      .select("id, nom")
      .order("nom");
    
    if (error) {
      console.error("Error fetching caisses:", error);
      return;
    }
    setCaisses(data || []);
  };

  const fetchComptesBancaires = async () => {
    const { data, error } = await supabase
      .from("comptes_bancaires")
      .select("id, nom_banque")
      .order("nom_banque");
    
    if (error) {
      console.error("Error fetching bank accounts:", error);
      return;
    }
    setComptesBancaires(data || []);
  };

  const fetchTransactions = async () => {
    const { data: transactionsData, error: transactionsError } = await supabase
      .from("transactions")
      .select("*")
      .order("date_transaction", { ascending: false });
    
    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError);
      toast({ 
        title: "خطأ", 
        description: "فشل في تحميل المعاملات",
        variant: "destructive" 
      });
      return;
    }

    // Fetch related data separately
    const userIds = [...new Set(transactionsData.map(t => t.created_by).filter(Boolean))];
    const sourceIds = [...new Set(transactionsData.map(t => t.source_id).filter(Boolean))];
    const clientIds = [...new Set(transactionsData.map(t => t.entity_id).filter(id => id && transactionsData.find(t2 => t2.entity_id === id && t2.entity_type === 'client')))];
    
    const [profilesData, caissesData, comptesData, clientsData] = await Promise.all([
      userIds.length > 0 ? supabase.from("profiles").select("id, first_name, last_name").in("id", userIds) : Promise.resolve({ data: [] }),
      sourceIds.length > 0 ? supabase.from("caisses").select("id, nom").in("id", sourceIds) : Promise.resolve({ data: [] }),
      sourceIds.length > 0 ? supabase.from("comptes_bancaires").select("id, nom_banque").in("id", sourceIds) : Promise.resolve({ data: [] }),
      clientIds.length > 0 ? supabase.from("clients").select("id, full_name, client_id_number").in("id", clientIds) : Promise.resolve({ data: [] }),
    ]);

    // Map the data
    const enrichedTransactions = transactionsData.map(t => ({
      ...t,
      profiles: profilesData.data?.find(p => p.id === t.created_by),
      caisses: t.source_type === 'caisse' ? caissesData.data?.find(c => c.id === t.source_id) : null,
      comptes_bancaires: t.source_type === 'compte_bancaire' ? comptesData.data?.find(c => c.id === t.source_id) : null,
      entity_client: t.entity_type === 'client' && t.entity_id ? clientsData.data?.find(c => c.id === t.entity_id) : null,
    }));

    setTransactions(enrichedTransactions);
  };

  const handleGeneratePDF = async () => {
    let filteredTransactions = [...transactions];
    let filterValue = '';

    // Apply date filter
    if (filterType === 'day') {
      filteredTransactions = filteredTransactions.filter(t => t.date_transaction === startDate);
      filterValue = new Date(startDate).toLocaleDateString('ar-TN');
    } else if (filterType === 'month') {
      filteredTransactions = filteredTransactions.filter(t => {
        const date = new Date(t.date_transaction);
        return date.getMonth() + 1 === parseInt(selectedMonth) && date.getFullYear() === parseInt(selectedYear);
      });
      const monthLabel = months.find(m => m.value === selectedMonth)?.label;
      filterValue = `${monthLabel} ${selectedYear}`;
    } else if (filterType === 'year') {
      filteredTransactions = filteredTransactions.filter(t => {
        const date = new Date(t.date_transaction);
        return date.getFullYear() === parseInt(selectedYear);
      });
      filterValue = selectedYear;
    } else if (filterType === 'custom') {
      filteredTransactions = filteredTransactions.filter(t => {
        return t.date_transaction >= startDate && t.date_transaction <= endDate;
      });
      filterValue = `${new Date(startDate).toLocaleDateString('ar-TN')} - ${new Date(endDate).toLocaleDateString('ar-TN')}`;
    }

    // Apply transaction type filter
    if (selectedType !== 'all') {
      filteredTransactions = filteredTransactions.filter(t => t.type === selectedType);
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filteredTransactions = filteredTransactions.filter(t => t.categorie === selectedCategory);
    }

    // Apply caisse filter
    if (selectedCaisse !== 'all') {
      filteredTransactions = filteredTransactions.filter(t => 
        t.source_type === 'caisse' && t.source_id === selectedCaisse
      );
    }

    // Apply bank account filter
    if (selectedCompteBancaire !== 'all') {
      filteredTransactions = filteredTransactions.filter(t => 
        t.source_type === 'compte_bancaire' && t.source_id === selectedCompteBancaire
      );
    }

    // Apply currency filter
    if (selectedDevise !== 'all') {
      filteredTransactions = filteredTransactions.filter(t => t.devise === selectedDevise);
    }

    if (filteredTransactions.length === 0) {
      toast({ 
        title: "لا توجد معاملات", 
        description: "لا توجد معاملات في الفترة المحددة",
        variant: "destructive" 
      });
      return;
    }

    // Calculate totals by currency if multi-currency
    const totalsByDevise: { [devise: string]: { entree: number; sortie: number; solde: number } } = {};
    
    filteredTransactions.forEach(t => {
      const devise = t.devise || 'TND';
      if (!totalsByDevise[devise]) {
        totalsByDevise[devise] = { entree: 0, sortie: 0, solde: 0 };
      }
      
      const montant = parseFloat(t.montant);
      if (t.type === 'entree') {
        totalsByDevise[devise].entree += montant;
      } else {
        totalsByDevise[devise].sortie += montant;
      }
      totalsByDevise[devise].solde = totalsByDevise[devise].entree - totalsByDevise[devise].sortie;
    });

    const totalEntree = filteredTransactions
      .filter(t => t.type === 'entree')
      .reduce((sum, t) => sum + parseFloat(t.montant), 0);

    const totalSortie = filteredTransactions
      .filter(t => t.type === 'sortie')
      .reduce((sum, t) => sum + parseFloat(t.montant), 0);

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

    const transactionsData = filteredTransactions.map(t => {
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
        created_by_name: t.profiles ? `${t.profiles.first_name} ${t.profiles.last_name}` : '-',
        source_type: t.source_type,
        source_name: sourceName,
        entity_name: t.entity_name || '-'
      };
    });

    const filterTypeLabels = {
      'day': 'يوم',
      'month': 'شهر',
      'year': 'سنة',
      'custom': 'فترة مخصصة',
    };

    await generateTransactionExtractPDF({
      title: 'كشف المعاملات التفصيلي',
      filterType: filterTypeLabels[filterType],
      filterValue,
      transactions: transactionsData,
      totalEntree,
      totalSortie,
      solde,
      selectedDevise: selectedDevise === 'all' ? undefined : selectedDevise,
      totalsByDevise: selectedDevise === 'all' && Object.keys(totalsByDevise).length > 1 ? totalsByDevise : undefined,
      detailsByCaisse,
      detailsByBankAccount,
    });

    toast({ title: "تم إنشاء الكشف بنجاح" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>استخراج كشف المعاملات</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>نوع الفترة</Label>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">يوم</SelectItem>
                <SelectItem value="month">شهر</SelectItem>
                <SelectItem value="year">سنة</SelectItem>
                <SelectItem value="custom">فترة مخصصة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterType === 'day' && (
            <div>
              <Label>التاريخ</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          )}

          {filterType === 'month' && (
            <div className="grid grid-cols-2 gap-4">
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
                <Label>الشهر</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {filterType === 'year' && (
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
          )}

          {filterType === 'custom' && (
            <div className="space-y-4">
              <div>
                <Label>من تاريخ</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>إلى تاريخ</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <Label>نوع المعاملة</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="entree">إيراد</SelectItem>
                <SelectItem value="sortie">مصروف</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>الفئة</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>الصناديق</Label>
            <Select value={selectedCaisse} onValueChange={setSelectedCaisse}>
              <SelectTrigger>
                <SelectValue placeholder="كل الصناديق" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الصناديق</SelectItem>
                {caisses.map((caisse) => (
                  <SelectItem key={caisse.id} value={caisse.id}>
                    {caisse.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>الحساب البنكي</Label>
            <Select value={selectedCompteBancaire} onValueChange={setSelectedCompteBancaire}>
              <SelectTrigger>
                <SelectValue placeholder="كل الحسابات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحسابات</SelectItem>
                {comptesbancaires.map((compte) => (
                  <SelectItem key={compte.id} value={compte.id}>
                    {compte.nom_banque}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>العملة</Label>
            <Select value={selectedDevise} onValueChange={setSelectedDevise}>
              <SelectTrigger>
                <SelectValue placeholder="كل العملات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العملات</SelectItem>
                <SelectItem value="TND">دينار تونسي (TND)</SelectItem>
                <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                <SelectItem value="EUR">يورو (EUR)</SelectItem>
                <SelectItem value="DLY">دينار ليبي (DLY)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleGeneratePDF} className="w-full">
            إنشاء الكشف
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
