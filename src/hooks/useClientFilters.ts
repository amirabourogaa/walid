import { useCallback, useMemo } from 'react';

interface Client {
  id: string;
  full_name: string;
  client_id_number?: string;
  whatsapp_number?: string;
  passport_number?: string;
  nationality?: string;
  assigned_employee?: string;
  passport_status?: string;
  visa_tracking_status?: string;
  summary?: string;
  notes?: string;
  status: 'جديد' | 'قيد المعالجة' | 'اكتملت العملية' | 'مرفوضة';
  created_at: string;
  updated_at: string;
  email?: string;
  service_type?: string;
  amount?: number;
  currency?: string;
  qr_code_data?: string;
  personal_photo_url?: string;
  passport_photo_url?: string;
  documents_urls?: string[];
  submission_date?: string;
  embassy_receipt_date?: string;
  visa_start_date?: string;
  visa_end_date?: string;
  invoice_status?: string;
  destination_country?: string;
  china_visa_type?: string;
  visa_type?: string;
  profession?: string;
  tax_id?: string;
  entry_status?: string;
  submitted_by?: string;
  progress?: any;
  daysRemaining?: number;
}

function isClientIncomplete(client: Client): boolean {
  return !!(
    client.visa_tracking_status === 'تم التقديم في السيستام' ||
    client.passport_status === 'غير موجود' ||
    !client.passport_number ||
    client.passport_number.trim() === '' ||
    !client.whatsapp_number ||
    client.whatsapp_number.trim() === '' ||
    client.assigned_employee === 'غير محدد' ||
    !client.full_name ||
    client.full_name.trim() === '' ||
    client.nationality === 'غير محدد'
  );
}

function isClientDelayed(client: Client): boolean {
  // Check if visa_tracking_status hasn't changed in 10+ days
  const checkDate = client.updated_at || client.created_at;
  if (!checkDate) return false;
  
  const lastUpdate = new Date(checkDate);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Only consider delayed if not completed
  const status = client.status?.replace(/ /g, '_');
  const isCompleted = status === 'اكتملت_العملية';
  return daysDiff > 10 && !isCompleted;
}

export function useClientFilters(clients: Client[]) {
  const filterClients = useCallback((
    statusFilter: string,
    nationalityFilter: string,
    responsibleEmployeeFilter: string,
    passportStatusFilter: string,
    whatsappFilter: string,
    passportNumberFilter: string,
    visaStatusFilter: string,
    summaryFilter: string,
    noteFilter: string,
    invoiceStatusFilter: string,
    showUnvalidated: boolean
  ) => {
    if (!clients) return [];
    
    let filtered = clients;

    // Apply status filter (main status, not visa tracking status)
    if (statusFilter !== "all") {
      if (statusFilter === "متأخرة") {
        // Filter delayed clients
        filtered = filtered.filter(client => isClientDelayed(client));
      } else {
        // Filter by exact status, normalizing underscores
        filtered = filtered.filter(client => {
          const normalizedClientStatus = client.status?.replace(/ /g, '_');
          const normalizedFilterStatus = statusFilter.replace(/ /g, '_');
          return normalizedClientStatus === normalizedFilterStatus;
        });
      }
    }

    // Apply nationality filter
    if (nationalityFilter !== "all") {
      filtered = filtered.filter(client => client.nationality === nationalityFilter);
    }

    // Apply responsible employee filter
    if (responsibleEmployeeFilter !== "all") {
      filtered = filtered.filter(client => client.assigned_employee === responsibleEmployeeFilter);
    }

    // Apply passport status filter
    if (passportStatusFilter !== "all") {
      filtered = filtered.filter(client => client.passport_status === passportStatusFilter);
    }

    // Apply WhatsApp filter
    if (whatsappFilter === "no_whatsapp") {
      filtered = filtered.filter(client => !client.whatsapp_number || client.whatsapp_number.trim() === '');
    } else if (whatsappFilter === "has_whatsapp") {
      filtered = filtered.filter(client => client.whatsapp_number && client.whatsapp_number.trim() !== '');
    }

    // Apply passport number filter
    if (passportNumberFilter === "no_passport_number") {
      filtered = filtered.filter(client => !client.passport_number || client.passport_number.trim() === '');
    } else if (passportNumberFilter === "has_passport_number") {
      filtered = filtered.filter(client => client.passport_number && client.passport_number.trim() !== '');
    }

    // Apply visa status filter (for visa tracking statuses)
    if (visaStatusFilter !== "all") {
      filtered = filtered.filter(client => client.visa_tracking_status === visaStatusFilter);
    }

    // Apply summary filter
    if (summaryFilter === "no_summary") {
      filtered = filtered.filter(client => !client.summary || client.summary.trim() === '');
    } else if (summaryFilter === "has_summary") {
      filtered = filtered.filter(client => client.summary && client.summary.trim() !== '');
    }

    // Apply note filter
    if (noteFilter === "no_note") {
      filtered = filtered.filter(client => !client.notes || client.notes.trim() === '');
    } else if (noteFilter === "has_note") {
      filtered = filtered.filter(client => client.notes && client.notes.trim() !== '');
    }

    // Apply invoice status filter
    if (invoiceStatusFilter !== "all") {
      if (invoiceStatusFilter === "متأخرة") {
        // Filter delayed invoices (unpaid for more than 30 days)
        filtered = filtered.filter(client => {
          if (client.invoice_status === 'مدفوعة') return false;
          const createdDate = new Date(client.created_at);
          const now = new Date();
          const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff > 30;
        });
      } else {
        // Filter by exact invoice status
        filtered = filtered.filter(client => client.invoice_status === invoiceStatusFilter);
      }
    }

    // Apply unvalidated filter
    if (showUnvalidated) {
      filtered = filtered.filter(client => isClientIncomplete(client));
    }

    // Sort clients by created_at in descending order (newest first)
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    return filtered;
  }, [clients]);

  const getUnvalidatedStats = useMemo(() => {
    if (!clients) return { count: 0, issues: [] };
    
    const unvalidated = clients.filter(client => isClientIncomplete(client));

    return {
      count: unvalidated.length,
      issues: [
        { type: 'تم التقديم في السيستام', count: clients.filter(c => c.visa_tracking_status === 'تم التقديم في السيستام').length },
        { type: 'جواز غير موجود', count: clients.filter(c => c.passport_status === 'غير موجود').length },
        { type: 'لا يوجد رقم جواز', count: clients.filter(c => !c.passport_number || c.passport_number.trim() === '').length },
        { type: 'لا يوجد واتساب', count: clients.filter(c => !c.whatsapp_number || c.whatsapp_number.trim() === '').length },
        { type: 'موظف غير محدد', count: clients.filter(c => c.assigned_employee === 'غير محدد').length },
        { type: 'اسم غير مكتمل', count: clients.filter(c => !c.full_name || c.full_name.trim() === '').length },
        { type: 'جنسية غير محددة', count: clients.filter(c => c.nationality === 'غير محدد').length }
      ]
    };
  }, [clients]);

  return {
    filterClients,
    unvalidatedStats: getUnvalidatedStats,
    isClientIncomplete,
    isClientDelayed
  };
}
