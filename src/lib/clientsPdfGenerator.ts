import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AMIRI_FONT_BASE64 } from './amiriFontBase64';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

interface Client {
  id: string;
  full_name: string;
  client_id_number?: string;
  whatsapp_number?: string;
  passport_number?: string;
  email?: string;
  nationality?: string;
  passport_status?: string;
  visa_tracking_status?: string;
  assigned_employee?: string;
  service_type?: string;
  destination_country?: string;
  status: string;
  created_at: string;
  invoice_status?: string;
}

export const generateClientListPDF = async (clients: Client[], title: string = 'قائمة العملاء') => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Add Arabic font
  try {
    doc.addFileToVFS('Amiri-Regular.ttf', AMIRI_FONT_BASE64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    doc.setFont('Amiri');
  } catch (error) {
    console.error('Error setting up Arabic font:', error);
  }

  // Header
  doc.setFontSize(20);
  doc.setTextColor(33, 37, 41);
  doc.text(title, doc.internal.pageSize.width / 2, 20, { align: 'center' });

  // Date
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  const currentDate = new Date().toLocaleDateString('ar-TN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`التاريخ: ${currentDate}`, doc.internal.pageSize.width - 15, 15, { align: 'right' });

  // Stats
  doc.setFontSize(11);
  doc.text(`عدد العملاء: ${clients.length}`, doc.internal.pageSize.width - 15, 25, { align: 'right' });

  // Table data
  const tableData = clients.map((client, index) => [
    index + 1,
    client.full_name || '-',
    client.client_id_number || '-',
    client.whatsapp_number || '-',
    client.passport_number || '-',
    client.nationality || '-',
    client.destination_country || '-',
    client.service_type || '-',
    client.visa_tracking_status || '-',
    client.assigned_employee || '-',
    client.invoice_status || '-',
    new Date(client.created_at).toLocaleDateString('ar-TN'),
  ]);

  // Create table
  autoTable(doc, {
    startY: 35,
    head: [[
      '#',
      'الاسم الكامل',
      'رقم العميل',
      'واتساب',
      'رقم الجواز',
      'الجنسية',
      'وجهة السفر',
      'نوع الخدمة',
      'حالة التأشيرة',
      'الموظف المعين',
      'حالة الفاتورة',
      'تاريخ الإنشاء',
    ]],
    body: tableData,
    styles: {
      font: 'Amiri',
      fontSize: 8,
      cellPadding: 2,
      halign: 'center',
      valign: 'middle',
      fontStyle: 'normal',
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      font: 'Amiri',
      fontStyle: 'normal',
      fontSize: 9,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    margin: { top: 35, right: 10, bottom: 20, left: 10 },
    tableWidth: 'auto',
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 20 },
      6: { cellWidth: 25 },
      7: { cellWidth: 25 },
      8: { cellWidth: 25 },
      9: { cellWidth: 25 },
      10: { cellWidth: 20 },
      11: { cellWidth: 25 },
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(108, 117, 125);
    doc.text(
      `صفحة ${i} من ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save
  const fileName = `clients_list_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
