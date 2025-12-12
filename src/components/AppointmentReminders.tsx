import { useState, useEffect } from 'react';
import { Bell, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Reminder {
  id: string;
  client_id: string;
  reminder_type: string;
  reminder_date: string;
  sent: boolean;
  client?: {
    full_name: string;
    whatsapp_number?: string;
    passport_number?: string;
  };
}

export function AppointmentReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReminders();
    
    // Refresh every minute
    const interval = setInterval(fetchReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchReminders = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('appointment_reminders')
        .select(`
          *,
          client:clients(
            full_name,
            whatsapp_number,
            passport_number
          )
        `)
        .gte('reminder_date', today)
        .lte('reminder_date', nextWeek)
        .order('reminder_date', { ascending: true });

      if (error) throw error;

      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsSent = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('appointment_reminders')
        .update({ sent: true, sent_at: new Date().toISOString() })
        .eq('id', reminderId);

      if (error) throw error;

      toast.success('تم تعليم التذكير كمُرسل');
      fetchReminders();
    } catch (error) {
      console.error('Error marking reminder as sent:', error);
      toast.error('حدث خطأ أثناء تحديث التذكير');
    }
  };

  const getReminderTypeLabel = (type: string) => {
    return type === 'embassy_receipt' ? 'استلام السفارة' : 'انتهاء التأشيرة';
  };

  const getReminderColor = (type: string) => {
    return type === 'embassy_receipt' ? 'bg-blue-500' : 'bg-orange-500';
  };

  const upcomingReminders = reminders.filter(r => !r.sent);
  const sentReminders = reminders.filter(r => r.sent);

  if (isLoading) {
    return <div className="text-center py-4">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4 font-arabic" dir="rtl">
      {/* Upcoming Reminders */}
      {upcomingReminders.length > 0 && (
        <Card className="card-professional border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              <span>التذكيرات القادمة ({upcomingReminders.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-start justify-between p-4 bg-white rounded-lg border"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Bell className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{reminder.client?.full_name}</h4>
                      {reminder.client?.passport_number && (
                        <Badge variant="outline" className="text-xs">
                          {reminder.client.passport_number}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(reminder.reminder_date).toLocaleDateString('ar')}</span>
                      </div>
                      <Badge className={`${getReminderColor(reminder.reminder_type)} text-white text-xs`}>
                        {getReminderTypeLabel(reminder.reminder_type)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markAsSent(reminder.id)}
                >
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                  تم الإرسال
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sent Reminders */}
      {sentReminders.length > 0 && (
        <Card className="card-professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span>التذكيرات المُرسلة ({sentReminders.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sentReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-center justify-between p-3 bg-green-50/50 rounded-lg border border-green-200"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="font-medium text-sm">{reminder.client?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getReminderTypeLabel(reminder.reminder_type)} - {new Date(reminder.reminder_date).toLocaleDateString('ar')}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                  مُرسل
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {upcomingReminders.length === 0 && sentReminders.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          لا توجد تذكيرات في الأسبوع القادم
        </div>
      )}
    </div>
  );
}
