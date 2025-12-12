import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

interface CreateEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateEmployeeDialog({
  open,
  onOpenChange,
  onSuccess
}: CreateEmployeeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast({
        title: 'خطأ',
        description: 'الرجاء ملء جميع الحقول المطلوبة',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Create auth user with signup
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: 'employee'
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('فشل إنشاء المستخدم');

      // 2. Update role in user_roles table (if profile was created by trigger)
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'employee' })
        .eq('user_id', authData.user.id);

      if (roleError) console.error('Error updating role:', roleError);

      // 3. Add to employees table
      const employeeName = `${formData.firstName} ${formData.lastName}`.trim();
      const { error: employeeError } = await supabase
        .from('employees')
        .insert({
          name: employeeName,
          email: formData.email,
          workload: 0,
          user_id: authData.user.id,
          profile_synced: true
        });

      if (employeeError) throw employeeError;

      toast({
        title: 'نجاح',
        description: 'تم إنشاء حساب الموظف بنجاح'
      });

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: ''
      });
      
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل إنشاء حساب الموظف',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            إنشاء حساب موظف جديد
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">الاسم الأول *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="أدخل الاسم الأول"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">اسم العائلة</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="أدخل اسم العائلة"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="employee@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="أدخل كلمة مرور قوية"
              required
              minLength={6}
            />
            <p className="text-xs text-muted-foreground">
              يجب أن تكون كلمة المرور 6 أحرف على الأقل
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
