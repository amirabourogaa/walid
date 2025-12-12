import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload, FileText, User, CreditCard, FileStack } from 'lucide-react';
import { z } from 'zod';
import { countries } from '@/lib/countries';

// Validation schema
const clientNameSchema = z.string()
  .trim()
  .min(3, { message: "يجب أن يحتوي الاسم على 3 أحرف على الأقل" })
  .max(100, { message: "يجب أن لا يتجاوز الاسم 100 حرف" })
  .regex(/^[\u0621-\u064A\u0660-\u0669a-zA-Z\s]+$/, { message: "الاسم يجب أن يحتوي على أحرف عربية أو إنجليزية فقط" });

interface ManualUpload {
  personalPhoto: File | null;
  passportPhoto: File | null;
  documents: File[];
  clientName: string;
  companyName: string;
  assignedFolder: string;
  whatsappNumber: string;
  email: string;
  passportNumber: string;
  passportExpiryDate: string;
  nationality: string;
  passportStatus: string;
  visaTrackingStatus: string;
  serviceType: string;
  destinationCountry: string;
  visaType: string;
  chinaVisaType: string;
  profession: string;
  taxId: string;
  amount: string;
  currency: string;
  entryStatus: string;
  submissionDate: string;
  embassyReceiptDate: string;
  visaStartDate: string;
  visaEndDate: string;
  submittedBy: string;
  summary: string;
  notes: string;
  invoiceStatus: string;
}

interface Employee {
  id: string;
  user_id: string;
  name: string;
  email: string;
  workload: number;
}

export default function SupervisorInbox() {
  const [dispatchMode, setDispatchMode] = useState<'auto' | 'manual'>('auto');
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [manualUpload, setManualUpload] = useState<ManualUpload>({
    personalPhoto: null,
    passportPhoto: null,
    documents: [],
    clientName: '',
    companyName: '',
    assignedFolder: 'general',
    whatsappNumber: '',
    email: '',
    passportNumber: '',
    passportExpiryDate: '',
    nationality: '',
    passportStatus: '',
    visaTrackingStatus: 'تم استلام معاملتكم',
    serviceType: '',
    destinationCountry: '',
    visaType: '',
    chinaVisaType: '',
    profession: '',
    taxId: '',
    amount: '',
    currency: 'TND',
    entryStatus: '',
    submissionDate: '',
    embassyReceiptDate: '',
    visaStartDate: '',
    visaEndDate: '',
    submittedBy: '',
    summary: '',
    notes: '',
    invoiceStatus: 'غير مدفوعة'
  });

  // Helper function to sanitize file names for storage
  const sanitizeFileName = (name: string): string => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\w\s.-]/g, '') // Remove special characters except word chars, spaces, dots, dashes
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .toLowerCase();
  };

  useEffect(() => {
    fetchClients();
    fetchEmployees();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name')
      .order('full_name');
    
    setClients(data || []);
  };

  const fetchEmployees = async () => {
    // Get all employees from profiles with employee role
    const { data: employeeRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'employee');

    if (!employeeRoles || employeeRoles.length === 0) return;

    // Get profiles and employee records
    const { data: employeeProfiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', employeeRoles.map(r => r.user_id));

    const { data: employeeRecords } = await supabase
      .from('employees')
      .select('*')
      .in('user_id', employeeRoles.map(r => r.user_id));

    if (!employeeProfiles) return;

    // Merge profile and employee data
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
  };

  const handleFileUpload = (type: 'personal' | 'passport' | 'documents', files: FileList | null) => {
    if (!files) return;

    if (type === 'documents') {
      setManualUpload(prev => ({
        ...prev,
        documents: [...prev.documents, ...Array.from(files)]
      }));
    } else if (type === 'personal') {
      setManualUpload(prev => ({ ...prev, personalPhoto: files[0] }));
    } else if (type === 'passport') {
      setManualUpload(prev => ({ ...prev, passportPhoto: files[0] }));
    }
  };

  const handleConfirmUpload = async () => {
    // Validate required fields
    if (!manualUpload.clientName) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم العميل', variant: 'destructive' });
      return;
    }

    // Validate client name
    const nameValidation = clientNameSchema.safeParse(manualUpload.clientName);
    if (!nameValidation.success) {
      toast({ 
        title: 'خطأ في الاسم', 
        description: nameValidation.error.errors[0].message, 
        variant: 'destructive' 
      });
      return;
    }

    // Validate file types if files are provided
    const allowedFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (manualUpload.personalPhoto && !allowedFileTypes.includes(manualUpload.personalPhoto.type)) {
      toast({ title: 'خطأ', description: 'الصورة الشخصية يجب أن تكون بصيغة JPG, PNG, WEBP أو PDF', variant: 'destructive' });
      return;
    }
    if (manualUpload.passportPhoto && !allowedFileTypes.includes(manualUpload.passportPhoto.type)) {
      toast({ title: 'خطأ', description: 'صورة الجواز يجب أن تكون بصيغة JPG, PNG, WEBP أو PDF', variant: 'destructive' });
      return;
    }

    // Validate file sizes (max 10MB per file to support PDF)
    const maxSize = 10 * 1024 * 1024;
    if (manualUpload.personalPhoto && manualUpload.personalPhoto.size > maxSize) {
      toast({ title: 'خطأ', description: 'حجم الصورة الشخصية يجب أن لا يتجاوز 10 ميجابايت', variant: 'destructive' });
      return;
    }
    if (manualUpload.passportPhoto && manualUpload.passportPhoto.size > maxSize) {
      toast({ title: 'خطأ', description: 'حجم صورة الجواز يجب أن لا يتجاوز 10 ميجابايت', variant: 'destructive' });
      return;
    }

    try {
      toast({ title: 'جاري المعالجة...', description: 'يتم رفع الملفات وإنشاء الملف الشخصي' });
      const sanitizedClientName = sanitizeFileName(manualUpload.clientName);
      
      let personalPhotoPath = null;
      let passportPhotoPath = null;

      // Upload personal photo if provided
      if (manualUpload.personalPhoto) {
        const personalPhotoName = `${Date.now()}_personal_${sanitizeFileName(manualUpload.personalPhoto.name)}`;
        const { error: personalError } = await supabase.storage
          .from('client-files')
          .upload(`clients/${sanitizedClientName}/${personalPhotoName}`, manualUpload.personalPhoto);

        if (personalError) throw personalError;
        personalPhotoPath = `clients/${sanitizedClientName}/${personalPhotoName}`;
      }

      // Upload passport photo if provided
      if (manualUpload.passportPhoto) {
        const passportPhotoName = `${Date.now()}_passport_${sanitizeFileName(manualUpload.passportPhoto.name)}`;
        const { error: passportError } = await supabase.storage
          .from('client-files')
          .upload(`clients/${sanitizedClientName}/${passportPhotoName}`, manualUpload.passportPhoto);

        if (passportError) throw passportError;
        passportPhotoPath = `clients/${sanitizedClientName}/${passportPhotoName}`;
      }

      // Upload documents - store paths instead of URLs
      const documentPaths: string[] = [];
      const sanitizedFolder = sanitizeFileName(manualUpload.assignedFolder);
      for (const doc of manualUpload.documents) {
        const docName = `${Date.now()}_${sanitizeFileName(doc.name)}`;
        const docPath = `clients/${sanitizedClientName}/${sanitizedFolder}/${docName}`;
        const { error: docError } = await supabase.storage
          .from('client-files')
          .upload(docPath, doc);

        if (docError) throw docError;
        documentPaths.push(docPath);
      }

      // Dispatch to employee with paths and additional data
      const clientCreated = await dispatchToEmployee(
        manualUpload.clientName,
        manualUpload.companyName,
        personalPhotoPath, 
        passportPhotoPath, 
        documentPaths,
        manualUpload.whatsappNumber,
        manualUpload.email,
        manualUpload.passportNumber,
        manualUpload.passportExpiryDate,
        manualUpload.nationality,
        manualUpload.passportStatus,
        manualUpload.visaTrackingStatus,
        manualUpload.serviceType,
        manualUpload.destinationCountry,
        manualUpload.visaType,
        manualUpload.chinaVisaType,
        manualUpload.profession,
        manualUpload.taxId,
        manualUpload.amount,
        manualUpload.currency,
        manualUpload.entryStatus,
        manualUpload.submissionDate,
        manualUpload.embassyReceiptDate,
        manualUpload.visaStartDate,
        manualUpload.visaEndDate,
        manualUpload.submittedBy,
        manualUpload.summary,
        manualUpload.notes,
        manualUpload.invoiceStatus
      );

      if (clientCreated) {
        toast({ 
          title: '✅ نجاح', 
          description: `تم إنشاء ملف العميل "${manualUpload.clientName}" وتوزيعه بنجاح`,
          duration: 5000
        });
        
        // Reset form
        setManualUpload({
          personalPhoto: null,
          passportPhoto: null,
          documents: [],
          clientName: '',
          companyName: '',
          assignedFolder: 'general',
          whatsappNumber: '',
          email: '',
          passportNumber: '',
          passportExpiryDate: '',
          nationality: '',
          passportStatus: '',
          visaTrackingStatus: 'تم استلام معاملتكم',
          serviceType: '',
          destinationCountry: '',
          visaType: '',
          chinaVisaType: '',
          profession: '',
          taxId: '',
          amount: '',
          currency: 'TND',
          entryStatus: '',
          submissionDate: '',
          embassyReceiptDate: '',
          visaStartDate: '',
          visaEndDate: '',
          submittedBy: '',
          summary: '',
          notes: '',
          invoiceStatus: 'غير مدفوعة'
        });

        // Refresh clients list
        await fetchClients();
      }
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast({ 
        title: 'خطأ', 
        description: error?.message || 'فشل في تحميل الملفات', 
        variant: 'destructive' 
      });
    }
  };

  const dispatchToEmployee = async (
    clientName: string,
    companyName: string,
    personalPhotoPath: string | null, 
    passportPhotoPath: string | null, 
    documentPaths: string[],
    whatsappNumber: string,
    email: string,
    passportNumber: string,
    passportExpiryDate: string,
    nationality: string,
    passportStatus: string,
    visaTrackingStatus: string,
    serviceType: string,
    destinationCountry: string,
    visaType: string,
    chinaVisaType: string,
    profession: string,
    taxId: string,
    amount: string,
    currency: string,
    entryStatus: string,
    submissionDate: string,
    embassyReceiptDate: string,
    visaStartDate: string,
    visaEndDate: string,
    submittedBy: string,
    summary: string,
    notes: string,
    invoiceStatus: string
  ): Promise<boolean> => {
    let selectedEmployee: { profile: any; name: string; employeeId: string } | null = null;
    
    if (dispatchMode === 'auto') {
      // Get all employees from profiles with employee role
      const { data: employeeRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'employee');

      if (!employeeRoles || employeeRoles.length === 0) {
        toast({ title: 'خطأ', description: 'لا يوجد موظفون متاحون في النظام', variant: 'destructive' });
        return false;
      }

      // Get profiles for these employee users
      const { data: employeeProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', employeeRoles.map(r => r.user_id));

      if (!employeeProfiles || employeeProfiles.length === 0) {
        toast({ title: 'خطأ', description: 'لا يوجد موظفون متاحون', variant: 'destructive' });
        return false;
      }

      // Count assignments for each employee to find least loaded
      const employeeWorkloads = await Promise.all(
        employeeProfiles.map(async (profile) => {
          const name = `${profile.first_name} ${profile.last_name}`.trim();
          const { count } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .or(`assigned_employee.eq.${name},assigned_employee.eq.${profile.email}`);
          
          return {
            profile,
            name,
            employeeId: profile.id,
            workload: count || 0
          };
        })
      );

      // Sort by workload and pick the one with least work
      employeeWorkloads.sort((a, b) => a.workload - b.workload);
      selectedEmployee = employeeWorkloads[0];

    } else {
      // Manual mode: use selected employee
      if (!selectedEmployeeId) {
        toast({ title: 'خطأ', description: 'يرجى اختيار موظف', variant: 'destructive' });
        return false;
      }

      const employee = employees.find(e => e.id === selectedEmployeeId);
      if (!employee) {
        toast({ title: 'خطأ', description: 'الموظف المحدد غير موجود', variant: 'destructive' });
        return false;
      }

      selectedEmployee = {
        profile: { id: employee.user_id, email: employee.email },
        name: employee.name,
        employeeId: employee.user_id
      };
    }

    if (!selectedEmployee) {
      toast({ title: 'خطأ', description: 'فشل في اختيار موظف', variant: 'destructive' });
      return false;
    }

    // Generate client_id_number automatically
    const { data: clientIdNumber, error: idError } = await supabase
      .rpc('get_next_client_id_number');
    
    if (idError) {
      console.error('Client ID generation error:', idError);
      toast({ title: 'خطأ', description: `فشل إنشاء معرف العميل: ${idError.message}`, variant: 'destructive' });
      return false;
    }

    // Create new client with uploaded file paths and generated client_id_number
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        full_name: clientName,
        company_name: companyName || null,
        assigned_employee: selectedEmployee.name,
        assigned_employee_id: selectedEmployee.employeeId,
        status: 'جديد',
        personal_photo_url: personalPhotoPath,
        passport_photo_url: passportPhotoPath,
        documents_urls: documentPaths,
        client_id_number: clientIdNumber,
        whatsapp_number: whatsappNumber || null,
        email: email || null,
        passport_number: passportNumber || null,
        passport_expiry_date: passportExpiryDate || null,
        nationality: nationality || null,
        passport_status: passportStatus || null,
        visa_tracking_status: visaTrackingStatus || 'تم استلام معاملتكم',
        service_type: serviceType || null,
        destination_country: destinationCountry || null,
        visa_type: visaType || null,
        china_visa_type: chinaVisaType || null,
        profession: profession || null,
        tax_id: taxId || null,
        amount: amount ? parseFloat(amount) : null,
        currency: currency || null,
        entry_status: entryStatus || null,
        submission_date: submissionDate || null,
        embassy_receipt_date: embassyReceiptDate || null,
        visa_start_date: visaStartDate || null,
        visa_end_date: visaEndDate || null,
        submitted_by: submittedBy || null,
        summary: summary || null,
        notes: notes || null,
        invoice_status: invoiceStatus || 'غير مدفوعة'
      })
      .select()
      .single();

    if (clientError) {
      console.error('Client creation error:', clientError);
      toast({ title: 'خطأ', description: `فشل إنشاء العميل: ${clientError.message}`, variant: 'destructive' });
      return false;
    }

    console.log('✅ Client created successfully:', newClient);

    // Sync employee to employees table if doesn't exist
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', selectedEmployee.employeeId)
      .maybeSingle();

    let employeeRecordId = existingEmployee?.id;

    if (!existingEmployee) {
      const { data: newEmployeeRecord, error: employeeError } = await supabase
        .from('employees')
        .insert({
          name: selectedEmployee.name,
          email: selectedEmployee.profile.email,
          user_id: selectedEmployee.employeeId,
          workload: 1,
          profile_synced: true
        })
        .select()
        .single();

      if (employeeError) {
        console.error('Employee creation error:', employeeError);
      } else {
        employeeRecordId = newEmployeeRecord.id;
      }
    } else {
      // Update workload - increment by 1
      const { data: currentEmployee } = await supabase
        .from('employees')
        .select('workload')
        .eq('id', employeeRecordId)
        .single();
      
      if (currentEmployee) {
        await supabase
          .from('employees')
          .update({ workload: (currentEmployee.workload || 0) + 1 })
          .eq('id', employeeRecordId);
      }
    }

    // Create assignment in client_assignments table
    if (employeeRecordId && newClient) {
      const { error: assignmentError } = await supabase
        .from('client_assignments')
        .insert({
          client_id: newClient.id,
          employee_id: employeeRecordId,
          status: 'في الانتظار'
        });

      if (assignmentError) {
        console.error('Assignment creation error:', assignmentError);
      }

      // Create notification for the employee
      const { error: notificationError } = await supabase
        .from('employee_notifications')
        .insert({
          employee_id: employeeRecordId,
          client_id: newClient.id,
          notification_type: 'new_client_assignment',
          title: 'عميل جديد',
          message: `تم تعيين عميل جديد لك: ${clientName}`,
          read: false
        });

      if (notificationError) {
        console.error('Notification creation error:', notificationError);
      }
    }

    toast({ 
      title: '✅ تم التوزيع', 
      description: `تم توزيع ملف "${clientName}" إلى الموظف ${selectedEmployee.name}`,
      duration: 4000
    });

    return true;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>صندوق الوارد - المشرف</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dispatch Mode Selection */}
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <Label>وضع التوزيع:</Label>
            <Button
              variant={dispatchMode === 'auto' ? 'default' : 'outline'}
              onClick={() => setDispatchMode('auto')}
              size="sm"
            >
              تلقائي
            </Button>
            <Button
              variant={dispatchMode === 'manual' ? 'default' : 'outline'}
              onClick={() => setDispatchMode('manual')}
              size="sm"
            >
              يدوي
            </Button>
          </div>

          {/* Manual Employee Selection */}
          {dispatchMode === 'manual' && (
            <div>
              <Label htmlFor="employee-select">اختيار الموظف *</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger id="employee-select">
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
          )}
        </div>

        {/* Manual Upload Interface */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Personal Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                صورة شخصية (اختياري)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload('personal', e.target.files)}
                    className="hidden"
                    id="personal-photo"
                  />
                  <label htmlFor="personal-photo" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm">انقر للاختيار</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG</p>
                  </label>
                </div>
                {manualUpload.personalPhoto && (
                  <p className="text-xs text-success truncate">{manualUpload.personalPhoto.name}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Passport Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                صورة جواز السفر (اختياري)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload('passport', e.target.files)}
                    className="hidden"
                    id="passport-photo"
                  />
                  <label htmlFor="passport-photo" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm">انقر للاختيار</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG</p>
                  </label>
                </div>
                {manualUpload.passportPhoto && (
                  <p className="text-xs text-success truncate">{manualUpload.passportPhoto.name}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Documents Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileStack className="h-4 w-4" />
                المستندات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={(e) => handleFileUpload('documents', e.target.files)}
                    className="hidden"
                    id="documents"
                  />
                  <label htmlFor="documents" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm">انقر للاختيار</p>
                  </label>
                </div>
                {manualUpload.documents.length > 0 && (
                  <p className="text-xs text-success">{manualUpload.documents.length} ملف(ات)</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Information */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="client-name">اسم العميل *</Label>
            <Input
              id="client-name"
              value={manualUpload.clientName}
              onChange={(e) => setManualUpload(prev => ({ ...prev, clientName: e.target.value }))}
              placeholder="أدخل اسم العميل"
            />
          </div>

          <div>
            <Label htmlFor="whatsapp">رقم الواتساب</Label>
            <Input
              id="whatsapp"
              value={manualUpload.whatsappNumber}
              onChange={(e) => setManualUpload(prev => ({ ...prev, whatsappNumber: e.target.value }))}
              placeholder="مثال: +216 12 345 678"
            />
          </div>

          <div>
            <Label htmlFor="service-type">نوع الخدمة</Label>
            <Select
              value={manualUpload.serviceType}
              onValueChange={(value) => setManualUpload(prev => ({ ...prev, serviceType: value }))}
            >
              <SelectTrigger id="service-type">
                <SelectValue placeholder="اختر نوع الخدمة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="فيزا">فيزا</SelectItem>
                <SelectItem value="استشارة">استشارة</SelectItem>
                <SelectItem value="دعوة">دعوة</SelectItem>
                <SelectItem value="عقد">عقد</SelectItem>
                <SelectItem value="تصديق">تصديق</SelectItem>
                <SelectItem value="أخرى">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="destination">الدولة المسافر إليها</Label>
            <Select
              value={manualUpload.destinationCountry}
              onValueChange={(value) => setManualUpload(prev => ({ ...prev, destinationCountry: value }))}
            >
              <SelectTrigger id="destination">
                <SelectValue placeholder="اختر الدولة" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.nameAr}>
                    {country.flag} {country.nameAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="visa-type">نوع التأشيرة</Label>
            <Select
              value={manualUpload.visaType}
              onValueChange={(value) => setManualUpload(prev => ({ ...prev, visaType: value }))}
            >
              <SelectTrigger id="visa-type">
                <SelectValue placeholder="اختر نوع التأشيرة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="عمل">عمل</SelectItem>
                <SelectItem value="سياحة">سياحة</SelectItem>
                <SelectItem value="معالجة">معالجة</SelectItem>
                <SelectItem value="دراسة">دراسة</SelectItem>
                <SelectItem value="تصديق">تصديق</SelectItem>
                <SelectItem value="مرافق">مرافق</SelectItem>
                <SelectItem value="أخرى">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {manualUpload.destinationCountry === 'الصين' && (
            <div>
              <Label htmlFor="china-visa-type">نوع التأشيرة الصينية</Label>
              <Select
                value={manualUpload.chinaVisaType}
                onValueChange={(value) => setManualUpload(prev => ({ ...prev, chinaVisaType: value }))}
              >
                <SelectTrigger id="china-visa-type">
                  <SelectValue placeholder="اختر نوع التأشيرة الصينية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Z">العمل في الصين - تأشيرة Z</SelectItem>
                  <SelectItem value="M">الأعمال - تأشيرة M</SelectItem>
                  <SelectItem value="X1">للطلاب - تأشيرة X1</SelectItem>
                  <SelectItem value="X2">للطلاب - تأشيرة X2</SelectItem>
                  <SelectItem value="S1">ملتقى عائلي - تأشيرة S1</SelectItem>
                  <SelectItem value="S2">ملتقى عائلي - تأشيرة S2</SelectItem>
                  <SelectItem value="Q">ملتقى عائلي - تأشيرة Q</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">المبلغ المطلوب</Label>
              <Input
                id="amount"
                type="number"
                value={manualUpload.amount}
                onChange={(e) => setManualUpload(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="currency">العملة</Label>
              <Select
                value={manualUpload.currency}
                onValueChange={(value) => setManualUpload(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TND">TND - دينار تونسي</SelectItem>
                  <SelectItem value="EUR">EUR - يورو</SelectItem>
                  <SelectItem value="USD">USD - دولار أمريكي</SelectItem>
                  <SelectItem value="DLY">DLY - دينار ليبي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <Button 
          onClick={handleConfirmUpload} 
          className="w-full"
          disabled={!manualUpload.clientName}
        >
          <FileText className="h-4 w-4 mr-2" />
          تأكيد وتوزيع
        </Button>
      </CardContent>
    </Card>
  );
}
