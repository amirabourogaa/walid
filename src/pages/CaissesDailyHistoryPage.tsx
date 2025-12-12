import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Caisse {
  id: string;
  nom: string;
  montants: Array<{ currency: string; amount: number }>;
}

interface DailyHistory {
  id: string;
  history_date: string;
  montants_debut_journee: Array<{ currency: string; amount: number }>;
  montants_fin_journee: Array<{ currency: string; amount: number }>;
  transactions_summary: {
    entrees: Record<string, number>;
    sorties: Record<string, number>;
    nombre_transactions: number;
  };
}

export default function CaissesDailyHistoryPage() {
  const navigate = useNavigate();
  const [caisses, setCaisses] = useState<Caisse[]>([]);
  const [selectedCaisseId, setSelectedCaisseId] = useState<string>('');
  const [history, setHistory] = useState<DailyHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all' | 'custom'>('month');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [singleDayHistory, setSingleDayHistory] = useState<DailyHistory | null>(null);

  useEffect(() => {
    fetchCaisses();
  }, []);

  useEffect(() => {
    if (selectedCaisseId) {
      if (dateRange === 'custom' && selectedDate) {
        fetchSingleDayHistory();
      } else {
        fetchHistory();
        setSingleDayHistory(null);
      }
    }
  }, [selectedCaisseId, dateRange, selectedDate]);

  const fetchCaisses = async () => {
    try {
      const { data, error } = await supabase
        .from('caisses')
        .select('id, nom, montants')
        .order('nom');

      if (error) throw error;
      setCaisses((data || []).map(c => ({
        ...c,
        montants: (c.montants as any) || []
      })));
      
      if (data && data.length > 0) {
        setSelectedCaisseId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching caisses:', error);
      toast.error('حدث خطأ أثناء تحميل الصناديق');
    }
  };

  const fetchSingleDayHistory = async () => {
    if (!selectedCaisseId || !selectedDate) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('caisses_daily_history')
        .select('*')
        .eq('caisse_id', selectedCaisseId)
        .eq('history_date', selectedDate)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSingleDayHistory({
          id: data.id,
          history_date: data.history_date,
          montants_debut_journee: (data.montants_debut_journee as any) || [],
          montants_fin_journee: (data.montants_fin_journee as any) || [],
          transactions_summary: (data.transactions_summary as any) || {
            entrees: {},
            sorties: {},
            nombre_transactions: 0
          }
        });
      } else {
        setSingleDayHistory(null);
        toast.info('لا يوجد سجل لهذا اليوم');
      }
      setHistory([]);
    } catch (error) {
      console.error('Error fetching single day history:', error);
      toast.error('حدث خطأ أثناء تحميل السجل');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!selectedCaisseId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('caisses_daily_history')
        .select('*')
        .eq('caisse_id', selectedCaisseId)
        .order('history_date', { ascending: false });

      const today = new Date();
      if (dateRange === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('history_date', weekAgo.toISOString().split('T')[0]);
      } else if (dateRange === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('history_date', monthAgo.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const transformedData: DailyHistory[] = (data || []).map(item => ({
        id: item.id,
        history_date: item.history_date,
        montants_debut_journee: (item.montants_debut_journee as any) || [],
        montants_fin_journee: (item.montants_fin_journee as any) || [],
        transactions_summary: (item.transactions_summary as any) || {
          entrees: {},
          sorties: {},
          nombre_transactions: 0
        }
      }));
      
      setHistory(transformedData);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('حدث خطأ أثناء تحميل السجل');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!selectedCaisseId) return;

    try {
      // Get the caisse data
      const selectedCaisse = caisses.find(c => c.id === selectedCaisseId);
      if (!selectedCaisse) {
        toast.error('الصندوق غير موجود');
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Calculate transactions summary for today
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('type, montant, devise')
        .eq('source_type', 'caisse')
        .eq('source_id', selectedCaisseId)
        .eq('date_transaction', today);

      if (txError) throw txError;

      const entrees: Record<string, number> = {};
      const sorties: Record<string, number> = {};

      (transactions || []).forEach(tx => {
        if (tx.type === 'entree') {
          entrees[tx.devise] = (entrees[tx.devise] || 0) + tx.montant;
        } else {
          sorties[tx.devise] = (sorties[tx.devise] || 0) + tx.montant;
        }
      });

      const transactionsSummary = {
        entrees,
        sorties,
        nombre_transactions: transactions?.length || 0
      };

      // Insert or update the history
      const { error } = await supabase
        .from('caisses_daily_history')
        .upsert({
          caisse_id: selectedCaisseId,
          history_date: today,
          montants_debut_journee: selectedCaisse.montants,
          montants_fin_journee: selectedCaisse.montants,
          transactions_summary: transactionsSummary
        }, {
          onConflict: 'caisse_id,history_date'
        });

      if (error) throw error;

      toast.success('تم حفظ لقطة اليوم بنجاح');
      fetchHistory();
    } catch (error) {
      console.error('Error saving snapshot:', error);
      toast.error('حدث خطأ أثناء حفظ اللقطة');
    }
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      TND: 'د.ت',
      EUR: '€',
      USD: '$',
      DLY: 'د.ل'
    };
    return symbols[currency] || currency;
  };

  const calculateDifference = (start: number, end: number) => {
    return end - start;
  };

  const selectedCaisse = caisses.find(c => c.id === selectedCaisseId);

  return (
    <div className="p-6 space-y-6 font-arabic" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/manager/caisses')}
            className="space-x-2 space-x-reverse"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>رجوع</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">السجل اليومي للصناديق</h1>
            <p className="text-muted-foreground">متابعة التطورات اليومية للصناديق</p>
          </div>
        </div>
        <Button onClick={handleSaveSnapshot} className="space-x-2 space-x-reverse">
          <Download className="h-4 w-4" />
          <span>حفظ لقطة اليوم</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">الصندوق</label>
              <Select value={selectedCaisseId} onValueChange={setSelectedCaisseId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الصندوق" />
                </SelectTrigger>
                <SelectContent>
                  {caisses.map(caisse => (
                    <SelectItem key={caisse.id} value={caisse.id}>
                      {caisse.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">الفترة</label>
              <Select value={dateRange} onValueChange={(value: any) => {
                setDateRange(value);
                if (value !== 'custom') {
                  setSelectedDate('');
                  setSingleDayHistory(null);
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">آخر أسبوع</SelectItem>
                  <SelectItem value="month">آخر شهر</SelectItem>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="custom">تحديد يوم معين</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">اختر التاريخ</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={fetchSingleDayHistory}
                    disabled={!selectedDate}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </CardContent>
        </Card>
      ) : dateRange === 'custom' && singleDayHistory ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {format(new Date(singleDayHistory.history_date), 'EEEE، d MMMM yyyy', { locale: ar })}
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {singleDayHistory.transactions_summary.nombre_transactions} معاملة
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Montants début */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground">رصيد بداية اليوم</h3>
                {singleDayHistory.montants_debut_journee.length > 0 ? (
                  singleDayHistory.montants_debut_journee.map((montant) => (
                    <div key={montant.currency} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">{montant.currency}</span>
                      <span className="font-bold">
                        {montant.amount.toLocaleString()} {getCurrencySymbol(montant.currency)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
                )}
              </div>

              {/* Transactions */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground">حركات اليوم</h3>
                
                {Object.keys(singleDayHistory.transactions_summary.entrees || {}).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      <span>الإيرادات</span>
                    </div>
                    {Object.entries(singleDayHistory.transactions_summary.entrees).map(([currency, amount]) => (
                      <div key={currency} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <span className="text-xs">{currency}</span>
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">
                          +{amount.toLocaleString()} {getCurrencySymbol(currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {Object.keys(singleDayHistory.transactions_summary.sorties || {}).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <TrendingDown className="h-4 w-4" />
                      <span>المصروفات</span>
                    </div>
                    {Object.entries(singleDayHistory.transactions_summary.sorties).map(([currency, amount]) => (
                      <div key={currency} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        <span className="text-xs">{currency}</span>
                        <span className="text-sm font-medium text-red-700 dark:text-red-400">
                          -{amount.toLocaleString()} {getCurrencySymbol(currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {Object.keys(singleDayHistory.transactions_summary.entrees || {}).length === 0 && 
                 Object.keys(singleDayHistory.transactions_summary.sorties || {}).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا توجد حركات في هذا اليوم
                  </p>
                )}
              </div>

              {/* Montants fin */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground">رصيد نهاية اليوم</h3>
                {singleDayHistory.montants_fin_journee.length > 0 ? (
                  singleDayHistory.montants_fin_journee.map((montant) => {
                    const startMontant = singleDayHistory.montants_debut_journee.find(m => m.currency === montant.currency);
                    const difference = startMontant ? calculateDifference(startMontant.amount, montant.amount) : 0;
                    
                    return (
                      <div key={montant.currency} className="p-3 bg-primary/10 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{montant.currency}</span>
                          <span className="font-bold">
                            {montant.amount.toLocaleString()} {getCurrencySymbol(montant.currency)}
                          </span>
                        </div>
                        {difference !== 0 && (
                          <div className={`text-xs ${difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {difference > 0 ? '+' : ''}{difference.toLocaleString()} {getCurrencySymbol(montant.currency)}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : dateRange === 'custom' && !singleDayHistory && selectedDate ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا يوجد سجل لهذا اليوم ({selectedDate})</p>
            <p className="text-sm text-muted-foreground mt-2">
              اضغط على "حفظ لقطة اليوم" لبدء تسجيل السجل اليومي
            </p>
          </CardContent>
        </Card>
      ) : history.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا يوجد سجل متاح للصندوق المحدد</p>
            <p className="text-sm text-muted-foreground mt-2">
              اضغط على "حفظ لقطة اليوم" لبدء تسجيل السجل اليومي
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((record) => (
            <Card key={record.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {format(new Date(record.history_date), 'EEEE، d MMMM yyyy', { locale: ar })}
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {record.transactions_summary.nombre_transactions} معاملة
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Montants début */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm text-muted-foreground">رصيد بداية اليوم</h3>
                    {record.montants_debut_journee.length > 0 ? (
                      record.montants_debut_journee.map((montant) => (
                        <div key={montant.currency} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm font-medium">{montant.currency}</span>
                          <span className="font-bold">
                            {montant.amount.toLocaleString()} {getCurrencySymbol(montant.currency)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
                    )}
                  </div>

                  {/* Transactions */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm text-muted-foreground">حركات اليوم</h3>
                    
                    {/* Entrées */}
                    {Object.keys(record.transactions_summary.entrees || {}).length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>الإيرادات</span>
                        </div>
                        {Object.entries(record.transactions_summary.entrees).map(([currency, amount]) => (
                          <div key={currency} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                            <span className="text-xs">{currency}</span>
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">
                              +{amount.toLocaleString()} {getCurrencySymbol(currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sorties */}
                    {Object.keys(record.transactions_summary.sorties || {}).length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-red-600">
                          <TrendingDown className="h-4 w-4" />
                          <span>المصروفات</span>
                        </div>
                        {Object.entries(record.transactions_summary.sorties).map(([currency, amount]) => (
                          <div key={currency} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                            <span className="text-xs">{currency}</span>
                            <span className="text-sm font-medium text-red-700 dark:text-red-400">
                              -{amount.toLocaleString()} {getCurrencySymbol(currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {Object.keys(record.transactions_summary.entrees || {}).length === 0 && 
                     Object.keys(record.transactions_summary.sorties || {}).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        لا توجد حركات في هذا اليوم
                      </p>
                    )}
                  </div>

                  {/* Montants fin */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm text-muted-foreground">رصيد نهاية اليوم</h3>
                    {record.montants_fin_journee.length > 0 ? (
                      record.montants_fin_journee.map((montant) => {
                        const startMontant = record.montants_debut_journee.find(m => m.currency === montant.currency);
                        const difference = startMontant ? calculateDifference(startMontant.amount, montant.amount) : 0;
                        
                        return (
                          <div key={montant.currency} className="p-3 bg-primary/10 rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{montant.currency}</span>
                              <span className="font-bold">
                                {montant.amount.toLocaleString()} {getCurrencySymbol(montant.currency)}
                              </span>
                            </div>
                            {difference !== 0 && (
                              <div className={`text-xs ${difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {difference > 0 ? '+' : ''}{difference.toLocaleString()} {getCurrencySymbol(montant.currency)}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
