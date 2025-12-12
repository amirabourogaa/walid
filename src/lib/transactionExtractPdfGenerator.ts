import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AMIRI_FONT_BASE64 } from './amiriFontBase64';
import companyLogo from '@/assets/logo-tca.png';

interface TransactionExtractData {
  type: string;
  categorie: string;
  description: string;
  montant: number;
  devise: string;
  mode_paiement: string;
  date_transaction: string;
  created_by_name?: string;
  source_type?: string;
  source_name?: string;
  entity_name?: string;
}

interface ExtractOptions {
  title: string;
  filterType: string;
  filterValue: string;
  transactions: TransactionExtractData[];
  totalEntree: number;
  totalSortie: number;
  solde: number;
  selectedDevise?: string;
  totalsByDevise?: { [devise: string]: { entree: number; sortie: number; solde: number } };
  detailsByCaisse?: { [key: string]: { entree: number; sortie: number } };
  detailsByBankAccount?: { [key: string]: { entree: number; sortie: number } };
}

const categoryLabels: { [key: string]: string } = {
  'loyer': 'إيجار',
  'steg': 'STEG - الكهرباء والغاز',
  'sonede': 'SONEDE - الماء',
  'internet': 'الإنترنت',
  'mobile': 'الهاتف المحمول',
  'bon_cadeau': 'بطاقة هدايا / طعام',
  'fournisseur': 'موردون',
  'ambassade': 'سفارات',
  'transport': 'نقل',
  'salaire': 'رواتب',
  'avance_salaire': 'تسبقة علي الراتب',
  'cnss': 'CNSS - الضمان الاجتماعي',
  'finance': 'إيرادات مالية',
  'autre': 'أخرى',
};

const paymentMethodLabels: { [key: string]: string } = {
  'espece': 'نقدا',
  'cheque': 'شيك',
  'virement': 'تحويل بنكي',
  'carte_bancaire': 'بطاقة بنكية',
  'traite': 'كمبيالة',
};

export const generateTransactionExtractPDF = async (options: ExtractOptions): Promise<void> => {
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
    doc.addImage(companyLogo, 'PNG', 16, 11, 28, 28);
  } catch (error) {
    console.error('Logo loading error:', error);
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
  
  // Add filter info
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.text(`${options.filterType}: ${options.filterValue}`, pageWidth / 2, 75, { align: 'center' });
  
  let yPosition = 85;

  // Add summary
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text('الملخص المالي', pageWidth - 15, yPosition, { align: 'right' });
  yPosition += 10;
  
  // If specific currency or multiple currencies
  if (options.totalsByDevise && Object.keys(options.totalsByDevise).length > 0) {
    // Multi-currency summary
    Object.entries(options.totalsByDevise).forEach(([devise, amounts]) => {
      doc.setFontSize(10);
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(11);
      doc.text(`${devise}`, pageWidth - 15, yPosition, { align: 'right' });
      yPosition += 7;
      
      doc.setFontSize(10);
      doc.setTextColor(0, 128, 0);
      const entreesText = `إجمالي الإيرادات: ${amounts.entree.toFixed(3)} ${devise}+`;
      doc.text(entreesText, pageWidth - 15, yPosition, { align: 'right' });
      yPosition += 6;
      
      doc.setTextColor(255, 0, 0);
      const sortiesText = `إجمالي المصروفات: ${amounts.sortie.toFixed(3)} ${devise}-`;
      doc.text(sortiesText, pageWidth - 15, yPosition, { align: 'right' });
      yPosition += 6;
      
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(10);
      const soldeText = `الرصيد: ${amounts.solde.toFixed(3)} ${devise}`;
      doc.text(soldeText, pageWidth - 15, yPosition, { align: 'right' });
      yPosition += 10;
    });
  } else {
    // Single currency or legacy format
    const devise = options.selectedDevise || 'TND';
    doc.setFontSize(10);
    doc.setTextColor(0, 128, 0);
    const entreesText = `إجمالي الإيرادات: ${options.totalEntree.toFixed(3)} ${devise}+`;
    doc.text(entreesText, pageWidth - 15, yPosition, { align: 'right' });
    yPosition += 7;
    
    doc.setTextColor(255, 0, 0);
    const sortiesText = `إجمالي المصروفات: ${options.totalSortie.toFixed(3)} ${devise}-`;
    doc.text(sortiesText, pageWidth - 15, yPosition, { align: 'right' });
    yPosition += 7;
    
    doc.setTextColor(30, 58, 95);
    doc.setFontSize(11);
    const soldeText = `الرصيد: ${options.solde.toFixed(3)} ${devise}`;
    doc.text(soldeText, pageWidth - 15, yPosition, { align: 'right' });
    yPosition += 10;
  }

  // Add details by source if available
  if (options.detailsByCaisse && Object.keys(options.detailsByCaisse).length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 95);
    doc.text('تفاصيل الصناديق', pageWidth - 15, yPosition, { align: 'right' });
    yPosition += 8;
    
    doc.setFontSize(9);
    Object.entries(options.detailsByCaisse).forEach(([caisse, amounts]) => {
      const caisseText = `${caisse}: إيرادات ${amounts.entree.toFixed(3)} - مصروفات ${amounts.sortie.toFixed(3)}`;
      doc.text(caisseText, pageWidth - 15, yPosition, { align: 'right' });
      yPosition += 6;
    });
    yPosition += 5;
  }

  if (options.detailsByBankAccount && Object.keys(options.detailsByBankAccount).length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 95);
    doc.text('تفاصيل الحسابات البنكية', pageWidth - 15, yPosition, { align: 'right' });
    yPosition += 8;
    
    doc.setFontSize(9);
    Object.entries(options.detailsByBankAccount).forEach(([account, amounts]) => {
      const accountText = `${account}: إيرادات ${amounts.entree.toFixed(3)} - مصروفات ${amounts.sortie.toFixed(3)}`;
      doc.text(accountText, pageWidth - 15, yPosition, { align: 'right' });
      yPosition += 6;
    });
    yPosition += 5;
  }

  doc.setFont('Amiri', 'normal');
  yPosition += 5;

  // Add transactions table
  if (options.transactions && options.transactions.length > 0) {
    const tableData = options.transactions.map(transaction => {
      const arrow = transaction.type === 'entree' ? '↑' : '↓';
      const color = transaction.type === 'entree' ? '#22c55e' : '#ef4444';
      const montantFormatted = `${transaction.type === 'entree' ? '+' : '-'}${transaction.montant.toFixed(3)} ${transaction.devise}`;
      
      const sourceInfo = transaction.source_name ? `${transaction.source_name}` : '-';
      
      return [
        arrow,
        categoryLabels[transaction.categorie] || transaction.categorie,
        transaction.entity_name || '-',
        transaction.description || '-',
        montantFormatted,
        paymentMethodLabels[transaction.mode_paiement] || transaction.mode_paiement,
        new Date(transaction.date_transaction).toLocaleDateString('fr-FR'),
        transaction.created_by_name || '-',
        sourceInfo
      ];
    });
    
    autoTable(doc, {
      startY: yPosition,
      head: [['', 'الفئة', 'العميل/الشركة', 'الوصف', 'المبلغ', 'وسيلة الدفع', 'التاريخ', 'المستخدم', 'المصدر']],
      body: tableData,
      styles: {
        font: 'Amiri',
        fontSize: 8,
        halign: 'right',
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [30, 58, 95],
        textColor: [255, 255, 255],
        fontStyle: 'normal',
        halign: 'center',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 6 },
        2: { halign: 'center', cellWidth: 23 },
        4: { halign: 'center', cellWidth: 20 },
        6: { halign: 'center', cellWidth: 18 },
        8: { halign: 'center', cellWidth: 20 },
      },
      didParseCell: function(data: any) {
        if (data.column.index === 0 && data.section === 'body') {
          const transaction = options.transactions[data.row.index];
          data.cell.styles.textColor = transaction.type === 'entree' ? [34, 197, 94] : [239, 68, 68];
        }
      },
      margin: { top: yPosition, right: 15, left: 15 },
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
