import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import SupervisorInbox from "@/components/SupervisorInbox";
import EmployeeWorkspace from "@/components/EmployeeWorkspace";
import SupervisorDashboard from "@/components/SupervisorDashboard";
import { SupervisorOverview } from "@/components/SupervisorOverview";
import { Trash2, UserPlus } from "lucide-react";
import CreateEmployeeDialog from "@/components/CreateEmployeeDialog";

interface Employee {
  id: string;
  name: string;
  email: string | null;
  workload: number;
}

export default function WorkDistributionPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    checkUserRole();
    fetchEmployees();
    syncEmployeesFromProfiles();
    cleanupEmployees();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    setUserRole(data?.role || 'employee');
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('name');
    
    setEmployees(data || []);
  };

  const syncEmployeesFromProfiles = async () => {
    // Get all users with 'employee' role
    const { data: employeeRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'employee');

    if (!employeeRoles) return;

    for (const roleRecord of employeeRoles) {
      // Get profile information
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', roleRecord.user_id)
        .maybeSingle();

      if (!profile) continue;

      // Check if employee already exists
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!existingEmployee) {
        // Create employee record
        const employeeName = `${profile.first_name} ${profile.last_name}`.trim();
        await supabase.from('employees').insert({
          user_id: profile.id,
          name: employeeName,
          email: profile.email,
          workload: 0,
          profile_synced: true
        });
      }
    }

    fetchEmployees();
  };

  const cleanupEmployees = async () => {
    // Remove specific employees as requested
    const employeesToRemove = ['Mohamed Majdi', 'oumaima dellai', 'Sofien Majdi'];
    
    for (const employeeName of employeesToRemove) {
      await supabase
        .from('employees')
        .delete()
        .ilike('name', employeeName);
    }
  };

  const addEmployee = async () => {
    if (!newEmployeeName.trim()) {
      toast({ title: 'خطأ', description: 'الرجاء إدخال اسم الموظف', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('employees').insert({
      name: newEmployeeName.trim(),
      email: newEmployeeEmail.trim() || null,
      workload: 0
    });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل إضافة الموظف', variant: 'destructive' });
      return;
    }

    toast({ title: 'نجاح', description: 'تم إضافة الموظف بنجاح' });
    setNewEmployeeName("");
    setNewEmployeeEmail("");
    fetchEmployees();
  };

  const deleteEmployee = async (id: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل حذف الموظف', variant: 'destructive' });
      return;
    }

    toast({ title: 'نجاح', description: 'تم حذف الموظف بنجاح' });
    fetchEmployees();
  };

  const isManager = userRole === 'admin' || userRole === 'manager';

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">جلب وتقسيم الأعمال</h1>

      <Tabs defaultValue={isManager ? "overview" : "employee"}>
        <TabsList className="grid w-full grid-cols-5">
          {isManager && <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>}
          {isManager && <TabsTrigger value="supervisor">صندوق المشرف</TabsTrigger>}
          {isManager && <TabsTrigger value="dashboard">لوحة التحكم</TabsTrigger>}
          <TabsTrigger value="employee">مساحة الموظف</TabsTrigger>
          {isManager && <TabsTrigger value="employees">إدارة الموظفين</TabsTrigger>}
        </TabsList>

        {isManager && (
          <TabsContent value="overview">
            <SupervisorOverview />
          </TabsContent>
        )}

        {isManager && (
          <TabsContent value="supervisor">
            <SupervisorInbox />
          </TabsContent>
        )}

        {isManager && (
          <TabsContent value="dashboard">
            <SupervisorDashboard />
          </TabsContent>
        )}

        <TabsContent value="employee">
          <EmployeeWorkspace />
        </TabsContent>

        {isManager && (
          <TabsContent value="employees">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>إدارة الموظفين</CardTitle>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    إضافة موظف
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>البريد الإلكتروني</TableHead>
                      <TableHead>عدد المهام</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          لا يوجد موظفون
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{emp.name}</TableCell>
                          <TableCell>{emp.email || '-'}</TableCell>
                          <TableCell>{emp.workload}</TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteEmployee(emp.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <CreateEmployeeDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchEmployees}
      />
    </div>
  );
}
