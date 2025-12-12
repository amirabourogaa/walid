import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService, User } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface AuthGuardProps {
  children: ReactNode;
  requireRole?: 'admin' | 'manager' | 'employee' | 'client';
}

export function AuthGuard({ children, requireRole }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Initialize auth service
    authService.initialize().then(() => {
      setUser(authService.getCurrentUser());
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setUser(authService.getCurrentUser());
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !authService.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user is inactive
  if (user.status === 'inactive') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">حسابك قيد المراجعة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription className="text-center">
                تم إنشاء حسابك بنجاح ولكنه في انتظار الموافقة من الإدارة. 
                سنقوم بإعلامك عبر البريد الإلكتروني عند تفعيل حسابك.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => {
                authService.logout();
                window.location.href = '/login';
              }}
              className="w-full"
            >
              تسجيل الخروج
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check role permissions
  if (requireRole) {
    if (requireRole === 'manager') {
      // Manager role can be accessed by admin, manager, or employee
      if (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'employee') {
        return <Navigate to="/client" replace />;
      }
    } else if (requireRole === 'admin') {
      // Admin-only pages - managers can also access
      if (user.role !== 'admin' && user.role !== 'manager') {
        return <Navigate to="/manager" replace />;
      }
    } else if (requireRole === 'client') {
      // Client role - only clients can access
      if (user.role !== 'client') {
        return <Navigate to="/manager" replace />;
      }
    } else if (user.role !== requireRole && user.role !== 'admin') {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}