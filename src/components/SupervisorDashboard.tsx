import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Calendar, Clock, TrendingUp, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Assignment {
  id: string;
  client_id: string;
  employee_id: string;
  assigned_at: string;
  deadline: string | null;
  status: string;
  clients: {
    id: string;
    full_name: string;
    personal_photo_url: string | null;
    passport_photo_url: string | null;
    documents_urls: string[] | null;
    status: string;
    visa_tracking_status: string | null;
    submission_date: string | null;
    embassy_receipt_date: string | null;
    visa_start_date: string | null;
    visa_end_date: string | null;
    created_at: string;
  };
  daysInProcess: number;
  isOverdue: boolean;
}

interface EmployeeWithAssignments {
  id: string;
  name: string;
  workload: number;
  assignments: Assignment[];
  successRate: number;
  overdueCount: number;
  uploadedFilesCount: number;
  folderStats: {
    new: number;
    inProgress: number;
    completed: number;
    total: number;
  };
}

interface Stats {
  totalAssignments: number;
  completedAssignments: number;
  inProgressAssignments: number;
  overdueAssignments: number;
}

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<EmployeeWithAssignments[]>([]);
  const [deadlines, setDeadlines] = useState<{ [key: string]: string }>({});
  const [stats, setStats] = useState<Stats>({
    totalAssignments: 0,
    completedAssignments: 0,
    inProgressAssignments: 0,
    overdueAssignments: 0
  });

  useEffect(() => {
    fetchEmployeesWithAssignments();

    // Synchronisation temps réel pour les assignments
    const assignmentsChannel = supabase
      .channel('client-assignments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_assignments'
        },
        () => {
          fetchEmployeesWithAssignments();
        }
      )
      .subscribe();

    // Synchronisation pour les clients
    const clientsChannel = supabase
      .channel('clients-assignments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        () => {
          fetchEmployeesWithAssignments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(assignmentsChannel);
      supabase.removeChannel(clientsChannel);
    };
  }, []);

  const fetchEmployeesWithAssignments = async () => {
    const { data: emps } = await supabase
      .from('employees')
      .select('*')
      .order('name');

    if (!emps) return;

    // Fetch all clients to count assignments
    const { data: allClients } = await supabase
      .from('clients')
      .select('*');

    let totalAssignments = 0;
    let completedAssignments = 0;
    let inProgressAssignments = 0;
    let overdueAssignments = 0;

    const employeesWithAssignments = await Promise.all(
      emps.map(async (emp) => {
        // Find clients assigned to this employee by name or email
        const employeeClients = (allClients || []).filter(client => 
          client.assigned_employee === emp.name || 
          client.assigned_employee === emp.email ||
          client.assigned_employee === `${emp.name.split(' ')[0]}`
        );

        // Get client assignments for detailed tracking
        const { data: assignments } = await supabase
          .from('client_assignments')
          .select(`
            *,
            clients (
              id,
              full_name,
              personal_photo_url,
              passport_photo_url,
              documents_urls,
              status,
              visa_tracking_status,
              submission_date,
              embassy_receipt_date,
              visa_start_date,
              visa_end_date,
              created_at
            )
          `)
          .eq('employee_id', emp.id)
          .order('assigned_at', { ascending: false });

        // Map employee clients to assignments with date info
        const clientsWithAssignments = employeeClients.map(client => {
          const assignment = (assignments || []).find(a => a.client_id === client.id);
          
          // Calculate processing time
          const startDate = client.submission_date || client.created_at;
          const endDate = client.visa_end_date || null;
          let daysInProcess = 0;
          
          if (startDate) {
            const start = parseISO(startDate);
            const end = endDate ? parseISO(endDate) : new Date();
            daysInProcess = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          }
          
          return {
            id: assignment?.id || client.id,
            client_id: client.id,
            employee_id: emp.id,
            assigned_at: assignment?.assigned_at || client.created_at,
            deadline: assignment?.deadline || null,
            status: assignment?.status || 'جديد',
            clients: {
              id: client.id,
              full_name: client.full_name,
              personal_photo_url: client.personal_photo_url,
              passport_photo_url: client.passport_photo_url,
              documents_urls: client.documents_urls,
              status: client.status,
              visa_tracking_status: client.visa_tracking_status,
              submission_date: client.submission_date,
              embassy_receipt_date: client.embassy_receipt_date,
              visa_start_date: client.visa_start_date,
              visa_end_date: client.visa_end_date,
              created_at: client.created_at
            },
            daysInProcess,
            isOverdue: assignment?.deadline ? isPast(parseISO(assignment.deadline)) && assignment.status !== 'مكتمل' : false
          };
        });
        
        // Calculate statistics based on clients
        const clientCount = employeeClients.length;
        totalAssignments += clientCount;
        
        const completed = employeeClients.filter(c => 
          c.visa_tracking_status === 'اكتملت العملية'
        ).length;
        completedAssignments += completed;
        
        const inProgress = employeeClients.filter(c => 
          c.visa_tracking_status === 'قيد المراجعة' || c.visa_tracking_status === 'قيد المعالجة'
        ).length;
        inProgressAssignments += inProgress;
        
        // Count overdue assignments
        const overdue = clientsWithAssignments.filter(a => a.isOverdue).length;
        overdueAssignments += overdue;

        // Count uploaded files across all clients
        const uploadedFiles = employeeClients.reduce((count, client) => {
          const personalPhoto = client.personal_photo_url ? 1 : 0;
          const passportPhoto = client.passport_photo_url ? 1 : 0;
          const documents = client.documents_urls?.length || 0;
          return count + personalPhoto + passportPhoto + documents;
        }, 0);

        const successRate = clientCount > 0 
          ? Math.round((completed / clientCount) * 100) 
          : 0;

        // Calculate folder statistics by status
        const newClients = employeeClients.filter(c => c.status === 'جديد').length;
        const inProgressClients = employeeClients.filter(c => 
          c.status === 'قيد المعالجة' || c.visa_tracking_status === 'قيد المراجعة'
        ).length;
        const completedClients = employeeClients.filter(c => 
          c.status === 'اكتملت العملية' || c.visa_tracking_status === 'اكتملت العملية'
        ).length;

        return {
          ...emp,
          workload: clientCount,
          assignments: clientsWithAssignments,
          successRate,
          overdueCount: overdue,
          uploadedFilesCount: uploadedFiles,
          folderStats: {
            new: newClients,
            inProgress: inProgressClients,
            completed: completedClients,
            total: clientCount
          }
        };
      })
    );

    setEmployees(employeesWithAssignments);
    setStats({
      totalAssignments,
      completedAssignments,
      inProgressAssignments,
      overdueAssignments
    });
  };

  const updateDeadline = async (assignmentId: string) => {
    const deadlineDate = deadlines[assignmentId];
    if (!deadlineDate) {
      toast({ title: 'خطأ', description: 'الرجاء إدخال تاريخ الموعد النهائي', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('client_assignments')
      .update({ deadline: deadlineDate })
      .eq('id', assignmentId);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل تحديث الموعد النهائي', variant: 'destructive' });
      return;
    }

    toast({ title: 'نجاح', description: 'تم تحديث الموعد النهائي' });
    fetchEmployeesWithAssignments();
    setDeadlines({ ...deadlines, [assignmentId]: '' });
  };

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false;
    return isPast(parseISO(deadline));
  };

  const moveClientToEmployee = async (clientId: string, currentEmployeeId: string, newEmployeeId: string) => {
    const { error } = await supabase
      .from('client_assignments')
      .update({ employee_id: newEmployeeId })
      .eq('client_id', clientId)
      .eq('employee_id', currentEmployeeId);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل نقل الملف', variant: 'destructive' });
      return;
    }

    // Update client's assigned employee
    const newEmployee = employees.find(e => e.id === newEmployeeId);
    if (newEmployee) {
      await supabase
        .from('clients')
        .update({ assigned_employee: newEmployee.name })
        .eq('id', clientId);
    }

    toast({ title: 'نجاح', description: 'تم نقل الملف بنجاح' });
    fetchEmployeesWithAssignments();
  };

  const sendWarningToEmployee = async (employeeId: string, clientName: string) => {
    toast({ title: '⚠️ تحذير', description: `تم إرسال تحذير بخصوص ملف ${clientName}` });
  };

  const viewClientDetails = (clientId: string) => {
    navigate('/manager/clients');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">لوحة تحكم المشرف - متابعة الموظفين</h2>
        {stats.overdueAssignments > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive rounded-lg">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-destructive font-semibold">
              {stats.overdueAssignments} ملف متأخر عن الموعد المحدد
            </span>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المهام</p>
                <p className="text-3xl font-bold">{stats.totalAssignments}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">مكتملة</p>
                <p className="text-3xl font-bold text-success">{stats.completedAssignments}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">قيد المعالجة</p>
                <p className="text-3xl font-bold text-warning">{stats.inProgressAssignments}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">متأخرة</p>
                <p className="text-3xl font-bold text-destructive">{stats.overdueAssignments}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employees List */}
      {employees.map((employee) => (
        <Card key={employee.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{employee.name}</h3>
                <div className="flex gap-3 mt-2">
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground">جديد:</span>
                    <span className="font-semibold text-blue-600">{employee.folderStats.new}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground">قيد المعالجة:</span>
                    <span className="font-semibold text-warning">{employee.folderStats.inProgress}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground">مكتمل:</span>
                    <span className="font-semibold text-success">{employee.folderStats.completed}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground">المجموع:</span>
                    <span className="font-semibold">{employee.folderStats.total}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">
                  {employee.workload} مهمة
                </Badge>
                <Badge 
                  variant={employee.successRate >= 80 ? "default" : employee.successRate >= 50 ? "secondary" : "destructive"}
                >
                  {employee.successRate}% نجاح
                </Badge>
                {employee.overdueCount > 0 && (
                  <Badge variant="destructive">
                    {employee.overdueCount} متأخر
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {employee.workload === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">لا توجد مهام</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {employee.uploadedFilesCount || 0} ملفات محملة
                </p>
              </div>
            ) : employee.assignments.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">{employee.workload} مهمة</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {employee.uploadedFilesCount || 0} ملفات محملة
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العميل</TableHead>
                    <TableHead>حالة التأشيرة</TableHead>
                    <TableHead>تاريخ البدء</TableHead>
                    <TableHead>تاريخ الانتهاء</TableHead>
                    <TableHead>مدة المعالجة</TableHead>
                    <TableHead>الموعد النهائي</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.assignments.map((assignment) => {
                    const overdue = assignment.isOverdue;
                    const startDate = assignment.clients.submission_date || assignment.clients.created_at;
                    const endDate = assignment.clients.visa_end_date;
                    
                    return (
                      <TableRow
                        key={assignment.id}
                        className={overdue ? 'bg-destructive/10' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={assignment.clients.personal_photo_url || ''} />
                              <AvatarFallback>
                                {assignment.clients.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{assignment.clients.full_name}</p>
                              <div className="flex gap-2 mt-1">
                                {assignment.clients.personal_photo_url && (
                                  <Badge variant="outline" className="text-xs">صورة شخصية</Badge>
                                )}
                                {assignment.clients.passport_photo_url && (
                                  <Badge variant="outline" className="text-xs">جواز السفر</Badge>
                                )}
                                {assignment.clients.documents_urls && assignment.clients.documents_urls.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {assignment.clients.documents_urls.length} وثائق
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {assignment.clients.visa_tracking_status ? (
                              <Badge 
                                variant={
                                  assignment.clients.visa_tracking_status === 'اكتملت العملية' ? 'default' :
                                  assignment.clients.visa_tracking_status === 'مرفوضة' ? 'destructive' :
                                  'secondary'
                                }
                              >
                                {assignment.clients.visa_tracking_status}
                              </Badge>
                            ) : (
                              <Badge variant="outline">جديد</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {startDate ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {format(parseISO(startDate), 'dd/MM/yyyy', { locale: ar })}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {endDate ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {format(parseISO(endDate), 'dd/MM/yyyy', { locale: ar })}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">قيد المعالجة</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">
                              {assignment.daysInProcess} يوم
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {assignment.deadline ? (
                            <div className={`flex flex-col gap-1 text-sm ${overdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {format(parseISO(assignment.deadline), 'dd/MM/yyyy', { locale: ar })}
                              </div>
                              {overdue && (
                                <Badge variant="destructive" className="text-xs">
                                  متأخر
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Input
                                type="date"
                                value={deadlines[assignment.id] || ''}
                                onChange={(e) => setDeadlines({ ...deadlines, [assignment.id]: e.target.value })}
                                className="w-40"
                              />
                              <Button
                                size="sm"
                                onClick={() => updateDeadline(assignment.id)}
                                disabled={!deadlines[assignment.id]}
                              >
                                تحديد
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewClientDetails(assignment.client_id)}
                            >
                              عرض
                            </Button>
                            <Select onValueChange={(newEmployeeId) => moveClientToEmployee(assignment.client_id, employee.id, newEmployeeId)}>
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="نقل إلى" />
                              </SelectTrigger>
                              <SelectContent>
                                {employees.filter(e => e.id !== employee.id).map(e => (
                                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {overdue && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => sendWarningToEmployee(employee.id, assignment.clients.full_name)}
                              >
                                تحذير
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
