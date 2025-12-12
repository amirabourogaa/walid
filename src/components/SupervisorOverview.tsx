import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  UserCheck, 
  Globe, 
  FileText,
  Calendar,
  TrendingUp,
  Users
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { EditClientDialog } from './EditClientDialog';
import { SecureImage } from './SecureImage';

interface Client {
  id: string;
  full_name: string;
  assigned_employee: string;
  status: string;
  destination_country: string;
  visa_type: string;
  personal_photo_url: string;
  created_at: string;
  submission_date: string;
  updated_at: string;
  visa_tracking_status: string;
}

interface Employee {
  id: string;
  user_id: string;
  name: string;
  email: string;
  workload: number;
}

const statusOptions = [
  { value: 'all', label: 'الكل' },
  { value: 'جديد', label: 'جديد' },
  { value: 'قيد_المعالجة', label: 'قيد المعالجة' },
  { value: 'اكتملت_العملية', label: 'اكتملت العملية' },
  { value: 'موافق_عليه', label: 'موافق عليه' },
  { value: 'مرفوض', label: 'مرفوض' },
  { value: 'منتهي', label: 'منتهي' },
  { value: 'متأخرة', label: 'متأخرة' }
];

export function SupervisorOverview() {
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');

  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassignClientId, setReassignClientId] = useState<string | null>(null);
  const [newAssignedEmployee, setNewAssignedEmployee] = useState('');

  useEffect(() => {
    fetchData();

    // Real-time subscription for client changes only
    const clientsChannel = supabase
      .channel('clients-overview-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(clientsChannel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [clients, searchTerm, selectedEmployee, selectedStatus, selectedCountry]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch clients with all necessary fields
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, full_name, assigned_employee, status, destination_country, visa_type, personal_photo_url, created_at, submission_date, updated_at, visa_tracking_status')
      .order('updated_at', { ascending: false });

    // Fetch employees
    const { data: employeeRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'employee');

    if (employeeRoles && employeeRoles.length > 0) {
      const { data: employeeProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', employeeRoles.map(r => r.user_id));

      const { data: employeeRecords } = await supabase
        .from('employees')
        .select('*')
        .in('user_id', employeeRoles.map(r => r.user_id));

      if (employeeProfiles) {
        const mergedEmployees: Employee[] = employeeProfiles.map(profile => {
          const employeeRecord = employeeRecords?.find(e => e.user_id === profile.id);
          return {
            id: employeeRecord?.id || profile.id,
            user_id: profile.id,
            name: `${profile.first_name} ${profile.last_name}`.trim(),
            email: profile.email || '',
            workload: employeeRecord?.workload || 0
          };
        });

        setEmployees(mergedEmployees);
      }
    }

    setClients(clientsData || []);
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...clients];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.assigned_employee?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Employee filter
    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(client => client.assigned_employee === selectedEmployee);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'متأخرة') {
        // Filter only delayed clients (not completed)
        filtered = filtered.filter(client => isDelayed(client));
      } else {
        // Filter by exact status, normalizing underscores
        filtered = filtered.filter(client => {
          const normalizedClientStatus = client.status?.replace(/ /g, '_');
          const normalizedSelectedStatus = selectedStatus.replace(/ /g, '_');
          return normalizedClientStatus === normalizedSelectedStatus;
        });
      }
    }

    // Country filter
    if (selectedCountry !== 'all') {
      filtered = filtered.filter(client => client.destination_country === selectedCountry);
    }

    setFilteredClients(filtered);
  };

  const handleReassign = async () => {
    if (!reassignClientId || !newAssignedEmployee) {
      toast({ title: 'خطأ', description: 'يرجى اختيار موظف', variant: 'destructive' });
      return;
    }

    const employee = employees.find(e => e.id === newAssignedEmployee);
    if (!employee) return;

    const { error } = await supabase
      .from('clients')
      .update({ assigned_employee: employee.name })
      .eq('id', reassignClientId);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في إعادة التعيين', variant: 'destructive' });
    } else {
      toast({ title: 'نجاح', description: 'تم إعادة تعيين العميل بنجاح' });
      setReassignDialogOpen(false);
      setReassignClientId(null);
      setNewAssignedEmployee('');
      fetchData();
    }
  };

  const getEmployeeWorkload = (employeeName: string) => {
    const employee = employees.find(e => e.name === employeeName);
    return employee?.workload || 0;
  };

  const getUniqueCountries = () => {
    const countries = clients
      .map(c => c.destination_country)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);
    return countries;
  };

  const isDelayed = (client: Client) => {
    // Check if visa_tracking_status hasn't changed in 10+ days
    const checkDate = client.updated_at || client.created_at;
    if (!checkDate) return false;
    
    const lastUpdate = new Date(checkDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Only consider delayed if not completed
    const isCompleted = client.status === 'اكتملت_العملية' || client.status === 'اكتملت العملية';
    return daysDiff > 10 && !isCompleted;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'جديد': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
      'قيد_المعالجة': 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
      'اكتملت_العملية': 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
      'موافق_عليه': 'bg-green-500/10 text-green-700 border-green-500/20',
      'مرفوض': 'bg-red-500/10 text-red-700 border-red-500/20',
      'منتهي': 'bg-gray-500/10 text-gray-700 border-gray-500/20',
      'متأخرة': 'bg-orange-500/10 text-orange-700 border-orange-500/20'
    };
    return colors[status] || 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي العملاء</p>
                <p className="text-2xl font-bold">{clients.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">قيد المعالجة</p>
                <p className="text-2xl font-bold">
                  {clients.filter(c => {
                    const status = c.status?.replace(/ /g, '_');
                    return status === 'قيد_المعالجة';
                  }).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">اكتملت العملية</p>
                <p className="text-2xl font-bold">
                  {clients.filter(c => c.status === 'اكتملت_العملية' || c.status === 'اكتملت العملية').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">متأخرة</p>
                <p className="text-2xl font-bold text-orange-600">
                  {clients.filter(c => isDelayed(c)).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">عدد الموظفين</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            تصفية العملاء
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <Label htmlFor="search">بحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="اسم العميل أو الموظف"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>

            {/* Employee filter */}
            <div>
              <Label htmlFor="employee-filter">الموظف</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger id="employee-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.name}>
                      {employee.name} ({employee.workload})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status filter */}
            <div>
              <Label htmlFor="status-filter">الحالة</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country filter */}
            <div>
              <Label htmlFor="country-filter">الدولة</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger id="country-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {getUniqueCountries().map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              النتائج: {filteredClients.length} من {clients.length}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedEmployee('all');
                setSelectedStatus('all');
                setSelectedCountry('all');
              }}
            >
              مسح التصفية
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-8">جاري التحميل...</div>
        ) : filteredClients.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-muted-foreground">
            لا توجد نتائج
          </div>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  {/* Profile Photo */}
                  <div className="flex-shrink-0">
                    {client.personal_photo_url ? (
                      <SecureImage
                        src={client.personal_photo_url}
                        alt={client.full_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Client Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1 truncate">
                      {client.full_name}
                    </h3>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-3 w-3" />
                        <span className="truncate">{client.assigned_employee}</span>
                      </div>
                      
                      {client.destination_country && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3 w-3" />
                          <span>{client.destination_country}</span>
                        </div>
                      )}
                      
                      {client.submission_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(client.submission_date).toLocaleDateString('ar')}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <Badge className={getStatusColor(client.status)}>
                        {client.status?.replace(/_/g, ' ') || 'جديد'}
                      </Badge>
                      {isDelayed(client) && (
                        <Badge className="bg-orange-500/10 text-orange-700 border-orange-500/20 animate-pulse">
                          متأخرة
                        </Badge>
                      )}
                      {client.visa_type && (
                        <Badge variant="outline" className="text-xs">
                          {client.visa_type}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedClient(client);
                          setIsEditDialogOpen(true);
                        }}
                        className="flex-1"
                      >
                        عرض التفاصيل
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReassignClientId(client.id);
                          setReassignDialogOpen(true);
                        }}
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Client Dialog */}
      {selectedClient && (
        <EditClientDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          client={selectedClient}
          onClientUpdated={fetchData}
        />
      )}

      {/* Reassign Dialog */}
      {reassignDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>إعادة تعيين العميل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reassign-employee">اختر موظفاً</Label>
                <Select value={newAssignedEmployee} onValueChange={setNewAssignedEmployee}>
                  <SelectTrigger id="reassign-employee">
                    <SelectValue placeholder="اختر موظفاً" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name} - {employee.workload} عميل
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReassignDialogOpen(false);
                    setReassignClientId(null);
                    setNewAssignedEmployee('');
                  }}
                >
                  إلغاء
                </Button>
                <Button onClick={handleReassign}>
                  تأكيد
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
