import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { processArabicText, setupArabicFont } from "./arabicPdfHelpers";
import companyLogo from "@/assets/logo-tca.png";

// Helper function to properly format text (handles both Arabic and French)
const formatText = (text: string): string => {
  if (!text) return "";

  // Always process through Arabic text handler for proper bidirectional support
  // It will handle both pure Arabic, pure French, and mixed content
  return processArabicText(text);
};

// Check if text contains Arabic characters
const hasArabicCharacters = (text: string): boolean => {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  return arabicRegex.test(text);
};

// Format date to French locale
const formatDate = (date: string | null): string => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

interface ClientData {
  id: string;
  client_id_number?: string;
  full_name: string;
  whatsapp_number?: string;
  email?: string;
  passport_number?: string;
  nationality?: string;
  passport_status?: string;
  assigned_employee?: string;
  service_type?: string;
  destination_country?: string;
  visa_type?: string;
  china_visa_type?: string;
  profession?: string;
  amount?: number;
  currency?: string;
  entry_status?: string;
  submission_date?: string;
  embassy_receipt_date?: string;
  visa_start_date?: string;
  visa_end_date?: string;
  submitted_by?: string;
  status?: string;
  invoice_status?: string;
  summary?: string;
  notes?: string;
  tax_id?: string;
}

export const generateClientPDF = async (client: ClientData): Promise<string> => {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
      putOnlyUsedFonts: true,
    });

    // Setup Arabic font support
    await setupArabicFont(doc);
    doc.setFont("Amiri", "normal");

    const pageWidth = doc.internal.pageSize.getWidth();

    // Company Header Section in Arabic
    addArabicCompanyHeader(doc, pageWidth);

    // Document Title in Arabic
    doc.setFontSize(20);
    doc.setFont("Amiri", "normal");
    doc.setTextColor(184, 134, 11);
    doc.text("بطاقة العميل", pageWidth / 2, 68, { align: "center" });

    // Add decorative line
    doc.setDrawColor(184, 134, 11);
    doc.setLineWidth(0.5);
    doc.line(20, 73, pageWidth - 20, 73);

    // Client Essential Information Section in Arabic
    addArabicClientInfo(doc, client, pageWidth);

    // Footer
    addArabicFooter(doc, pageWidth);

    // Save PDF
    const fileName = `fiche_client_${client.passport_number || client.id}_${Date.now()}.pdf`;
    doc.save(fileName);

    return fileName;
  } catch (error) {
    console.error("Error generating client PDF:", error);
    throw new Error("خطأ في إنشاء ملف PDF");
  }
};

// Arabic Company Header
const addArabicCompanyHeader = (doc: jsPDF, pageWidth: number): void => {
  // En-tête avec fond bleu
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 55, "F");

  // Logo avec fond blanc à gauche
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 10, 30, 30, 2, 2, "F");

  try {
    doc.addImage(companyLogo, "PNG", 16, 11, 28, 28);
  } catch (error) {
    console.error("Logo loading error:", error);
  }

  // Nom de l'entreprise à droite
  doc.setFont("Amiri", "normal");
  doc.setTextColor(184, 134, 11);
  doc.setFontSize(16);
  doc.text("شركة تونس للإستشارات والمساعدة", pageWidth - 15, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Tunisia Consultancy & Assistance", pageWidth - 15, 24, { align: "right" });

  // Informations de contact
  doc.setFont("Amiri", "normal");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("بيانات الاتصال", pageWidth - 10, 33, { align: "right" });

  doc.setFontSize(8);
  doc.text("+216 28 846 888", pageWidth - 10, 38, { align: "right" });
  doc.text("+216 29 190 039", pageWidth - 10, 42, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.text("info@tunis-consulting.com", pageWidth - 10, 46, { align: "right" });

  doc.setFont("Amiri", "normal");
  doc.setFontSize(7);
  doc.text("عدد 85 شارع فلسطين عمارة القدس الطابق الثاني مكتب رقم 3 تونس, 1002", pageWidth - 10, 50, {
    align: "right",
  });
};

// Arabic Client Essential Information Section
const addArabicClientInfo = (doc: jsPDF, client: ClientData, pageWidth: number): void => {
  let yPos = 83;

  doc.setFontSize(14);
  doc.setFont("Amiri", "normal");
  doc.setTextColor(30, 58, 95);
  doc.text("معلومات العميل", pageWidth - 15, yPos, { align: "right" });

  yPos += 10;

  const clientInfo = [
    [client.client_id_number || "-", "معرف العميل"],
    [client.full_name || "-", "الاسم الكامل"],
    [client.whatsapp_number || "-", "رقم الواتساب"],
    [client.passport_number || "-", "رقم جواز السفر"],
    [client.service_type || "-", "نوع الخدمة"],
    [client.amount ? client.amount.toString() : "-", "المبلغ المطلوب"],
    [client.currency || "-", "العملة"],
  ];

  autoTable(doc, {
    startY: yPos,
    body: clientInfo,
    theme: "grid",
    styles: {
      font: "Amiri",
      fontSize: 11,
      cellPadding: 5,
      halign: "right",
    },
    columnStyles: {
      0: {
        textColor: [40, 40, 40],
        cellWidth: "auto",
        halign: "right",
      },
      1: {
        fillColor: [240, 248, 255],
        textColor: [60, 60, 60],
        cellWidth: 60,
        fontStyle: "normal",
        halign: "right",
      },
    },
    didParseCell: function (data: any) {
      data.cell.styles.lineWidth = 0.1;
      data.cell.styles.lineColor = [200, 200, 200];
    },
  });
};

// Arabic Footer
const addArabicFooter = (doc: jsPDF, pageWidth: number): void => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(184, 134, 11);
    doc.setLineWidth(0.3);
    doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);

    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 95);
    doc.setFont("Amiri", "normal");
    doc.text(`وثيقة  - شركة تونس للإستشارات والمساعدة - صفحة ${i} من ${pageCount}`, pageWidth / 2, pageHeight - 13, {
      align: "center",
    });

    doc.setFontSize(7);
    doc.text(`تاريخ الإنشاء: ${new Date().toLocaleDateString("fr-FR")}`, pageWidth - 15, pageHeight - 13, {
      align: "right",
    });
  }
};
