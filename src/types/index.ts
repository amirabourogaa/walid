export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'employee' | 'client';
  status: 'active' | 'inactive';
  phone?: string;
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passportNumber: string;
  visaType: string;
  status: 'جديد' | 'قيد_المعالجة' | 'موافق_عليه' | 'مرفوض' | 'منتهي';
  dossierNumber: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VisaApplication {
  id: string;
  clientId: string;
  visaType: string;
  status: 'مقدم' | 'قيد_المراجعة' | 'وثائق_مطلوبة' | 'موافق_عليه' | 'مرفوض';
  applicationDate: Date;
  appointmentDate?: Date;
  documents: Document[];
  notes: string;
  priority: 'منخفض' | 'متوسط' | 'عالي' | 'عاجل';
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Date;
  status: 'في_الانتظار' | 'تم_التحقق' | 'مرفوض';
}

export interface Appointment {
  id: string;
  clientId: string;
  employeeId: string;
  date: Date;
  duration: number;
  type: 'استشارة' | 'مراجعة_وثائق' | 'تحضير_مقابلة' | 'متابعة';
  status: 'مجدول' | 'مؤكد' | 'مكتمل' | 'ملغى';
  notes?: string;
  location: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'مسودة' | 'مرسل' | 'مدفوع' | 'متأخر' | 'ملغى';
  dueDate: Date;
  items: InvoiceItem[];
  createdAt: Date;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'معلومات' | 'نجاح' | 'تحذير' | 'خطأ';
  read: boolean;
  createdAt: Date;
}