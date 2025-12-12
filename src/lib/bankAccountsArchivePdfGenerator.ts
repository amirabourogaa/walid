import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AMIRI_FONT_BASE64 } from './amiriFontBase64';
import companyLogo from '@/assets/logo-tca.png';

interface BankAccountFinancialData {
  accountName: string;
  accountType: string;
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

interface BankAccountsPdfOptions {
  currentMonth: string;
  currentYear: number;
  accounts: BankAccountFinancialData[];
  compareMonth?: string;
  compareYear?: number;
  compareAccounts?: BankAccountFinancialData[];
}

const accountTypeLabels: { [key: string]: string } = {
  courant: "حساب جاري",
  epargne: "حساب توفير",
  autre: "آخر",
};

export const generateBankAccountsArchivePDF = async (options: BankAccountsPdfOptions): Promise<void> => {
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
  doc.text('info@tunis-consulting.com', pageWidth - 10, 46, { align: 'right' });
  
  doc.setFont('Amiri', 'normal');
  doc.setFontSize(7);
  doc.text('عدد 85 شارع فلسطين عمارة القدس الطابق الثاني مكتب رقم 3 تونس, 1002', pageWidth - 10, 50, { align: 'right' });
  
  // Title
  doc.setFont('Amiri', 'normal');
  doc.setTextColor(184, 134, 11);
  doc.setFontSize(18);
  doc.text('تقرير أرشيف الحسابات البنكية', pageWidth / 2, 68, { align: 'center' });
  
  // Period
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.text(`${options.currentMonth} ${options.currentYear}`, pageWidth / 2, 75, { align: 'center' });
  
  let yPosition = 85;

  // Group accounts by name
  const accountsByName = options.accounts.reduce((acc, account) => {
    if (!acc[account.accountName]) {
      acc[account.accountName] = [];
    }
    acc[account.accountName].push(account);
    return acc;
  }, {} as { [key: string]: BankAccountFinancialData[] });

  // Current month summary
  doc.setFont('Amiri', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 95);
  doc.text('الملخص المالي للفترة الحالية', pageWidth - 15, yPosition, { align: 'right' });
  yPosition += 10;

  Object.entries(accountsByName).forEach(([accountName, currencies]) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    // Account name and type
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    const accountType = accountTypeLabels[currencies[0].accountType] || currencies[0].accountType;
    doc.text(`${accountName} (${accountType})`, pageWidth - 15, yPosition, { align: 'right' });
    yPosition += 8;

    // Table data for this account
    const tableData = currencies.map(c => [
      c.balance.toFixed(3),
      c.expenses.toFixed(3),
      c.revenue.toFixed(3),
      c.initialAmount.toFixed(3),
      c.currency
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['الرصيد المتبقي', 'المصروفات', 'الإيرادات', 'المبلغ الأولي', 'العملة']],
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

  // Comparison section if provided
  if (options.compareAccounts && options.compareAccounts.length > 0 && options.compareMonth && options.compareYear) {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFont('Amiri', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 95);
    doc.text('المقارنة بين الفترتين', pageWidth - 15, yPosition, { align: 'right' });
    yPosition += 10;

    // Group compare accounts by name
    const compareAccountsByName = options.compareAccounts.reduce((acc, account) => {
      if (!acc[account.accountName]) {
        acc[account.accountName] = [];
      }
      acc[account.accountName].push(account);
      return acc;
    }, {} as { [key: string]: BankAccountFinancialData[] });

    // For each account, show comparison
    Object.entries(accountsByName).forEach(([accountName, currentCurrencies]) => {
      const compareCurrencies = compareAccountsByName[accountName];
      
      if (!compareCurrencies) return;

      if (yPosition > pageHeight - 70) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('Amiri', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(30, 58, 95);
      doc.text(accountName, pageWidth - 15, yPosition, { align: 'right' });
      yPosition += 8;

      // Prepare comparison data for each currency
      const comparisonData: any[] = [];
      
      currentCurrencies.forEach(current => {
        const compare = compareCurrencies.find(c => c.currency === current.currency);
        
        if (compare) {
          const revenueDiff = current.revenue - compare.revenue;
          const expensesDiff = current.expenses - compare.expenses;
          const balanceDiff = current.balance - compare.balance;
          
          comparisonData.push([
            current.currency,
            `${options.currentMonth} ${options.currentYear}`,
            current.revenue.toFixed(3),
            current.expenses.toFixed(3),
            current.balance.toFixed(3),
            `${options.compareMonth} ${options.compareYear}`,
            compare.revenue.toFixed(3),
            compare.expenses.toFixed(3),
            compare.balance.toFixed(3),
            `${revenueDiff >= 0 ? '+' : ''}${revenueDiff.toFixed(3)}`,
            `${expensesDiff >= 0 ? '+' : ''}${expensesDiff.toFixed(3)}`,
            `${balanceDiff >= 0 ? '+' : ''}${balanceDiff.toFixed(3)}`
          ]);
        }
      });

      if (comparisonData.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [
            [
              { content: 'العملة', rowSpan: 2 },
              { content: 'الفترة الحالية', colSpan: 4 },
              { content: 'فترة المقارنة', colSpan: 4 },
              { content: 'الفرق', colSpan: 3 }
            ],
            [
              'الفترة',
              'الإيرادات',
              'المصروفات',
              'الرصيد',
              'الفترة',
              'الإيرادات',
              'المصروفات',
              'الرصيد',
              'الإيرادات',
              'المصروفات',
              'الرصيد'
            ]
          ],
          body: comparisonData,
          styles: {
            font: 'Amiri',
            fontSize: 7,
            halign: 'center',
            cellPadding: 1.5,
          },
          headStyles: {
            fillColor: [30, 58, 95],
            textColor: [255, 255, 255],
            fontStyle: 'normal',
            halign: 'center',
            fontSize: 7,
          },
          alternateRowStyles: {
            fillColor: [245, 247, 250],
          },
          margin: { right: 10, left: 10 },
          tableWidth: 'auto',
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 20 },
            5: { cellWidth: 20 },
          },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }
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
  const fileName = `تقرير_أرشيف_الحسابات_البنكية_${options.currentMonth}_${options.currentYear}.pdf`;
  doc.save(fileName);
};
