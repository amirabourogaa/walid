import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderOpen, Eye, FileText, Edit } from 'lucide-react';
import EmployeeDashboard from './EmployeeDashboard';
import { EditClientDialog } from './EditClientDialog';

interface AssignedClient {
  id: string;
  full_name: string;
  status: string;
  assigned_employee: string;
  personal_photo_url?: string;
  passport_photo_url?: string;
  documents_urls?: string[];
  created_at: string;
}

export default function EmployeeWorkspace() {
  const [assignedClients, setAssignedClients] = useState<AssignedClient[]>([]);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeEmail, setEmployeeEmail] = useState<string>('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<AssignedClient | null>(null);

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    // Get current user profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    if (!profile) return;

    const name = `${profile.first_name} ${profile.last_name}`.trim();
    setEmployeeName(name);
    setEmployeeEmail(profile.email || '');

    // Get clients assigned to this employee (RLS automatically filters by assigned_employee)
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading assigned clients:', error);
      return;
    }

    setAssignedClients(clients || []);
  };

  const handleEditClient = (client: AssignedClient) => {
    setSelectedClient(client);
    setIsEditDialogOpen(true);
  };

  return (
    <>
    <Tabs defaultValue="dashboard" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="dashboard">لوحة التحكم</TabsTrigger>
        <TabsTrigger value="files">ملفاتي</TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard">
        <EmployeeDashboard />
      </TabsContent>

      <TabsContent value="files">
        <div className="p-6 space-y-4">
          <h2 className="text-2xl font-bold">ملفاتي - العملاء المخصصون لي</h2>
          
          {assignedClients.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                لا توجد ملفات عملاء مخصصة لك بعد
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignedClients.map(client => (
                <Card key={client.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      {client.personal_photo_url ? (
                        <img 
                          src={client.personal_photo_url} 
                          alt={client.full_name}
                          className="h-16 w-16 rounded-full object-cover border-2 border-primary"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/64?text=' + client.full_name.charAt(0);
                          }}
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                          {client.full_name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-lg">{client.full_name}</CardTitle>
                        <span className={`text-xs px-2 py-1 rounded inline-block mt-1 ${
                          client.status === 'جديد' ? 'bg-blue-100 text-blue-800' :
                          client.status === 'قيد المعالجة' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {client.status}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      📅 {new Date(client.created_at).toLocaleDateString('ar')}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {client.personal_photo_url && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(client.personal_photo_url, '_blank')}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          صورة شخصية
                        </Button>
                      )}
                      {client.passport_photo_url && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(client.passport_photo_url, '_blank')}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          جواز السفر
                        </Button>
                      )}
                      {client.documents_urls && client.documents_urls.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(client.documents_urls![0], '_blank')}
                        >
                          <FolderOpen className="h-3 w-3 mr-1" />
                          مستندات ({client.documents_urls.length})
                        </Button>
                      )}
                    </div>

                    <Button 
                      className="w-full mt-2"
                      onClick={() => handleEditClient(client)}
                    >
                      <Edit className="h-4 w-4 ml-2" />
                      تعديل البيانات
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>

    <EditClientDialog
      open={isEditDialogOpen}
      onOpenChange={setIsEditDialogOpen}
      client={selectedClient}
      onClientUpdated={loadEmployeeData}
    />
  </>
  );
}
