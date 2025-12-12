import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { History as HistoryIcon, Edit, Search, Download, RotateCcw, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";

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

export default function TransactionsHistoryPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: history = [] } = useQuery({
    queryKey: ["transactions-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions_history")
        .select(`
          *,
          profiles!transactions_history_modified_by_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .order("modified_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Synchronisation en temps réel
  useEffect(() => {
    const channel = supabase
      .channel('transactions-history-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions_history'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["transactions-history"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const restoreMutation = useMutation({
    mutationFn: async (historyItem: any) => {
      const transactionData = historyItem.data;
      delete transactionData.id; // Remove old ID
      delete transactionData.created_at;
      delete transactionData.updated_at;

      const { error } = await supabase.from("transactions").insert(transactionData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-history"] });
      toast.success("تم استعادة المعاملة بنجاح");
    },
    onError: () => {
      toast.error("فشل في استعادة المعاملة");
    },
  });

  const handleRestoreClick = (historyItem: any) => {
    restoreMutation.mutate(historyItem);
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "created": return "تم الإنشاء";
      case "updated": return "تم التعديل";
      case "deleted": return "تم الحذف";
      default: return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "created": return "bg-green-500";
      case "updated": return "bg-blue-500";
      case "deleted": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const generatePDF = (item: any) => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('سجل المعاملة', 105, 20, { align: 'center' });
    
    // Add transaction details
    doc.setFontSize(12);
    const transactionData = item.data;
    const details = [
      ['النوع', transactionData.type === 'entree' ? 'إيراد' : 'مصروف'],
      ['الفئة', categories.find(c => c.value === transactionData.categorie)?.label || transactionData.categorie],
      ['المبلغ', `${transactionData.montant} ${transactionData.devise}`],
      ['طريقة الدفع', paymentMethods.find(p => p.value === transactionData.mode_paiement)?.label || transactionData.mode_paiement],
      ['التاريخ', new Date(transactionData.date_transaction).toLocaleDateString('ar-TN')],
      ['الوصف', transactionData.description || '-'],
      ['الإجراء', getActionLabel(item.action)],
      ['تاريخ التعديل', new Date(item.modified_at).toLocaleString('ar-TN')],
    ];

    (doc as any).autoTable({
      startY: 40,
      head: [['الحقل', 'القيمة']],
      body: details,
      styles: { font: 'helvetica', fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`transaction-history-${item.transaction_id}.pdf`);
    toast.success('تم تحميل PDF بنجاح');
  };

  const filteredHistory = history.filter((item: any) => {
    const data = item.data;
    const searchLower = searchTerm.toLowerCase();
    return (
      data.description?.toLowerCase().includes(searchLower) ||
      data.montant?.toString().includes(searchLower) ||
      item.profiles?.first_name?.toLowerCase().includes(searchLower) ||
      item.profiles?.last_name?.toLowerCase().includes(searchLower)
    );
  });

  // Group history by transaction_id
  const groupedHistory = filteredHistory.reduce((acc: any, item: any) => {
    const transactionId = item.transaction_id;
    if (!acc[transactionId]) {
      acc[transactionId] = [];
    }
    acc[transactionId].push(item);
    return acc;
  }, {});

  // Sort each group by date and convert to array
  const groupedArray = Object.entries(groupedHistory).map(([transactionId, items]: [string, any]) => {
    const sortedItems = items.sort((a: any, b: any) => 
      new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime()
    );
    return {
      transactionId,
      items: sortedItems,
      latestData: sortedItems[0].data,
      latestAction: sortedItems[0].action,
    };
  }).sort((a, b) => 
    new Date(b.items[0].modified_at).getTime() - new Date(a.items[0].modified_at).getTime()
  );

  const [openTransactions, setOpenTransactions] = useState<Record<string, boolean>>({});

  const toggleTransaction = (transactionId: string) => {
    setOpenTransactions(prev => ({
      ...prev,
      [transactionId]: !prev[transactionId]
    }));
  };

  const getDateDiff = (oldDate: string, newDate: string) => {
    const old = new Date(oldDate);
    const newD = new Date(newDate);
    if (old.getTime() !== newD.getTime()) {
      return {
        changed: true,
        oldMonth: old.toLocaleDateString('ar-TN', { month: 'long', year: 'numeric' }),
        newMonth: newD.toLocaleDateString('ar-TN', { month: 'long', year: 'numeric' })
      };
    }
    return { changed: false };
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <HistoryIcon className="h-8 w-8" />
          سجل المعاملات
        </h1>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث في السجل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        {groupedArray.map((group: any) => {
          const data = group.latestData;
          const isDeleted = group.latestAction === 'deleted';
          const totalActions = group.items.length;

          return (
            <Card key={group.transactionId} className={`overflow-hidden ${isDeleted ? 'border-red-300' : ''}`}>
              <Collapsible
                open={openTransactions[group.transactionId]}
                onOpenChange={() => toggleTransaction(group.transactionId)}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={getActionColor(group.latestAction)}>
                          {getActionLabel(group.latestAction)}
                        </Badge>
                        <Badge variant="outline">
                          {totalActions} {totalActions === 1 ? 'عملية' : 'عمليات'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">النوع: </span>
                          <span className="font-medium">
                            {data.type === "entree" ? "إيراد" : "مصروف"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">الفئة: </span>
                          <span className="font-medium">
                            {categories.find((c) => c.value === data.categorie)?.label || data.categorie}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">المبلغ: </span>
                          <span className="font-bold">
                            {data.montant?.toFixed(3)} {data.devise}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">التاريخ: </span>
                          <span className="font-medium">
                            {new Date(data.date_transaction).toLocaleDateString('ar-TN')}
                          </span>
                        </div>
                      </div>

                      {data.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {data.description}
                        </p>
                      )}

                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full mt-2">
                          {openTransactions[group.transactionId] ? (
                            <>
                              <ChevronUp className="h-4 w-4 ml-2" />
                              إخفاء التفاصيل
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 ml-2" />
                              عرض السجل الكامل ({totalActions} تغييرات)
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <div className="flex flex-col gap-2 mr-4">
                      {isDeleted && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreClick(group.items[0])}
                        >
                          <RotateCcw className="h-4 w-4 ml-2" />
                          استعادة
                        </Button>
                      )}
                      {!isDeleted && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/manager/transactions/edit/${group.transactionId}`)}
                        >
                          <Edit className="h-4 w-4 ml-2" />
                          تعديل
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="border-t bg-muted/30">
                    <div className="p-4 space-y-3">
                      <h3 className="font-semibold text-sm mb-3">📋 سجل التغييرات الكامل</h3>
                      {group.items.map((item: any, index: number) => {
                        const modifierName = item.profiles 
                          ? `${item.profiles.first_name} ${item.profiles.last_name}`
                          : "غير معروف";
                        
                        // Check if date was changed
                        let dateChangeInfo = null;
                        if (item.action === 'updated' && index < group.items.length - 1) {
                          const previousItem = group.items[index + 1];
                          dateChangeInfo = getDateDiff(
                            previousItem.data.date_transaction,
                            item.data.date_transaction
                          );
                        }

                        return (
                          <div key={item.id} className="bg-background rounded-lg p-3 border">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getActionColor(item.action)} variant="outline">
                                    {getActionLabel(item.action)}
                                  </Badge>
                                  <span className="text-xs font-semibold">
                                    {format(new Date(item.modified_at), "dd/MM/yyyy HH:mm:ss")}
                                  </span>
                                </div>
                                
                                <div className="text-sm space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">👤 بواسطة:</span>
                                    <span className="font-medium">{modifierName}</span>
                                  </div>
                                  
                                  {dateChangeInfo?.changed && (
                                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 p-2 rounded mt-2">
                                      <Calendar className="h-4 w-4 text-blue-600" />
                                      <span className="text-blue-700 dark:text-blue-300 font-medium">
                                        تم نقل المعاملة من {dateChangeInfo.oldMonth} إلى {dateChangeInfo.newMonth}
                                      </span>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                                    <div>
                                      <span className="text-muted-foreground">المبلغ: </span>
                                      <span className="font-semibold">{item.data.montant?.toFixed(3)} {item.data.devise}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">الدفع: </span>
                                      <span>{paymentMethods.find((m) => m.value === item.data.mode_paiement)?.label}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => generatePDF(item)}
                                className="shrink-0"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
}