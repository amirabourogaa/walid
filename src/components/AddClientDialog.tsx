import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';
import { generateClientPDF } from '@/lib/pdfGenerator';
import { countries } from '@/lib/countries';

const clientSchema = z.object({
  full_name: z.string().trim().min(1, 'الاسم الكامل مطلوب').max(100, 'الاسم يجب أن يكون أقل من 100 حرف'),
  company_name: z.string().trim().max(200, 'اسم الشركة يجب أن يكون أقل من 200 حرف').optional(),
  whatsapp_number: z.string().trim().max(20, 'رقم الواتساب يجب أن يكون أقل من 20 حرف').optional(),
  email: z.string().trim().email({ message: 'البريد الإلكتروني غير صالح' }).max(255, 'البريد الإلكتروني يجب أن يكون أقل من 255 حرف').optional().or(z.literal('')),
  passport_number: z.string().trim().max(50, 'رقم جواز السفر يجب أن يكون أقل من 50 حرف').optional(),
  passport_expiry_date: z.string().optional(),
  nationality: z.string().trim().max(100, 'الجنسية يجب أن تكون أقل من 100 حرف').optional(),
  passport_status: z.enum(['موجود', 'غير موجود']).optional(),
  visa_tracking_status: z.string().trim().max(200, 'حالة التتبع يجب أن تكون أقل من 200 حرف').default('تم استلام معاملتكم'),
  assigned_employee: z.string().trim().max(100, 'اسم الموظف يجب أن يكون أقل من 100 حرف').optional(),
  service_type: z.string().trim().max(100, 'نوع الخدمة يجب أن يكون أقل من 100 حرف').optional(),
  destination_country: z.string().trim().max(100, 'الدولة يجب أن تكون أقل من 100 حرف').optional(),
  china_visa_type: z.string().trim().max(50, 'نوع التأشيرة يجب أن يكون أقل من 50 حرف').optional(),
  visa_type: z.string().trim().max(100, 'نوع التأشيرة يجب أن يكون أقل من 100 حرف').optional(),
  profession: z.string().trim().max(100, 'المهنة يجب أن تكون أقل من 100 حرف').optional(),
  tax_id: z.string().trim().max(50, 'المعرف الضريبي يجب أن يكون أقل من 50 حرف').optional(),
  amount: z.string().trim().optional(),
  currency: z.enum(['USD', 'EUR', 'TND', 'DLY']).optional(),
  entry_status: z.string().trim().max(100, 'حالة الدخول يجب أن تكون أقل من 100 حرف').optional(),
  submission_date: z.string().optional(),
  embassy_receipt_date: z.string().optional(),
  visa_start_date: z.string().optional(),
  visa_end_date: z.string().optional(),
  submitted_by: z.string().trim().max(100, 'المقدم من يجب أن يكون أقل من 100 حرف').optional(),
  summary: z.string().trim().max(500, 'الملخص يجب أن يكون أقل من 500 حرف').optional(),
  notes: z.string().trim().max(1000, 'الملاحظات يجب أن تكون أقل من 1000 حرف').optional(),
  invoice_status: z.enum(['غير مدفوعة', 'مدفوعة جزئياً', 'مدفوعة']).optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

const chinaVisaTypes = [
  { value: 'Z', label: 'العمل في الصين - تأشيرة Z' },
  { value: 'M', label: 'الأعمال - تأشيرة M' },
  { value: 'X1', label: 'للطلاب - تأشيرة X1' },
  { value: 'X2', label: 'للطلاب - تأشيرة X2' },
  { value: 'S1', label: 'ملتقى عائلي - تأشيرة S1' },
  { value: 'S2', label: 'ملتقى عائلي - تأشيرة S2' },
  { value: 'Q', label: 'ملتقى عائلي - تأشيرة Q' },
];

const generalVisaTypes = [
  { value: 'work', label: 'تأشيرة عمل' },
  { value: 'tourism', label: 'تأشيرة سياحة' },
  { value: 'medical', label: 'تأشيرة معالجة' },
  { value: 'study', label: 'الدراسة' },
  { value: 'companion', label: 'مرافق' },
  { value: 'other', label: 'أخرى' },
];

const serviceTypes = [
  { value: 'visa', label: 'فيزا' },
  { value: 'consultation', label: 'استشارة' },
  { value: 'invitation', label: 'دعوة' },
  { value: 'contract', label: 'عقد' },
  { value: 'legalization', label: 'تصديق' },
  { value: 'other', label: 'أخرى' },
];

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientAdded: () => void;
}

export function AddClientDialog({ open, onOpenChange, onClientAdded }: AddClientDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [personalPhoto, setPersonalPhoto] = useState<File | null>(null);
  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [documents, setDocuments] = useState<File[]>([]);
  const [customServiceType, setCustomServiceType] = useState('');
  const [customVisaType, setCustomVisaType] = useState('');
  const [customEntryStatus, setCustomEntryStatus] = useState('');
  const [employees, setEmployees] = useState<Array<{ id: string; name: string; user_id: string }>>([]);

  useEffect(() => {
    if (open) {
      loadEmployees();
    }
  }, [open]);

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, name, user_id')
      .order('name');
    if (data) setEmployees(data);
  };

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      visa_tracking_status: 'تم استلام معاملتكم',
    },
  });

  const destinationCountry = form.watch('destination_country');
  const serviceType = form.watch('service_type');
  const visaTypeValue = form.watch('visa_type');
  const entryStatusValue = form.watch('entry_status');

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('client-files')
      .upload(fileName, file, { upsert: true });

    if (error) throw error;

    // Return the file path (not public URL) for storage in database
    // Signed URLs will be generated when displaying the image
    return fileName;
  };

  const onSubmit = async (data: ClientFormData) => {
    setIsLoading(true);
    try {
      // Check if email already exists (if email is provided)
      if (data.email && data.email.trim() !== '') {
        const { data: existingClient, error: emailCheckError } = await supabase
          .from('clients')
          .select('id, email')
          .eq('email', data.email.trim())
          .maybeSingle();

        if (emailCheckError) throw emailCheckError;

        if (existingClient) {
          toast.error('البريد الإلكتروني موجود بالفعل في النظام');
          setIsLoading(false);
          return;
        }
      }

      // Upload files if any
      let personalPhotoUrl = '';
      let passportPhotoUrl = '';
      const documentUrls: string[] = [];

      if (personalPhoto) {
        personalPhotoUrl = await uploadFile(personalPhoto, 'personal-photos');
      }

      if (passportPhoto) {
        passportPhotoUrl = await uploadFile(passportPhoto, 'passport-photos');
      }

      for (const doc of documents) {
        const url = await uploadFile(doc, 'documents');
        documentUrls.push(url);
      }

      // Prepare progress timeline
      const progress = [
        { id: '1', title: 'تم استلام معاملتكم', date: data.submission_date || '', status: 'completed', icon: 'document' },
        { id: '2', title: 'تم التقديم في السيستام', status: 'pending', icon: 'clock' },
        { id: '3', title: 'تم قبول التأشيرة', status: 'pending', icon: 'check' },
        { id: '4', title: 'التأشيرة غير موافق عليها', status: 'pending', icon: 'user' },
        { id: '5', title: 'تم التقديم إلى السفارة', status: 'pending', icon: 'building' },
        { id: '6', title: 'اكتملت العملية', status: 'pending', icon: 'check' }
      ];

      // Use custom values if "other" is selected
      const finalServiceType = data.service_type === 'other' ? customServiceType : data.service_type;
      const finalVisaType = data.visa_type === 'other' ? customVisaType : data.visa_type;
      const finalEntryStatus = data.entry_status === 'other' ? customEntryStatus : data.entry_status;

      // Find employee user_id from selected employee name
      const selectedEmp = employees.find(e => e.name === data.assigned_employee);
      const assignedEmployeeId = selectedEmp?.user_id || null;

      // Insert into database
      const { data: client, error } = await supabase
        .from('clients')
        .insert({
          full_name: data.full_name,
          company_name: data.company_name,
          whatsapp_number: data.whatsapp_number,
          email: data.email,
          passport_number: data.passport_number,
          passport_expiry_date: data.passport_expiry_date || null,
          nationality: data.nationality,
          passport_status: data.passport_status,
          visa_tracking_status: data.visa_tracking_status,
          assigned_employee: data.assigned_employee,
          assigned_employee_id: assignedEmployeeId,
          service_type: finalServiceType,
          destination_country: data.destination_country,
          china_visa_type: data.china_visa_type,
          visa_type: finalVisaType,
          profession: data.profession,
          tax_id: data.tax_id,
          personal_photo_url: personalPhotoUrl || null,
          passport_photo_url: passportPhotoUrl || null,
          documents_urls: documentUrls.length > 0 ? documentUrls : null,
          amount: data.amount ? parseFloat(data.amount) : null,
          currency: data.currency,
          entry_status: finalEntryStatus,
          submission_date: data.submission_date || null,
          embassy_receipt_date: data.embassy_receipt_date || null,
          visa_start_date: data.visa_start_date || null,
          visa_end_date: data.visa_end_date || null,
          submitted_by: data.submitted_by,
          summary: data.summary,
          notes: data.notes,
          invoice_status: data.invoice_status || 'غير مدفوعة',
          progress: progress,
          status: 'جديد',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('تم إضافة العميل بنجاح');
      onClientAdded();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error('حدث خطأ أثناء إضافة العميل');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto font-arabic" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة عميل جديد</DialogTitle>
          <DialogDescription>املأ المعلومات التالية لإضافة عميل جديد</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* المعلومات الأساسية */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">المعلومات الأساسية</h3>
              
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم الكامل *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="أدخل الاسم الكامل" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الشركة</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="أدخل اسم الشركة (اختياري)" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="whatsapp_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الواتساب</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+218912345678" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="example@email.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="passport_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم جواز السفر</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="AB123456" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passport_expiry_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ انتهاء جواز السفر</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Passport Expiry Alert */}
              {form.watch('passport_expiry_date') && (() => {
                const expiryDate = new Date(form.watch('passport_expiry_date'));
                const today = new Date();
                const eightMonthsFromNow = new Date();
                eightMonthsFromNow.setMonth(today.getMonth() + 8);
                
                if (expiryDate < eightMonthsFromNow) {
                  return (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-700 font-bold text-center">
                        🔴 تنبيه: صلاحية جواز السفر أقل من 8 أشهر
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* معلومات الحالة */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">معلومات الحالة</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الجنسية</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="الجنسية" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passport_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>حالة جواز السفر</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الحالة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="موجود">موجود</SelectItem>
                          <SelectItem value="غير موجود">غير موجود</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="visa_tracking_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>حالة تتبع التأشيرة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الحالة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="تم استلام معاملتكم">تم استلام معاملتكم</SelectItem>
                          <SelectItem value="تم التقديم في السيستام">تم التقديم في السيستام</SelectItem>
                          <SelectItem value="تم قبول التأشيرة">تم قبول التأشيرة</SelectItem>
                          <SelectItem value="التأشيرة غير موافق عليها">التأشيرة غير موافق عليها</SelectItem>
                          <SelectItem value="تم التقديم إلى السفارة">تم التقديم إلى السفارة</SelectItem>
                          <SelectItem value="اكتملت العملية">اكتملت العملية</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assigned_employee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الموظف المسؤول</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الموظف" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* نوع الخدمة والوجهة */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">نوع الخدمة والوجهة</h3>
              
              <FormField
                control={form.control}
                name="service_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الخدمة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الخدمة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serviceTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {serviceType === 'other' && (
                <div>
                  <Label>اكتب نوع الخدمة</Label>
                  <Input
                    value={customServiceType}
                    onChange={(e) => setCustomServiceType(e.target.value)}
                    placeholder="أدخل نوع الخدمة"
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="destination_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الدولة المسافر إليها</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الدولة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countries.map(country => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.flag} {country.nameAr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {destinationCountry === 'CN' && (
                <FormField
                  control={form.control}
                  name="china_visa_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع التأشيرة الصينية</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نوع التأشيرة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {chinaVisaTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {destinationCountry && destinationCountry !== 'CN' && (
                <>
                  <FormField
                    control={form.control}
                    name="visa_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع التأشيرة</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر نوع التأشيرة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {generalVisaTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {visaTypeValue === 'other' && (
                    <div>
                      <Label>اكتب نوع التأشيرة</Label>
                      <Input
                        value={customVisaType}
                        onChange={(e) => setCustomVisaType(e.target.value)}
                        placeholder="أدخل نوع التأشيرة"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="profession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المهنة</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="المهنة" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tax_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المعرف الجبائي</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="المعرف الجبائي (للشركات)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* تحميل الملفات */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">تحميل الملفات</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>صورة شخصية</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPersonalPhoto(e.target.files?.[0] || null)}
                    />
                    <Upload className="h-4 w-4" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>صورة جواز السفر</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPassportPhoto(e.target.files?.[0] || null)}
                    />
                    <Upload className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>المستندات (حتى 500 ميجابايت)</Label>
                <Input
                  type="file"
                  multiple
                  onChange={(e) => setDocuments(Array.from(e.target.files || []))}
                />
                <p className="text-xs text-muted-foreground">يمكنك تحميل ملفات متعددة</p>
              </div>
            </div>

            {/* المعلومات المالية */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">المعلومات المالية</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المبلغ المطلوب</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العملة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر العملة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                          <SelectItem value="EUR">يورو (EUR)</SelectItem>
                          <SelectItem value="TND">دينار تونسي (TND)</SelectItem>
                          <SelectItem value="DLY">دينار ليبي (DLY)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* معلومات التقديم */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">معلومات التقديم</h3>
              
              <FormField
                control={form.control}
                name="entry_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حالة الدخول</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حالة الدخول" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="first">دخول أول</SelectItem>
                        <SelectItem value="previous">دخول مسبق</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {entryStatusValue === 'other' && (
                <div>
                  <Label>اكتب حالة الدخول</Label>
                  <Input
                    value={customEntryStatus}
                    onChange={(e) => setCustomEntryStatus(e.target.value)}
                    placeholder="أدخل حالة الدخول"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="submission_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ التقديم</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="embassy_receipt_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ استلام السفارة</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="visa_start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ بداية التأشيرة</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="visa_end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ نهاية التأشيرة</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="submitted_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تم التقديم من طرف</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="اسم الشخص أو الجهة" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حالة الفاتورة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حالة الفاتورة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="غير مدفوعة">غير مدفوعة</SelectItem>
                        <SelectItem value="مدفوعة جزئياً">مدفوعة جزئياً</SelectItem>
                        <SelectItem value="مدفوعة">مدفوعة</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* معلومات إضافية */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">معلومات إضافية</h3>
              
              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الخلاصة</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="ملخص حول الطلب" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="ملاحظات إضافية" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                حفظ العميل
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}