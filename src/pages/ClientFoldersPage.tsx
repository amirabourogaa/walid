import { useState, useEffect } from 'react';
import { FolderOpen, Search, Calendar, FileText, MapPin, CheckCircle2, Clock, Download, ChevronDown, ChevronLeft, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SecureImage } from '@/components/SecureImage';

interface ClientFolder {
  id: string;
  client_id: string;
  folder_name: string;
  folder_path: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  is_archived: boolean;
  passport_number: string | null;
  full_name: string;
  destination_country: string | null;
  service_type: string | null;
  completion_date: string | null;
  client?: {
    personal_photo_url?: string;
    whatsapp_number?: string;
    email?: string;
    documents_urls?: string[];
    client_id_number?: string;
    passport_number?: string;
  };
}

interface ClientGroup {
  clientId: string;
  clientIdNumber: string;
  fullName: string;
  passportNumber: string;
  personalPhotoUrl?: string;
  whatsappNumber?: string;
  email?: string;
  foldersByCountry: { [country: string]: ClientFolder[] };
}

export default function ClientFoldersPage() {
  const [folders, setFolders] = useState<ClientFolder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_folders')
        .select(`
          *,
          client:clients(
            personal_photo_url,
            whatsapp_number,
            email,
            documents_urls,
            client_id_number,
            passport_number
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('حدث خطأ أثناء تحميل الملفات');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFolderFiles = async (folder: ClientFolder) => {
    try {
      toast.info('جاري تحضير الملفات للتحميل...');
      
      if (folder.client?.documents_urls && folder.client.documents_urls.length > 0) {
        for (const docUrl of folder.client.documents_urls) {
          const { data, error } = await supabase.storage
            .from('client-files')
            .download(docUrl);

          if (error) throw error;

          const url = URL.createObjectURL(data);
          const link = document.createElement('a');
          link.href = url;
          link.download = docUrl.split('/').pop() || 'document';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
        toast.success('تم تحميل جميع الملفات بنجاح');
      } else {
        toast.info('لا توجد ملفات في هذا الدوسييه');
      }
    } catch (error) {
      console.error('Error downloading files:', error);
      toast.error('حدث خطأ أثناء تحميل الملفات');
    }
  };

  const activeFolders = folders.filter(f => !f.is_archived);
  const archivedFolders = folders.filter(f => f.is_archived);

  const filteredFolders = (activeTab === 'active' ? activeFolders : archivedFolders).filter(folder => {
    const matchesSearch = folder.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         folder.passport_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         folder.client?.client_id_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         folder.client?.whatsapp_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = !countryFilter || countryFilter === 'all' || folder.destination_country === countryFilter;
    return matchesSearch && matchesCountry;
  });

  // Group archived folders by client
  const groupedArchivedClients = archivedFolders.reduce((acc, folder) => {
    const clientKey = folder.client_id;
    
    if (!acc[clientKey]) {
      acc[clientKey] = {
        clientId: folder.client_id,
        clientIdNumber: folder.client?.client_id_number || '',
        fullName: folder.full_name,
        passportNumber: folder.passport_number || folder.client?.passport_number || '',
        personalPhotoUrl: folder.client?.personal_photo_url,
        whatsappNumber: folder.client?.whatsapp_number,
        email: folder.client?.email,
        foldersByCountry: {}
      };
    }

    const country = folder.destination_country || 'غير محدد';
    if (!acc[clientKey].foldersByCountry[country]) {
      acc[clientKey].foldersByCountry[country] = [];
    }
    acc[clientKey].foldersByCountry[country].push(folder);

    return acc;
  }, {} as { [key: string]: ClientGroup });

  const filteredGroupedClients = Object.values(groupedArchivedClients).filter(client => {
    const matchesSearch = client.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.passportNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.clientIdNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.whatsappNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (countryFilter && countryFilter !== 'all') {
      return Object.keys(client.foldersByCountry).includes(countryFilter);
    }
    
    return true;
  });

  const toggleClientExpansion = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const stats = {
    total: folders.length,
    active: activeFolders.length,
    archived: archivedFolders.length,
    thisMonth: folders.filter(f => {
      const created = new Date(f.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length
  };

  return (
    <div className="p-6 space-y-6 font-arabic" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الملفات</h1>
          <p className="text-muted-foreground">إدارة ومتابعة ملفات العملاء المكتملة</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FolderOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الملفات</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">نشطة</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">مؤرشفة</p>
                <p className="text-2xl font-bold">{stats.archived}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">هذا الشهر</p>
                <p className="text-2xl font-bold">{stats.thisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="card-professional">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="البحث في الملفات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="فلترة بالبلد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل البلدان</SelectItem>
                <SelectItem value="الصين">الصين</SelectItem>
                <SelectItem value="فرنسا">فرنسا</SelectItem>
                <SelectItem value="ألمانيا">ألمانيا</SelectItem>
                <SelectItem value="تركيا">تركيا</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Folders List */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            الملفات النشطة ({stats.active})
          </TabsTrigger>
          <TabsTrigger value="archived">
            الملفات المؤرشفة ({stats.archived})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <div className="grid gap-4">
            {isLoading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : filteredFolders.length === 0 ? (
              <div className="text-center py-8">لا توجد ملفات</div>
            ) : (
              filteredFolders.map((folder) => (
                <Card key={folder.id} className="card-professional hover-scale">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 space-x-reverse flex-1">
                        <SecureImage
                          src={folder.client?.personal_photo_url}
                          alt={folder.full_name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                          fallback={
                            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-lg">
                                {folder.full_name?.split(' ')[0][0]}{folder.full_name?.split(' ')[1]?.[0]}
                              </span>
                            </div>
                          }
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{folder.full_name}</h3>
                            {folder.client?.client_id_number && (
                              <Badge variant="default">ID: {folder.client.client_id_number}</Badge>
                            )}
                            {folder.client?.passport_number && (
                              <Badge variant="outline">{folder.client.passport_number}</Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-muted-foreground">
                            {folder.client?.whatsapp_number && (
                              <div className="flex items-center gap-1">
                                <span>📱</span>
                                <span>{folder.client.whatsapp_number}</span>
                              </div>
                            )}
                            {folder.destination_country && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{folder.destination_country}</span>
                              </div>
                            )}
                            {folder.service_type && (
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                <span>{folder.service_type}</span>
                              </div>
                            )}
                            {folder.completion_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(folder.completion_date).toLocaleDateString('ar')}</span>
                              </div>
                            )}
                            {folder.client?.documents_urls && (
                              <div className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                <span>{folder.client.documents_urls.length} مستند</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFolderFiles(folder)}
                        >
                          <Download className="h-4 w-4 ml-2" />
                          تحميل الملفات
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="archived" className="mt-6">
          <div className="grid gap-4">
            {isLoading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : filteredGroupedClients.length === 0 ? (
              <div className="text-center py-8">لا توجد ملفات مؤرشفة</div>
            ) : (
              filteredGroupedClients.map((clientGroup) => {
                const isExpanded = expandedClients.has(clientGroup.clientId);
                const totalOperations = Object.values(clientGroup.foldersByCountry).reduce(
                  (sum, folders) => sum + folders.length, 0
                );
                const countries = Object.keys(clientGroup.foldersByCountry);

                return (
                  <Card key={clientGroup.clientId} className="card-professional">
                    <CardContent className="p-6">
                      {/* Client Folder Header */}
                      <div
                        className="flex items-start justify-between cursor-pointer hover:bg-accent/50 -m-6 p-6 rounded-lg transition-colors"
                        onClick={() => toggleClientExpansion(clientGroup.clientId)}
                      >
                        <div className="flex items-start space-x-4 space-x-reverse flex-1">
                          <SecureImage
                            src={clientGroup.personalPhotoUrl}
                            alt={clientGroup.fullName}
                            className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                            fallback={
                              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-lg">
                                  {clientGroup.fullName?.split(' ')[0][0]}{clientGroup.fullName?.split(' ')[1]?.[0]}
                                </span>
                              </div>
                            }
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FolderOpen className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold text-lg">
                                {clientGroup.clientIdNumber && `${clientGroup.clientIdNumber} - `}
                                {clientGroup.fullName}
                                {clientGroup.passportNumber && ` - ${clientGroup.passportNumber}`}
                              </h3>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                              <Badge variant="secondary">
                                {totalOperations} عملية
                              </Badge>
                              <Badge variant="outline">
                                {countries.length} دولة
                              </Badge>
                              {clientGroup.whatsappNumber && (
                                <span className="flex items-center gap-1">
                                  📱 {clientGroup.whatsappNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronLeft className="h-5 w-5" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Operations by Country */}
                      {isExpanded && (
                        <div className="mt-4 space-y-4 border-t pt-4">
                          {Object.entries(clientGroup.foldersByCountry).map(([country, folders]) => (
                            <div key={country} className="space-y-2">
                              <div className="flex items-center gap-2 mb-3">
                                <MapPin className="h-4 w-4 text-primary" />
                                <h4 className="font-semibold text-md">{country}</h4>
                                <Badge variant="outline">{folders.length} عملية</Badge>
                              </div>
                              
                              <div className="pr-6 space-y-2">
                                {folders.map((folder) => (
                                  <div
                                    key={folder.id}
                                    className="flex items-center justify-between p-4 bg-accent/30 rounded-lg border"
                                  >
                                    <div className="flex-1 space-y-1">
                                      <div className="flex items-center gap-2">
                                        {folder.service_type && (
                                          <Badge variant="default">{folder.service_type}</Badge>
                                        )}
                                        {folder.completion_date && (
                                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(folder.completion_date).toLocaleDateString('ar')}
                                          </span>
                                        )}
                                      </div>
                                      {folder.archived_at && (
                                        <p className="text-xs text-muted-foreground">
                                          تم الأرشفة: {new Date(folder.archived_at).toLocaleDateString('ar')}
                                        </p>
                                      )}
                                    </div>
                                    
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadFolderFiles(folder);
                                      }}
                                    >
                                      <Download className="h-4 w-4 ml-2" />
                                      تحميل
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
