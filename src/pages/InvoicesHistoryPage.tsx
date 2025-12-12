import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { History, RotateCcw, Search, Send, Mail, Filter, Calendar, User, FileText, Clock, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


export default function InvoicesHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  // Fetch invoice history
  const { data: history = [] } = useQuery({
    queryKey: ["invoices-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices_history")
        .select(`
          *,
          profiles:modified_by (
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

  // Fetch WhatsApp history
  const { data: whatsappHistory = [] } = useQuery({
    queryKey: ["whatsapp-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_message_history")
        .select(`
          *,
          clients (
            full_name,
            whatsapp_number
          ),
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all users for filter
  const { data: users = [] } = useQuery({
    queryKey: ["users-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });

  // Synchronisation en temps réel
  useEffect(() => {
    const channel = supabase
      .channel('invoices-history-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices_history'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["invoices-history"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const restoreMutation = useMutation({
    mutationFn: async (historyItem: any) => {
      const invoiceData = historyItem.data;
      delete invoiceData.id; // Remove old ID
      delete invoiceData.created_at;
      delete invoiceData.updated_at;

      const { error } = await supabase.from("invoices").insert(invoiceData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-history"] });
      toast.success("تم استعادة الفاتورة بنجاح");
    },
    onError: () => {
      toast.error("فشل في استعادة الفاتورة");
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
    const data = item.data;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Invoice History Details", 105, 20, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    
    const details = [
      ["Action", getActionLabel(item.action)],
      ["Date/Time", format(new Date(item.modified_at), "dd/MM/yyyy HH:mm")],
      ["Modified By", item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name}` : "Unknown"],
      ["Invoice Number", data.invoice_number],
      ["Client Name", data.client_name],
      ["Total Amount", `${data.total_amount?.toFixed(3)} ${data.currency}`],
      ["Status", data.status],
      ["Issue Date", data.issue_date],
      ["Notes", data.notes || "N/A"]
    ];
    
    autoTable(doc, {
      startY: 30,
      head: [["Field", "Value"]],
      body: details,
      theme: "striped",
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    doc.save(`invoice-history-${data.invoice_number}-${item.id}.pdf`);
    toast.success("تم تنزيل PDF بنجاح");
  };

  const filteredHistory = history.filter((item: any) => {
    const data = item.data;
    const searchLower = searchTerm.toLowerCase();
    
    // Search filter
    const matchesSearch = 
      data.invoice_number?.toLowerCase().includes(searchLower) ||
      data.client_name?.toLowerCase().includes(searchLower) ||
      data.total_amount?.toString().includes(searchLower) ||
      item.profiles?.first_name?.toLowerCase().includes(searchLower) ||
      item.profiles?.last_name?.toLowerCase().includes(searchLower);
    
    // Action filter
    const matchesAction = actionFilter === "all" || item.action === actionFilter;
    
    // Date filter
    const matchesDate = !dateFilter || 
      format(new Date(item.modified_at), "yyyy-MM-dd") === dateFilter;
    
    // User filter
    const matchesUser = userFilter === "all" || item.modified_by === userFilter;
    
    return matchesSearch && matchesAction && matchesDate && matchesUser;
  });

  // Combine invoice history with WhatsApp/Email history
  const combinedHistory = [
    ...filteredHistory.map((item: any) => ({
      ...item,
      type: "invoice_action",
      timestamp: item.modified_at
    })),
    ...whatsappHistory
      .filter((msg: any) => 
        !searchTerm || 
        msg.clients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map((msg: any) => ({
      ...msg,
      type: "whatsapp_sent",
      timestamp: msg.sent_at
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="container mx-auto p-6 font-arabic" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            سجل الفواتير الكامل
          </h1>
          <p className="text-muted-foreground mt-1">تتبع جميع العمليات والتعديلات على الفواتير</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 ml-2" />
          {showFilters ? "إخفاء الفلاتر" : "إظهار الفلاتر"}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">فواتير تم إنشاؤها</p>
                <p className="text-2xl font-bold">
                  {history.filter((h: any) => h.action === "created").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <History className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تعديلات</p>
                <p className="text-2xl font-bold">
                  {history.filter((h: any) => h.action === "updated").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <RotateCcw className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">محذوفات</p>
                <p className="text-2xl font-bold">
                  {history.filter((h: any) => h.action === "deleted").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Send className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">رسائل واتساب</p>
                <p className="text-2xl font-bold">{whatsappHistory.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              فلاتر البحث المتقدم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>نوع الإجراء</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الإجراءات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الإجراءات</SelectItem>
                    <SelectItem value="created">تم الإنشاء</SelectItem>
                    <SelectItem value="updated">تم التعديل</SelectItem>
                    <SelectItem value="deleted">تم الحذف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>المستخدم</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع المستخدمين" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المستخدمين</SelectItem>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setActionFilter("all");
                    setDateFilter("");
                    setUserFilter("all");
                    setSearchTerm("");
                  }}
                >
                  إعادة تعيين الفلاتر
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث في السجل (رقم الفاتورة، اسم العميل، المبلغ، المستخدم)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Combined History Timeline */}
      <div className="space-y-3">
        {combinedHistory.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <History className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد سجلات</p>
            </CardContent>
          </Card>
        ) : (
          combinedHistory.map((item: any) => {
            if (item.type === "invoice_action") {
              const data = item.data;
              const modifierName = item.profiles 
                ? `${item.profiles.first_name} ${item.profiles.last_name}`
                : "غير معروف";

              return (
                <Card key={`invoice-${item.id}`} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className={`${getActionColor(item.action)} text-white`}>
                            {getActionLabel(item.action)}
                          </Badge>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {format(new Date(item.modified_at), "dd/MM/yyyy HH:mm:ss")}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            {modifierName}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">رقم الفاتورة</p>
                            <p className="font-bold text-sm">{data.invoice_number}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">العميل</p>
                            <p className="font-medium text-sm">{data.client_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">المبلغ الإجمالي</p>
                            <p className="font-bold text-sm text-primary">
                              {data.total_amount?.toFixed(3)} {data.currency}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">الحالة</p>
                            <Badge variant="outline" className="text-xs">{data.status}</Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">تاريخ الإصدار</p>
                            <p className="text-sm">{data.issue_date}</p>
                          </div>
                          {data.client_whatsapp && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">واتساب</p>
                              <p className="text-sm">{data.client_whatsapp}</p>
                            </div>
                          )}
                          {data.client_email && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">البريد الإلكتروني</p>
                              <p className="text-sm">{data.client_email}</p>
                            </div>
                          )}
                          {data.payment_mode && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">طريقة الدفع</p>
                              <p className="text-sm">{data.payment_mode}</p>
                            </div>
                          )}
                        </div>
                        
                        {data.services && data.services.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-2">الخدمات ({data.services.length})</p>
                            <div className="space-y-1">
                              {data.services.slice(0, 3).map((service: any, idx: number) => (
                                <div key={idx} className="text-sm flex justify-between items-center p-2 bg-muted/20 rounded">
                                  <span>{service.description}</span>
                                  <span className="font-medium">
                                    {service.quantity} × {service.unitPrice.toFixed(3)} = {service.total.toFixed(3)} {data.currency}
                                  </span>
                                </div>
                              ))}
                              {data.services.length > 3 && (
                                <p className="text-xs text-muted-foreground">+ {data.services.length - 3} خدمات أخرى</p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {data.notes && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
                            <p className="text-xs text-muted-foreground mb-1">ملاحظات</p>
                            <p className="text-sm">{data.notes}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 mr-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generatePDF(item)}
                          title="تنزيل PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {item.action === "deleted" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleRestoreClick(item)}
                            title="استعادة الفاتورة"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            } else if (item.type === "whatsapp_sent") {
              const senderName = item.profiles 
                ? `${item.profiles.first_name} ${item.profiles.last_name}`
                : "غير معروف";

              return (
                <Card key={`whatsapp-${item.id}`} className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <Send className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className="bg-green-600 text-white">
                            إرسال واتساب
                          </Badge>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {format(new Date(item.sent_at), "dd/MM/yyyy HH:mm:ss")}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            {senderName}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">العميل</p>
                            <p className="font-medium text-sm">{item.clients?.full_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">رقم واتساب</p>
                            <p className="text-sm">{item.clients?.whatsapp_number}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">حالة التأشيرة</p>
                            <p className="text-sm font-medium">{item.visa_status}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            return null;
          })
        )}
      </div>
    </div>
  );
}