import { Check, Clock, X, FileText, Building, FileCheck, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimelineStatus = 'completed' | 'current' | 'pending' | 'rejected';

export interface TimelineStep {
  id: string;
  title: string;
  description?: string;
  status: TimelineStatus;
  date?: string;
  employee?: string;
  deadline?: string;
}

interface ApplicationTimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function ApplicationTimeline({ steps, className }: ApplicationTimelineProps) {
  const getStatusColor = (status: TimelineStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 border-green-500';
      case 'current':
        return 'bg-blue-500 border-blue-500';
      case 'rejected':
        return 'bg-red-500 border-red-500';
      default:
        return 'bg-gray-300 border-gray-300';
    }
  };

  const getStatusIcon = (status: TimelineStatus) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-white" />;
      case 'current':
        return <Clock className="h-4 w-4 text-white" />;
      case 'rejected':
        return <X className="h-4 w-4 text-white" />;
      default:
        return <div className="h-2 w-2 bg-white rounded-full" />;
    }
  };

  const getConnectorColor = (currentStatus: TimelineStatus, nextStatus?: TimelineStatus) => {
    if (currentStatus === 'completed') {
      return 'bg-green-500';
    }
    if (currentStatus === 'current' || currentStatus === 'rejected') {
      return 'bg-gray-300';
    }
    return 'bg-gray-300';
  };

  return (
    <div className={cn('relative', className)}>
      <div className="space-y-0">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const nextStep = !isLast ? steps[index + 1] : undefined;
          
          return (
            <div key={step.id} className="relative flex items-start pb-8 last:pb-0">
              {/* Connector Line */}
              {!isLast && (
                <div 
                  className={cn(
                    'absolute right-[19px] top-10 h-full w-0.5',
                    getConnectorColor(step.status, nextStep?.status)
                  )}
                />
              )}
              
              {/* Step Indicator */}
              <div className="flex items-center justify-center flex-shrink-0 ml-4">
                <div 
                  className={cn(
                    'flex items-center justify-center h-10 w-10 rounded-full border-2',
                    getStatusColor(step.status)
                  )}
                >
                  {getStatusIcon(step.status)}
                </div>
              </div>

              {/* Step Content */}
              <div className="flex-1 mr-4">
                <div className={cn(
                  'p-4 rounded-lg border',
                  step.status === 'current' ? 'bg-blue-50 border-blue-200' :
                  step.status === 'completed' ? 'bg-green-50 border-green-200' :
                  step.status === 'rejected' ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-200'
                )}>
                  <h4 className="font-semibold text-sm mb-1">{step.title}</h4>
                  
                  {step.description && (
                    <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {step.date && (
                      <div className="flex items-center space-x-1 space-x-reverse">
                        <Clock className="h-3 w-3" />
                        <span>{step.date}</span>
                      </div>
                    )}
                    
                    {step.employee && (
                      <div className="flex items-center space-x-1 space-x-reverse">
                        <User className="h-3 w-3" />
                        <span>{step.employee}</span>
                      </div>
                    )}
                    
                    {step.deadline && step.status === 'current' && (
                      <div className="flex items-center space-x-1 space-x-reverse text-orange-600 font-medium">
                        <Clock className="h-3 w-3" />
                        <span>الموعد النهائي: {step.deadline}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
