import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, User, FileText, UserCheck, Edit, Trash, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ActivityLog {
  id: string;
  client_id: string;
  user_id: string | null;
  action_type: string;
  action_description: string;
  old_value: any;
  new_value: any;
  field_changed: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

interface ClientActivityLogProps {
  clientId: string;
}

const actionIcons: Record<string, any> = {
  created: Plus,
  updated: Edit,
  status_changed: FileText,
  reassigned: UserCheck,
  document_added: FileText,
  deleted: Trash,
};

const actionColors: Record<string, string> = {
  created: 'bg-green-500/10 text-green-700 border-green-500/20',
  updated: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  status_changed: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  reassigned: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  document_added: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
  deleted: 'bg-red-500/10 text-red-700 border-red-500/20',
};

export function ClientActivityLog({ clientId }: ClientActivityLogProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('client-activity-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_activity_log',
          filter: `client_id=eq.${clientId}`
        },
        (payload) => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const fetchActivities = async () => {
    setLoading(true);
    
    const { data: logs, error } = await supabase
      .from('client_activity_log')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching activity logs:', error);
      setLoading(false);
      return;
    }

    // Fetch user names for each log
    const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))];
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      const enrichedLogs = logs.map(log => {
        const profile = profiles?.find(p => p.id === log.user_id);
        return {
          ...log,
          user_name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'مستخدم غير معروف',
          user_email: profile?.email || ''
        };
      });

      setActivities(enrichedLogs);
    } else {
      setActivities(logs.map(log => ({
        ...log,
        user_name: 'النظام',
        user_email: ''
      })));
    }

    setLoading(false);
  };

  const getActionIcon = (actionType: string) => {
    const Icon = actionIcons[actionType] || Edit;
    return <Icon className="h-4 w-4" />;
  };

  const getActionColor = (actionType: string) => {
    return actionColors[actionType] || 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          سجل النشاطات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد نشاطات</div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className="relative flex gap-4 pb-4"
                  style={{
                    borderBottom: index < activities.length - 1 ? '1px solid hsl(var(--border))' : 'none'
                  }}
                >
                  {/* Timeline line */}
                  {index < activities.length - 1 && (
                    <div
                      className="absolute right-[19px] top-8 w-[2px] h-[calc(100%-2rem)] bg-border"
                    />
                  )}

                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${getActionColor(activity.action_type)}`}>
                    {getActionIcon(activity.action_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">
                          {activity.action_description}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{activity.user_name}</span>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(activity.created_at), {
                              addSuffix: true,
                              locale: ar
                            })}
                          </span>
                        </div>
                      </div>

                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {activity.action_type === 'created' && 'إنشاء'}
                        {activity.action_type === 'updated' && 'تحديث'}
                        {activity.action_type === 'status_changed' && 'تغيير الحالة'}
                        {activity.action_type === 'reassigned' && 'إعادة تعيين'}
                        {activity.action_type === 'document_added' && 'إضافة مستند'}
                        {activity.action_type === 'deleted' && 'حذف'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
