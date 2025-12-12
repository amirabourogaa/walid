import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ArrowUpRight, ArrowDownRight, Edit2, Trash2, History, Archive, FileText, Search, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

import { TransactionExtractDialog } from "@/components/TransactionExtractDialog";

const transactionTypes = [
  { value: "entree", label: "إيراد" },
  { value: "sortie", label: "مصروف" },
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

const paymentMethods = [
  { value: "espece", label: "نقدا" },
  { value: "cheque", label: "شيك" },
  { value: "virement", label: "تحويل بنكي" },
  { value: "carte_bancaire", label: "بطاقة بنكية" },
  { value: "traite", label: "كمبيالة" },
];

const currencies = ["TND", "EUR", "USD", "DLY"];

export default function TransactionsPage() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [type, setType] = useState("sortie");
  const [categorie, setCategorie] = useState("loyer");
  const [description, setDescription] = useState("");
  const [montant, setMontant] = useState("");
  const [devise, setDevise] = useState("TND");
  const [modePaiement, setModePaiement] = useState("espece");
  const [sourceType, setSourceType] = useState("caisse");
  const [sourceId, setSourceId] = useState("");
  const [dateTransaction, setDateTransaction] = useState(format(new Date(), "yyyy-MM-dd"));
  
  // Filter states
  const [filterType, setFilterType] = useState<'all' | 'entree' | 'sortie'>('all');
  const [filterCategorie, setFilterCategorie] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterMontantMin, setFilterMontantMin] = useState('');
  const [filterMontantMax, setFilterMontantMax] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [filterSourceType, setFilterSourceType] = useState<string>('all');
  const [showUnstored, setShowUnstored] = useState(false);
  
  // Client/Company selection states
  const [entityType, setEntityType] = useState<'client' | 'company' | 'manual' | ''>('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [manualEntityName, setManualEntityName] = useState('');
  const [manualEntityContact, setManualEntityContact] = useState('');
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [showExtractDialog, setShowExtractDialog] = useState(false);
  const [extractFilterType, setExtractFilterType] = useState<'day' | 'month' | 'year' | 'custom'>('month');
  const [extractStartDate, setExtractStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [extractEndDate, setExtractEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const queryClient = useQueryClient();

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date_transaction", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: caisses = [] } = useQuery({
    queryKey: ["caisses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("caisses").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Only admins and managers can see bank accounts
  // Employees will get an empty array due to RLS policies
  const { data: comptes = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("comptes_bancaires").select("*");
      // If RLS blocks access (employee role), return empty array instead of throwing
      if (error && error.code === 'PGRST116') return [];
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, client_id_number, whatsapp_number, email")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      // Fetch distinct company names from clients table
      const { data, error } = await supabase
        .from("clients")
        .select("company_name")
        .not("company_name", "is", null)
        .not("company_name", "eq", "");
      if (error) throw error;
      // Get unique company names
      const uniqueCompanies = [...new Set(data.map(c => c.company_name))].map((name, idx) => ({
        id: `company_${idx}`,
        name: name
      }));
      return uniqueCompanies;
    },
  });

  // Synchronisation temps réel pour les transactions, caisses et comptes
  useEffect(() => {
    const transactionsChannel = supabase
      .channel('transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
        }
      )
      .subscribe();

    const caissesChannel = supabase
      .channel('caisses-realtime-trans')
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

    const comptesChannel = supabase
      .channel('comptes-realtime-trans')
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
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(caissesChannel);
      supabase.removeChannel(comptesChannel);
    };
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async (transaction: any) => {
      const { data: userData } = await supabase.auth.getUser();
      
      // Prepare entity information
      let entityInfo: any = {};
      if (entityType === 'client' && selectedClientId) {
        const client = clients.find(c => c.id === selectedClientId);
        if (client) {
          entityInfo = {
            entity_type: 'client',
            entity_name: client.full_name,
            entity_id: client.id,
          };
        }
      } else if (entityType === 'company' && selectedCompanyId) {
        const company = companies.find(c => c.id === selectedCompanyId);
        if (company) {
          entityInfo = {
            entity_type: 'company',
            entity_name: company.name,
            entity_id: null,
          };
        }
      } else if (entityType === 'manual' && manualEntityName) {
        entityInfo = {
          entity_type: 'manual',
          entity_name: manualEntityName,
          entity_id: null,
        };
      }
      
      if (editingTransaction) {
        // Update existing transaction
        const { error } = await supabase
          .from("transactions")
          .update({...transaction, ...entityInfo})
          .eq("id", editingTransaction.id);
        if (error) throw error;
      } else {
        // Create new transaction
        const { error } = await supabase.from("transactions").insert({
          ...transaction,
          ...entityInfo,
          created_by: userData.user?.id,
        });
        if (error) throw error;
      }

      // Update client invoice status if marked as paid
      if (markAsPaid && entityType === 'client' && selectedClientId && transaction.type === 'entree') {
        const { error: clientError } = await supabase
          .from("clients")
          .update({ invoice_status: 'مدفوعة' })
          .eq("id", selectedClientId);
        if (clientError) console.error('Error updating client invoice status:', clientError);
      }
      
      // Note: Initial amounts (المبلغ الأولي) are fixed and not modified by transactions
      // The balance is calculated as: Initial Amount + Revenue - Expenses
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["caisses"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({ title: editingTransaction ? "تم تحديث المعاملة بنجاح" : "تمت إضافة المعاملة بنجاح" });
      resetForm();
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["caisses"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({ title: "تم حذف المعاملة بنجاح" });
    },
  });

  const resetForm = () => {
    setEditingTransaction(null);
    setType("sortie");
    setCategorie("loyer");
    setDescription("");
    setMontant("");
    setDevise("TND");
    setModePaiement("espece");
    setSourceType("caisse");
    setSourceId("");
    setDateTransaction(format(new Date(), "yyyy-MM-dd"));
    setEntityType('');
    setSelectedClientId('');
    setClientSearchTerm('');
    setSelectedCompanyId('');
    setCompanySearchTerm('');
    setManualEntityName('');
    setManualEntityContact('');
    setMarkAsPaid(false);
  };

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.client_id_number?.includes(clientSearchTerm) ||
    client.whatsapp_number?.includes(clientSearchTerm)
  );

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(companySearchTerm.toLowerCase())
  );

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setType(transaction.type);
    setCategorie(transaction.categorie);
    setDescription(transaction.description || "");
    setMontant(transaction.montant.toString());
    setDevise(transaction.devise);
    setModePaiement(transaction.mode_paiement);
    setSourceType(transaction.source_type);
    setSourceId(transaction.source_id);
    setDateTransaction(transaction.date_transaction);
    
    // Set entity information
    if (transaction.entity_type === 'client' && transaction.entity_id) {
      setEntityType('client');
      setSelectedClientId(transaction.entity_id);
    } else if (transaction.entity_type === 'company' && transaction.entity_name) {
      setEntityType('company');
      const company = companies.find(c => c.name === transaction.entity_name);
      if (company) setSelectedCompanyId(company.id);
    } else if (transaction.entity_type === 'manual' && transaction.entity_name) {
      setEntityType('manual');
      setManualEntityName(transaction.entity_name);
    }
    
    setDialogOpen(true);
  };

  const handleDelete = (transactionId: string) => {
    deleteMutation.mutate(transactionId);
  };

  const handleSubmit = () => {
    if (!montant || parseFloat(montant) <= 0) {
      toast({ title: "المبلغ مطلوب", variant: "destructive" });
      return;
    }
    if (!sourceType) {
      toast({ title: "يجب اختيار مصدر الدفع", variant: "destructive" });
      return;
    }
    if (!sourceId) {
      toast({ title: "يجب اختيار الصندوق أو الحساب البنكي", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      type,
      categorie,
      description,
      montant: parseFloat(montant),
      devise,
      mode_paiement: modePaiement,
      source_type: sourceType,
      source_id: sourceId,
      date_transaction: dateTransaction,
    });
  };

  const sources = sourceType === "caisse" ? caisses : comptes;

  // Filter transactions based on selected filters
  const filteredTransactions = transactions.filter(transaction => {
    // Type filter
    if (filterType !== 'all' && transaction.type !== filterType) return false;
    
    // Category filter
    if (filterCategorie !== 'all' && transaction.categorie !== filterCategorie) return false;
    
    // Search term (description, entity name, category)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesDescription = transaction.description?.toLowerCase().includes(search);
      const matchesEntityName = transaction.entity_name?.toLowerCase().includes(search);
      const categoryLabel = categories.find(c => c.value === transaction.categorie)?.label.toLowerCase();
      const matchesCategory = categoryLabel?.includes(search);
      if (!matchesDescription && !matchesEntityName && !matchesCategory) return false;
    }
    
    // Date range filter
    if (filterDateFrom && transaction.date_transaction < filterDateFrom) return false;
    if (filterDateTo && transaction.date_transaction > filterDateTo) return false;
    
    // Amount range filter
    if (filterMontantMin && transaction.montant < parseFloat(filterMontantMin)) return false;
    if (filterMontantMax && transaction.montant > parseFloat(filterMontantMax)) return false;
    
    // Payment method filter
    if (filterPaymentMethod !== 'all' && transaction.mode_paiement !== filterPaymentMethod) return false;
    
    // Source type filter
    if (filterSourceType !== 'all' && transaction.source_type !== filterSourceType) return false;
    
    // Show only unstored transactions (no source_type or source_id)
    if (showUnstored && (transaction.source_id || transaction.source_type)) return false;
    
    return true;
  });

  const clearAllFilters = () => {
    setFilterType('all');
    setFilterCategorie('all');
    setSearchTerm('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterMontantMin('');
    setFilterMontantMax('');
    setFilterPaymentMethod('all');
    setFilterSourceType('all');
    setShowUnstored(false);
  };

  const hasActiveFilters = filterType !== 'all' || filterCategorie !== 'all' || searchTerm || 
    filterDateFrom || filterDateTo || filterMontantMin || filterMontantMax || 
    filterPaymentMethod !== 'all' || filterSourceType !== 'all' || showUnstored;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">إدارة المعاملات</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/manager/transactions-archive")}>
            <Archive className="ml-2 h-4 w-4" />
            الأرشيف
          </Button>
          <Button variant="outline" onClick={() => setShowExtractDialog(true)}>
            <FileText className="ml-2 h-4 w-4" />
            استخراج كشف
          </Button>
          <Button variant="outline" onClick={() => navigate("/manager/transactions-history")}>
            <History className="ml-2 h-4 w-4" />
            السجل
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                معاملة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTransaction ? "تعديل المعاملة" : "إضافة معاملة جديدة"}</DialogTitle>
              </DialogHeader>
            <div className="space-y-4">
              {/* Entity Selection */}
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label>العميل / الشركة</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEntityType(entityType === 'manual' ? '' : 'manual');
                      if (entityType !== 'manual') {
                        setSelectedClientId('');
                        setSelectedCompanyId('');
                      } else {
                        setManualEntityName('');
                        setManualEntityContact('');
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    {entityType === 'manual' ? 'اختيار من القائمة' : 'إضافة يدويًا'}
                  </Button>
                </div>

                {entityType !== 'manual' ? (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Client Selection */}
                    <div className="space-y-2 relative">
                      <Label>العميل</Label>
                      <Input
                        placeholder="ابحث عن عميل..."
                        value={clientSearchTerm}
                        onChange={(e) => {
                          setClientSearchTerm(e.target.value);
                          setEntityType('client');
                          setSelectedCompanyId('');
                          setCompanySearchTerm('');
                        }}
                        className={selectedClientId ? 'border-primary' : ''}
                      />
                      {entityType === 'client' && clientSearchTerm && filteredClients.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-popover border rounded-md shadow-lg">
                          {filteredClients.slice(0, 10).map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              className="w-full text-right px-4 py-2.5 hover:bg-accent hover:text-accent-foreground transition-colors text-sm border-b last:border-b-0"
                              onClick={() => {
                                setSelectedClientId(client.id);
                                setClientSearchTerm(client.full_name);
                              }}
                            >
                              <div className="font-medium">{client.full_name}</div>
                              {client.client_id_number && (
                                <div className="text-xs text-muted-foreground">{client.client_id_number}</div>
                              )}
                              {client.whatsapp_number && (
                                <div className="text-xs text-muted-foreground">{client.whatsapp_number}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedClientId && (
                        <p className="text-xs text-muted-foreground">✓ تم اختيار العميل</p>
                      )}
                    </div>

                    {/* Company Selection */}
                    <div className="space-y-2 relative">
                      <Label>الشركة</Label>
                      <Input
                        placeholder="ابحث عن شركة..."
                        value={companySearchTerm}
                        onChange={(e) => {
                          setCompanySearchTerm(e.target.value);
                          setEntityType('company');
                          setSelectedClientId('');
                          setClientSearchTerm('');
                        }}
                        className={selectedCompanyId ? 'border-primary' : ''}
                      />
                      {entityType === 'company' && companySearchTerm && filteredCompanies.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-popover border rounded-md shadow-lg">
                          {filteredCompanies.slice(0, 10).map((company) => (
                            <button
                              key={company.id}
                              type="button"
                              className="w-full text-right px-4 py-2.5 hover:bg-accent hover:text-accent-foreground transition-colors text-sm border-b last:border-b-0"
                              onClick={() => {
                                setSelectedCompanyId(company.id);
                                setCompanySearchTerm(company.name);
                              }}
                            >
                              <div className="font-medium">{company.name}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedCompanyId && (
                        <p className="text-xs text-muted-foreground">✓ تم اختيار الشركة</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>الاسم *</Label>
                      <Input
                        placeholder="أدخل اسم العميل أو الشركة"
                        value={manualEntityName}
                        onChange={(e) => setManualEntityName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>معلومات الاتصال</Label>
                      <Input
                        placeholder="رقم الهاتف أو البريد الإلكتروني"
                        value={manualEntityContact}
                        onChange={(e) => setManualEntityContact(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Mark as Paid Checkbox - Only for revenue transactions with selected client */}
                {type === 'entree' && entityType === 'client' && selectedClientId && (
                  <div className="flex items-center space-x-2 space-x-reverse pt-2 border-t">
                    <input
                      type="checkbox"
                      id="markAsPaid"
                      checked={markAsPaid}
                      onChange={(e) => setMarkAsPaid(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="markAsPaid" className="cursor-pointer font-normal">
                      تحديث حالة الفاتورة إلى "مدفوعة"
                    </Label>
                  </div>
                )}
              </div>

              <div>
                <Label>نوع المعاملة</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الفئة</Label>
                <Select value={categorie} onValueChange={setCategorie}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الوصف</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="تفاصيل المعاملة" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>المبلغ</Label>
                  <Input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="0.000" />
                </div>
                <div>
                  <Label>العملة</Label>
                  <Select value={devise} onValueChange={setDevise}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>طريقة الدفع</Label>
                <Select value={modePaiement} onValueChange={setModePaiement}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>مصدر الدفع</Label>
                <Select value={sourceType} onValueChange={(v) => { setSourceType(v); setSourceId(""); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caisse">صندوق</SelectItem>
                    {/* Only show bank accounts option for admins and managers */}
                    {comptes.length > 0 && (
                      <SelectItem value="compte_bancaire">حساب بنكي</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{sourceType === "caisse" ? "اختر الصندوق" : "اختر الحساب"}</Label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {sourceType === "caisse" ? s.nom : s.nom_banque}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>التاريخ</Label>
                <Input type="date" value={dateTransaction} onChange={(e) => setDateTransaction(e.target.value)} />
              </div>
              <Button onClick={handleSubmit} className="w-full">حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="mb-6 p-4 bg-card rounded-lg border space-y-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">بحث وتصفية المعاملات</h2>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 ml-2" />
              مسح الفلاتر
            </Button>
          )}
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ابحث في الوصف، العميل، الفئة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label>نوع المعاملة</Label>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="entree">إيرادات</SelectItem>
                <SelectItem value="sortie">مصروفات</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>الفئة</Label>
            <Select value={filterCategorie} onValueChange={setFilterCategorie}>
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
            <Label>طريقة الدفع</Label>
            <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>مصدر الدفع</Label>
            <Select value={filterSourceType} onValueChange={setFilterSourceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="caisse">الصناديق</SelectItem>
                <SelectItem value="compte_bancaire">الحسابات البنكية</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>من تاريخ</Label>
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
            />
          </div>

          <div>
            <Label>إلى تاريخ</Label>
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
            />
          </div>

          <div>
            <Label>الحد الأدنى للمبلغ</Label>
            <Input
              type="number"
              placeholder="0.000"
              value={filterMontantMin}
              onChange={(e) => setFilterMontantMin(e.target.value)}
            />
          </div>

          <div>
            <Label>الحد الأقصى للمبلغ</Label>
            <Input
              type="number"
              placeholder="0.000"
              value={filterMontantMax}
              onChange={(e) => setFilterMontantMax(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2 space-x-reverse pt-6">
            <input
              type="checkbox"
              id="showUnstored"
              checked={showUnstored}
              onChange={(e) => setShowUnstored(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="showUnstored" className="cursor-pointer font-normal">
              معاملات غير مخزنة
            </Label>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground pt-2 border-t">
          عرض {filteredTransactions.length} من أصل {transactions.length} معاملة
        </div>
      </div>

      <div className="space-y-2">
        {filteredTransactions.map((transaction: any) => (
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
                  {transaction.entity_name && (
                    <p className="text-sm text-primary font-medium">
                      {transaction.entity_name}
                    </p>
                  )}
                  {transaction.description && <p className="text-sm text-muted-foreground">{transaction.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {transaction.type === "entree" ? "+" : "-"}
                    {transaction.montant.toFixed(3)} {transaction.devise}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {paymentMethods.find((m) => m.value === transaction.mode_paiement)?.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{format(new Date(transaction.date_transaction), "dd/MM/yyyy")}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(transaction)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(transaction.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <TransactionExtractDialog
        open={showExtractDialog}
        onOpenChange={setShowExtractDialog}
      />
    </div>
  );
}
