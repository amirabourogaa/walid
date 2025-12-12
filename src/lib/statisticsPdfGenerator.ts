import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AMIRI_FONT_BASE64 } from './amiriFontBase64';
import companyLogo from '@/assets/logo-tca.png';

interface StatsPdfOptions {
  title: string;
  period: string;
  data: any[];
  columns: { header: string; dataKey: string }[];
  summary?: { label: string; value: string | number }[];
  logoUrl?: string;
}

export const generateStatisticsPDF = async (options: StatsPdfOptions): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add Arabic font
  try {
    doc.addFileToVFS('Amiri-Regular.ttf', AMIRI_FONT_BASE64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    doc.setFont('Amiri');
  } catch (error) {
    console.error('Error loading Arabic font:', error);
    doc.setFont('helvetica');
  }

  // En-tête avec fond bleu
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 55, 'F');
  
  // Logo avec fond blanc à gauche
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 10, 30, 30, 2, 2, 'F');
  
  try {
    const logoToUse = options.logoUrl || companyLogo;
    doc.addImage(logoToUse, 'PNG', 16, 11, 28, 28);
  } catch (error) {
    console.error('Error adding logo:', error);
  }

  // Nom de l'entreprise à droite
  doc.setFont('Amiri', 'normal');
  doc.setTextColor(184, 134, 11);
  doc.setFontSize(16);
  doc.text('شركة تونس للإستشارات والمساعدة', pageWidth - 15, 18, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Tunisia Consultancy & Assistance', pageWidth - 15, 24, { align: 'right' });
  
  // Informations de contact
  doc.setFont('Amiri', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('بيانات الاتصال', pageWidth - 10, 33, { align: 'right' });
  
  doc.setFontSize(8);
  doc.text('+216 28 846 888', pageWidth - 10, 38, { align: 'right' });
  doc.text('+216 29 190 039', pageWidth - 10, 42, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.text('info@tunis-consulting.com', pageWidth - 10, 46, { align: 'right' });
  
  doc.setFont('Amiri', 'normal');
  doc.setFontSize(7);
  doc.text('عدد 85 شارع فلسطين عمارة القدس الطابق الثاني مكتب رقم 3 تونس, 1002', pageWidth - 10, 50, { align: 'right' });
  
  // Add title
  doc.setFont('Amiri', 'normal');
  doc.setTextColor(184, 134, 11);
  doc.setFontSize(18);
  doc.text(options.title, pageWidth / 2, 68, { align: 'center' });
  
  // Add period
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.text(options.period, pageWidth / 2, 75, { align: 'center' });
  
  let yPosition = 83;

  // Add summary section if provided
  if (options.summary && options.summary.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text('الملخص', pageWidth - 15, yPosition, { align: 'right' });
    yPosition += 10;
    
    doc.setFontSize(10);
    options.summary.forEach(item => {
      doc.text(`${item.label}: ${item.value}`, pageWidth - 15, yPosition, { align: 'right' });
      yPosition += 7;
    });
    
    yPosition += 5;
  }

  // Add data table
  if (options.data && options.data.length > 0) {
    const tableData = options.data.map(row => 
      options.columns.map(col => row[col.dataKey]?.toString() || '-')
    );
    
    (doc as any).autoTable({
      startY: yPosition,
      head: [options.columns.map(col => col.header)],
      body: tableData,
      styles: {
        font: 'Amiri',
        fontSize: 10,
        halign: 'right',
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [30, 58, 95],
        textColor: [255, 255, 255],
        fontStyle: 'normal',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      margin: { top: 83, right: 15, left: 15 },
    });
  }

  // Add footer
  const totalPages = (doc as any).internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(184, 134, 11);
    doc.setLineWidth(0.3);
    doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
    
    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 95);
    doc.setFont('Amiri', 'normal');
    doc.text(
      `شركة تونس للإستشارات والمساعدة - صفحة ${i} من ${totalPages}`,
      pageWidth / 2,
      pageHeight - 13,
      { align: 'center' }
    );
    
    doc.setFontSize(7);
    doc.text(
      `تم الإنشاء في: ${new Date().toLocaleDateString('fr-FR')}`,
      pageWidth - 15,
      pageHeight - 13,
      { align: 'right' }
    );
  }

  // Save PDF
  const fileName = `${options.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
