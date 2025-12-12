import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Landmark, Edit, Trash2, Eye, EyeOff, TrendingUp, TrendingDown, FileText, Wallet, Building2, MapPin, CreditCard } from "lucide-react";
import TN from "country-flag-icons/react/3x2/TN";
import EU from "country-flag-icons/react/3x2/EU";
import US from "country-flag-icons/react/3x2/US";
import LY from "country-flag-icons/react/3x2/LY";
import wifakLogo from "@/assets/banks/wifak-bank-logo.png";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { generateBankAccountsArchivePDF } from "@/lib/bankAccountsArchivePdfGenerator";

interface CurrencyAmount {
  currency: string;
  amount: number;
}

interface BankAccount {
  id: string;
  nom_banque: string;
  type_compte: string;
  montants: CurrencyAmount[];
  code_secret: string | null;
  created_at: string;
}

interface FinancialSummary {
  currency: string;
  initialAmount: number;
  revenue: number;
  expenses: number;
  balance: number;
}

interface ArchivedAccount {
  id: string;
  original_compte_id: string;
  nom_banque: string;
  type_compte: string;
  montants: CurrencyAmount[];
  financial_summary: {
    [currency: string]: {
      initialAmount: number;
      revenue: number;
      expenses: number;
      balance: number;
    };
  };
  archive_month: number;
  archive_year: number;
  created_at: string;
  archived_at: string;
}

const tunisianBanks = [
  "البنك المركزي التونسي",
  "بنك تونس",
  "البنك الوطني الفلاحي",
  "بنك الإسكان",
  "بنك الأمان",
  "البنك العربي التونسي الدولي",
  "بنك التضامن التونسي",
  "بنك تونس والإمارات",
  "البنك التونسي الليبي",
  "البنك الفرنسي التونسي",
  "أمين بنك",
  "بنك الزيتونة",
  "بنك التمويل الصغير",
  "بنك تونس الخليجي",
  "بنك الوفاق",
  "Autre (saisir manuellement)",
];

const accountTypes = [
  { value: "courant", label: "حساب جاري" },
  { value: "epargne", label: "حساب توفير" },
  { value: "autre", label: "آخر" },
];

const currencies = ["TND", "EUR", "USD", "DLY"];

const getCurrencyFlag = (currency: string) => {
  const flagProps = { className: "w-8 h-6 rounded shadow-sm" };
  switch (currency) {
    case "TND":
      return <TN {...flagProps} />;
    case "EUR":
      return <EU {...flagProps} />;
    case "USD":
      return <US {...flagProps} />;
    case "DLY":
      return <LY {...flagProps} />;
    default:
      return null;
  }
};

const getCurrencyName = (currency: string) => {
  switch (currency) {
    case "TND":
      return "دينار تونسي";
    case "EUR":
      return "يورو";
    case "USD":
      return "دولار أمريكي";
    case "DLY":
      return "دينار ليبي";
    default:
      return currency;
  }
};

const getBankLogo = (bankName: string) => {
  const lowerBank = bankName.toLowerCase();
  
  if (lowerBank.includes("وفاق") || lowerBank.includes("wifak")) {
    return <img src={wifakLogo} alt="Wifak Bank" className="w-12 h-12 object-contain" />;
  }
  
  // Default icon for other banks
  const emoji = (() => {
    if (lowerBank.includes("مركزي") || lowerBank.includes("central")) {
      return "🏛️";
    } else if (lowerBank.includes("الوطني") || lowerBank.includes("national")) {
      return "🏦";
    } else if (lowerBank.includes("الأمان") || lowerBank.includes("amen")) {
      return "🔒";
    } else if (lowerBank.includes("زيتونة") || lowerBank.includes("zitouna")) {
      return "🕌";
    } else if (lowerBank.includes("الإسكان") || lowerBank.includes("habitat")) {
      return "🏘️";
    } else if (lowerBank.includes("التضامن") || lowerBank.includes("solidarite")) {
      return "🤲";
    } else if (lowerBank.includes("الفلاحي") || lowerBank.includes("agricole")) {
      return "🌾";
    } else if (lowerBank.includes("التمويل") || lowerBank.includes("finance")) {
      return "💰";
    } else {
      return "🏦";
    }
  })();
  
  return <div className="text-4xl flex items-center justify-center w-12 h-12">{emoji}</div>;
};

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

export default function BankAccountsPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [nomBanque, setNomBanque] = useState("");
  const [customBank, setCustomBank] = useState("");
  const [typeCompte, setTypeCompte] = useState("courant");
  const [montants, setMontants] = useState<CurrencyAmount[]>([{ currency: "TND", amount: 0 }]);
  const [codeSecret, setCodeSecret] = useState("");
  const [showAmounts, setShowAmounts] = useState<Record<string, boolean>>({});
  const [secretInput, setSecretInput] = useState("");
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [compareYear, setCompareYear] = useState((currentYear - 1).toString());
  const [compareMonth, setCompareMonth] = useState(currentMonth.toString());
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comptes_bancaires")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        montants: (d.montants as any) || []
      })) as BankAccount[];
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions-bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("source_type", "compte_bancaire");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: archivedAccounts = [] } = useQuery({
    queryKey: ["bank-accounts-archive", selectedYear, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comptes_bancaires_archive")
        .select("*")
        .eq("archive_year", parseInt(selectedYear))
        .eq("archive_month", parseInt(selectedMonth))
        .order("nom_banque", { ascending: true });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        montants: item.montants as unknown as CurrencyAmount[],
        financial_summary: item.financial_summary as unknown as ArchivedAccount['financial_summary'],
      }));
    },
  });

  const { data: compareAccounts = [] } = useQuery({
    queryKey: ["bank-accounts-archive-compare", compareYear, compareMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comptes_bancaires_archive")
        .select("*")
        .eq("archive_year", parseInt(compareYear))
        .eq("archive_month", parseInt(compareMonth))
        .order("nom_banque", { ascending: true });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        montants: item.montants as unknown as CurrencyAmount[],
        financial_summary: item.financial_summary as unknown as ArchivedAccount['financial_summary'],
      }));
    },
  });

  const calculateFinancialSummary = (accountId: string, montants: CurrencyAmount[]): FinancialSummary[] => {
    const accountTransactions = transactions.filter(t => t.source_id === accountId);
    const summaries: FinancialSummary[] = [];

    montants.forEach(m => {
      const revenue = accountTransactions
        .filter(t => t.devise === m.currency && t.type === 'entree')
        .reduce((sum, t) => sum + Number(t.montant), 0);
      
      const expenses = accountTransactions
        .filter(t => t.devise === m.currency && t.type === 'sortie')
        .reduce((sum, t) => sum + Number(t.montant), 0);

      // Calcul: المبلغ الأول - المصروفات + الإيرادات = المبلغ المتبقي
      // Formula: Initial Amount - Expenses + Revenue = Balance
      const balance = m.amount - expenses + revenue;

      summaries.push({
        currency: m.currency,
        initialAmount: m.amount,
        revenue,
        expenses,
        balance
      });
    });

    return summaries;
  };

  // Synchronisation temps réel
  useEffect(() => {
    const channel = supabase
      .channel('bank-accounts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comptes_bancaires'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async (account: any) => {
      const { error } = await supabase.from("comptes_bancaires").insert(account);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({ title: "حساب بنكي تم إنشاؤه بنجاح" });
      resetForm();
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from("comptes_bancaires").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({ title: "تم تحديث الحساب" });
      resetForm();
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comptes_bancaires").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({ title: "تم حذف الحساب" });
    },
  });

  const resetForm = () => {
    setNomBanque("");
    setCustomBank("");
    setTypeCompte("courant");
    setMontants([{ currency: "TND", amount: 0 }]);
    setCodeSecret("");
    setEditingAccount(null);
  };

  const handleSubmit = () => {
    const finalBankName = nomBanque === "Autre (saisir manuellement)" ? customBank : nomBanque;
    if (!finalBankName.trim()) {
      toast({ title: "اسم البنك مطلوب", variant: "destructive" });
      return;
    }
    const accountData = {
      nom_banque: finalBankName,
      type_compte: typeCompte,
      montants,
      code_secret: codeSecret || null,
    };
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, ...accountData });
    } else {
      createMutation.mutate(accountData);
    }
  };

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setNomBanque(account.nom_banque);
    setTypeCompte(account.type_compte);
    setMontants(account.montants.length > 0 ? account.montants : [{ currency: "TND", amount: 0 }]);
    setCodeSecret(account.code_secret || "");
    setDialogOpen(true);
  };

  const toggleShowAmount = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account?.code_secret) {
      setShowAmounts({ ...showAmounts, [accountId]: !showAmounts[accountId] });
      return;
    }
    if (showAmounts[accountId]) {
      setShowAmounts({ ...showAmounts, [accountId]: false });
      setSecretInput("");
      return;
    }
    const input = prompt("أدخل الرمز السري:");
    if (input === account.code_secret) {
      setShowAmounts({ ...showAmounts, [accountId]: true });
    } else {
      toast({ title: "رمز سري خاطئ", variant: "destructive" });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا الحساب؟")) {
      deleteMutation.mutate(id);
    }
  };

  const addMontant = () => {
    setMontants([...montants, { currency: "TND", amount: 0 }]);
  };

  const removeMontant = (index: number) => {
    setMontants(montants.filter((_, i) => i !== index));
  };

  const updateMontant = (index: number, field: keyof CurrencyAmount, value: string | number) => {
    const newMontants = [...montants];
    newMontants[index] = { ...newMontants[index], [field]: value };
    setMontants(newMontants);
  };

  const handleGenerateArchivePDF = async () => {
    try {
      if (archivedAccounts.length === 0) {
        toast({ 
          title: "خطأ", 
          description: "لا توجد بيانات لإنشاء التقرير",
          variant: "destructive" 
        });
        return;
      }

      // Prepare current period data
      const accountsData = archivedAccounts.flatMap(account => {
        return Object.entries(account.financial_summary).map(([currency, data]) => ({
          accountName: account.nom_banque,
          accountType: account.type_compte,
          currency,
          initialAmount: data.initialAmount,
          revenue: data.revenue,
          expenses: data.expenses,
          balance: data.balance
        }));
      });

      // Prepare comparison data if available
      let compareAccountsData;
      if (compareAccounts.length > 0) {
        compareAccountsData = compareAccounts.flatMap(account => {
          return Object.entries(account.financial_summary).map(([currency, data]) => ({
            accountName: account.nom_banque,
            accountType: account.type_compte,
            currency,
            initialAmount: data.initialAmount,
            revenue: data.revenue,
            expenses: data.expenses,
            balance: data.balance
          }));
        });
      }

      await generateBankAccountsArchivePDF({
        currentMonth: months.find(m => m.value === selectedMonth)?.label || selectedMonth,
        currentYear: parseInt(selectedYear),
        accounts: accountsData,
        compareMonth: compareAccounts.length > 0 ? months.find(m => m.value === compareMonth)?.label : undefined,
        compareYear: compareAccounts.length > 0 ? parseInt(compareYear) : undefined,
        compareAccounts: compareAccountsData
      });

      toast({ title: "تم إنشاء التقرير بنجاح" });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ 
        title: "خطأ", 
        description: "فشل في إنشاء التقرير",
        variant: "destructive" 
      });
    }
  };

  const years = Array.from({ length: 10 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">إدارة الحسابات البنكية</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              حساب جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAccount ? "تعديل الحساب" : "إضافة حساب بنكي"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>اسم البنك</Label>
                <Select value={nomBanque} onValueChange={setNomBanque}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر البنك" />
                  </SelectTrigger>
                  <SelectContent>
                    {tunisianBanks.map((bank) => (
                      <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {nomBanque === "Autre (saisir manuellement)" && (
                <div>
                  <Label>اسم البنك (إدخال يدوي)</Label>
                  <Input value={customBank} onChange={(e) => setCustomBank(e.target.value)} placeholder="أدخل اسم البنك" />
                </div>
              )}
              <div>
                <Label>نوع الحساب</Label>
                <Select value={typeCompte} onValueChange={setTypeCompte}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المبالغ بالعملات</Label>
                {montants.map((montant, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Select value={montant.currency} onValueChange={(v) => updateMontant(index, "currency", v)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((curr) => (
                          <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={montant.amount}
                      onChange={(e) => updateMontant(index, "amount", parseFloat(e.target.value) || 0)}
                      placeholder="المبلغ"
                      className="flex-1"
                    />
                    {montants.length > 1 && (
                      <Button variant="outline" size="icon" onClick={() => removeMontant(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" onClick={addMontant} className="mt-2">
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة عملة
                </Button>
              </div>
              <div>
                <Label>رمز سري (اختياري)</Label>
                <Input
                  type="password"
                  value={codeSecret}
                  onChange={(e) => setCodeSecret(e.target.value)}
                  placeholder="رمز سري لعرض المبالغ"
                />
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingAccount ? "تحديث" : "حفظ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="accounts" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="accounts">الحسابات النشطة</TabsTrigger>
          <TabsTrigger value="archives">أرشيف الحسابات</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          {isLoading ? (
            <p>جاري التحميل...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map((account) => {
                const financialSummaries = calculateFinancialSummary(account.id, account.montants);
                const isVisible = showAmounts[account.id];
                const totalBalance = financialSummaries.reduce((sum, s) => sum + s.balance, 0);
                
                return (
                  <Card key={account.id} className="overflow-hidden border-2 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                    <div className="bg-gradient-to-r from-blue-500/10 via-blue-400/5 to-background p-4 border-b">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center">{getBankLogo(account.nom_banque)}</div>
                          <div>
                            <CardTitle className="text-lg font-bold">{account.nom_banque}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {accountTypes.find((t) => t.value === account.type_compte)?.label}
                              </Badge>
                              {account.code_secret && (
                                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                  🔒 محمي
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleShowAmount(account.id)}
                          >
                            {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(account)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(account.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant={totalBalance >= 0 ? "default" : "destructive"} className="text-xs">
                          {totalBalance >= 0 ? "رصيد إيجابي" : "رصيد سالب"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {financialSummaries.length} عملة
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {financialSummaries.map((summary, idx) => (
                          <div key={idx}>
                            <div className="flex items-center justify-between p-4 bg-gradient-to-br from-muted/50 to-muted/20 rounded-lg border-2 mb-3">
                              <div className="flex items-center gap-3">
                                {getCurrencyFlag(summary.currency)}
                                <div>
                                  <p className="text-xs text-muted-foreground">{getCurrencyName(summary.currency)}</p>
                                  <p className="text-2xl font-bold mt-1">
                                    {isVisible ? summary.balance.toFixed(3) : "••••••"}
                                  </p>
                                  <p className="text-xs font-medium text-primary">{summary.currency}</p>
                                </div>
                              </div>
                            </div>
                            
                            {isVisible && (
                              <div className="space-y-2 bg-card/50 p-3 rounded-lg border">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="flex flex-col">
                                    <span className="text-muted-foreground mb-1">المبلغ الأولي</span>
                                    <span className="font-bold text-base">{summary.initialAmount.toFixed(3)}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-muted-foreground mb-1 flex items-center gap-1">
                                      <TrendingUp className="h-3 w-3" />
                                      الإيرادات
                                    </span>
                                    <span className="font-bold text-base text-green-600">+{summary.revenue.toFixed(3)}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-muted-foreground mb-1 flex items-center gap-1">
                                      <TrendingDown className="h-3 w-3" />
                                      المصروفات
                                    </span>
                                    <span className="font-bold text-base text-red-600">-{summary.expenses.toFixed(3)}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-muted-foreground mb-1">الصافي</span>
                                    <span className={`font-bold text-base ${(summary.revenue - summary.expenses) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                      {(summary.revenue - summary.expenses).toFixed(3)}
                                    </span>
                                  </div>
                                </div>
                                
                                <Separator />
                                
                                <div className="flex justify-between items-center pt-2">
                                  <span className="text-xs font-medium text-muted-foreground">الرصيد النهائي</span>
                                  <span className={`text-lg font-bold ${summary.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {summary.balance.toFixed(3)} {summary.currency}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {idx < financialSummaries.length - 1 && <Separator className="my-4" />}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archives">
          <Card className="p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">فلتر الأرشيف</h3>
              <Button onClick={handleGenerateArchivePDF} disabled={archivedAccounts.length === 0}>
                <FileText className="ml-2 h-4 w-4" />
                إنشاء تقرير PDF
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-4">الفترة الأساسية</h4>
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
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">فترة المقارنة</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>السنة</Label>
                    <Select value={compareYear} onValueChange={setCompareYear}>
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
                    <Select value={compareMonth} onValueChange={setCompareMonth}>
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
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            {archivedAccounts.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد حسابات بنكية مؤرشفة للفترة المحددة</p>
              </Card>
            ) : (
              archivedAccounts.map((account) => (
                <Card key={account.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{account.nom_banque}</h3>
                      <p className="text-muted-foreground">
                        {accountTypes.find((t) => t.value === account.type_compte)?.label}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {months.find((m) => m.value === account.archive_month.toString())?.label}{" "}
                      {account.archive_year}
                    </Badge>
                  </div>

                  <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="summary">الملخص المالي</TabsTrigger>
                      <TabsTrigger value="comparison">المقارنة</TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary">
                      <div className="space-y-3 mt-4">
                        <h4 className="font-semibold text-sm text-muted-foreground">الملخص المالي</h4>
                        {Object.entries(account.financial_summary).map(([currency, data]) => (
                          <div key={currency} className="bg-muted/50 rounded-lg p-3 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">العملة</span>
                              <Badge variant="outline">{currency}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">المبلغ الأول:</span>
                                <p className="font-semibold">{data.initialAmount.toFixed(3)} {currency}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">الإيرادات:</span>
                                <p className="font-semibold text-green-600 flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  {data.revenue.toFixed(3)} {currency}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">المصروفات:</span>
                                <p className="font-semibold text-red-600 flex items-center gap-1">
                                  <TrendingDown className="h-3 w-3" />
                                  {data.expenses.toFixed(3)} {currency}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">المبلغ المتبقي:</span>
                                <p className="font-bold text-primary">{data.balance.toFixed(3)} {currency}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="comparison">
                      {(() => {
                        const compareAccount = compareAccounts.find(
                          (a) => a.original_compte_id === account.original_compte_id
                        );

                        if (!compareAccount) {
                          return (
                            <div className="text-center text-muted-foreground py-4">
                              لا توجد بيانات للمقارنة
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold mb-2">
                                  {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                                </h4>
                                <div className="space-y-2">
                                  {Object.entries(account.financial_summary).map(([currency, data]) => (
                                    <div key={currency} className="bg-muted/50 rounded-lg p-2 text-sm">
                                      <Badge variant="outline" className="mb-1">{currency}</Badge>
                                      <p>الإيرادات: {data.revenue.toFixed(3)}</p>
                                      <p>المصروفات: {data.expenses.toFixed(3)}</p>
                                      <p className="font-bold">الرصيد: {data.balance.toFixed(3)}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2">
                                  {months.find((m) => m.value === compareMonth)?.label} {compareYear}
                                </h4>
                                <div className="space-y-2">
                                  {Object.entries(compareAccount.financial_summary).map(([currency, data]) => (
                                    <div key={currency} className="bg-muted/50 rounded-lg p-2 text-sm">
                                      <Badge variant="outline" className="mb-1">{currency}</Badge>
                                      <p>الإيرادات: {data.revenue.toFixed(3)}</p>
                                      <p>المصروفات: {data.expenses.toFixed(3)}</p>
                                      <p className="font-bold">الرصيد: {data.balance.toFixed(3)}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <div className="border-t pt-4">
                              <h4 className="font-semibold mb-3">الفرق بين الفترتين</h4>
                              {Object.keys(account.financial_summary).map((currency) => {
                                const current = account.financial_summary[currency];
                                const previous = compareAccount.financial_summary[currency];
                                
                                if (!previous) return null;
                                
                                const revenueDiff = current.revenue - previous.revenue;
                                const expensesDiff = current.expenses - previous.expenses;
                                const balanceDiff = current.balance - previous.balance;
                                
                                return (
                                  <div key={currency} className="bg-muted/50 rounded-lg p-3 space-y-2 mb-2">
                                    <Badge variant="outline">{currency}</Badge>
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">الإيرادات:</span>
                                        <p className={`font-semibold ${revenueDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {revenueDiff >= 0 ? '+' : ''}{revenueDiff.toFixed(3)} {currency}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">المصروفات:</span>
                                        <p className={`font-semibold ${expensesDiff <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {expensesDiff >= 0 ? '+' : ''}{expensesDiff.toFixed(3)} {currency}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">الرصيد:</span>
                                        <p className={`font-bold ${balanceDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {balanceDiff >= 0 ? '+' : ''}{balanceDiff.toFixed(3)} {currency}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </TabsContent>
                  </Tabs>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
