import logoTca from '@/assets/logo-tca-invoice.png';
import cachetTca from '@/assets/cachet-tca-invoice.png';

interface InvoiceData {
  invoice_number: string;
  client_name: string;
  client_address?: string;
  client_phone?: string;
  client_tax_id?: string;
  services: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    non_taxable?: boolean;
  }>;
  subtotal: number;
  tva_rate?: number;
  tva_amount?: number;
  discount_amount?: number;
  timbre_fiscal?: number;
  total_amount: number;
  currency: string;
  issue_date: string;
  due_date?: string;
  language?: 'FR' | 'AR';
  // Flight info
  flight_departure_city?: string;
  flight_arrival_city?: string;
  flight_departure_date?: string;
  flight_return_date?: string;
  flight_traveler_name?: string;
  // Hotel info
  hotel_name?: string;
  hotel_city?: string;
  hotel_checkin_date?: string;
  hotel_checkout_date?: string;
  hotel_guest_name?: string;
  hotel_room_type?: string;
  notes?: string;
}

// Mappage des villes/pays aux drapeaux Unicode.
const countryMap: { [key: string]: string } = {
    'TUNIS': '🇹🇳', 'TUNISIE': '🇹🇳', 'TUNISIA': '🇹🇳', 'CARTHAGE': '🇹🇳', 'DJERBA': '🇹🇳',
    'HANGZHOU': '🇨🇳', 'CHINA': '🇨🇳', 'CHINE': '🇨🇳', 'BEIJING': '🇨🇳', 'SHANGHAI': '🇨🇳',
    'PARIS': '🇫🇷', 'FRANCE': '🇫🇷', 'LYON': '🇫🇷', 'MARSEILLE': '🇫🇷',
    'DUBAI': '🇦🇪', 'ABU DHABI': '🇦🇪', 'UAE': '🇦🇪',
    'ISTANBUL': '🇹🇷', 'TURKEY': '🇹🇷', 'TURQUIE': '🇹🇷', 'ANKARA': '🇹🇷',
    'LONDON': '🇬🇧', 'UK': '🇬🇧', 'ROYAUME-UNI': '🇬🇧',
    'NEW YORK': '🇺🇸', 'USA': '🇺🇸', 'WASHINGTON': '🇺🇸', 'LOS ANGELES': '🇺🇸',
    'ROME': '🇮🇹', 'ITALY': '🇮🇹', 'ITALIE': '🇮🇹', 'MILAN': '🇮🇹',
    'BERLIN': '🇩🇪', 'GERMANY': '🇩🇪', 'ALLEMAGNE': '🇩🇪', 'MUNICH': '🇩🇪',
    'MADRID': '🇪🇸', 'SPAIN': '🇪🇸', 'ESPAGNE': '🇪🇸', 'BARCELONA': '🇪🇸',
    'CAIRO': '🇪🇬', 'EGYPT': '🇪🇬', 'EGYPTE': '🇪🇬',
    'RIYADH': '🇸🇦', 'SAUDI': '🇸🇦', 'JEDDAH': '🇸🇦',
    'DOHA': '🇶🇦', 'QATAR': '🇶🇦',
    'CASABLANCA': '🇲🇦', 'MOROCCO': '🇲🇦', 'MAROC': '🇲🇦', 'RABAT': '🇲🇦',
    'ALGIERS': '🇩🇿', 'ALGERIA': '🇩🇿', 'ALGERIE': '🇩🇿', 'ALGER': '🇩🇿',
  };

  /**
   * Obtient l'émoji du drapeau pour une ville ou un pays donné.
   * @param cityOrCountry - Nom de la ville ou du pays.
   * @returns L'émoji du drapeau correspondant, ou une chaîne vide si non trouvé.
   */
  function getCountryFlag(cityOrCountry: string): string {
    if (!cityOrCountry) return '';
    const upper = cityOrCountry.toUpperCase();
    for (const [key, flag] of Object.entries(countryMap)) {
      if (upper.includes(key)) {
        return flag;
      }
    }
    return '';
  }

  const currencySymbols: Record<string, string> = {
  'TND': 'DT',
  'USD': '$',
  'EUR': '€',
  'DLY': 'DLY'
};

export function generateInvoiceHTML(data: InvoiceData): string {
  const language = data.language || 'FR';
  const currSymbol = currencySymbols[data.currency] || data.currency;
  const textDirection = language === 'AR' ? 'rtl' : 'ltr';
  
  // Translations
  const t = language === 'AR' ? {
    title: 'فاتورة',
    billedTo: 'فوترة إلى',
    invoiceDetails: 'تفاصيل الفاتورة',
    invoiceNum: 'رقم',
    date: 'تاريخ',
    dueDate: 'تاريخ الاستحقاق',
    description: 'الوصف',
    quantity: 'الكمية',
    unitPrice: 'السعر الوحدوي',
    amount: 'المبلغ',
    subtotal: 'المجموع الفرعي',
    discount: 'الخصم',
    tva: 'الضريبة على القيمة المضافة',
    timbre: 'رسوم الطوابع',
    total: 'المجموع الكلي',
    clientDischarge: 'تفريغ العميل',
    tcaStamp: 'ختم وتوقيع TCA',
    signatureDate: 'التوقيع والتاريخ',
    thankYou: 'شكرا لثقتكم',
    companyNameAr: 'شركة تونس للإستشارات والمساعدة',
    companyNameEn: 'TUNIS CO. CONSULTING AND ASSISTING',
    businessClassAr: 'خدمات رجال الاعمال',
    businessClassEn: 'Business Class Services',
    nonTaxable: 'غير خاضع للضريبة'
  } : {
    title: 'FACTURE',
    billedTo: 'Facturé à',
    invoiceDetails: 'Détails de la Facture',
    invoiceNum: 'Numéro',
    date: 'Date',
    dueDate: 'Échéance',
    description: 'Description',
    quantity: 'Quantité',
    unitPrice: 'Prix Unitaire',
    amount: 'Montant',
    subtotal: 'Sous-total',
    discount: 'Remise',
    tva: 'TVA',
    timbre: 'Timbre Fiscal',
    total: 'TOTAL',
    clientDischarge: 'Décharge Client',
    tcaStamp: 'Cachet et Signature TCA',
    signatureDate: 'Signature et Date',
    thankYou: 'Merci pour votre confiance',
    companyNameAr: 'شركة تونس للإستشارات والمساعدة',
    companyNameEn: 'TUNIS CO. CONSULTING AND ASSISTING',
    businessClassAr: 'خدمات رجال الاعمال',
    businessClassEn: 'Business Class Services',
    nonTaxable: 'NON SOUMIS À TVA'
  };

  // Generate services rows
  const servicesHtml = data.services.map(service => {
    const nonTaxBadge = service.non_taxable 
      ? `<span class="no-tax-badge">${t.nonTaxable}</span>` 
      : '';
    return `
      <tr>
        <td>${service.description} ${nonTaxBadge}</td>
        <td>${service.quantity}</td>
        <td>${service.unit_price.toFixed(3)} ${currSymbol}</td>
        <td>${service.amount.toFixed(3)} ${currSymbol}</td>
      </tr>
    `;
  }).join('');

  // Flight info HTML
  const hasFlightInfo = data.flight_departure_city && data.flight_arrival_city;
  const flightHtml = hasFlightInfo ? `
    <div class="flight-details">
      <h3>${language === 'AR' ? '✈️ مسار الرحلة' : '✈️ Itinéraire du Vol'}</h3>
      <div class="flight-route">
        <div class="flight-point">
          <div class="city">${getCountryFlag(data.flight_departure_city)} ${data.flight_departure_city}</div>
          <div class="date">${language === 'AR' ? 'المغادرة:' : 'Départ:'} ${data.flight_departure_date || 'N/A'}</div>
        </div>
        <div class="flight-arrow">→</div>
        <div class="flight-point">
          <div class="city">${getCountryFlag(data.flight_arrival_city)} ${data.flight_arrival_city}</div>
          <div class="date">${language === 'AR' ? 'العودة:' : 'Retour:'} ${data.flight_return_date || 'N/A'}</div>
        </div>
      </div>
      ${data.flight_traveler_name ? `<div class="passenger-info"><strong>${language === 'AR' ? 'المسافر:' : 'Passager:'}</strong> ${data.flight_traveler_name}</div>` : ''}
    </div>
  ` : '';

  // Hotel info HTML
  const hasHotelInfo = data.hotel_name && data.hotel_city;
  const hotelHtml = hasHotelInfo ? `
    <div class="flight-details" style="background: #f8e8f0; border-left-color: #B8860B;">
      <h3>${language === 'AR' ? '🏨 معلومات الإقامة' : '🏨 Informations d\'Hébergement'}</h3>
      <div class="flight-route">
        <div class="flight-point">
          <div class="city">${data.hotel_name}</div>
          <div class="date">${data.hotel_city}</div>
        </div>
        <div class="flight-arrow">🏨</div>
        <div class="flight-point">
          <div class="city">${language === 'AR' ? 'الدخول:' : 'Arrivée:'} ${data.hotel_checkin_date || 'N/A'}</div>
          <div class="date">${language === 'AR' ? 'الخروج:' : 'Départ:'} ${data.hotel_checkout_date || 'N/A'}</div>
        </div>
      </div>
      ${data.hotel_guest_name ? `<div class="passenger-info"><strong>${language === 'AR' ? 'النزيل:' : 'Client:'}</strong> ${data.hotel_guest_name}</div>` : ''}
      ${data.hotel_room_type ? `<div class="passenger-info" style="margin-top: 5px;"><strong>${language === 'AR' ? 'الغرفة:' : 'Chambre:'}</strong> ${data.hotel_room_type}</div>` : ''}
    </div>
  ` : '';

  // Discount HTML
  const discountHtml = (data.discount_amount && data.discount_amount > 0) ? `
    <div class="totals-row">
      <div>${t.discount}</div>
      <div>-${data.discount_amount.toFixed(3)} ${currSymbol}</div>
    </div>
  ` : '';

  // TVA HTML
  const tvaHtml = (data.tva_amount && data.tva_amount > 0) ? `
    <div class="totals-row">
      <div>${t.tva} (${data.tva_rate}%)</div>
      <div>${data.tva_amount.toFixed(3)} ${currSymbol}</div>
    </div>
  ` : '';

  // Timbre HTML
  const timbreHtml = (data.timbre_fiscal && data.timbre_fiscal > 0) ? `
    <div class="totals-row">
      <div>${t.timbre}</div>
      <div>${data.timbre_fiscal.toFixed(3)} ${currSymbol}</div>
    </div>
  ` : '';

  // Client info
  const clientInfoHtml = `
    <p><strong>${data.client_name}</strong></p>
    ${data.client_address ? `<p>${data.client_address}</p>` : ''}
    ${data.client_phone ? `<p>${data.client_phone}</p>` : ''}
    ${data.client_tax_id ? `<p><strong>${language === 'AR' ? 'المعرف الجبائي:' : 'Matricule Fiscal:'}</strong> ${data.client_tax_id}</p>` : ''}
  `;

  return `
<!DOCTYPE html>
<html dir="${textDirection}">
<head>
  <meta charset="UTF-8">
  <title>${t.title} ${data.invoice_number}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      font-size: 10px;
      direction: ${textDirection};
    }
    
    .header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%);
      color: white;
      padding: 20px 30px;
      border-radius: 8px 8px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }
    
    .header-left {
      text-align: ${language === 'AR' ? 'right' : 'left'};
      display: flex;
      flex-direction: column;
      align-items: ${language === 'AR' ? 'flex-end' : 'flex-start'};
      justify-content: flex-start;
    }
    
    .header-right {
      text-align: ${language === 'AR' ? 'left' : 'right'};
      display: flex;
      flex-direction: column;
      align-items: ${language === 'AR' ? 'flex-start' : 'flex-end'};
      justify-content: flex-start;
    }
    
    .header-logo img {
      width: 100px;
      height: auto;
      margin-bottom: 10px;
    }
    
    .company-name {
      font-size: 11px;
      line-height: 1.6;
      color: white;
      text-align: ${language === 'AR' ? 'left' : 'right'};
    }
    
    .company-name-ar {
      font-size: 12px;
      font-weight: bold;
    }
    
    .company-name-en {
      font-size: 11px;
    }
    
    .header h1 {
      font-size: 36px;
      color: #B8860B;
      margin-bottom: 10px;
      font-weight: bold;
      margin: 0;
    }
    
    .header-info {
      font-size: 14px;
      color: white;
      margin-top: 5px;
      margin: 0;
    }
    
    .company-details {
      background: linear-gradient(135deg, #B8860B 0%, #DAA520 100%);
      color: white;
      padding: 12px 30px;
      font-size: 10px;
      line-height: 1.4;
    }
    
    .content {
      padding: 20px 30px;
    }
    
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      gap: 15px;
    }
    
    .info-box {
      flex: 1;
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      border-left: 3px solid #B8860B;
    }
    
    .info-box h3 {
      color: #1e3a5f;
      font-size: 11px;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    
    .flight-details {
      background: #e8f4f8;
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 15px;
      border-left: 4px solid #2c5282;
    }
    
    .flight-details h3 {
      color: #1e3a5f;
      font-size: 11px;
      margin-bottom: 8px;
    }
    
    .flight-route {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    
    .flight-point {
      flex: 1;
      background: white;
      padding: 8px;
      border-radius: 5px;
      text-align: center;
    }
    
    .flight-point .city {
      font-weight: bold;
      color: #1e3a5f;
      font-size: 11px;
    }
    
    .flight-point .date {
      font-size: 9px;
      color: #666;
    }
    
    .flight-arrow {
      font-size: 16px;
      color: #B8860B;
      font-weight: bold;
    }
    
    .passenger-info {
      background: white;
      padding: 6px 10px;
      border-radius: 5px;
      font-size: 10px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    
    thead {
      background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%);
      color: white;
    }
    
    th {
      padding: 8px 10px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
    }
    
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 10px;
    }
    
    .no-tax-badge {
      background: #fff3cd;
      color: #856404;
      padding: 2px 4px;
      border-radius: 2px;
      font-size: 7px;
      font-weight: bold;
      margin-left: 4px;
    }
    
    .totals-box {
      width: 350px;
      background: #f8f9fa;
      border-radius: 6px;
      overflow: hidden;
      float: right;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 15px;
      font-size: 11px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .totals-row.total {
      background: linear-gradient(135deg, #B8860B 0%, #DAA520 100%);
      color: white;
      font-size: 14px;
      font-weight: bold;
      padding: 10px 15px;
    }
    
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      gap: 20px;
      clear: both;
    }
    
    .signature-box {
      flex: 1;
      text-align: center;
    }
    
    .signature-box h4 {
      font-size: 10px;
      color: #1e3a5f;
      margin-bottom: 5px;
    }
    
    .signature-area {
      border: 2px dashed #B8860B;
      border-radius: 5px;
      height: 80px;
      background: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 8px;
      position: relative;
    }
    
    .signature-area img {
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
    }
    
    .footer {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 2px solid #B8860B;
      text-align: center;
      font-size: 9px;
      color: #1e3a5f;
    }
    
    @media print {
      body {
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${t.title}</h1>
      <div class="header-info">
        <strong>N° ${data.invoice_number}</strong><br>
        ${t.date}: ${data.issue_date}
      </div>
    </div>
    <div class="header-right">
      <div class="header-logo">
        <img src="${logoTca}" alt="TCA Logo">
      </div>
      <div class="company-name">
        <div class="company-name-ar">${t.companyNameAr}</div>
        <div class="company-name-en">${t.companyNameEn}</div>
        <div class="company-name-ar">${t.businessClassAr}</div>
        <div class="company-name-en">${t.businessClassEn}</div>
      </div>
    </div>
  </div>
  
  <div class="company-details">
    <p><strong>Tunisie Conseil et Assistance TCA Sarl</strong> | Capital: 5000 Dinars</p>
    <p><strong>Matricule Fiscal:</strong> 1389792/E | <strong>Registre de Commerce:</strong> B0140682015</p>
    <p><strong>Compte Bancaire:</strong> 04069154003633490208 Attijari Bank | M. Khaireddine Bachi</p>
  </div>
  
  <div class="content">
    <div class="info-section">
      <div class="info-box">
        <h3>${t.billedTo}</h3>
        ${clientInfoHtml}
      </div>
      <div class="info-box">
        <h3>${t.invoiceDetails}</h3>
        <p><strong>${t.invoiceNum}:</strong> ${data.invoice_number}</p>
        <p><strong>${t.date}:</strong> ${data.issue_date}</p>
        ${data.due_date ? `<p><strong>${t.dueDate}:</strong> ${data.due_date}</p>` : '<p><strong>${t.dueDate}:</strong> 30 jours</p>'}
      </div>
    </div>
    
    ${flightHtml}
    ${hotelHtml}
    
    <table>
      <thead>
        <tr>
          <th style="width: 50%;">${t.description}</th>
          <th style="width: 15%;">${t.quantity}</th>
          <th style="width: 15%;">${t.unitPrice}</th>
          <th style="width: 20%;">${t.amount}</th>
        </tr>
      </thead>
      <tbody>
        ${servicesHtml}
      </tbody>
    </table>
    
    <div class="totals-box">
      <div class="totals-row">
        <div>${t.subtotal}</div>
        <div>${data.subtotal.toFixed(3)} ${currSymbol}</div>
      </div>
      ${discountHtml}
      ${tvaHtml}
      ${timbreHtml}
      <div class="totals-row total">
        <div>${t.total}</div>
        <div>${data.total_amount.toFixed(3)} ${currSymbol}</div>
      </div>
    </div>
    
    <div class="signature-section">
      <div class="signature-box">
        <h4>${t.clientDischarge}</h4>
        <div class="signature-area">${t.signatureDate}</div>
      </div>
      <div class="signature-box">
        <h4>${t.tcaStamp}</h4>
        <div class="signature-area">
          <img src="${cachetTca}" alt="Cachet TCA">
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p><strong>Adresse:</strong> عدد 85 شارع فلسطين، البلفدير 1002 - B2 - 3 الطابق الثاني عمارة القدس</p>
      <p>Palestine St. 85 Blevedair 1002 - B2 - 3 2nd floor Alquds Building</p>
      <p>📞 +216 28 846 888 - +216 29 549 995 | Libya: +218 92 823 7040 | 🌐 www.tunis-consulting.com</p>
      <p style="margin-top: 10px; font-style: italic;">${t.thankYou}</p>
    </div>
  </div>
</body>
</html>
  `;
}