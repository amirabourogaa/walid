import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Wallet, Edit, Trash2, TrendingUp, TrendingDown, Archive, RefreshCw, Calendar, FileText, MapPin, Coins, History } from "lucide-react";
import TN from "country-flag-icons/react/3x2/TN";
import EU from "country-flag-icons/react/3x2/EU";
import US from "country-flag-icons/react/3x2/US";
import LY from "country-flag-icons/react/3x2/LY";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateCaissesPDF } from "@/lib/caissesPdfGenerator";

interface CurrencyAmount {
  currency: string;
  amount: number;
}

interface Caisse {
  id: string;
  nom: string;
  emplacement: string | null;
  montants: CurrencyAmount[];
  created_at: string;
}

interface FinancialSummary {
  currency: string;
  initialAmount: number;
  revenue: number;
  expenses: number;
  balance: number;
}

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
      return <Coins className="w-8 h-6 text-muted-foreground" />;
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

export default function CaissesPage() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCaisse, setEditingCaisse] = useState<Caisse | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetCaisseId, setResetCaisseId] = useState<string | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [nom, setNom] = useState("");
  const [emplacement, setEmplacement] = useState("");
  const [montants, setMontants] = useState<CurrencyAmount[]>([{ currency: "TND", amount: 0 }]);
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminEdit, setShowAdminEdit] = useState(false);
  const queryClient = useQueryClient();

  const { data: caisses = [], isLoading } = useQuery({
    queryKey: ["caisses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caisses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        montants: (d.montants as any) || []
      })) as Caisse[];
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions-caisses", selectedMonth, selectedYear],
    queryFn: async () => {
      const firstDay = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("source_type", "caisse")
        .gte("date_transaction", firstDay)
        .lte("date_transaction", lastDay);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: archives = [] } = useQuery({
    queryKey: ["caisses-archives"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caisses_archive")
        .select("*")
        .order("archived_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const calculateFinancialSummary = (caisseId: string, montants: CurrencyAmount[]): FinancialSummary[] => {
    const caisseTransactions = transactions.filter(t => t.source_id === caisseId);
    const summaries: FinancialSummary[] = [];

    montants.forEach(m => {
      const revenue = caisseTransactions
        .filter(t => t.devise === m.currency && t.type === 'entree')
        .reduce((sum, t) => sum + Number(t.montant), 0);
      
      const expenses = caisseTransactions
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
      .channel('caisses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'caisses'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["caisses"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  });

  const createMutation = useMutation({
    mutationFn: async (caisse: { nom: string; emplacement: string; montants: CurrencyAmount[] }) => {
      const { error } = await supabase.from("caisses").insert({ ...caisse, montants: caisse.montants as any });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caisses"] });
      toast({ title: "Caisse créée avec succès" });
      resetForm();
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Erreur lors de la création", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; nom: string; emplacement: string; montants: CurrencyAmount[] }) => {
      const { error } = await supabase.from("caisses").update({ ...updates, montants: updates.montants as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caisses"] });
      toast({ title: "Caisse modifiée avec succès" });
      resetForm();
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("caisses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caisses"] });
      toast({ title: "Caisse supprimée" });
    },
  });

  const resetCaisseMutation = useMutation({
    mutationFn: async ({ id, montants }: { id: string; montants: CurrencyAmount[] }) => {
      const { error } = await supabase.from("caisses").update({ montants: montants as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caisses"] });
      toast({ title: "Caisse réinitialisée avec succès" });
      setResetDialogOpen(false);
      setResetCaisseId(null);
      setMontants([{ currency: "TND", amount: 0 }]);
    },
  });

  const resetForm = () => {
    setNom("");
    setEmplacement("");
    setMontants([{ currency: "TND", amount: 0 }]);
    setEditingCaisse(null);
    setAdminPassword("");
    setShowAdminEdit(false);
  };

  const handleSubmit = () => {
    if (!nom.trim()) {
      toast({ title: "Le nom est obligatoire", variant: "destructive" });
      return;
    }
    if (editingCaisse) {
      // Si on édite une caisse existante
      if (showAdminEdit) {
        // Admin a vérifié son mot de passe - on met à jour tout y compris les montants
        updateMutation.mutate({ id: editingCaisse.id, nom, emplacement, montants });
      } else {
        // Pas de vérification admin - on met à jour seulement nom et emplacement
        updateMutation.mutate({ id: editingCaisse.id, nom, emplacement, montants: editingCaisse.montants });
      }
    } else {
      // Nouvelle caisse - création normale
      createMutation.mutate({ nom, emplacement, montants });
    }
  };

  const handleEdit = (caisse: Caisse) => {
    setEditingCaisse(caisse);
    setNom(caisse.nom);
    setEmplacement(caisse.emplacement || "");
    setMontants(caisse.montants.length > 0 ? caisse.montants : [{ currency: "TND", amount: 0 }]);
    setAdminPassword("");
    setShowAdminEdit(false);
    setDialogOpen(true);
  };

  const handleVerifyAdminPassword = () => {
    // ⚠️ SECURITY WARNING: Client-side password validation is not secure
    // This should be moved to a server-side edge function
    if (adminPassword === "54372272") {
      setShowAdminEdit(true);
      toast({ title: "تم التحقق من كلمة المرور" });
    } else {
      toast({ 
        title: "كلمة مرور خاطئة", 
        description: "الرجاء إدخال كلمة المرور الصحيحة",
        variant: "destructive" 
      });
    }
  };

  const handleResetCaisse = (caisseId: string) => {
    const caisse = caisses.find(c => c.id === caisseId);
    if (caisse) {
      setResetCaisseId(caisseId);
      setMontants(caisse.montants.map(m => ({ ...m, amount: 0 })));
      setResetDialogOpen(true);
    }
  };

  const handleResetSubmit = () => {
    if (!resetCaisseId) return;
    resetCaisseMutation.mutate({ id: resetCaisseId, montants });
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

  const handleGeneratePDF = async () => {
    try {
      const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];

      // Prepare current month data
      const caisseFinancialData = caisses.flatMap(caisse => {
        const summaries = calculateFinancialSummary(caisse.id, caisse.montants);
        return summaries.map(summary => ({
          caisseName: caisse.nom,
          currency: summary.currency,
          initialAmount: summary.initialAmount,
          revenue: summary.revenue,
          expenses: summary.expenses,
          balance: summary.balance
        }));
      });

      // Get previous 3 months data from archives
      const previousMonths = [];
      for (let i = 1; i <= 3; i++) {
        const monthDate = new Date(selectedYear, selectedMonth - 1 - i, 1);
        const month = monthDate.getMonth() + 1;
        const year = monthDate.getFullYear();

        const monthArchives = archives.filter(
          a => a.archive_month === month && a.archive_year === year
        );

        if (monthArchives.length > 0) {
          const totalRevenue: { [currency: string]: number } = {};
          const totalExpenses: { [currency: string]: number } = {};
          const totalBalance: { [currency: string]: number } = {};

          monthArchives.forEach(archive => {
            const summary = archive.financial_summary as any;
            Object.entries(summary).forEach(([currency, data]: [string, any]) => {
              totalRevenue[currency] = (totalRevenue[currency] || 0) + (data.revenue || 0);
              totalExpenses[currency] = (totalExpenses[currency] || 0) + (data.expenses || 0);
              totalBalance[currency] = (totalBalance[currency] || 0) + (data.balance || 0);
            });
          });

          previousMonths.push({
            month: `${monthNames[month - 1]} ${year}`,
            totalRevenue,
            totalExpenses,
            totalBalance
          });
        }
      }

      await generateCaissesPDF({
        currentMonth: monthNames[selectedMonth - 1],
        currentYear: selectedYear,
        caisses: caisseFinancialData,
        previousMonths: previousMonths.length > 0 ? previousMonths : undefined
      });

      toast({
        title: "نجح",
        description: "تم إنشاء تقرير PDF بنجاح",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "خطأ",
        description: "فشل في إنشاء تقرير PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">إدارة الصناديق</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/manager/caisses-daily-history')}>
            <History className="ml-2 h-4 w-4" />
            السجل اليومي
          </Button>
          <Button variant="outline" onClick={handleGeneratePDF}>
            <FileText className="ml-2 h-4 w-4" />
            تقرير PDF
          </Button>
          <Button variant="outline" onClick={() => setArchiveDialogOpen(true)}>
            <Archive className="ml-2 h-4 w-4" />
            الأرشيف
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                صندوق جديد
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCaisse ? "تعديل الصندوق" : "إضافة صندوق جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>اسم الصندوق</Label>
                <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="مثال: صندوق المكتب الرئيسي" />
              </div>
              <div>
                <Label>الموقع</Label>
                <Input value={emplacement} onChange={(e) => setEmplacement(e.target.value)} placeholder="مثال: الطابق الأول" />
              </div>
              {!editingCaisse && (
                <div>
                  <Label>المبالغ بالعملات</Label>
                  <div className="text-sm text-muted-foreground mb-2">
                    ملاحظة: يتم تعيين المبالغ الأولية مرة واحدة فقط عند إنشاء الصندوق، وسيتم إعادة تعيينها تلقائيًا إلى الصفر في اليوم الأول من كل شهر.
                  </div>
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
              )}
              {editingCaisse && !showAdminEdit && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm font-medium mb-2">المبالغ الحالية:</p>
                    <div className="space-y-2">
                      {editingCaisse.montants.map((montant, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="font-medium">{montant.currency}</span>
                          <span>{montant.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      💡 المبالغ الأولية لا يمكن تعديلها. سيتم إعادة تعيينها تلقائيًا إلى الصفر في اليوم الأول من كل شهر (الساعة 00:10).
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm font-medium mb-2 text-amber-900 dark:text-amber-100">🔒 تعديل المبالغ الأولية (مسؤول فقط)</p>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="أدخل كلمة مرور المسؤول"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleVerifyAdminPassword();
                          }
                        }}
                      />
                      <Button onClick={handleVerifyAdminPassword} variant="outline">
                        تحقق
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {editingCaisse && showAdminEdit && (
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-900 dark:text-green-100">✅ تم التحقق من صلاحيات المسؤول - يمكنك الآن تعديل المبالغ الأولية</p>
                  </div>
                  <div>
                    <Label>تعديل المبالغ بالعملات</Label>
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
                </div>
              )}
              <Button onClick={handleSubmit} className="w-full">
                {editingCaisse ? "تحديث" : "حفظ"}
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mb-6 flex gap-2 items-center">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <SelectItem key={month} value={month.toString()}>
                {new Date(2000, month - 1).toLocaleDateString('ar-TN', { month: 'long' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p>جاري التحميل...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {caisses.map((caisse) => {
            const financialSummaries = calculateFinancialSummary(caisse.id, caisse.montants);
            const totalBalance = financialSummaries.reduce((sum, s) => sum + s.balance, 0);
            
            return (
              <Card key={caisse.id} className="overflow-hidden border-2 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background p-4 border-b">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Wallet className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">{caisse.nom}</CardTitle>
                        {caisse.emplacement && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {caisse.emplacement}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleResetCaisse(caisse.id)} title="إعادة تعيين الصندوق">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(caisse)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(caisse.id)}>
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

                <CardContent className="p-4 space-y-4">
                  {financialSummaries.map((summary, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex items-center justify-between p-4 bg-gradient-to-br from-muted/50 to-muted/20 rounded-lg border-2">
                        <div className="flex items-center gap-3">
                          {getCurrencyFlag(summary.currency)}
                          <div>
                            <p className="text-xs text-muted-foreground">{getCurrencyName(summary.currency)}</p>
                            <p className="text-2xl font-bold mt-1">{summary.balance.toFixed(3)}</p>
                            <p className="text-xs font-medium text-primary">{summary.currency}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 space-y-2 bg-card/50 p-3 rounded-lg border">
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
                            <span className={`font-bold text-base ${summary.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
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
                      
                      {idx < financialSummaries.length - 1 && <Separator className="my-4" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reset Caisse Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إعادة تعيين الصندوق</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">قم بتعيين مبلغ البداية لكل عملة في هذا الصندوق</p>
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
            <Button onClick={handleResetSubmit} className="w-full">
              تأكيد إعادة التعيين
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>أرشيف الصناديق</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {archives.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا يوجد أرشيف بعد</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(
                  archives.reduce((acc: any, archive: any) => {
                    const key = `${archive.archive_year}-${archive.archive_month}`;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(archive);
                    return acc;
                  }, {})
                ).map(([key, monthArchives]: [string, any]) => {
                  const [year, month] = key.split('-');
                  return (
                    <div key={key} className="border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-4">
                        {new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('ar-TN', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {monthArchives.map((archive: any) => (
                          <Card key={archive.id}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Wallet className="h-4 w-4" />
                                {archive.nom}
                              </CardTitle>
                              {archive.emplacement && (
                                <p className="text-sm text-muted-foreground">📍 {archive.emplacement}</p>
                              )}
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {Object.entries(archive.financial_summary || {}).map(([currency, summary]: [string, any]) => (
                                <div key={currency} className="text-sm">
                                  <div className="font-bold mb-1">{currency}</div>
                                  <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                      <span>المبلغ الأولي:</span>
                                      <span>{summary.initialAmount?.toFixed(3)}</span>
                                    </div>
                                    <div className="flex justify-between text-success">
                                      <span>الإيرادات:</span>
                                      <span>+{summary.revenue?.toFixed(3)}</span>
                                    </div>
                                    <div className="flex justify-between text-destructive">
                                      <span>المصروفات:</span>
                                      <span>-{summary.expenses?.toFixed(3)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-bold">
                                      <span>الرصيد النهائي:</span>
                                      <span>{summary.balance?.toFixed(3)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
