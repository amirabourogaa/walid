import { FileText, Clock, Check, Building, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProgressStatus = 'completed' | 'pending';

export interface ProgressStep {
  id: string;
  title: string;
  date?: string;
  status: ProgressStatus;
  icon: 'document' | 'clock' | 'check' | 'building' | 'user';
}

interface ClientProgressTimelineProps {
  steps: ProgressStep[];
  className?: string;
}

export function ClientProgressTimeline({ steps, className }: ClientProgressTimelineProps) {
  const getIcon = (iconType: string, status: ProgressStatus) => {
    const iconClass = cn(
      'h-5 w-5',
      status === 'completed' ? 'text-white' : 'text-muted-foreground'
    );

    switch (iconType) {
      case 'document':
        return <FileText className={iconClass} />;
      case 'clock':
        return <Clock className={iconClass} />;
      case 'check':
        return <Check className={iconClass} />;
      case 'building':
        return <Building className={iconClass} />;
      case 'user':
        return <User className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  return (
    <div className={cn('', className)}>
      <h4 className="font-semibold text-sm mb-3">التقدم</h4>
      <div className="space-y-0">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.id} className="relative flex items-center pb-6 last:pb-0">
              {/* Connector Line */}
              {!isLast && (
                <div 
                  className={cn(
                    'absolute right-[19px] top-10 h-full w-0.5',
                    step.status === 'completed' ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
              
              {/* Step Indicator */}
              <div className="flex items-center justify-center flex-shrink-0 ml-3">
                <div 
                  className={cn(
                    'flex items-center justify-center h-10 w-10 rounded-full',
                    step.status === 'completed' 
                      ? 'bg-primary' 
                      : 'bg-muted border-2 border-border'
                  )}
                >
                  {getIcon(step.icon, step.status)}
                </div>
              </div>

              {/* Step Content */}
              <div className="flex-1">
                <p className={cn(
                  'text-sm font-medium',
                  step.status === 'completed' ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {step.title}
                </p>
                {step.date && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.date}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
