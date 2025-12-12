import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AMIRI_FONT_BASE64 } from './amiriFontBase64';
import companyLogo from '@/assets/logo-tca.png';

interface CaisseFinancialData {
  caisseName: string;
  currency: string;
  initialAmount: number;
  revenue: number;
  expenses: number;
  balance: number;
}

interface MonthlyComparison {
  month: string;
  totalRevenue: { [currency: string]: number };
  totalExpenses: { [currency: string]: number };
  totalBalance: { [currency: string]: number };
}

interface CaissesPdfOptions {
  currentMonth: string;
  currentYear: number;
  caisses: CaisseFinancialData[];
  previousMonths?: MonthlyComparison[];
}

export const generateCaissesPDF = async (options: CaissesPdfOptions): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Add Arabic font
  try {
    doc.addFileToVFS('Amiri-Regular.ttf', AMIRI_FONT_BASE64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    doc.setFont('Amiri');
  } catch (error) {
    console.error('Error loading Arabic font:', error);
    doc.setFont('helvetica');
  }

  // Header with blue background
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 55, 'F');
  
  // Logo with white background
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 10, 30, 30, 2, 2, 'F');
  
  try {
    doc.addImage(companyLogo, 'PNG', 16, 11, 28, 28);
  } catch (error) {
    console.error('Error adding logo:', error);
  }

  // Company name
  doc.setFont('Amiri', 'normal');
  doc.setTextColor(184, 134, 11);
  doc.setFontSize(16);
  doc.text('شركة تونس للإستشارات والمساعدة', pageWidth - 15, 18, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Tunisia Consultancy & Assistance', pageWidth - 15, 24, { align: 'right' });
  
  // Contact information
  doc.setFont('Amiri', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('بيانات الاتصال', pageWidth - 10, 33, { align: 'right' });
  
  doc.setFontSize(8);
  doc.text('+216 28 846 888', pageWidth - 10, 38, { align: 'right' });
  doc.text('+216 29 190 039', pageWidth - 10, 42, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('info@tunis-consulting.com', pageWidth - 10, 46, { align: 'right' });
  
  doc.setFont('Amiri', 'normal');
  doc.setFontSize(7);
  doc.text('عدد 85 شارع فلسطين عمارة القدس الطابق الثاني مكتب رقم 3 تونس, 1002', pageWidth - 10, 50, { align: 'right' });
  
  // Title
  doc.setFont('Amiri', 'normal');
  doc.setTextColor(184, 134, 11);
  doc.setFontSize(18);
  doc.text('تقرير الصناديق الشهري', pageWidth / 2, 68, { align: 'center' });
  
  // Period
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.text(`${options.currentMonth} ${options.currentYear}`, pageWidth / 2, 75, { align: 'center' });
  
  let yPosition = 85;

  // Group caisses by name
  const caissesByName = options.caisses.reduce((acc, caisse) => {
    if (!acc[caisse.caisseName]) {
      acc[caisse.caisseName] = [];
    }
    acc[caisse.caisseName].push(caisse);
    return acc;
  }, {} as { [key: string]: CaisseFinancialData[] });

  // Current month summary
  Object.entries(caissesByName).forEach(([caisseName, currencies]) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    // Caisse name
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text(caisseName, pageWidth - 15, yPosition, { align: 'right' });
    yPosition += 8;

    // Table data for this caisse
    const tableData = currencies.map(c => [
      c.balance.toFixed(3),
      c.expenses.toFixed(3),
      c.revenue.toFixed(3),
      c.initialAmount.toFixed(3),
      c.currency
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['الرصيد', 'المصروفات', 'الإيرادات', 'المبلغ الأولي', 'العملة']],
      body: tableData,
      styles: {
        font: 'Amiri',
        fontSize: 9,
        halign: 'center',
        cellPadding: 2,
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
      margin: { right: 15, left: 15 },
      tableWidth: 'auto',
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  });

  // Comparison with previous months if provided
  if (options.previousMonths && options.previousMonths.length > 0) {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFont('Amiri', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text('مقارنة بين الأشهر', pageWidth - 15, yPosition, { align: 'right' });
    yPosition += 10;

    // Prepare comparison data
    const currencies = Array.from(new Set(options.caisses.map(c => c.currency)));
    
    currencies.forEach(currency => {
      const comparisonData = options.previousMonths!.map(month => {
        const revenue = month.totalRevenue[currency] || 0;
        const expenses = month.totalExpenses[currency] || 0;
        const balance = month.totalBalance[currency] || 0;
        return [
          balance.toFixed(3),
          expenses.toFixed(3),
          revenue.toFixed(3),
          month.month
        ];
      });

      // Add current month
      const currentRevenue = options.caisses
        .filter(c => c.currency === currency)
        .reduce((sum, c) => sum + c.revenue, 0);
      const currentExpenses = options.caisses
        .filter(c => c.currency === currency)
        .reduce((sum, c) => sum + c.expenses, 0);
      const currentBalance = options.caisses
        .filter(c => c.currency === currency)
        .reduce((sum, c) => sum + c.balance, 0);
      
      comparisonData.unshift([
        currentBalance.toFixed(3),
        currentExpenses.toFixed(3),
        currentRevenue.toFixed(3),
        `${options.currentMonth} ${options.currentYear}`
      ]);

      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(`العملة: ${currency}`, pageWidth - 15, yPosition, { align: 'right' });
      yPosition += 5;

      autoTable(doc, {
        startY: yPosition,
        head: [['الرصيد الإجمالي', 'المصروفات الإجمالية', 'الإيرادات الإجمالية', 'الشهر']],
        body: comparisonData,
        styles: {
          font: 'Amiri',
          fontSize: 9,
          halign: 'center',
          cellPadding: 2,
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
        margin: { right: 15, left: 15 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    });
  }

  // Add footer to all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  
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
      `تم الإنشاء في: ${new Date().toLocaleDateString('ar-TN')}`,
      pageWidth - 15,
      pageHeight - 13,
      { align: 'right' }
    );
  }

  // Save PDF
  const fileName = `تقرير_الصناديق_${options.currentMonth}_${options.currentYear}.pdf`;
  doc.save(fileName);
};
