import { useState } from 'react';
import { CheckCircle2, Clock, XCircle, Building2, Package, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendVisaStatusUpdate } from '@/lib/whatsappHelpers';

const visaStatuses = [
  { 
    value: 'تم استلام معاملتكم', 
    label: 'تم استلام معاملتكم',
    icon: Package,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    message: (name: string) => `مرحباً ${name}،

📝 تم استلام معاملتكم!

تم استلام معاملتكم بنجاح وسيتم معالجتها قريباً.

📋 الحالة الحالية: تم استلام معاملتكم
📅 التاريخ: ${new Date().toLocaleDateString('ar-TN')}

سيتم إعلامكم بأي تحديثات جديدة.

شكراً لثقتكم بنا.

---
شركة تونس للاستشارات والخدمات
📱 Facebook: https://www.facebook.com/share/1D4dHp2z74/?mibextid=wwXIfr`
  },
  { 
    value: 'تم التقديم في السيستام', 
    label: 'تم التقديم في السيستام',
    icon: Clock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    message: (name: string) => `مرحباً ${name}،

📝 تم التقديم في السيستام!

تم إدخال معلوماتكم في نظام التأشيرات بنجاح.

📋 الحالة الحالية: تم التقديم في السيستام
📅 التاريخ: ${new Date().toLocaleDateString('ar-TN')}

سيتم إعلامكم بأي تحديثات جديدة.

شكراً لثقتكم بنا.

---
شركة تونس للاستشارات والخدمات
📱 Facebook: https://www.facebook.com/share/1D4dHp2z74/?mibextid=wwXIfr`
  },
  { 
    value: 'تم قبول التأشيرة', 
    label: 'تم قبول التأشيرة',
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    message: (name: string) => `مرحباً ${name}،

🎉 تم قبول التأشيرة!

نهنئكم! تم قبول طلب التأشيرة الخاص بكم.

📋 الحالة الحالية: تم قبول التأشيرة
📅 التاريخ: ${new Date().toLocaleDateString('ar-TN')}

سيتم إعلامكم بموعد الاستلام قريباً.

شكراً لثقتكم بنا.

---
شركة تونس للاستشارات والخدمات
📱 Facebook: https://www.facebook.com/share/1D4dHp2z74/?mibextid=wwXIfr`
  },
  { 
    value: 'التأشيرة غير موافق عليها', 
    label: 'التأشيرة غير موافق عليها',
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    message: (name: string) => `مرحباً ${name}،

❌ التأشيرة غير موافق عليها

نأسف لإبلاغكم أن طلب التأشيرة لم يتم الموافقة عليه.

📋 الحالة الحالية: التأشيرة غير موافق عليها
📅 التاريخ: ${new Date().toLocaleDateString('ar-TN')}

يمكنكم التواصل معنا لمزيد من التفاصيل.

---
شركة تونس للاستشارات والخدمات
📱 Facebook: https://www.facebook.com/share/1D4dHp2z74/?mibextid=wwXIfr`
  },
  { 
    value: 'تم التقديم إلى السفارة', 
    label: 'تم التقديم إلى السفارة',
    icon: Building2,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    message: (name: string) => `مرحباً ${name}،

🏛️ تم التقديم إلى السفارة!

تم تقديم ملفكم إلى السفارة وهو قيد المراجعة.

📋 الحالة الحالية: تم التقديم إلى السفارة
📅 التاريخ: ${new Date().toLocaleDateString('ar-TN')}

سيتم إعلامكم بأي تحديثات جديدة.

شكراً لثقتكم بنا.

---
شركة تونس للاستشارات والخدمات
📱 Facebook: https://www.facebook.com/share/1D4dHp2z74/?mibextid=wwXIfr`
  },
  { 
    value: 'اكتملت العملية', 
    label: 'اكتملت العملية',
    icon: CheckCheck,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    message: (name: string) => `مرحباً ${name}،

✅ اكتملت العملية!

تهانينا! اكتملت جميع إجراءات التأشيرة بنجاح.

📋 الحالة الحالية: اكتملت العملية
📅 التاريخ: ${new Date().toLocaleDateString('ar-TN')}

يمكنكم استلام وثائقكم.

شكراً لثقتكم بنا.

---
شركة تونس للاستشارات والخدمات
📱 Facebook: https://www.facebook.com/share/1D4dHp2z74/?mibextid=wwXIfr`
  }
];

interface VisaStatusTrackerProps {
  clientId: string;
  clientName: string;
  whatsappNumber?: string;
  currentStatus?: string;
  onStatusChange?: () => void;
  className?: string;
}

export function VisaStatusTracker({ 
  clientId, 
  clientName,
  whatsappNumber,
  currentStatus, 
  onStatusChange,
  className 
}: VisaStatusTrackerProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusClick = async (newStatus: string) => {
    if (newStatus === currentStatus || isUpdating) return;

    setIsUpdating(true);
    try {
      // Update status in database
      const { error: updateError } = await supabase
        .from('clients')
        .update({ visa_tracking_status: newStatus })
        .eq('id', clientId);

      if (updateError) throw updateError;

      // Send WhatsApp message
      if (whatsappNumber) {
        try {
          // Créer un objet client pour la fonction d'aide
          const clientForWhatsApp = {
            id: clientId,
            full_name: clientName,
            whatsapp_number: whatsappNumber
          };
          
          await sendVisaStatusUpdate(clientForWhatsApp, newStatus);
          toast.success('تم تحديث الحالة وإرسال رسالة WhatsApp بنجاح');
        } catch (whatsappError) {
          console.error('WhatsApp error:', whatsappError);
          toast.warning('تم تحديث الحالة ولكن فشل إرسال رسالة WhatsApp');
        }
      } else {
        toast.success('تم تحديث الحالة بنجاح');
      }

      onStatusChange?.();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('حدث خطأ أثناء تحديث الحالة');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={cn('', className)}>
      <h4 className="font-semibold text-sm mb-3">حالة تتبع التأشيرة</h4>
      <div className="relative">
        {visaStatuses.map((status, index) => {
          const Icon = status.icon;
          const isActive = status.value === currentStatus;
          const isLast = index === visaStatuses.length - 1;
          
          return (
            <div key={status.value} className="relative">
              {!isLast && (
                <div className="absolute right-[15px] top-8 w-[2px] h-[calc(100%-16px)] bg-border" />
              )}
              <button
                onClick={() => handleStatusClick(status.value)}
                disabled={isUpdating}
                className={cn(
                  'w-full flex items-center gap-3 py-2 transition-all text-right',
                  'hover:opacity-80',
                  isUpdating && 'opacity-50 cursor-not-allowed',
                  !isUpdating && 'cursor-pointer'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-full z-10 shrink-0',
                  isActive 
                    ? `${status.bgColor} ${status.color}` 
                    : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={cn(
                  'text-sm flex-1',
                  isActive ? `font-semibold ${status.color}` : 'text-muted-foreground'
                )}>
                  {status.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}