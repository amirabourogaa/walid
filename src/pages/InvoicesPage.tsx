import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Download, Eye, DollarSign, Calendar, FileText, X, Trash2, Send, Mail, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateInvoicePDF } from '@/lib/invoicePdfGeneratorUnified';
import { authService } from '@/lib/auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Client {
  id: string;
  full_name: string;
  whatsapp_number?: string;
  tax_id?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  client_whatsapp?: string;
  client_tax_id?: string;
  client_email?: string;
  services: Service[];
  subtotal: number;
  currency: string;
  tva_rate?: number;
  tva_amount?: number;
  discount_amount?: number;
  timbre_fiscal?: number;
  retenue_source_rate?: number;
  retenue_source_amount?: number;
  total_amount: number;
  status: string;
  issue_date: string;
  due_date?: string;
  notes?: string;
  created_at: string;
  collection_source_type?: string;
  collection_source_id?: string;
  payment_mode?: string;
  // Informations de vol
  flight_departure_city?: string;
  flight_arrival_city?: string;
  flight_departure_date?: string;
  flight_return_date?: string;
  flight_traveler_name?: string;
  // Informations d'hébergement
  hotel_name?: string;
  hotel_city?: string;
  hotel_checkin_date?: string;
  hotel_checkout_date?: string;
  hotel_guest_name?: string;
  hotel_room_type?: string;
}

interface Service {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  exemptFromTVA?: boolean;
  isHT?: boolean; // Indique si le prix est Hors Taxe
}

const statusColors = {
  'مسودة': 'bg-gray-500',
  'مرسلة': 'bg-blue-500',
  'مدفوعة': 'bg-green-500',
  'متأخرة': 'bg-red-500',
  'ملغية': 'bg-gray-400'
};

export default function InvoicesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const preSelectedClient = location.state?.selectedClient;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(!!preSelectedClient);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);
  const [securityCode, setSecurityCode] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [repairInvoiceId, setRepairInvoiceId] = useState<string | null>(null);
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const [repairCollectionSourceType, setRepairCollectionSourceType] = useState<'caisse' | 'compte_bancaire' | ''>('');
  const [repairCollectionSourceId, setRepairCollectionSourceId] = useState('');
  const [repairPaymentMode, setRepairPaymentMode] = useState('');
  
  // Status change to paid dialog
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [statusChangeInvoiceId, setStatusChangeInvoiceId] = useState<string | null>(null);
  const [statusChangeClientId, setStatusChangeClientId] = useState<string | null>(null);
  const [statusChangeCollectionSourceType, setStatusChangeCollectionSourceType] = useState<'caisse' | 'compte_bancaire' | ''>('');
  const [statusChangeCollectionSourceId, setStatusChangeCollectionSourceId] = useState('');
  const [statusChangePaymentMode, setStatusChangePaymentMode] = useState('');
  
  // Edit Invoice states
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientWhatsapp, setEditClientWhatsapp] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');
  const [editClientTaxId, setEditClientTaxId] = useState('');
  const [editServices, setEditServices] = useState<Service[]>([]);
  const [editCurrency, setEditCurrency] = useState('TND');
  const [editTvaEnabled, setEditTvaEnabled] = useState(false);
  const [editTvaRate, setEditTvaRate] = useState(19);
  const [editDiscountAmount, setEditDiscountAmount] = useState(0);
  const [editTimbreFiscalEnabled, setEditTimbreFiscalEnabled] = useState(false);
  const [editRetenueSourceEnabled, setEditRetenueSourceEnabled] = useState(false);
  const [editRetenueSourceRate, setEditRetenueSourceRate] = useState(0);
  const [editIssueDate, setEditIssueDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('مسودة');

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(preSelectedClient?.id || '');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientWhatsapp, setManualClientWhatsapp] = useState('');
  const [manualClientEmail, setManualClientEmail] = useState('');
  const [manualClientTaxId, setManualClientTaxId] = useState('');
  const [invoiceLanguage, setInvoiceLanguage] = useState<"FR" | "AR">("FR");
  const [services, setServices] = useState<Service[]>([]);
  const [currency, setCurrency] = useState('TND');
  const [tvaEnabled, setTvaEnabled] = useState(false);
  const [tvaRate, setTvaRate] = useState(19);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [timbreFiscalEnabled, setTimbreFiscalEnabled] = useState(false);
  const [retenueSourceEnabled, setRetenueSourceEnabled] = useState(false);
  const [retenueSourceRate, setRetenueSourceRate] = useState(0);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [collectionSourceType, setCollectionSourceType] = useState<'caisse' | 'compte_bancaire' | ''>('');
  const [collectionSourceId, setCollectionSourceId] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [caisses, setCaisses] = useState<any[]>([]);
  const [comptesBancaires, setComptesBancaires] = useState<any[]>([]);

  // Informations de vol (optionnel)
  const [hasFlightInfo, setHasFlightInfo] = useState(false);
  const [flightDepartureCity, setFlightDepartureCity] = useState('');
  const [flightArrivalCity, setFlightArrivalCity] = useState('');
  const [flightDepartureDate, setFlightDepartureDate] = useState('');
  const [flightReturnDate, setFlightReturnDate] = useState('');
  const [flightTravelerName, setFlightTravelerName] = useState('');

  // Informations d'hébergement (optionnel)
  const [hasHotelInfo, setHasHotelInfo] = useState(false);
  const [hotelName, setHotelName] = useState('');
  const [hotelCity, setHotelCity] = useState('');
  const [hotelCheckinDate, setHotelCheckinDate] = useState('');
  const [hotelCheckoutDate, setHotelCheckoutDate] = useState('');
  const [hotelGuestName, setHotelGuestName] = useState('');
  const [hotelRoomType, setHotelRoomType] = useState('');

  useEffect(() => {
    fetchInvoices();
    fetchClients();
    fetchCaisses();
    fetchComptesBancaires();
    checkUserRole();
    generateDefaultInvoiceNumber();
    cleanupDraftInvoiceTransactions();

    // Synchronisation en temps réel pour les factures
    const channel = supabase
      .channel('invoices-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices'
        },
        () => {
          fetchInvoices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const generateDefaultInvoiceNumber = async () => {
    try {
      const { data: invoiceNumberData, error } = await supabase
        .rpc('get_next_invoice_number');
      
      if (!error && invoiceNumberData) {
        setInvoiceNumber(invoiceNumberData);
      }
    } catch (error) {
      console.error('Error generating default invoice number:', error);
    }
  };

  const checkUserRole = () => {
    const user = authService.getCurrentUser();
    setIsAdmin(user?.role === 'admin');
  };

  const cleanupDraftInvoiceTransactions = async () => {
    try {
      // Récupérer toutes les factures avec statut "مسودة" qui ont des transactions
      const { data: draftInvoices, error: fetchError } = await supabase
        .from('invoices')
        .select('id, invoice_number, collection_source_type, collection_source_id, total_amount, currency')
        .eq('status', 'مسودة');

      if (fetchError || !draftInvoices || draftInvoices.length === 0) return;

      // Pour chaque facture brouillon
      for (const invoice of draftInvoices) {
        // Chercher les transactions liées
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('id, montant, devise')
          .ilike('description', `%${invoice.invoice_number}%`);

        if (txError || !transactions || transactions.length === 0) continue;

        // Supprimer les transactions
        for (const transaction of transactions) {
          await supabase
            .from('transactions')
            .delete()
            .eq('id', transaction.id);

          // Corriger le montant de la caisse/compte bancaire si la facture a un collection_source
          if (invoice.collection_source_type && invoice.collection_source_id) {
            const tableName = invoice.collection_source_type === 'caisse' ? 'caisses' : 'comptes_bancaires';
            
            const { data: sourceData, error: balanceFetchError } = await supabase
              .from(tableName)
              .select('montants')
              .eq('id', invoice.collection_source_id)
              .maybeSingle();

            if (!balanceFetchError && sourceData) {
              let montants = sourceData.montants as Array<{currency: string, amount: number}>;
              const currencyIndex = montants.findIndex(m => m.currency === transaction.devise);
              
              if (currencyIndex >= 0) {
                montants[currencyIndex].amount -= transaction.montant;
                
                await supabase
                  .from(tableName)
                  .update({ montants })
                  .eq('id', invoice.collection_source_id);
              }
            }
          }
        }

        // Nettoyer les informations de collection_source de la facture brouillon
        if (invoice.collection_source_type || invoice.collection_source_id) {
          await supabase
            .from('invoices')
            .update({
              collection_source_type: null,
              collection_source_id: null,
              payment_mode: null
            })
            .eq('id', invoice.id);
        }
      }

      console.log('تم تنظيف المعاملات من الفواتير المسودة');
    } catch (error) {
      console.error('Error cleaning up draft invoice transactions:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices((data || []).map(invoice => ({
        ...invoice,
        services: (invoice.services as any) || []
      })));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('حدث خطأ أثناء تحميل الفواتير');
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, whatsapp_number, tax_id')
        .order('full_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('حدث خطأ أثناء تحميل العملاء');
    }
  };

  const fetchCaisses = async () => {
    try {
      const { data, error } = await supabase
        .from('caisses')
        .select('id, nom')
        .order('nom');

      if (error) throw error;
      setCaisses(data || []);
    } catch (error) {
      console.error('Error fetching caisses:', error);
    }
  };

  const fetchComptesBancaires = async () => {
    try {
      const { data, error } = await supabase
        .from('comptes_bancaires')
        .select('id, nom_banque')
        .order('nom_banque');

      if (error) throw error;
      setComptesBancaires(data || []);
    } catch (error) {
      console.error('Error fetching comptes bancaires:', error);
    }
  };

  const addService = () => {
    setServices([
      ...services,
      {
        id: Date.now().toString(),
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0,
        exemptFromTVA: false,
        isHT: false
      }
    ]);
  };

  const updateService = (id: string, field: keyof Service, value: any) => {
    setServices(services.map(service => {
      if (service.id === id) {
        const updated = { ...service, [field]: value };
        
        // Recalculate total when quantity, unitPrice, or checkbox states change
        if (field === 'quantity' || field === 'unitPrice' || field === 'exemptFromTVA' || field === 'isHT') {
          // If neither checkbox is checked, the amount is TTC and needs to be converted to HT
          // If isHT is checked, the amount is already HT
          // If exemptFromTVA is checked, no TVA applies
          
          const quantity = field === 'quantity' ? value : updated.quantity;
          const unitPrice = field === 'unitPrice' ? value : updated.unitPrice;
          const isHT = field === 'isHT' ? value : updated.isHT;
          const exemptFromTVA = field === 'exemptFromTVA' ? value : updated.exemptFromTVA;
          
          // Calculate the base total
          let calculatedTotal = quantity * unitPrice;
          
          // Store the original entered price for display purposes
          updated.unitPrice = unitPrice;
          updated.total = calculatedTotal;
        }
        
        return updated;
      }
      return service;
    }));
  };

  const removeService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  const calculateTotals = () => {
    // Calculate subtotal and TVA based on service types
    let subtotalHT = 0;
    let tvaAmount = 0;
    
    services.forEach(service => {
      const serviceTotal = service.total;
      
      if (service.exemptFromTVA) {
        // No TVA applies - add the total as-is to HT
        subtotalHT += serviceTotal;
      } else if (service.isHT) {
        // Amount is HT, calculate TVA if enabled
        subtotalHT += serviceTotal;
        if (tvaEnabled) {
          tvaAmount += (serviceTotal * tvaRate) / 100;
        }
      } else {
        // Amount is TTC, convert to HT and extract TVA
        if (tvaEnabled && tvaRate > 0) {
          const htAmount = serviceTotal / (1 + tvaRate / 100);
          subtotalHT += htAmount;
          tvaAmount += serviceTotal - htAmount;
        } else {
          // If TVA not enabled, treat as HT
          subtotalHT += serviceTotal;
        }
      }
    });

    let total = subtotalHT + tvaAmount;

    // Subtract discount
    total -= discountAmount;

    // Add timbre fiscal (only for TND)
    const timbreFiscal = timbreFiscalEnabled && currency === 'TND' ? 1 : 0;
    total += timbreFiscal;

    // Calculate retenue à la source (only if enabled and currency is TND and total > 1000)
    const retenueSourceAmount = retenueSourceEnabled && currency === 'TND' && total > 1000
      ? (total * retenueSourceRate) / 100
      : 0;
    total -= retenueSourceAmount;

    return {
      subtotal: subtotalHT,
      tvaAmount,
      timbreFiscal,
      retenueSourceAmount,
      total: Math.max(0, total)
    };
  };

  const handleCreateInvoice = async () => {
    // Validation for manual entry or client selection
    if (!isManualEntry && !selectedClientId) {
      toast.error('يرجى اختيار العميل أو تفعيل الإدخال اليدوي');
      return;
    }

    if (isManualEntry && !manualClientName.trim()) {
      toast.error('يرجى إدخال اسم العميل');
      return;
    }

    if (services.length === 0) {
      toast.error('يرجى إضافة خدمة واحدة على الأقل');
      return;
    }

    if (services.some(s => !s.description || s.quantity <= 0 || s.unitPrice < 0)) {
      toast.error('يرجى ملء جميع تفاصيل الخدمات بشكل صحيح');
      return;
    }

    setIsCreating(true);
    try {
      let clientData;
      let clientIdForInvoice;

      if (isManualEntry) {
        // Use manual entry data
        clientData = {
          full_name: manualClientName.trim(),
          whatsapp_number: manualClientWhatsapp.trim() || undefined,
          tax_id: manualClientTaxId.trim() || undefined,
          email: manualClientEmail.trim() || undefined
        };
        clientIdForInvoice = null; // NULL for manual entries
      } else {
        // Use selected client from database
        const selectedClient = clients.find(c => c.id === selectedClientId);
        if (!selectedClient) throw new Error('العميل غير موجود');
        
        // Fetch email if available
        const { data: clientDetails } = await supabase
          .from('clients')
          .select('email')
          .eq('id', selectedClientId)
          .single();
        
        clientData = {
          full_name: selectedClient.full_name,
          whatsapp_number: selectedClient.whatsapp_number,
          tax_id: selectedClient.tax_id,
          email: clientDetails?.email
        };
        clientIdForInvoice = selectedClientId;
      }

      const totals = calculateTotals();
      
      // Use manual invoice number or generate one if not provided
      let finalInvoiceNumber = invoiceNumber.trim();
      
      if (!finalInvoiceNumber) {
        const { data: invoiceNumberData, error: invoiceNumberError } = await supabase
          .rpc('get_next_invoice_number');
        
        if (invoiceNumberError) {
          console.error('Error generating invoice number:', invoiceNumberError);
          throw new Error('فشل في إنشاء رقم الفاتورة');
        }
        
        finalInvoiceNumber = invoiceNumberData;
      }

      const invoiceData = {
        invoice_number: finalInvoiceNumber,
        client_id: clientIdForInvoice,
        client_name: clientData.full_name,
        client_whatsapp: clientData.whatsapp_number,
        client_tax_id: clientData.tax_id,
        client_email: clientData.email,
        services: services,
        subtotal: totals.subtotal,
        currency,
        tva_rate: tvaEnabled ? tvaRate : null,
        tva_amount: tvaEnabled ? totals.tvaAmount : null,
        discount_amount: discountAmount,
        timbre_fiscal: totals.timbreFiscal,
        retenue_source_rate: retenueSourceEnabled && currency === 'TND' && totals.total > 1000 ? retenueSourceRate : null,
        retenue_source_amount: totals.retenueSourceAmount,
        total_amount: totals.total,
        status: 'مسودة',
        issue_date: issueDate,
        due_date: dueDate || null,
        notes: notes || null,
        // Ne jamais définir collection_source pour les factures "مسودة"
        collection_source_type: null,
        collection_source_id: null,
        payment_mode: null,
        // Informations de vol (only if enabled)
        flight_departure_city: hasFlightInfo ? flightDepartureCity || null : null,
        flight_arrival_city: hasFlightInfo ? flightArrivalCity || null : null,
        flight_departure_date: hasFlightInfo ? flightDepartureDate || null : null,
        flight_return_date: hasFlightInfo ? flightReturnDate || null : null,
        flight_traveler_name: hasFlightInfo ? flightTravelerName || null : null,
        // Informations d'hébergement (only if enabled)
        hotel_name: hasHotelInfo ? hotelName || null : null,
        hotel_city: hasHotelInfo ? hotelCity || null : null,
        hotel_checkin_date: hasHotelInfo ? hotelCheckinDate || null : null,
        hotel_checkout_date: hasHotelInfo ? hotelCheckoutDate || null : null,
        hotel_guest_name: hasHotelInfo ? hotelGuestName || null : null,
        hotel_room_type: hasHotelInfo ? hotelRoomType || null : null
      };

      setCreatedInvoice(invoiceData);
      toast.success('تم إنشاء الفاتورة بنجاح');
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('حدث خطأ أثناء إنشاء الفاتورة');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveInvoice = async () => {
    if (!createdInvoice) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Check if invoice number already exists
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('invoice_number', createdInvoice.invoice_number)
        .maybeSingle();
      
      let finalInvoiceData = { ...createdInvoice };
      
      // If invoice number exists, regenerate it
      if (existingInvoice) {
        const { data: newInvoiceNumber, error: invoiceNumberError } = await supabase
          .rpc('get_next_invoice_number');
        
        if (invoiceNumberError) {
          throw new Error('فشل في إنشاء رقم فاتورة جديد');
        }
        
        finalInvoiceData.invoice_number = newInvoiceNumber;
        setCreatedInvoice(finalInvoiceData);
        toast.info(`تم تغيير رقم الفاتورة إلى ${newInvoiceNumber} لتجنب التكرار`);
      }
      
      const { error } = await supabase
        .from('invoices')
        .insert([finalInvoiceData]);

      if (error) throw error;

      // Si la facture est payée, créer automatiquement une transaction
      if (createdInvoice.status === 'مدفوعة' && createdInvoice.collection_source_type && createdInvoice.collection_source_id) {
        // Map payment mode to database enum values
        const paymentModeMap: Record<string, 'espece' | 'cheque' | 'virement' | 'traite' | 'carte_bancaire'> = {
          'espèce': 'espece',
          'chèque': 'cheque',
          'virement': 'virement',
          'traite': 'traite',
          'carte_bancaire': 'carte_bancaire'
        };
        
        const devise = (createdInvoice.currency === 'TND' ? 'TND' : createdInvoice.currency === 'EUR' ? 'EUR' : 'USD') as 'TND' | 'EUR' | 'USD';
        
        // Créer la transaction
        const transactionData = {
          type: 'entree' as const,
          categorie: 'autre' as const,
          description: `فاتورة ${createdInvoice.invoice_number} - ${createdInvoice.client_name}`,
          montant: createdInvoice.total_amount,
          devise: devise,
          mode_paiement: paymentModeMap[createdInvoice.payment_mode] || 'espece',
          source_type: createdInvoice.collection_source_type,
          source_id: createdInvoice.collection_source_id,
          date_transaction: createdInvoice.issue_date,
          created_by: userData.user?.id
        };

        const { error: transactionError } = await supabase
          .from('transactions')
          .insert([transactionData]);

        if (transactionError) {
          console.error('Error creating transaction:', transactionError);
          toast.error('تم حفظ الفاتورة لكن حدث خطأ في إنشاء المعاملة');
        } else {
          // Mettre à jour le montant de la caisse ou du compte bancaire
          try {
            const tableName = createdInvoice.collection_source_type === 'caisse' ? 'caisses' : 'comptes_bancaires';
            // Fetch current montants
            const { data: sourceData, error: fetchError } = await supabase
              .from(tableName)
              .select('montants')
              .eq('id', createdInvoice.collection_source_id)
              .single();
            
            if (fetchError) throw fetchError;
            
            // Update the amount for the specific currency
            let montants = sourceData.montants as Array<{currency: string, amount: number}>;
            const currencyIndex = montants.findIndex(m => m.currency === devise);
            
            if (currencyIndex >= 0) {
              montants[currencyIndex].amount += createdInvoice.total_amount;
            } else {
              montants.push({ currency: devise, amount: createdInvoice.total_amount });
            }
            
            // Save updated montants
            const { error: updateError } = await supabase
              .from(tableName)
              .update({ montants })
              .eq('id', createdInvoice.collection_source_id);
            
            if (updateError) throw updateError;
            
            toast.success('تم حفظ الفاتورة وإنشاء المعاملة وتحديث الرصيد بنجاح');
          } catch (balanceError) {
            console.error('Error updating balance:', balanceError);
            toast.warning('تم حفظ الفاتورة والمعاملة ولكن حدث خطأ في تحديث الرصيد');
          }
        }
      } else if (createdInvoice.status === 'مدفوعة') {
        toast.warning('يرجى تحديد مكان التحصيل لإنشاء المعاملة تلقائياً');
      } else {
        toast.success('تم حفظ الفاتورة في قاعدة البيانات');
      }

      fetchInvoices();
      resetForm();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('حدث خطأ أثناء حفظ الفاتورة');
    }
  };

  const handleDownloadPDF = async () => {
    if (!createdInvoice) return;

    try {
      const invoiceData = {
        invoice_number: createdInvoice.invoice_number,
        client_name: createdInvoice.client_name,
        client_whatsapp: createdInvoice.client_whatsapp,
        client_tax_id: createdInvoice.client_tax_id,
        client_email: createdInvoice.client_email,
        services: createdInvoice.services.map((s: any) => ({
          description: s.description,
          quantity: s.quantity,
          unit_price: s.unitPrice,
          amount: s.total
        })),
        subtotal: createdInvoice.subtotal,
        tva_rate: createdInvoice.tva_rate,
        tva_amount: createdInvoice.tva_amount,
        discount_amount: createdInvoice.discount_amount,
        timbre_fiscal: createdInvoice.timbre_fiscal,
        total_amount: createdInvoice.total_amount,
        currency: createdInvoice.currency,
        issue_date: createdInvoice.issue_date,
        due_date: createdInvoice.due_date,
        notes: createdInvoice.notes,
        flight_departure_city: createdInvoice.flight_departure_city,
        flight_arrival_city: createdInvoice.flight_arrival_city,
        flight_departure_date: createdInvoice.flight_departure_date,
        flight_return_date: createdInvoice.flight_return_date,
        flight_traveler_name: createdInvoice.flight_traveler_name,
        hotel_name: createdInvoice.hotel_name,
        hotel_city: createdInvoice.hotel_city,
        hotel_checkin_date: createdInvoice.hotel_checkin_date,
        hotel_checkout_date: createdInvoice.hotel_checkout_date,
        hotel_guest_name: createdInvoice.hotel_guest_name,
        hotel_room_type: createdInvoice.hotel_room_type
      };

      await generateInvoicePDF(invoiceData, {
        language: invoiceLanguage === 'AR' ? 'ar' : 'fr'
      });
      
      toast.success('تم إنشاء ملف PDF بنجاح');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('حدث خطأ أثناء إنشاء الفاتورة');
    }
  };

  const handleGeneratePDFFromList = async (invoice: Invoice, language: "FR" | "AR" = "FR") => {
    try {
      const invoiceData = {
        invoice_number: invoice.invoice_number,
        client_name: invoice.client_name,
        client_whatsapp: invoice.client_whatsapp,
        client_tax_id: invoice.client_tax_id,
        client_email: invoice.client_email,
        services: invoice.services.map((s: any) => ({
          description: s.description,
          quantity: s.quantity,
          unit_price: s.unitPrice || s.unit_price,
          amount: s.total || s.amount
        })),
        subtotal: invoice.subtotal,
        tva_rate: invoice.tva_rate,
        tva_amount: invoice.tva_amount,
        discount_amount: invoice.discount_amount,
        timbre_fiscal: invoice.timbre_fiscal,
        total_amount: invoice.total_amount,
        currency: invoice.currency,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        notes: invoice.notes,
        language: language,
        flight_departure_city: invoice.flight_departure_city,
        flight_arrival_city: invoice.flight_arrival_city,
        flight_departure_date: invoice.flight_departure_date,
        flight_return_date: invoice.flight_return_date,
        flight_traveler_name: invoice.flight_traveler_name,
        hotel_name: invoice.hotel_name,
        hotel_city: invoice.hotel_city,
        hotel_checkin_date: invoice.hotel_checkin_date,
        hotel_checkout_date: invoice.hotel_checkout_date,
        hotel_guest_name: invoice.hotel_guest_name,
        hotel_room_type: invoice.hotel_room_type
      };

      await generateInvoicePDF(invoiceData, {
        language: language === 'AR' ? 'ar' : 'fr'
      });
      
      toast.success('تم إنشاء ملف PDF بنجاح');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('حدث خطأ أثناء إنشاء الفاتورة');
    }
  };

  const handleSendWhatsApp = async (invoice: Invoice) => {
    let whatsappNumber = invoice.client_whatsapp;
    
    // If whatsapp number is not in invoice, fetch from client
    if (!whatsappNumber) {
      try {
        const { data: client, error } = await supabase
          .from('clients')
          .select('whatsapp_number')
          .eq('id', invoice.client_id)
          .single();
        
        if (error) throw error;
        whatsappNumber = client?.whatsapp_number;
      } catch (error) {
        console.error('Error fetching client whatsapp:', error);
      }
    }

    if (!whatsappNumber) {
      toast.error('رقم الواتساب غير متوفر لهذا العميل');
      return;
    }

    const message = `مرحباً،
    
هذا تذكير بفاتورتك:
رقم الفاتورة: ${invoice.invoice_number}
المبلغ الإجمالي: ${invoice.total_amount.toFixed(3)} ${invoice.currency}
تاريخ الإصدار: ${invoice.issue_date}
${invoice.due_date ? `تاريخ الاستحقاق: ${invoice.due_date}` : ''}

شكراً لك.`;

    const phoneNumber = whatsappNumber.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSendEmail = async (invoice: Invoice) => {
    let clientEmail = invoice.client_email;
    
    // If email is not in invoice, fetch from client
    if (!clientEmail) {
      try {
        const { data: client, error } = await supabase
          .from('clients')
          .select('email')
          .eq('id', invoice.client_id)
          .maybeSingle();
        
        if (error) throw error;
        clientEmail = client?.email;
      } catch (error) {
        console.error('Error fetching client email:', error);
      }
    }

    if (!clientEmail) {
      toast.error('البريد الإلكتروني غير متوفر لهذا العميل');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoice: {
            invoiceNumber: invoice.invoice_number,
            clientName: invoice.client_name,
            clientEmail: clientEmail,
            clientWhatsapp: invoice.client_whatsapp,
            clientTaxId: invoice.client_tax_id,
            services: invoice.services,
            subtotal: invoice.subtotal,
            currency: invoice.currency,
            tvaRate: invoice.tva_rate,
            tvaAmount: invoice.tva_amount,
            discountAmount: invoice.discount_amount,
            timbreFiscal: invoice.timbre_fiscal,
            retenueSourceRate: invoice.retenue_source_rate,
            retenueSourceAmount: invoice.retenue_source_amount,
            totalAmount: invoice.total_amount,
            issueDate: invoice.issue_date,
            dueDate: invoice.due_date,
            notes: invoice.notes
          }
        }
      });

      if (error) throw error;
      toast.success('تم إرسال الفاتورة بنجاح عبر البريد الإلكتروني');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('حدث خطأ أثناء إرسال البريد الإلكتروني');
    }
  };

  const handleStatusChange = async (invoiceId: string, newStatus: string, clientId: string | null) => {
    if (!isAdmin) {
      toast.error('فقط المسؤولون يمكنهم تغيير حالة الفاتورة');
      return;
    }

    try {
      // Get invoice details
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (fetchError) throw fetchError;

      // If changing to paid and no payment info, open dialog
      if (newStatus === 'مدفوعة' && (!invoice.collection_source_type || !invoice.collection_source_id || !invoice.payment_mode)) {
        setStatusChangeInvoiceId(invoiceId);
        setStatusChangeClientId(clientId);
        setStatusChangeCollectionSourceType('');
        setStatusChangeCollectionSourceId('');
        setStatusChangePaymentMode('');
        setStatusChangeDialogOpen(true);
        return;
      }

      // Update invoice status
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;

      // Update client's invoice_status if client exists
      if (clientId) {
        const { error: clientError } = await supabase
          .from('clients')
          .update({ invoice_status: newStatus })
          .eq('id', clientId);

        if (clientError) throw clientError;
      }

      // Create transaction if status is "مدفوعة" and has collection source
      if (newStatus === 'مدفوعة' && invoice.collection_source_type && invoice.collection_source_id) {
        // Vérifier si une transaction existe déjà pour cette facture
        const { data: existingTransactions } = await supabase
          .from('transactions')
          .select('id')
          .ilike('description', `%${invoice.invoice_number}%`)
          .limit(1);

        if (existingTransactions && existingTransactions.length > 0) {
          toast.warning('يوجد معاملة مسبقة لهذه الفاتورة');
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          
          // Map payment mode to database enum values
          const paymentModeMap: Record<string, 'espece' | 'cheque' | 'virement' | 'traite' | 'carte_bancaire'> = {
            'espèce': 'espece',
            'chèque': 'cheque',
            'virement': 'virement',
            'traite': 'traite',
            'carte_bancaire': 'carte_bancaire'
          };
          
          const devise = (invoice.currency === 'TND' ? 'TND' : invoice.currency === 'EUR' ? 'EUR' : 'USD') as 'TND' | 'EUR' | 'USD';
          
          const transactionData = {
            type: 'entree' as const,
            categorie: 'autre' as const,
            montant: invoice.total_amount,
            devise: devise,
            mode_paiement: paymentModeMap[invoice.payment_mode] || 'espece',
            source_type: invoice.collection_source_type,
            source_id: invoice.collection_source_id,
            description: `Encaissement facture ${invoice.invoice_number} - ${invoice.client_name}`,
            date_transaction: new Date().toISOString().split('T')[0],
            created_by: user?.id
          };

          const { error: transactionError } = await supabase
            .from('transactions')
            .insert([transactionData]);

          if (transactionError) {
            console.error('Error creating transaction:', transactionError);
            toast.error('تم تحديث الفاتورة ولكن حدث خطأ في إنشاء المعاملة');
          } else {
          // Update balance in caisse or compte_bancaire
          try {
            const tableName = invoice.collection_source_type === 'caisse' ? 'caisses' : 'comptes_bancaires';
            
            // Fetch current montants
            const { data: sourceData, error: fetchError } = await supabase
              .from(tableName)
              .select('montants')
              .eq('id', invoice.collection_source_id)
              .single();
            
            if (fetchError) throw fetchError;
            
            // Update the amount for the specific currency
            let montants = sourceData.montants as Array<{currency: string, amount: number}>;
            const currencyIndex = montants.findIndex(m => m.currency === devise);
            
            if (currencyIndex >= 0) {
              montants[currencyIndex].amount += invoice.total_amount;
            } else {
              montants.push({ currency: devise, amount: invoice.total_amount });
            }
            
            // Save updated montants
            const { error: updateError } = await supabase
              .from(tableName)
              .update({ montants })
              .eq('id', invoice.collection_source_id);
            
            if (updateError) throw updateError;
            
            toast.success('تم تحديث حالة الفاتورة وإنشاء المعاملة وتحديث الرصيد بنجاح');
          } catch (balanceError) {
            console.error('Error updating balance:', balanceError);
            toast.warning('تم تحديث الفاتورة والمعاملة ولكن حدث خطأ في تحديث الرصيد');
          }
        }
        }
      } else {
        toast.success('تم تحديث حالة الفاتورة بنجاح');
      }

      fetchInvoices();
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
    }
  };

  const handleDeleteInvoice = async () => {
    if (!isAdmin) {
      toast.error('فقط المسؤولون يمكنهم حذف الفواتير');
      return;
    }

    if (securityCode !== '54372272') {
      toast.error('رمز الأمان غير صحيح');
      return;
    }

    if (!deleteInvoiceId) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', deleteInvoiceId);

      if (error) throw error;

      toast.success('تم حذف الفاتورة بنجاح');
      fetchInvoices();
      setDeleteInvoiceId(null);
      setSecurityCode('');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('حدث خطأ أثناء حذف الفاتورة');
    }
  };

  const handleRepairInvoice = async () => {
    if (!isAdmin) {
      toast.error('فقط المسؤولون يمكنهم إصلاح الفواتير');
      return;
    }

    if (securityCode !== '54372272') {
      toast.error('رمز الأمان غير صحيح');
      return;
    }

    if (!repairInvoiceId || !repairCollectionSourceType || !repairCollectionSourceId || !repairPaymentMode) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    try {
      // Get invoice details
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', repairInvoiceId)
        .single();

      if (fetchError) throw fetchError;

      // Update invoice with collection source info
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          collection_source_type: repairCollectionSourceType,
          collection_source_id: repairCollectionSourceId,
          payment_mode: repairPaymentMode
        })
        .eq('id', repairInvoiceId);

      if (updateError) throw updateError;

      // Create transaction
      const { data: { user } } = await supabase.auth.getUser();
      
      const paymentModeMap: Record<string, 'espece' | 'cheque' | 'virement' | 'traite' | 'carte_bancaire'> = {
        'espèce': 'espece',
        'chèque': 'cheque',
        'virement': 'virement',
        'traite': 'traite',
        'carte_bancaire': 'carte_bancaire'
      };
      
      const devise = (invoice.currency === 'TND' ? 'TND' : invoice.currency === 'EUR' ? 'EUR' : 'USD') as 'TND' | 'EUR' | 'USD';
      
      const transactionData = {
        type: 'entree' as const,
        categorie: 'autre' as const,
        montant: invoice.total_amount,
        devise: devise,
        mode_paiement: paymentModeMap[repairPaymentMode] || 'espece',
        source_type: repairCollectionSourceType,
        source_id: repairCollectionSourceId,
        description: `تحصيل فاتورة ${invoice.invoice_number} - ${invoice.client_name}`,
        date_transaction: invoice.issue_date,
        created_by: user?.id
      };

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([transactionData]);

      if (transactionError) throw transactionError;

      // Update balance
      const tableName = repairCollectionSourceType === 'caisse' ? 'caisses' : 'comptes_bancaires';
      
      const { data: sourceData, error: balanceFetchError } = await supabase
        .from(tableName)
        .select('montants')
        .eq('id', repairCollectionSourceId)
        .single();
      
      if (balanceFetchError) throw balanceFetchError;
      
      let montants = sourceData.montants as Array<{currency: string, amount: number}>;
      const currencyIndex = montants.findIndex(m => m.currency === devise);
      
      if (currencyIndex >= 0) {
        montants[currencyIndex].amount += invoice.total_amount;
      } else {
        montants.push({ currency: devise, amount: invoice.total_amount });
      }
      
      const { error: balanceUpdateError } = await supabase
        .from(tableName)
        .update({ montants })
        .eq('id', repairCollectionSourceId);
      
      if (balanceUpdateError) throw balanceUpdateError;

      toast.success('تم إصلاح الفاتورة وإنشاء المعاملة وتحديث الرصيد بنجاح');
      setRepairDialogOpen(false);
      setRepairInvoiceId(null);
      setRepairCollectionSourceType('');
      setRepairCollectionSourceId('');
      setRepairPaymentMode('');
      setSecurityCode('');
      fetchInvoices();
    } catch (error) {
      console.error('Error repairing invoice:', error);
      toast.error('حدث خطأ أثناء إصلاح الفاتورة');
    }
  };

  const handleStatusChangeConfirm = async () => {
    if (!statusChangeInvoiceId || !statusChangeCollectionSourceType || !statusChangeCollectionSourceId || !statusChangePaymentMode) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    try {
      // Get invoice details
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', statusChangeInvoiceId)
        .single();

      if (fetchError) throw fetchError;

      // Update invoice status and collection info
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          status: 'مدفوعة',
          collection_source_type: statusChangeCollectionSourceType,
          collection_source_id: statusChangeCollectionSourceId,
          payment_mode: statusChangePaymentMode
        })
        .eq('id', statusChangeInvoiceId);

      if (invoiceError) throw invoiceError;

      // Update client's invoice_status if client exists
      if (statusChangeClientId) {
        await supabase
          .from('clients')
          .update({ invoice_status: 'مدفوعة' })
          .eq('id', statusChangeClientId);
      }

      // Create transaction
      const { data: { user } } = await supabase.auth.getUser();
      
      const paymentModeMap: Record<string, 'espece' | 'cheque' | 'virement' | 'traite' | 'carte_bancaire'> = {
        'espèce': 'espece',
        'chèque': 'cheque',
        'virement': 'virement',
        'traite': 'traite',
        'carte_bancaire': 'carte_bancaire'
      };
      
      const devise = (invoice.currency === 'TND' ? 'TND' : invoice.currency === 'EUR' ? 'EUR' : invoice.currency === 'DLY' ? 'DLY' : 'USD') as 'TND' | 'EUR' | 'USD' | 'DLY';
      
      const transactionData = {
        type: 'entree' as const,
        categorie: 'autre' as const,
        montant: invoice.total_amount,
        devise: devise === 'DLY' ? 'TND' : devise, // DLY fallback to TND
        mode_paiement: paymentModeMap[statusChangePaymentMode] || 'espece',
        source_type: statusChangeCollectionSourceType,
        source_id: statusChangeCollectionSourceId,
        description: `Encaissement facture ${invoice.invoice_number} - ${invoice.client_name}`,
        date_transaction: new Date().toISOString().split('T')[0],
        created_by: user?.id
      };

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([transactionData]);

      if (transactionError) {
        console.error('Error creating transaction:', transactionError);
        toast.error('تم تحديث الفاتورة ولكن حدث خطأ في إنشاء المعاملة');
      } else {
        // Update balance in caisse or compte_bancaire
        try {
          const tableName = statusChangeCollectionSourceType === 'caisse' ? 'caisses' : 'comptes_bancaires';
          
          const { data: sourceData, error: balanceFetchError } = await supabase
            .from(tableName)
            .select('montants')
            .eq('id', statusChangeCollectionSourceId)
            .single();
          
          if (balanceFetchError) throw balanceFetchError;
          
          let montants = sourceData.montants as Array<{currency: string, amount: number}>;
          const currencyKey = devise === 'DLY' ? 'TND' : devise;
          const currencyIndex = montants.findIndex(m => m.currency === currencyKey);
          
          if (currencyIndex >= 0) {
            montants[currencyIndex].amount += invoice.total_amount;
          } else {
            montants.push({ currency: currencyKey, amount: invoice.total_amount });
          }
          
          const { error: updateError } = await supabase
            .from(tableName)
            .update({ montants })
            .eq('id', statusChangeCollectionSourceId);
          
          if (updateError) throw updateError;
          
          toast.success('تم تحديث حالة الفاتورة وإنشاء المعاملة وتحديث الرصيد بنجاح');
        } catch (balanceError) {
          console.error('Error updating balance:', balanceError);
          toast.warning('تم تحديث الفاتورة والمعاملة ولكن حدث خطأ في تحديث الرصيد');
        }
      }

      setStatusChangeDialogOpen(false);
      setStatusChangeInvoiceId(null);
      setStatusChangeClientId(null);
      setStatusChangeCollectionSourceType('');
      setStatusChangeCollectionSourceId('');
      setStatusChangePaymentMode('');
      fetchInvoices();
    } catch (error) {
      console.error('Error changing status to paid:', error);
      toast.error('حدث خطأ أثناء تغيير حالة الفاتورة');
    }
  };

  const handleOpenEditDialog = (invoice: Invoice) => {
    setEditInvoiceId(invoice.id);
    setEditInvoiceNumber(invoice.invoice_number);
    setEditClientName(invoice.client_name);
    setEditClientWhatsapp(invoice.client_whatsapp || '');
    setEditClientEmail(invoice.client_email || '');
    setEditClientTaxId(invoice.client_tax_id || '');
    setEditServices(invoice.services);
    setEditCurrency(invoice.currency);
    setEditTvaEnabled(!!invoice.tva_rate);
    setEditTvaRate(invoice.tva_rate || 19);
    setEditDiscountAmount(invoice.discount_amount || 0);
    setEditTimbreFiscalEnabled(!!invoice.timbre_fiscal);
    setEditRetenueSourceEnabled(!!invoice.retenue_source_rate);
    setEditRetenueSourceRate(invoice.retenue_source_rate || 0);
    setEditIssueDate(invoice.issue_date);
    setEditDueDate(invoice.due_date || '');
    setEditNotes(invoice.notes || '');
    setEditStatus(invoice.status);
    setEditDialogOpen(true);
  };

  const handleUpdateInvoice = async () => {
    if (!isAdmin) {
      toast.error('فقط المسؤولون يمكنهم تعديل الفواتير');
      return;
    }

    if (securityCode !== '54372272') {
      toast.error('رمز الأمان غير صحيح');
      return;
    }

    if (!editInvoiceId || !editInvoiceNumber.trim() || !editClientName.trim()) {
      toast.error('يرجى ملء الحقول المطلوبة (رقم الفاتورة واسم العميل)');
      return;
    }

    if (editServices.length === 0) {
      toast.error('يرجى إضافة خدمة واحدة على الأقل');
      return;
    }

    try {
      // Calculate totals with proper HT/TTC handling
      let subtotalHT = 0;
      let tvaAmount = 0;
      
      editServices.forEach(service => {
        const serviceTotal = service.total;
        
        if (service.exemptFromTVA) {
          // No TVA applies - add the total as-is to HT
          subtotalHT += serviceTotal;
        } else if (service.isHT) {
          // Amount is HT, calculate TVA if enabled
          subtotalHT += serviceTotal;
          if (editTvaEnabled) {
            tvaAmount += (serviceTotal * editTvaRate) / 100;
          }
        } else {
          // Amount is TTC, convert to HT and extract TVA
          if (editTvaEnabled && editTvaRate > 0) {
            const htAmount = serviceTotal / (1 + editTvaRate / 100);
            subtotalHT += htAmount;
            tvaAmount += serviceTotal - htAmount;
          } else {
            // If TVA not enabled, treat as HT
            subtotalHT += serviceTotal;
          }
        }
      });

      let total = subtotalHT + tvaAmount;

      total -= editDiscountAmount;

      const timbreFiscal = editTimbreFiscalEnabled && editCurrency === 'TND' ? 1 : 0;
      total += timbreFiscal;

      const retenueSourceAmount = editRetenueSourceEnabled && editCurrency === 'TND' && total > 1000
        ? (total * editRetenueSourceRate) / 100
        : 0;
      total -= retenueSourceAmount;

      total = Math.max(0, total);

      // Update invoice
      const updateData: any = {
        invoice_number: editInvoiceNumber,
        client_name: editClientName,
        client_whatsapp: editClientWhatsapp || null,
        client_email: editClientEmail || null,
        client_tax_id: editClientTaxId || null,
        services: editServices as any,
        subtotal: subtotalHT,
        currency: editCurrency,
        tva_rate: editTvaEnabled ? editTvaRate : null,
        tva_amount: editTvaEnabled ? tvaAmount : null,
        discount_amount: editDiscountAmount,
        timbre_fiscal: timbreFiscal,
        retenue_source_rate: editRetenueSourceEnabled && editCurrency === 'TND' && total > 1000 ? editRetenueSourceRate : null,
        retenue_source_amount: retenueSourceAmount,
        total_amount: total,
        status: editStatus,
        issue_date: editIssueDate,
        due_date: editDueDate || null,
        notes: editNotes || null
      };

      // Si le statut devient "مسودة", nettoyer les informations de collection
      if (editStatus === 'مسودة') {
        updateData.collection_source_type = null;
        updateData.collection_source_id = null;
        updateData.payment_mode = null;
      }

      const { error: updateError } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', editInvoiceId);

      if (updateError) throw updateError;

      toast.success('تم تحديث الفاتورة بنجاح');
      setEditDialogOpen(false);
      setEditInvoiceId(null);
      setSecurityCode('');
      fetchInvoices();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('حدث خطأ أثناء تحديث الفاتورة');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setCreatedInvoice(null);
    setInvoiceNumber('');
    setIsManualEntry(false);
    setSelectedClientId('');
    setManualClientName('');
    setManualClientWhatsapp('');
    setManualClientEmail('');
    setManualClientTaxId('');
    setInvoiceLanguage("FR");
    setServices([]);
    setCurrency('TND');
    setTvaEnabled(false);
    setTvaRate(19);
    setDiscountAmount(0);
    setTimbreFiscalEnabled(false);
    setRetenueSourceEnabled(false);
    setRetenueSourceRate(0);
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setNotes('');
    setCollectionSourceType('');
    setCollectionSourceId('');
    setPaymentMode('');
    // Reset flight info
    setHasFlightInfo(false);
    setFlightDepartureCity('');
    setFlightArrivalCity('');
    setFlightDepartureDate('');
    setFlightReturnDate('');
    setFlightTravelerName('');
    // Reset hotel info
    setHasHotelInfo(false);
    setHotelName('');
    setHotelCity('');
    setHotelCheckinDate('');
    setHotelCheckoutDate('');
    setHotelGuestName('');
    setHotelRoomType('');
    // Generate new invoice number for next use
    generateDefaultInvoiceNumber();
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || !statusFilter || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = invoices.filter(inv => inv.status === 'مدفوعة').reduce((sum, inv) => sum + inv.total_amount, 0);
  const pendingAmount = invoices.filter(inv => inv.status === 'مرسلة').reduce((sum, inv) => sum + inv.total_amount, 0);
  const overdueAmount = invoices.filter(inv => inv.status === 'متأخرة').reduce((sum, inv) => sum + inv.total_amount, 0);

  const totals = calculateTotals();

  return (
    <div className="p-6 space-y-6 font-arabic" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة الفواتير</h1>
          <p className="text-muted-foreground">إدارة وتتبع الفواتير والمدفوعات</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/manager/invoices-history')} className="space-x-2 space-x-reverse">
            <History className="h-4 w-4" />
            <span>السجل</span>
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/manager/invoices-archive'} className="space-x-2 space-x-reverse">
            <FileText className="h-4 w-4" />
            <span>أرشيف الفواتير</span>
          </Button>
          <Button onClick={() => setShowForm(true)} className="space-x-2 space-x-reverse">
            <Plus className="h-4 w-4" />
            <span>فاتورة جديدة</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold">{totalRevenue.toLocaleString()} د.ت</p>
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
                <p className="text-sm font-medium text-muted-foreground">في الانتظار</p>
                <p className="text-2xl font-bold">{pendingAmount.toLocaleString()} د.ت</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-red-100 rounded-lg">
                <Calendar className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">متأخرة</p>
                <p className="text-2xl font-bold">{overdueAmount.toLocaleString()} د.ت</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="p-3 bg-gray-100 rounded-lg">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الفواتير</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Form */}
      {showForm && (
        <Card className="card-professional">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {createdInvoice ? 'تفاصيل الفاتورة' : 'إنشاء فاتورة جديدة'}
              </h2>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {!createdInvoice ? (
              <div className="space-y-6">
                {/* Invoice Number */}
                <div className="space-y-2">
                  <Label>رقم الفاتورة</Label>
                  <Input
                    placeholder="رقم الفاتورة (يتم إنشاؤه تلقائياً)"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="font-semibold"
                  />
                  <p className="text-xs text-muted-foreground">
                    يمكنك تعديل رقم الفاتورة يدوياً إذا لزم الأمر
                  </p>
                </div>

                {/* Client Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>معلومات العميل *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsManualEntry(!isManualEntry);
                        if (!isManualEntry) {
                          setSelectedClientId('');
                        } else {
                          setManualClientName('');
                          setManualClientWhatsapp('');
                          setManualClientEmail('');
                          setManualClientTaxId('');
                        }
                      }}
                    >
                      {isManualEntry ? 'اختيار من القائمة' : 'إدخال يدوي'}
                    </Button>
                  </div>

                  {!isManualEntry ? (
                    <div className="space-y-2">
                      <Input
                        placeholder="ابحث عن عميل..."
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                        className="mb-2"
                      />
                      <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر العميل من القائمة" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients
                            .filter(client => 
                              client.full_name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                              client.whatsapp_number?.includes(clientSearchTerm)
                            )
                            .map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.full_name}
                                {client.whatsapp_number && ` - ${client.whatsapp_number}`}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <div className="space-y-2">
                        <Label>اسم العميل *</Label>
                        <Input
                          placeholder="أدخل اسم العميل"
                          value={manualClientName}
                          onChange={(e) => setManualClientName(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>رقم الواتساب</Label>
                          <Input
                            placeholder="+216 XX XXX XXX"
                            value={manualClientWhatsapp}
                            onChange={(e) => setManualClientWhatsapp(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>البريد الإلكتروني</Label>
                          <Input
                            type="email"
                            placeholder="exemple@email.com"
                            value={manualClientEmail}
                            onChange={(e) => setManualClientEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>المعرف الضريبي</Label>
                        <Input
                          placeholder="أدخل المعرف الضريبي"
                          value={manualClientTaxId}
                          onChange={(e) => setManualClientTaxId(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>تاريخ الإصدار *</Label>
                    <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ الاستحقاق</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>

                {/* Invoice Language */}
                <div className="space-y-2">
                  <Label>نموذج الفاتورة / Modèle de Facture</Label>
                  <Select value={invoiceLanguage} onValueChange={(value: "FR" | "AR") => setInvoiceLanguage(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FR">Facture Française 🇫🇷</SelectItem>
                      <SelectItem value="AR">فاتورة عربية 🇹🇳</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Services */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>الخدمات *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addService}>
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة خدمة
                    </Button>
                  </div>
                  
                  {services.map((service, index) => (
                    <div key={service.id} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          <Label className="text-xs">الوصف</Label>
                          <Input
                            placeholder="وصف الخدمة"
                            value={service.description}
                            onChange={(e) => updateService(service.id, 'description', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">الكمية</Label>
                          <Input
                            type="number"
                            min="1"
                            value={service.quantity}
                            onChange={(e) => updateService(service.id, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">السعر الوحدوي</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.001"
                            value={service.unitPrice}
                            onChange={(e) => updateService(service.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">المجموع</Label>
                          <Input
                            type="number"
                            value={service.total.toFixed(3)}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeService(service.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* TVA Options */}
                      <div className="flex items-center gap-6 pr-2">
                        {/* TVA Exemption Checkbox */}
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <input
                            type="checkbox"
                            id={`exempt-${service.id}`}
                            checked={service.exemptFromTVA || false}
                            onChange={(e) => updateService(service.id, 'exemptFromTVA', e.target.checked)}
                            className="rounded w-4 h-4 cursor-pointer"
                          />
                          <Label htmlFor={`exempt-${service.id}`} className="cursor-pointer text-sm font-medium">
                            ☑ Non soumis à TVA (غير خاضع للضريبة)
                          </Label>
                        </div>
                        
                        {/* HT (Hors Taxe) Checkbox */}
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <input
                            type="checkbox"
                            id={`ht-${service.id}`}
                            checked={service.isHT || false}
                            onChange={(e) => updateService(service.id, 'isHT', e.target.checked)}
                            className="rounded w-4 h-4 cursor-pointer"
                          />
                          <Label htmlFor={`ht-${service.id}`} className="cursor-pointer text-sm font-medium">
                            ☑ Montant HT (المبلغ قبل الضريبة)
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Currency */}
                <div className="space-y-2">
                  <Label>العملة *</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TND">دينار تونسي (TND)</SelectItem>
                      <SelectItem value="EUR">يورو (EUR)</SelectItem>
                      <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                      <SelectItem value="DLY">دينار ليبي (DLY)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Financial Options */}
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold">خيارات مالية</h3>
                  
                  {/* TVA */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <input
                        type="checkbox"
                        checked={tvaEnabled}
                        onChange={(e) => setTvaEnabled(e.target.checked)}
                        className="rounded"
                      />
                      <Label>الضريبة على القيمة المضافة (TVA)</Label>
                    </div>
                    {tvaEnabled && (
                      <div className="flex items-center space-x-1">
                        <Input
                          type="number"
                          value={tvaRate}
                          onChange={(e) => setTvaRate(parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span>%</span>
                      </div>
                    )}
                  </div>

                  {/* Discount */}
                  <div className="flex items-center justify-between">
                    <Label>التخفيض (بالمبلغ)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="w-32"
                    />
                  </div>

                  {/* Timbre Fiscal */}
                  {currency === 'TND' && (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <input
                        type="checkbox"
                        checked={timbreFiscalEnabled}
                        onChange={(e) => setTimbreFiscalEnabled(e.target.checked)}
                        className="rounded"
                      />
                      <Label>معلوم الطابع الجبائي (1 دت)</Label>
                    </div>
                  )}

                  {/* Retenue à la source */}
                  {currency === 'TND' && totals.total > 1000 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <input
                          type="checkbox"
                          checked={retenueSourceEnabled}
                          onChange={(e) => setRetenueSourceEnabled(e.target.checked)}
                          className="rounded"
                        />
                        <Label>الاقتطاع من المورد (للفواتير أكثر من 1000 دت)</Label>
                      </div>
                      {retenueSourceEnabled && (
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={retenueSourceRate}
                          onChange={(e) => setRetenueSourceRate(parseFloat(e.target.value) || 0)}
                          placeholder="النسبة ٪"
                          className="w-32"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Totals Summary */}
                <div className="space-y-2 p-4 bg-primary/5 rounded-lg">
                  <div className="flex justify-between">
                    <span>المجموع الجزئي:</span>
                    <span className="font-bold">{totals.subtotal.toFixed(3)} {currency}</span>
                  </div>
                  {tvaEnabled && (
                    <div className="flex justify-between">
                      <span>الضريبة ({tvaRate}%):</span>
                      <span className="font-bold">+{totals.tvaAmount.toFixed(3)} {currency}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span>التخفيض:</span>
                      <span className="font-bold text-green-600">-{discountAmount.toFixed(3)} {currency}</span>
                    </div>
                  )}
                  {totals.timbreFiscal > 0 && (
                    <div className="flex justify-between">
                      <span>معلوم الطابع الجبائي:</span>
                      <span className="font-bold">+{totals.timbreFiscal.toFixed(3)} TND</span>
                    </div>
                  )}
                  {totals.retenueSourceAmount > 0 && (
                    <div className="flex justify-between">
                      <span>الاقتطاع من المورد ({retenueSourceRate}%):</span>
                      <span className="font-bold text-red-600">-{totals.retenueSourceAmount.toFixed(3)} {currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg pt-2 border-t">
                    <span className="font-bold">المجموع الإجمالي:</span>
                    <span className="font-bold text-primary">{totals.total.toFixed(3)} {currency}</span>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>ملاحظات</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أضف ملاحظات إضافية..."
                    rows={3}
                  />
                </div>

                {/* Informations de vol (optionnel) */}
                <div className="space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      id="hasFlightInfo"
                      checked={hasFlightInfo}
                      onChange={(e) => setHasFlightInfo(e.target.checked)}
                      className="rounded w-5 h-5 cursor-pointer"
                    />
                    <Label htmlFor="hasFlightInfo" className="cursor-pointer text-base font-semibold flex items-center gap-2">
                      <span>✈️</span>
                      <span>هذه الفاتورة تخص تذكرة طيران</span>
                    </Label>
                  </div>
                  
                  {hasFlightInfo && (
                    <>
                      <p className="text-sm text-muted-foreground">معلومات الرحلة الجوية</p>
                      <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>مدينة المغادرة</Label>
                      <Input
                        placeholder="مثال: تونس"
                        value={flightDepartureCity}
                        onChange={(e) => setFlightDepartureCity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>مدينة الوصول</Label>
                      <Input
                        placeholder="مثال: قوانغتشو"
                        value={flightArrivalCity}
                        onChange={(e) => setFlightArrivalCity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ المغادرة</Label>
                      <Input
                        type="date"
                        value={flightDepartureDate}
                        onChange={(e) => setFlightDepartureDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ العودة</Label>
                      <Input
                        type="date"
                        value={flightReturnDate}
                        onChange={(e) => setFlightReturnDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>اسم المسافر</Label>
                    <Input
                      placeholder="أدخل اسم المسافر"
                      value={flightTravelerName}
                      onChange={(e) => setFlightTravelerName(e.target.value)}
                    />
                  </div>
                    </>
                  )}
                </div>

                {/* Informations d'hébergement (optionnel) */}
                <div className="space-y-4 p-4 bg-amber-50/50 rounded-lg border border-amber-200">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      id="hasHotelInfo"
                      checked={hasHotelInfo}
                      onChange={(e) => setHasHotelInfo(e.target.checked)}
                      className="rounded w-5 h-5 cursor-pointer"
                    />
                    <Label htmlFor="hasHotelInfo" className="cursor-pointer text-base font-semibold flex items-center gap-2">
                      <span>🏨</span>
                      <span>هذه الفاتورة تخص إقامة فندقية</span>
                    </Label>
                  </div>
                  
                  {hasHotelInfo && (
                    <>
                      <p className="text-sm text-muted-foreground">معلومات الإقامة</p>
                      <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>اسم الفندق</Label>
                      <Input
                        placeholder="مثال: فندق الحبيب"
                        value={hotelName}
                        onChange={(e) => setHotelName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>المدينة</Label>
                      <Input
                        placeholder="مثال: تونس"
                        value={hotelCity}
                        onChange={(e) => setHotelCity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ الدخول</Label>
                      <Input
                        type="date"
                        value={hotelCheckinDate}
                        onChange={(e) => setHotelCheckinDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ الخروج</Label>
                      <Input
                        type="date"
                        value={hotelCheckoutDate}
                        onChange={(e) => setHotelCheckoutDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>اسم النزيل</Label>
                    <Input
                      placeholder="مثال: سفيان سعد الله"
                      value={hotelGuestName}
                      onChange={(e) => setHotelGuestName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>نوع الغرفة</Label>
                    <Input
                      placeholder="مثال: غرفة مزدوجة"
                      value={hotelRoomType}
                      onChange={(e) => setHotelRoomType(e.target.value)}
                    />
                  </div>
                    </>
                  )}
                </div>

                {/* Payment Collection Details */}
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold">معلومات الدفع والتحصيل</h3>
                  
                  {/* Payment Mode */}
                  <div className="space-y-2">
                    <Label>طريقة الدفع</Label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر طريقة الدفع..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="espèce">نقدي</SelectItem>
                        <SelectItem value="chèque">شيك</SelectItem>
                        <SelectItem value="virement">تحويل بنكي</SelectItem>
                        <SelectItem value="traite">كمبيالة</SelectItem>
                        <SelectItem value="carte_bancaire">بطاقة بنكية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Collection Source Type */}
                  <div className="space-y-2">
                    <Label>مكان التحصيل</Label>
                    <Select value={collectionSourceType} onValueChange={(value: 'caisse' | 'compte_bancaire' | '') => setCollectionSourceType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر مكان التحصيل..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="caisse">صندوق</SelectItem>
                        <SelectItem value="compte_bancaire">حساب بنكي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Collection Source */}
                  {collectionSourceType === 'caisse' && (
                    <div className="space-y-2">
                      <Label>الصندوق</Label>
                      <Select value={collectionSourceId} onValueChange={setCollectionSourceId}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الصندوق..." />
                        </SelectTrigger>
                        <SelectContent>
                          {caisses.map((caisse) => (
                            <SelectItem key={caisse.id} value={caisse.id}>
                              {caisse.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {collectionSourceType === 'compte_bancaire' && (
                    <div className="space-y-2">
                      <Label>الحساب البنكي</Label>
                      <Select value={collectionSourceId} onValueChange={setCollectionSourceId}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحساب البنكي..." />
                        </SelectTrigger>
                        <SelectContent>
                          {comptesBancaires.map((compte) => (
                            <SelectItem key={compte.id} value={compte.id}>
                              {compte.nom_banque}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Create Button */}
                <Button
                  onClick={handleCreateInvoice}
                  disabled={isCreating}
                  className="w-full"
                  size="lg"
                >
                  {isCreating ? 'جاري الإنشاء...' : 'إنشاء الفاتورة'}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Invoice Created - Show Action Buttons */}
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <FileText className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">تم إنشاء الفاتورة بنجاح!</h3>
                  <p className="text-muted-foreground mb-4">رقم الفاتورة: {createdInvoice.invoice_number}</p>
                  <p className="text-2xl font-bold text-primary">
                    {createdInvoice.total_amount.toFixed(3)} {createdInvoice.currency}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={handleSaveInvoice} size="lg" variant="default">
                    <FileText className="h-5 w-5 ml-2" />
                    حفظ في قاعدة البيانات
                  </Button>
                  <Button onClick={handleDownloadPDF} size="lg" variant="outline">
                    <Download className="h-5 w-5 ml-2" />
                    تنزيل PDF
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="card-professional">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="البحث في الفواتير..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="فلترة بالحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="مسودة">مسودة</SelectItem>
                  <SelectItem value="مرسلة">مرسلة</SelectItem>
                  <SelectItem value="مدفوعة">مدفوعة</SelectItem>
                  <SelectItem value="متأخرة">متأخرة</SelectItem>
                  <SelectItem value="ملغية">ملغية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <div className="grid gap-6">
        {filteredInvoices.length === 0 ? (
          <Card className="card-professional">
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد فواتير</p>
            </CardContent>
          </Card>
        ) : (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="card-professional hover-scale">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div className="flex items-start space-x-4 space-x-reverse">
                    <div className="p-2 sm:p-3 bg-primary/10 rounded-lg shrink-0">
                      <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base sm:text-lg truncate">{invoice.client_name}</h3>
                      <p className="text-sm text-muted-foreground truncate">فاتورة رقم: {invoice.invoice_number}</p>
                      <p className="text-xl sm:text-2xl font-bold text-primary mt-1">
                        {invoice.total_amount.toFixed(3)} {invoice.currency}
                      </p>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 self-end sm:self-auto">
                    {isAdmin ? (
                      <Select 
                        value={invoice.status} 
                        onValueChange={(value) => handleStatusChange(invoice.id, value, invoice.client_id)}
                      >
                        <SelectTrigger className="w-28 sm:w-32 h-8 bg-background text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="مسودة">مسودة</SelectItem>
                          <SelectItem value="مرسلة">مرسلة</SelectItem>
                          <SelectItem value="مدفوعة">مدفوعة</SelectItem>
                          <SelectItem value="متأخرة">متأخرة</SelectItem>
                          <SelectItem value="ملغية">ملغية</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={`${statusColors[invoice.status as keyof typeof statusColors]} text-white`}>
                        {invoice.status}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-sm">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">تاريخ الإصدار</p>
                    <p className="text-sm">{invoice.issue_date}</p>
                  </div>
                  {invoice.due_date && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">تاريخ الاستحقاق</p>
                      <p className="text-sm">{invoice.due_date}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">عدد الخدمات</p>
                    <p className="text-sm">{invoice.services.length} خدمة</p>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleGeneratePDFFromList(invoice, "FR")}
                    title="تحميل PDF بالفرنسية"
                    className="text-xs sm:text-sm"
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                    <span className="hidden sm:inline">PDF </span>FR
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleGeneratePDFFromList(invoice, "AR")}
                    title="تحميل PDF بالعربية"
                    className="text-xs sm:text-sm"
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                    <span className="hidden sm:inline">PDF </span>AR
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSendWhatsApp(invoice)}
                    title="إرسال عبر واتساب"
                    className="text-xs sm:text-sm"
                  >
                    <Send className="h-3 w-3 sm:h-4 sm:w-4 sm:ml-1" />
                    <span className="hidden sm:inline">واتساب</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSendEmail(invoice)}
                    title="إرسال بالبريد الإلكتروني"
                    className="text-xs sm:text-sm"
                  >
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 sm:ml-1" />
                    <span className="hidden sm:inline">إيميل</span>
                  </Button>
                  {isAdmin && invoice.status === 'مدفوعة' && (
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {
                        setRepairInvoiceId(invoice.id);
                        setRepairCollectionSourceType(invoice.collection_source_type as any || '');
                        setRepairCollectionSourceId(invoice.collection_source_id || '');
                        setRepairPaymentMode(invoice.payment_mode || '');
                        setRepairDialogOpen(true);
                      }}
                      title="تعديل معلومات الدفع والتحصيل"
                      className="bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm"
                    >
                      تصليح
                    </Button>
                  )}
                  {isAdmin && (
                    <>
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handleOpenEditDialog(invoice)}
                        title="تعديل الفاتورة"
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm"
                      >
                        <span className="mr-1">✏️</span>
                        <span className="hidden sm:inline">تعديل</span>
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => setDeleteInvoiceId(invoice.id)}
                        title="حذف الفاتورة"
                        className="text-xs sm:text-sm"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteInvoiceId} onOpenChange={(open) => !open && setDeleteInvoiceId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. يرجى إدخال رمز الأمان للتأكيد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>رمز الأمان</Label>
            <Input
              type="password"
              placeholder="أدخل رمز الأمان"
              value={securityCode}
              onChange={(e) => setSecurityCode(e.target.value)}
            />
          </div>
          <AlertDialogFooter className="flex-row-reverse">
            <AlertDialogAction onClick={handleDeleteInvoice}>
              تأكيد الحذف
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => {
              setDeleteInvoiceId(null);
              setSecurityCode('');
            }}>
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Repair Invoice Dialog */}
      <AlertDialog open={repairDialogOpen} onOpenChange={setRepairDialogOpen}>
        <AlertDialogContent dir="rtl" className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>إصلاح الفاتورة وإنشاء المعاملة</AlertDialogTitle>
            <AlertDialogDescription>
              هذه الفاتورة مدفوعة ولكن لم يتم تسجيل معلومات التحصيل. يرجى تحديد مكان التحصيل وطريقة الدفع لإنشاء المعاملة المالية وتحديث الرصيد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 mb-4">
            <Label className="text-red-500">رمز الأمان مطلوب</Label>
            <Input
              type="password"
              placeholder="أدخل رمز الأمان..."
              value={securityCode}
              onChange={(e) => setSecurityCode(e.target.value)}
              className="text-right"
            />
          </div>
          <div className="space-y-4">
            {/* Collection Source Type */}
            <div className="space-y-2">
              <Label>مكان التحصيل</Label>
              <Select value={repairCollectionSourceType} onValueChange={(value: 'caisse' | 'compte_bancaire') => {
                setRepairCollectionSourceType(value);
                setRepairCollectionSourceId('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر مكان التحصيل..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caisse">صندوق</SelectItem>
                  <SelectItem value="compte_bancaire">حساب بنكي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Collection Source */}
            {repairCollectionSourceType && (
              <div className="space-y-2">
                <Label>{repairCollectionSourceType === 'caisse' ? 'الصندوق' : 'الحساب البنكي'}</Label>
                <Select value={repairCollectionSourceId} onValueChange={setRepairCollectionSourceId}>
                  <SelectTrigger>
                    <SelectValue placeholder={repairCollectionSourceType === 'caisse' ? 'اختر الصندوق...' : 'اختر الحساب البنكي...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {repairCollectionSourceType === 'caisse' ? (
                      caisses.map((caisse) => (
                        <SelectItem key={caisse.id} value={caisse.id}>
                          {caisse.nom}
                        </SelectItem>
                      ))
                    ) : (
                      comptesBancaires.map((compte) => (
                        <SelectItem key={compte.id} value={compte.id}>
                          {compte.nom_banque}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Payment Mode */}
            <div className="space-y-2">
              <Label>طريقة الدفع</Label>
              <Select value={repairPaymentMode} onValueChange={setRepairPaymentMode}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر طريقة الدفع..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="espèce">نقدي</SelectItem>
                  <SelectItem value="chèque">شيك</SelectItem>
                  <SelectItem value="virement">تحويل بنكي</SelectItem>
                  <SelectItem value="traite">كمبيالة</SelectItem>
                  <SelectItem value="carte_bancaire">بطاقة بنكية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter className="flex-row-reverse">
            <AlertDialogAction onClick={handleRepairInvoice}>
              إصلاح وتحديث
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => {
              setRepairDialogOpen(false);
              setRepairInvoiceId(null);
              setRepairCollectionSourceType('');
              setRepairCollectionSourceId('');
              setRepairPaymentMode('');
            }}>
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change to Paid Dialog */}
      <AlertDialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <AlertDialogContent dir="rtl" className="max-w-xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>تحويل الفاتورة إلى مدفوعة</AlertDialogTitle>
            <AlertDialogDescription>
              يرجى تحديد معلومات الدفع والتحصيل لإتمام عملية الدفع وإنشاء المعاملة المالية.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            {/* Payment Mode */}
            <div className="space-y-2">
              <Label>طريقة الدفع *</Label>
              <Select value={statusChangePaymentMode} onValueChange={setStatusChangePaymentMode}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر طريقة الدفع..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="espèce">نقدي</SelectItem>
                  <SelectItem value="chèque">شيك</SelectItem>
                  <SelectItem value="virement">تحويل بنكي</SelectItem>
                  <SelectItem value="traite">كمبيالة</SelectItem>
                  <SelectItem value="carte_bancaire">بطاقة بنكية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Collection Source Type */}
            <div className="space-y-2">
              <Label>مكان التحصيل *</Label>
              <Select value={statusChangeCollectionSourceType} onValueChange={(value: 'caisse' | 'compte_bancaire') => {
                setStatusChangeCollectionSourceType(value);
                setStatusChangeCollectionSourceId('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر مكان التحصيل..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caisse">صندوق</SelectItem>
                  <SelectItem value="compte_bancaire">حساب بنكي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Collection Source */}
            {statusChangeCollectionSourceType && (
              <div className="space-y-2">
                <Label>{statusChangeCollectionSourceType === 'caisse' ? 'الصندوق' : 'الحساب البنكي'} *</Label>
                <Select value={statusChangeCollectionSourceId} onValueChange={setStatusChangeCollectionSourceId}>
                  <SelectTrigger>
                    <SelectValue placeholder={statusChangeCollectionSourceType === 'caisse' ? 'اختر الصندوق...' : 'اختر الحساب البنكي...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {statusChangeCollectionSourceType === 'caisse' ? (
                      caisses.map((caisse) => (
                        <SelectItem key={caisse.id} value={caisse.id}>
                          {caisse.nom}
                        </SelectItem>
                      ))
                    ) : (
                      comptesBancaires.map((compte) => (
                        <SelectItem key={compte.id} value={compte.id}>
                          {compte.nom_banque}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={handleStatusChangeConfirm}>
              تأكيد الدفع
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => {
              setStatusChangeDialogOpen(false);
              setStatusChangeInvoiceId(null);
              setStatusChangeClientId(null);
              setStatusChangeCollectionSourceType('');
              setStatusChangeCollectionSourceId('');
              setStatusChangePaymentMode('');
            }}>
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Invoice Dialog */}
      <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <AlertDialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>تعديل الفاتورة</AlertDialogTitle>
            <AlertDialogDescription>
              يمكنك تعديل جميع معلومات الفاتورة بما في ذلك رقم الفاتورة
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            {/* Security Code */}
            <div className="space-y-2">
              <Label className="text-red-500">رمز الأمان مطلوب *</Label>
              <Input
                type="password"
                placeholder="أدخل رمز الأمان..."
                value={securityCode}
                onChange={(e) => setSecurityCode(e.target.value)}
                className="text-right"
              />
            </div>

            {/* Invoice Number */}
            <div className="space-y-2">
              <Label>رقم الفاتورة *</Label>
              <Input
                placeholder="مثال: FAC0001/2025"
                value={editInvoiceNumber}
                onChange={(e) => setEditInvoiceNumber(e.target.value)}
                className="text-right"
              />
            </div>

            {/* Client Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم العميل *</Label>
                <Input
                  placeholder="اسم العميل"
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label>رقم واتساب</Label>
                <Input
                  placeholder="رقم واتساب"
                  value={editClientWhatsapp}
                  onChange={(e) => setEditClientWhatsapp(e.target.value)}
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  placeholder="البريد الإلكتروني"
                  value={editClientEmail}
                  onChange={(e) => setEditClientEmail(e.target.value)}
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label>الرقم الضريبي</Label>
                <Input
                  placeholder="الرقم الضريبي"
                  value={editClientTaxId}
                  onChange={(e) => setEditClientTaxId(e.target.value)}
                  className="text-right"
                />
              </div>
            </div>

            {/* Services */}
            <div className="space-y-2">
              <Label>الخدمات *</Label>
              <div className="space-y-2">
                {editServices.map((service, index) => (
                  <div key={service.id} className="space-y-2 p-3 bg-muted/50 rounded">
                    <div className="grid grid-cols-4 gap-2">
                      <Input
                        placeholder="الوصف"
                        value={service.description}
                        onChange={(e) => {
                          const newServices = [...editServices];
                          newServices[index].description = e.target.value;
                          setEditServices(newServices);
                        }}
                        className="text-right"
                      />
                      <Input
                        type="number"
                        placeholder="الكمية"
                        value={service.quantity}
                        onChange={(e) => {
                          const newServices = [...editServices];
                          newServices[index].quantity = parseFloat(e.target.value) || 0;
                          newServices[index].total = newServices[index].quantity * newServices[index].unitPrice;
                          setEditServices(newServices);
                        }}
                      />
                      <Input
                        type="number"
                        placeholder="السعر"
                        value={service.unitPrice}
                        onChange={(e) => {
                          const newServices = [...editServices];
                          newServices[index].unitPrice = parseFloat(e.target.value) || 0;
                          newServices[index].total = newServices[index].quantity * newServices[index].unitPrice;
                          setEditServices(newServices);
                        }}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setEditServices(editServices.filter((_, i) => i !== index));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* TVA Options */}
                    <div className="flex items-center gap-6 pr-2">
                      {/* TVA Exemption Checkbox */}
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <input
                          type="checkbox"
                          id={`edit-exempt-${service.id}`}
                          checked={service.exemptFromTVA || false}
                          onChange={(e) => {
                            const newServices = [...editServices];
                            newServices[index].exemptFromTVA = e.target.checked;
                            setEditServices(newServices);
                          }}
                          className="rounded w-4 h-4 cursor-pointer"
                        />
                        <Label htmlFor={`edit-exempt-${service.id}`} className="cursor-pointer text-sm font-medium">
                          ☑ Non soumis à TVA (غير خاضع للضريبة)
                        </Label>
                      </div>
                      
                      {/* HT (Hors Taxe) Checkbox */}
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <input
                          type="checkbox"
                          id={`edit-ht-${service.id}`}
                          checked={service.isHT || false}
                          onChange={(e) => {
                            const newServices = [...editServices];
                            newServices[index].isHT = e.target.checked;
                            setEditServices(newServices);
                          }}
                          className="rounded w-4 h-4 cursor-pointer"
                        />
                        <Label htmlFor={`edit-ht-${service.id}`} className="cursor-pointer text-sm font-medium">
                          ☑ Montant HT (المبلغ قبل الضريبة)
                        </Label>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditServices([
                      ...editServices,
                      {
                        id: Date.now().toString(),
                        description: '',
                        quantity: 1,
                        unitPrice: 0,
                        total: 0,
                        exemptFromTVA: false,
                        isHT: false
                      }
                    ]);
                  }}
                >
                  <Plus className="h-4 w-4 ml-1" />
                  إضافة خدمة
                </Button>
              </div>
            </div>

            {/* Currency and Financial Options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>العملة</Label>
                <Select value={editCurrency} onValueChange={setEditCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TND">دينار تونسي (TND)</SelectItem>
                    <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                    <SelectItem value="EUR">يورو (EUR)</SelectItem>
                    <SelectItem value="DLY">دينار ليبي (DLY)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="مسودة">مسودة</SelectItem>
                    <SelectItem value="مرسلة">مرسلة</SelectItem>
                    <SelectItem value="مدفوعة">مدفوعة</SelectItem>
                    <SelectItem value="متأخرة">متأخرة</SelectItem>
                    <SelectItem value="ملغية">ملغية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ الإصدار</Label>
                <Input
                  type="date"
                  value={editIssueDate}
                  onChange={(e) => setEditIssueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>تاريخ الاستحقاق</Label>
                <Input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* TVA Options */}
            <div className="flex items-center space-x-2 space-x-reverse">
              <input
                type="checkbox"
                id="editTvaEnabled"
                checked={editTvaEnabled}
                onChange={(e) => setEditTvaEnabled(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="editTvaEnabled" className="cursor-pointer">تفعيل ضريبة القيمة المضافة (TVA)</Label>
            </div>
            {editTvaEnabled && (
              <div className="space-y-2">
                <Label>نسبة الضريبة (%)</Label>
                <Input
                  type="number"
                  value={editTvaRate}
                  onChange={(e) => setEditTvaRate(parseFloat(e.target.value) || 0)}
                />
              </div>
            )}

            {/* Discount */}
            <div className="space-y-2">
              <Label>الخصم</Label>
              <Input
                type="number"
                value={editDiscountAmount}
                onChange={(e) => setEditDiscountAmount(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Timbre Fiscal */}
            <div className="flex items-center space-x-2 space-x-reverse">
              <input
                type="checkbox"
                id="editTimbreFiscal"
                checked={editTimbreFiscalEnabled}
                onChange={(e) => setEditTimbreFiscalEnabled(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="editTimbreFiscal" className="cursor-pointer">طابع جبائي (1 دينار)</Label>
            </div>

            {/* Retenue à la Source */}
            <div className="flex items-center space-x-2 space-x-reverse">
              <input
                type="checkbox"
                id="editRetenueSource"
                checked={editRetenueSourceEnabled}
                onChange={(e) => setEditRetenueSourceEnabled(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="editRetenueSource" className="cursor-pointer">الاقتطاع من المصدر</Label>
            </div>
            {editRetenueSourceEnabled && (
              <div className="space-y-2">
                <Label>نسبة الاقتطاع (%)</Label>
                <Input
                  type="number"
                  value={editRetenueSourceRate}
                  onChange={(e) => setEditRetenueSourceRate(parseFloat(e.target.value) || 0)}
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                placeholder="أدخل ملاحظات إضافية..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="text-right"
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter className="flex-row-reverse">
            <AlertDialogAction onClick={handleUpdateInvoice}>
              حفظ التعديلات
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => {
              setEditDialogOpen(false);
              setEditInvoiceId(null);
              setSecurityCode('');
            }}>
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
