/**
 * Générateur de Factures Unifié - Support Arabe et Français
 *
 * Ce générateur unifié permet de créer des factures en arabe, en français,
 * ou dans les deux langues simultanément avec une mise en page adaptative.
 *
 * Fonctionnalités:
 * - Détection automatique de la langue
 * - Support RTL (Right-to-Left) pour l'arabe
 * - Support LTR (Left-to-Right) pour le français
 * - Police Amiri embarquée (pas de dépendance externe)
 * - Mise en page adaptative selon la langue
 * - Option pour factures bilingues
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import companyLogo from "@/assets/logo-tca.png";
import cachetTCA from "@/assets/cachet-tca-invoice.png";
import tcaFlightLogo from "@/assets/tca-flight-logo.jpg";
import tcaHotelLogo from "@/assets/tca-hotel-logo.jpg";
import { AMIRI_FONT_BASE64 } from "./amiriFontBase64";
import { generateInvoiceHTML } from "./invoiceHtmlGenerator";
import { countries } from "./countries";

// ============================================================================
// TYPES ET INTERFACES
// ============================================================================

// Bibliothèque d'icônes textuelles pour les factures (compatible jsPDF)
const ICONS = {
  airplane: ">>",          // Icône d'avion
  departure: "",           // Décollage
  arrival: "",             // Atterrissage
  hotel: "",               // Hôtel
  bed: "",                 // Lit
  calendar: "",            // Calendrier
  passenger: "",           // Passager
  guests: "",              // Invités
  location: "",            // Localisation
  flag: "",                // Drapeau
  luggage: "",             // Bagage
  phone: "",               // Téléphone
  email: "",               // Email
  globe: "",               // Globe terrestre
  check: "✓",              // Coche
  arrow: ">>",             // Flèche
  arrowDouble: ">>",       // Double flèche
} as const;

export interface InvoiceService {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface InvoiceData {
  invoice_number: string;
  issue_date: string;
  due_date?: string;
  client_name: string;
  client_whatsapp?: string;
  client_email?: string;
  client_tax_id?: string;
  services: InvoiceService[];
  subtotal: number;
  tva_rate?: number;
  tva_amount?: number;
  timbre_fiscal?: number;
  total_amount: number;
  status?: string;
  notes?: string;
  currency?: string;
  // Informations de vol (optionnel)
  flight_departure_city?: string;
  flight_arrival_city?: string;
  flight_departure_date?: string;
  flight_return_date?: string;
  flight_traveler_name?: string;
  // Informations d'hébergement (optionnel)
  hotel_name?: string;
  hotel_city?: string;
  hotel_checkin_date?: string;
  hotel_checkout_date?: string;
  hotel_guest_name?: string;
  hotel_room_type?: string;
}

export interface InvoiceOptions {
  language?: "ar" | "fr" | "auto"; // 'auto' détecte automatiquement
  bilingual?: boolean; // Générer une facture bilingue
  logo?: string; // Logo en base64 ou URL
  companyInfo?: CompanyInfo; // Informations de l'entreprise
}

export interface CompanyInfo {
  name_ar?: string;
  name_fr?: string;
  name_en?: string;
  address_ar?: string;
  address_fr?: string;
  tax_id?: string;
  registration?: string;
  bank_account?: string;
  phone?: string;
  email?: string;
  website?: string;
}

// ============================================================================
// UTILITAIRES
// ============================================================================

/**
 * Détecte si un texte contient des caractères arabes
 */
const hasArabicCharacters = (text: string): boolean => {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicPattern.test(text);
};

/**
 * Formate un montant avec 3 décimales (précision exacte)
 */
const formatAmount = (amount: number, currency: string = "DT"): string => {
  // Arrondir à 3 décimales avec précision maximale
  const rounded = Math.round(amount * 1000) / 1000;
  return rounded.toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " " + currency;
};

/**
 * Formate une date
 */
const formatDate = (date: string): string => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Traite le texte arabe pour l'affichage correct dans le PDF
 * Le texte arabe reste dans son ordre naturel (droite à gauche)
 */
const processArabicText = (text: string): string => {
  if (!text || !hasArabicCharacters(text)) {
    return text;
  }

  // Retourner le texte tel quel pour écriture RTL normale
  return text;
};

/**
 * Configure la police appropriée selon le contenu du texte
 * Retourne 'Amiri' si le texte contient de l'arabe, sinon 'helvetica'
 */
const selectFont = (text: string | undefined): string => {
  if (!text) return "helvetica";
  return hasArabicCharacters(text) ? "Amiri" : "helvetica";
};

/**
 * Affiche du texte avec la police appropriée (support mixte arabe/français)
 */
const displayText = (doc: jsPDF, text: string, x: number, y: number, options?: any): void => {
  const font = selectFont(text);
  // Pour l'arabe, toujours utiliser 'normal' car 'bold' n'est pas bien supporté
  const style = hasArabicCharacters(text) ? "normal" : options?.style || "normal";
  doc.setFont(font, style);
  // Traiter le texte arabe pour un affichage correct
  const processedText = hasArabicCharacters(text) ? processArabicText(text) : text;
  doc.text(processedText, x, y, options);
};

/**
 * Obtient le nom du pays pour une ville (sans emoji - jsPDF ne supporte pas les emojis)
 * @param cityOrCountry - Nom de la ville ou du pays
 * @returns Chaîne vide (les drapeaux emoji ne fonctionnent pas dans jsPDF)
 */
const getCountryFlag = (cityOrCountry: string): string => {
  // jsPDF ne supporte pas les emojis Unicode, on retourne une chaîne vide
  return "";
};

/**
 * Obtient le nom du pays pour une ville
 */
const getCountryName = (cityOrCountry: string): string => {
  const countryNameMap: { [key: string]: string } = {
    TUNIS: "Tunisie",
    CARTHAGE: "Tunisie",
    HANGZHOU: "Chine",
    BEIJING: "Chine",
    SHANGHAI: "Chine",
    PARIS: "France",
    LYON: "France",
    MARSEILLE: "France",
    DUBAI: "EAU",
    "ABU DHABI": "EAU",
    ISTANBUL: "Turquie",
    ANKARA: "Turquie",
    LONDON: "Royaume-Uni",
    "NEW YORK": "États-Unis",
    WASHINGTON: "États-Unis",
    "LOS ANGELES": "États-Unis",
    ROME: "Italie",
    MILAN: "Italie",
    BERLIN: "Allemagne",
    MUNICH: "Allemagne",
    MADRID: "Espagne",
    BARCELONA: "Espagne",
    CAIRO: "Égypte",
    RIYADH: "Arabie Saoudite",
    JEDDAH: "Arabie Saoudite",
    DOHA: "Qatar",
    CASABLANCA: "Maroc",
    RABAT: "Maroc",
    ALGIERS: "Algérie",
    ALGER: "Algérie",
  };

  const upper = cityOrCountry.toUpperCase();
  for (const [key, country] of Object.entries(countryNameMap)) {
    if (upper.includes(key)) {
      return country;
    }
  }
  return cityOrCountry;
};

/**
 * Détermine la langue principale du contenu
 */
const detectLanguage = (invoice: InvoiceData): "ar" | "fr" => {
  const textToCheck = [
    invoice.client_name,
    invoice.status || "",
    invoice.notes || "",
    ...invoice.services.map((s) => s.description),
  ].join(" ");

  return hasArabicCharacters(textToCheck) ? "ar" : "fr";
};

// ============================================================================
// TRADUCTIONS
// ============================================================================

const translations = {
  ar: {
    invoice: "فاتورة",
    invoice_number: "رقم",
    date: "التاريخ",
    issue_date: "تاريخ الإصدار",
    due_date: "تاريخ الاستحقاق",
    billed_to: "الفاتورة إلى",
    invoice_details: "معلومات الفاتورة",
    status: "الحالة",
    description: "الوصف",
    quantity: "الكمية",
    unit_price: "السعر الوحدوي",
    amount: "المبلغ",
    subtotal: "المبلغ قبل الضريبة",
    tva: "الأداء على القيمة المضافة",
    timbre_fiscal: "الطابع الجبائي",
    stamp: "الطابع الجبائي",
    total: "المبلغ الإجمالي",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    tax_id: "م.ج",
    thank_you: "شكراً لثقتكم. هذه الفاتورة مستحقة الدفع خلال 30 يوماً من تاريخ الإصدار.",
    currency: "د.ت",
    non_taxable: "غير خاضع للضريبة",
    client_signature: "تفريغ العميل",
    signature_date: "التوقيع والتاريخ",
    address: "العنوان",
  },
  fr: {
    invoice: "FACTURE",
    invoice_number: "N°",
    date: "Date",
    issue_date: "Date d'émission",
    due_date: "Date d'échéance",
    billed_to: "FACTURÉ À",
    invoice_details: "DÉTAILS DE LA FACTURE",
    status: "Statut",
    description: "Description",
    quantity: "Quantité",
    unit_price: "Prix Unitaire",
    amount: "Montant",
    subtotal: "Montant HT",
    tva: "TVA",
    timbre_fiscal: "Timbre Fiscal",
    stamp: "Timbre Fiscal",
    total: "TOTAL TTC",
    phone: "Tél",
    email: "Email",
    tax_id: "MF",
    thank_you: "Merci pour votre confiance. Cette facture est payable dans les 30 jours suivant la date d'émission.",
    currency: "DT",
    non_taxable: "NON SOUMIS À TVA",
    client_signature: "Décharge Client",
    signature_date: "Signature et Date",
    address: "Adresse",
  },
};

// ============================================================================
// CONFIGURATION PAR DÉFAUT
// ============================================================================

const defaultCompanyInfo: CompanyInfo = {
  name_ar: "شركة تونس للإستشارات والمساعدة",
  name_fr: "Tunisie Conseil et Assistance TCA Sarl",
  name_en: "TCA ltd.",
  address_ar: "عدد 85 شارع فلسطين، البلفدير 1002 - B2 - 3 الطابق الثاني عمارة القدس",
  address_fr: "Palestine St. 85 Blevedair 1002 - B2 - 3 2nd floor Alquds Building",
  tax_id: "1389792/E",
  registration: "B0140682015",
  bank_account: "04069154003633490208 Attijari Bank | M. Khaireddine Bachi",
  phone: "+216 28 846 888 - +216 29 549 995",
  email: "contact@tunis-consulting.com",
  website: "www.tunis-consulting.com",
};

// ============================================================================
// FONCTION PRINCIPALE
// ============================================================================

/**
 * Génère une facture PDF avec support arabe et français
 *
 * @param invoice - Données de la facture
 * @param options - Options de génération
 * @returns Nom du fichier PDF généré
 */
export const generateInvoicePDF = async (invoice: InvoiceData, options: InvoiceOptions = {}): Promise<string> => {
  // Déterminer la langue
  const language = options.language === "auto" || !options.language ? detectLanguage(invoice) : options.language;

  const isArabic = language === "ar";
  const isBilingual = options.bilingual || false;
  const companyInfo = options.companyInfo || defaultCompanyInfo;
  const currency = invoice.currency || (isArabic ? "د.ت" : "DT");

  // Créer le document PDF
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Charger la police arabe
  try {
    doc.addFileToVFS("Amiri-Regular.ttf", AMIRI_FONT_BASE64);
    doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
  } catch (error) {
    console.error("Erreur lors du chargement de la police Amiri:", error);
  }

  // Détecter le type de facture
  const hasFlightInfo = !!(
    invoice.flight_departure_city ||
    invoice.flight_arrival_city ||
    invoice.flight_departure_date ||
    invoice.flight_return_date ||
    invoice.flight_traveler_name
  );
  const hasHotelInfo = !!(
    invoice.hotel_name ||
    invoice.hotel_city ||
    invoice.hotel_checkin_date ||
    invoice.hotel_checkout_date ||
    invoice.hotel_guest_name ||
    invoice.hotel_room_type
  );

  // Générer le contenu selon le type et la langue
  if (hasFlightInfo) {
    // Facture spécifique pour billets d'avion (FR ou AR)
    await generateFlightInvoice(doc, invoice, companyInfo, currency, pageWidth, language);
  } else if (hasHotelInfo && !isArabic) {
    // Facture spécifique pour réservations d'hôtel (style FR)
    await generateHotelInvoice(doc, invoice, companyInfo, currency, pageWidth);
  } else if (isArabic) {
    // Facture arabe standard
    await generateArabicInvoice(doc, invoice, companyInfo, currency, pageWidth);
  } else {
    // Facture française standard
    await generateFrenchInvoice(doc, invoice, companyInfo, currency, pageWidth);
  }

  // Sauvegarder le PDF
  const fileName = `facture_${invoice.invoice_number}_${Date.now()}.pdf`;
  doc.save(fileName);

  return fileName;
};

// ============================================================================
// GÉNÉRATION FACTURE ARABE (RTL)
// ============================================================================

const generateArabicInvoice = async (
  doc: jsPDF,
  invoice: InvoiceData,
  companyInfo: CompanyInfo,
  currency: string,
  pageWidth: number,
): Promise<void> => {
  const t = translations.ar;

  // En-tête avec fond bleu
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 45, "F");

  // Logo à gauche
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(10, 8, 25, 25, 2, 2, "F");

  // Try to load company logo
  try {
    const logoImg = new Image();
    logoImg.src = companyLogo;
    await new Promise((resolve) => {
      logoImg.onload = () => {
        try {
          doc.addImage(logoImg, "PNG", 11, 9, 23, 23);
          resolve(true);
        } catch (e) {
          console.warn("Could not add logo:", e);
          resolve(false);
        }
      };
      logoImg.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 1000);
    });
  } catch (error) {
    console.warn("Could not load logo:", error);
  }

  // Nom de l'entreprise à droite
  doc.setFont("Amiri", "normal");
  doc.setTextColor(184, 134, 11);
  doc.setFontSize(11);
  doc.text(processArabicText(companyInfo.name_ar || ""), pageWidth - 10, 38, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(companyInfo.name_en || "", pageWidth - 10, 42, { align: "right" });

  // Titre de la facture
  doc.setFont("Amiri", "normal");
  doc.setTextColor(184, 134, 11);
  doc.setFontSize(24);
  doc.text(processArabicText(t.invoice), 10, 15);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(processArabicText(`${t.invoice_number}: ${invoice.invoice_number}`), 10, 22);
  doc.text(processArabicText(`${t.date}: ${formatDate(invoice.issue_date)}`), 10, 27);

  // Barre d'informations de l'entreprise
  doc.setFillColor(184, 134, 11);
  doc.rect(0, 45, pageWidth, 20, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("Amiri", "normal");
  let yPos = 50;
  doc.text(processArabicText(`${companyInfo.name_ar} | رأس المال: 5000 دينار`), pageWidth - 10, yPos, {
    align: "right",
  });
  yPos += 3;
  doc.text(
    processArabicText(`المعرف الجبائي: ${companyInfo.tax_id} | السجل التجاري: ${companyInfo.registration}`),
    pageWidth - 10,
    yPos,
    { align: "right" },
  );
  yPos += 3;
  doc.text(processArabicText(`الحساب البنكي: ${companyInfo.bank_account}`), pageWidth - 10, yPos, { align: "right" });
  yPos += 3;
  doc.text(processArabicText(`العنوان: ${companyInfo.address_ar}`), pageWidth - 10, yPos, { align: "right" });
  yPos += 3;
  doc.text(processArabicText(`الهاتف: ${companyInfo.phone}`), pageWidth - 10, yPos, { align: "right" });

  // Boîtes d'informations
  yPos = 72;

  // Détails de la facture (à droite pour RTL)
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(105, yPos, 95, 30, 2, 2, "F");
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(1);
  doc.line(200, yPos, 200, yPos + 30);

  doc.setTextColor(30, 58, 95);
  doc.setFontSize(9);
  doc.setFont("Amiri", "normal");
  doc.text(processArabicText(t.invoice_details), pageWidth - 10, yPos + 5, { align: "right" });

  doc.setTextColor(51, 51, 51);
  doc.setFontSize(8);
  doc.text(processArabicText(`${t.invoice_number}: ${invoice.invoice_number}`), pageWidth - 10, yPos + 10, {
    align: "right",
  });
  doc.text(processArabicText(`${t.issue_date}: ${formatDate(invoice.issue_date)}`), pageWidth - 10, yPos + 14, {
    align: "right",
  });
  if (invoice.due_date) {
    doc.text(processArabicText(`${t.due_date}: ${formatDate(invoice.due_date)}`), pageWidth - 10, yPos + 18, {
      align: "right",
    });
  }
  if (invoice.status) {
    doc.text(processArabicText(`${t.status}: ${invoice.status}`), pageWidth - 10, yPos + 22, { align: "right" });
  }

  // Informations client (à gauche pour RTL)
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(10, yPos, 90, 30, 2, 2, "F");
  doc.setDrawColor(184, 134, 11);
  doc.line(100, yPos, 100, yPos + 30);

  doc.setTextColor(30, 58, 95);
  doc.setFontSize(9);
  doc.text(processArabicText(t.billed_to), 97, yPos + 5, { align: "right" });

  doc.setTextColor(51, 51, 51);
  doc.setFontSize(8);
  const clientName = hasArabicCharacters(invoice.client_name)
    ? processArabicText(invoice.client_name)
    : invoice.client_name;
  doc.text(clientName, 97, yPos + 10, { align: "right" });

  let clientYPos = yPos + 14;
  if (invoice.client_whatsapp) {
    doc.text(processArabicText(`${t.phone}: ${invoice.client_whatsapp}`), 97, clientYPos, { align: "right" });
    clientYPos += 3.5;
  }
  if (invoice.client_email) {
    doc.setFont("helvetica", "normal");
    doc.text(invoice.client_email, 97, clientYPos, { align: "right" });
    doc.setFont("Amiri", "normal");
    clientYPos += 3.5;
  }
  if (invoice.client_tax_id) {
    doc.text(processArabicText(`${t.tax_id}: ${invoice.client_tax_id}`), 97, clientYPos, { align: "right" });
  }

  // Tableau des services (RTL)
  yPos = 110;

  const tableData = invoice.services.map((service) => {
    const desc = hasArabicCharacters(service.description)
      ? processArabicText(service.description)
      : service.description;
    return [
      formatAmount(service.amount, currency),
      formatAmount(service.unit_price, currency),
      service.quantity.toString(),
      desc,
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [
      [
        processArabicText(t.amount),
        processArabicText(t.unit_price),
        processArabicText(t.quantity),
        processArabicText(t.description),
      ],
    ],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
      fontStyle: "normal",
      fontSize: 9,
      halign: "right",
      font: "Amiri",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 51, 51],
      halign: "right",
      font: "Amiri",
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 35 },
      2: { cellWidth: 30, halign: "center" },
      3: { cellWidth: 90 },
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },
  });

  // Section des totaux (RTL - à gauche)
  const finalY = (doc as any).lastAutoTable.finalY + 5;
  const totalsX = 10;
  let totalsY = finalY;

  doc.setFillColor(248, 249, 250);
  doc.roundedRect(totalsX, totalsY, 70, 35, 2, 2, "F");

  doc.setFont("Amiri", "normal");

  // Sous-total
  doc.setTextColor(51, 51, 51);
  doc.setFontSize(9);
  doc.text(formatAmount(invoice.subtotal, currency), totalsX + 3, totalsY + 5);
  doc.setTextColor(30, 58, 95);
  doc.text(processArabicText(t.subtotal), totalsX + 67, totalsY + 5, { align: "right" });

  totalsY += 6;

  // TVA
  if (invoice.tva_amount) {
    doc.setTextColor(51, 51, 51);
    doc.text(formatAmount(invoice.tva_amount, currency), totalsX + 3, totalsY + 5);
    doc.setTextColor(30, 58, 95);
    doc.text(processArabicText(`${t.tva} (${invoice.tva_rate}%)`), totalsX + 67, totalsY + 5, { align: "right" });
    totalsY += 6;
  }

  // Timbre fiscal
  if (invoice.timbre_fiscal) {
    doc.setTextColor(51, 51, 51);
    doc.text(formatAmount(invoice.timbre_fiscal, currency), totalsX + 3, totalsY + 5);
    doc.setTextColor(30, 58, 95);
    doc.text(processArabicText(t.timbre_fiscal), totalsX + 67, totalsY + 5, { align: "right" });
    totalsY += 6;
  }

  // Total
  doc.setFillColor(184, 134, 11);
  doc.roundedRect(totalsX, totalsY, 70, 10, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(formatAmount(invoice.total_amount, currency), totalsX + 3, totalsY + 7);
  doc.text(processArabicText(t.total), totalsX + 67, totalsY + 7, { align: "right" });

  // Section cachet et signatures
  const signatureY = totalsY + 20;

  // Zone signature client
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.roundedRect(pageWidth - 95, signatureY, 85, 30, 2, 2, "S");

  doc.setFont("Amiri", "normal");
  doc.setTextColor(102, 102, 102);
  doc.setFontSize(8);
  doc.text(processArabicText("تفريغ العميل"), pageWidth - 52.5, signatureY + 5, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("Signature Client", pageWidth - 52.5, signatureY + 9, { align: "center" });

  // Zone cachet TCA avec image
  doc.roundedRect(15, signatureY, 85, 30, 2, 2, "S");

  doc.setFont("Amiri", "normal");
  doc.setFontSize(8);
  doc.text(processArabicText("ختم وتوقيع TCA"), 57.5, signatureY + 5, { align: "center" });

  // Ajouter le cachet TCA
  try {
    const cachetImg = new Image();
    cachetImg.src = cachetTCA;
    await new Promise((resolve) => {
      cachetImg.onload = () => {
        try {
          doc.addImage(cachetImg, "PNG", 20, signatureY + 8, 75, 18);
          resolve(true);
        } catch (e) {
          console.warn("Could not add cachet:", e);
          resolve(false);
        }
      };
      cachetImg.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 1000);
    });
  } catch (error) {
    console.warn("Could not load cachet:", error);
  }

  // Pied de page
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 15;
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.5);
  doc.line(10, footerY, pageWidth - 10, footerY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(7);
  doc.text(`Tél: ${companyInfo.phone}  |  MF: ${companyInfo.tax_id}`, pageWidth / 2, footerY + 5, { align: "center" });

  doc.setFont("Amiri", "normal");
  doc.setTextColor(102, 102, 102);
  doc.setFontSize(7);
  doc.text(processArabicText(t.thank_you), pageWidth / 2, footerY + 9, { align: "center" });
};

// ============================================================================
// GÉNÉRATION FACTURE FRANÇAISE (LTR)
// ============================================================================

const generateFrenchInvoice = async (
  doc: jsPDF,
  invoice: InvoiceData,
  companyInfo: CompanyInfo,
  currency: string,
  pageWidth: number,
): Promise<void> => {
  const t = translations.fr;

  // En-tête avec fond bleu
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 45, "F");

  // Logo
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(10, 8, 25, 25, 2, 2, "F");

  // Try to load company logo
  try {
    const logoImg = new Image();
    logoImg.src = companyLogo;
    await new Promise((resolve) => {
      logoImg.onload = () => {
        try {
          doc.addImage(logoImg, "PNG", 11, 9, 23, 23);
          resolve(true);
        } catch (e) {
          console.warn("Could not add logo:", e);
          resolve(false);
        }
      };
      logoImg.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 1000);
    });
  } catch (error) {
    console.warn("Could not load logo:", error);
  }

  // Nom de l'entreprise
  doc.setTextColor(184, 134, 11);
  doc.setFontSize(11);
  const companyName = companyInfo.name_fr || "";
  displayText(doc, companyName, 40, 18, { style: "bold" });

  doc.setFontSize(9);
  displayText(doc, "Services aux entreprises", 40, 25);

  // Titre de la facture
  doc.setTextColor(184, 134, 11);
  doc.setFontSize(24);
  displayText(doc, t.invoice, pageWidth - 10, 15, { align: "right", style: "bold" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  displayText(doc, `${t.invoice_number} ${invoice.invoice_number}`, pageWidth - 10, 22, { align: "right" });
  displayText(doc, `${t.date}: ${formatDate(invoice.issue_date)}`, pageWidth - 10, 27, { align: "right" });

  // Barre d'informations de l'entreprise
  doc.setFillColor(184, 134, 11);
  doc.rect(0, 45, pageWidth, 20, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  let yPos = 50;
  doc.text(`${companyInfo.name_fr} | Capital: 5000 Dinars`, 10, yPos);
  yPos += 3;
  doc.text(`Matricule Fiscal: ${companyInfo.tax_id} | Registre de Commerce: ${companyInfo.registration}`, 10, yPos);
  yPos += 3;
  doc.text(`Compte Bancaire: ${companyInfo.bank_account}`, 10, yPos);
  yPos += 3;
  doc.text(`Adresse: ${companyInfo.address_fr}`, 10, yPos);
  yPos += 3;
  doc.text(`Tél: ${companyInfo.phone} | Web: ${companyInfo.website}`, 10, yPos);

  // Boîtes d'informations
  yPos = 72;

  // Informations client (à gauche pour LTR)
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(10, yPos, 90, 30, 2, 2, "F");
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(1);
  doc.line(10, yPos, 10, yPos + 30);

  doc.setTextColor(30, 58, 95);
  doc.setFontSize(9);
  displayText(doc, t.billed_to, 13, yPos + 5, { style: "bold" });

  doc.setTextColor(51, 51, 51);
  doc.setFontSize(8);
  displayText(doc, invoice.client_name, 13, yPos + 10, { style: "bold" });

  let clientYPos = yPos + 14;
  if (invoice.client_whatsapp) {
    displayText(doc, `${t.phone}: ${invoice.client_whatsapp}`, 13, clientYPos);
    clientYPos += 3.5;
  }
  if (invoice.client_email) {
    displayText(doc, `${t.email}: ${invoice.client_email}`, 13, clientYPos);
    clientYPos += 3.5;
  }
  if (invoice.client_tax_id) {
    displayText(doc, `${t.tax_id}: ${invoice.client_tax_id}`, 13, clientYPos);
  }

  // Détails de la facture (à droite pour LTR)
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(105, yPos, 95, 30, 2, 2, "F");
  doc.setDrawColor(184, 134, 11);
  doc.line(105, yPos, 105, yPos + 30);

  doc.setTextColor(30, 58, 95);
  doc.setFontSize(9);
  displayText(doc, t.invoice_details, 108, yPos + 5, { style: "bold" });

  doc.setTextColor(51, 51, 51);
  doc.setFontSize(8);
  displayText(doc, `Numéro: ${invoice.invoice_number}`, 108, yPos + 10);
  displayText(doc, `${t.issue_date}: ${formatDate(invoice.issue_date)}`, 108, yPos + 14);
  if (invoice.due_date) {
    displayText(doc, `${t.due_date}: ${formatDate(invoice.due_date)}`, 108, yPos + 18);
  }
  if (invoice.status) {
    displayText(doc, `${t.status}: ${invoice.status}`, 108, yPos + 22);
  }

  // Tableau des services (LTR)
  yPos = 110;

  const tableData = invoice.services.map((service) => [
    hasArabicCharacters(service.description) ? processArabicText(service.description) : service.description,
    service.quantity.toString(),
    formatAmount(service.unit_price, currency),
    formatAmount(service.amount, currency),
  ]);

  // Détecter si les descriptions contiennent de l'arabe
  const hasArabicInServices = invoice.services.some((s) => hasArabicCharacters(s.description));

  autoTable(doc, {
    startY: yPos,
    head: [[t.description, t.quantity, t.unit_price, t.amount]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "left",
      font: "helvetica",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 51, 51],
      font: hasArabicInServices ? "Amiri" : "helvetica",
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },
  });

  // Section des totaux (LTR - à droite)
  const finalY = (doc as any).lastAutoTable.finalY + 5;
  const totalsX = pageWidth - 80;
  let totalsY = finalY;

  doc.setFillColor(248, 249, 250);
  doc.roundedRect(totalsX, totalsY, 70, 35, 2, 2, "F");

  // Sous-total
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(t.subtotal, totalsX + 3, totalsY + 5);
  doc.setTextColor(51, 51, 51);
  doc.text(formatAmount(invoice.subtotal, currency), totalsX + 67, totalsY + 5, { align: "right" });

  totalsY += 6;

  // TVA
  if (invoice.tva_amount) {
    doc.setTextColor(30, 58, 95);
    doc.text(`${t.tva} (${invoice.tva_rate}%)`, totalsX + 3, totalsY + 5);
    doc.setTextColor(51, 51, 51);
    doc.text(formatAmount(invoice.tva_amount, currency), totalsX + 67, totalsY + 5, { align: "right" });
    totalsY += 6;
  }

  // Timbre fiscal
  if (invoice.timbre_fiscal) {
    doc.setTextColor(30, 58, 95);
    doc.text(t.timbre_fiscal, totalsX + 3, totalsY + 5);
    doc.setTextColor(51, 51, 51);
    doc.text(formatAmount(invoice.timbre_fiscal, currency), totalsX + 67, totalsY + 5, { align: "right" });
    totalsY += 6;
  }

  // Total
  doc.setFillColor(184, 134, 11);
  doc.roundedRect(totalsX, totalsY, 70, 10, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(t.total, totalsX + 3, totalsY + 7);
  doc.text(formatAmount(invoice.total_amount, currency), totalsX + 67, totalsY + 7, { align: "right" });

  // Section Informations additionnelles (vol et hébergement)
  let additionalInfoY = totalsY + 15;
  const hasFlightInfo =
    invoice.flight_departure_city ||
    invoice.flight_arrival_city ||
    invoice.flight_departure_date ||
    invoice.flight_return_date ||
    invoice.flight_traveler_name;
  const hasHotelInfo =
    invoice.hotel_name ||
    invoice.hotel_city ||
    invoice.hotel_checkin_date ||
    invoice.hotel_checkout_date ||
    invoice.hotel_guest_name ||
    invoice.hotel_room_type;

  if (hasFlightInfo || hasHotelInfo) {
    additionalInfoY += 5;

    // Informations de vol
    if (hasFlightInfo) {
      doc.setFillColor(232, 245, 255);
      doc.roundedRect(10, additionalInfoY, 190, 30, 2, 2, "F");
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(1);
      doc.line(10, additionalInfoY, 10, additionalInfoY + 30);

      doc.setTextColor(30, 58, 95);
      doc.setFontSize(9);
      displayText(doc, "✈️ Informations de Vol", 13, additionalInfoY + 5, { style: "bold" });

      doc.setTextColor(51, 51, 51);
      doc.setFontSize(8);
      let flightY = additionalInfoY + 10;
      if (invoice.flight_departure_city || invoice.flight_arrival_city) {
        const route = `De: ${invoice.flight_departure_city || "-"} → Vers: ${invoice.flight_arrival_city || "-"}`;
        displayText(doc, route, 13, flightY);
        flightY += 4;
      }
      if (invoice.flight_departure_date || invoice.flight_return_date) {
        const dates = `Départ: ${invoice.flight_departure_date ? formatDate(invoice.flight_departure_date) : "-"} | Retour: ${invoice.flight_return_date ? formatDate(invoice.flight_return_date) : "-"}`;
        displayText(doc, dates, 13, flightY);
        flightY += 4;
      }
      if (invoice.flight_traveler_name) {
        displayText(doc, `Voyageur: ${invoice.flight_traveler_name}`, 13, flightY);
      }

      additionalInfoY += 35;
    }

    // Informations d'hébergement
    if (hasHotelInfo) {
      doc.setFillColor(255, 248, 232);
      doc.roundedRect(10, additionalInfoY, 190, 30, 2, 2, "F");
      doc.setDrawColor(251, 191, 36);
      doc.setLineWidth(1);
      doc.line(10, additionalInfoY, 10, additionalInfoY + 30);

      doc.setTextColor(30, 58, 95);
      doc.setFontSize(9);
      displayText(doc, "Informations d'Hebergement", 13, additionalInfoY + 5, { style: "bold" });

      doc.setTextColor(51, 51, 51);
      doc.setFontSize(8);
      let hotelY = additionalInfoY + 10;
      if (invoice.hotel_name) {
        const hotelInfo = `Hotel: ${invoice.hotel_name}${invoice.hotel_city ? ` - ${invoice.hotel_city}` : ""}`;
        displayText(doc, hotelInfo, 13, hotelY);
        hotelY += 4;
      }
      if (invoice.hotel_checkin_date || invoice.hotel_checkout_date) {
        const dates = `Check-in: ${invoice.hotel_checkin_date ? formatDate(invoice.hotel_checkin_date) : "-"} | Check-out: ${invoice.hotel_checkout_date ? formatDate(invoice.hotel_checkout_date) : "-"}`;
        displayText(doc, dates, 13, hotelY);
        hotelY += 4;
      }
      if (invoice.hotel_guest_name) {
        displayText(doc, `Client: ${invoice.hotel_guest_name}`, 13, hotelY);
        hotelY += 4;
      }
      if (invoice.hotel_room_type) {
        displayText(doc, `Type de chambre: ${invoice.hotel_room_type}`, 13, hotelY);
      }
    }
  }

  // Section cachet et signatures
  const signatureY = hasFlightInfo || hasHotelInfo ? additionalInfoY + 5 : totalsY + 20;

  // Zone cachet TCA avec image (à gauche)
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.roundedRect(10, signatureY, 85, 30, 2, 2, "S");

  doc.setTextColor(102, 102, 102);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Cachet et Signature TCA", 52.5, signatureY + 5, { align: "center" });

  // Ajouter le cachet TCA
  try {
    const cachetImg = new Image();
    cachetImg.src = cachetTCA;
    await new Promise((resolve) => {
      cachetImg.onload = () => {
        try {
          doc.addImage(cachetImg, "PNG", 15, signatureY + 8, 75, 18);
          resolve(true);
        } catch (e) {
          console.warn("Could not add cachet:", e);
          resolve(false);
        }
      };
      cachetImg.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 1000);
    });
  } catch (error) {
    console.warn("Could not load cachet:", error);
  }

  // Zone signature client (à droite)
  doc.roundedRect(pageWidth - 95, signatureY, 85, 30, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Décharge Client", pageWidth - 52.5, signatureY + 5, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("(Signature et Date)", pageWidth - 52.5, signatureY + 9, { align: "center" });

  // Pied de page
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 15;
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.5);
  doc.line(10, footerY, pageWidth - 10, footerY);

  doc.setTextColor(30, 58, 95);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Tél: ${companyInfo.phone}  |  MF: ${companyInfo.tax_id}`, pageWidth / 2, footerY + 5, { align: "center" });

  doc.setTextColor(102, 102, 102);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text(t.thank_you, pageWidth / 2, footerY + 9, { align: "center" });
};

// ============================================================================
// GÉNÉRATION FACTURE BILLET D'AVION (FR)
// ============================================================================

const generateFlightInvoice = async (
  doc: jsPDF,
  invoice: InvoiceData,
  companyInfo: CompanyInfo,
  currency: string,
  pageWidth: number,
  language: "ar" | "fr" = "fr",
): Promise<void> => {
  const t = language === "ar" ? translations.ar : translations.fr;
  const isRTL = language === "ar";
  
  // Ajouter la police Amiri pour supporter l'arabe
  doc.addFileToVFS("Amiri-Regular.ttf", AMIRI_FONT_BASE64);
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
  
  // ====== EN-TÊTE (HEADER) ======
  // Fond bleu gradient
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 50, "F");

  // Nom de l'entreprise en haut à droite
  doc.setTextColor(255, 255, 255);
  doc.setFont(isRTL ? "Amiri" : "helvetica", "bold");
  doc.setFontSize(12);
  displayText(doc, companyInfo.name_ar || "", isRTL ? 10 : pageWidth - 10, 12, { align: isRTL ? "left" : "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  displayText(doc, companyInfo.name_en || "TUNIS CO. CONSULTING AND ASSISTING", isRTL ? 10 : pageWidth - 10, 18, { align: isRTL ? "left" : "right" });
  doc.setFontSize(9);
  displayText(doc, isRTL ? "خدمات رجال الاعمال" : "Business Class Services", isRTL ? 10 : pageWidth - 10, 24, { align: isRTL ? "left" : "right" });

  // Logo en haut à gauche dans un cadre blanc
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(isRTL ? pageWidth - 35 : 10, 8, 25, 25, 2, 2, "F");

  try {
    const logoImg = new Image();
    logoImg.src = companyLogo;
    await new Promise((resolve) => {
      logoImg.onload = () => {
        try {
          doc.addImage(logoImg, "PNG", isRTL ? pageWidth - 34 : 11, 9, 23, 23);
          resolve(true);
        } catch (e) {
          console.warn("Could not add logo:", e);
          resolve(false);
        }
      };
      logoImg.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 1000);
    });
  } catch (error) {
    console.warn("Could not load logo:", error);
  }

  // Titre FACTURE et numéro sous le logo
  doc.setTextColor(184, 134, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  displayText(doc, isRTL ? "فاتورة" : "FACTURE", isRTL ? pageWidth - 10 : 10, 39, { align: isRTL ? "right" : "left" });

  // Numéro et date de facture bien structurés
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  displayText(doc, `N° ${invoice.invoice_number}`, isRTL ? pageWidth - 10 : 10, 45, { align: isRTL ? "right" : "left" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  displayText(doc, `${t.date}: ${formatDate(invoice.issue_date)}`, isRTL ? pageWidth - 10 : 10, 48, { align: isRTL ? "right" : "left" });

  // ====== BARRE D'INFORMATIONS (COMPANY DETAILS) ======
  doc.setFillColor(184, 134, 11);
  doc.rect(0, 50, pageWidth, 18, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  let yPos = 55;
  doc.text(`${companyInfo.name_fr} | Capital: 5000 Dinars`, 10, yPos);
  yPos += 4;
  doc.setFont("helvetica", "normal");
  doc.text(`Matricule Fiscal: ${companyInfo.tax_id} | Registre de Commerce: ${companyInfo.registration}`, 10, yPos);
  yPos += 4;
  doc.text(`Compte Bancaire: ${companyInfo.bank_account}`, 10, yPos);

  // ====== SECTION INFORMATIONS CLIENT ET FACTURE ======
  yPos = 73;

  // Box Client (à gauche)
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(10, yPos, 90, 30, 2, 2, "F");
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(1);
  doc.line(10, yPos, 10, yPos + 30);

  doc.setTextColor(30, 58, 95);
  doc.setFontSize(9);
  displayText(doc, t.billed_to, 13, yPos + 5, { style: "bold" });

  doc.setTextColor(51, 51, 51);
  doc.setFontSize(8);
  displayText(doc, invoice.client_name, 13, yPos + 10, { style: "bold" });

  let clientYPos = yPos + 14;
  if (invoice.client_whatsapp) {
    displayText(doc, invoice.client_whatsapp, 13, clientYPos);
    clientYPos += 3.5;
  }
  if (invoice.client_tax_id) {
    displayText(doc, `MF: ${invoice.client_tax_id}`, 13, clientYPos);
  }

  // Box Détails Facture (à droite)
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(110, yPos, 90, 30, 2, 2, "F");
  doc.setDrawColor(184, 134, 11);
  doc.line(110, yPos, 110, yPos + 30);

  doc.setTextColor(30, 58, 95);
  doc.setFontSize(9);
  displayText(doc, t.invoice_details, 113, yPos + 5, { style: "bold" });

  doc.setTextColor(51, 51, 51);
  doc.setFontSize(8);
  displayText(doc, `${t.invoice_number}: ${invoice.invoice_number}`, 113, yPos + 10);
  displayText(doc, `${t.date}: ${formatDate(invoice.issue_date)}`, 113, yPos + 14);
  if (invoice.due_date) {
    displayText(doc, `${t.due_date}: 30 jours`, 113, yPos + 18);
  }

  // ====== ITINÉRAIRE DU VOL ======
  yPos = 109;
  
  if (invoice.flight_departure_city && invoice.flight_arrival_city) {
    // Fond bleu clair
    doc.setFillColor(232, 244, 248);
    doc.roundedRect(10, yPos, 190, 30, 2, 2, "F");
    doc.setDrawColor(44, 82, 130);
    doc.setLineWidth(2);
    doc.line(10, yPos, 10, yPos + 30);

    // Logo TCA et Titre
    doc.addImage(tcaFlightLogo, "JPEG", 15, yPos + 2, 10, 10);
    
    doc.setTextColor(30, 58, 95);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const flightTitle = isRTL ? "مسار الرحلة" : "Itineraire du Vol";
    displayText(doc, flightTitle, 27, yPos + 8);

    // Box Départ
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, yPos + 11, 75, 15, 2, 2, "F");
    
    doc.setTextColor(30, 58, 95);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    displayText(doc, invoice.flight_departure_city, 17, yPos + 17);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(102, 102, 102);
    const departLabel = isRTL ? "المغادرة:" : "Depart:";
    displayText(doc, `${departLabel} ${invoice.flight_departure_date ? formatDate(invoice.flight_departure_date) : "N/A"}`, 17, yPos + 22);

    // Flèche
    doc.setFontSize(16);
    doc.setTextColor(184, 134, 11);
    doc.setFont("helvetica", "bold");
    displayText(doc, ">>", 95, yPos + 19, { align: "center" });

    // Box Arrivée
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(110, yPos + 11, 85, 15, 2, 2, "F");
    
    doc.setTextColor(30, 58, 95);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    displayText(doc, invoice.flight_arrival_city, 112, yPos + 17);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(102, 102, 102);
    const returnLabel = isRTL ? "العودة:" : "Retour:";
    displayText(doc, `${returnLabel} ${invoice.flight_return_date ? formatDate(invoice.flight_return_date) : "N/A"}`, 112, yPos + 22);

    yPos += 34;

    // Info passager
    if (invoice.flight_traveler_name) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, yPos - 4, 180, 8, 2, 2, "F");
      doc.setFontSize(9);
      doc.setTextColor(51, 51, 51);
      doc.setFont("helvetica", "bold");
      const passengerLabel = isRTL ? "المسافر:" : "Passager:";
      displayText(doc, `${passengerLabel} ${invoice.flight_traveler_name}`, 17, yPos, {});
      yPos += 10;
    } else {
      yPos += 6;
    }
  }

  // ====== TABLEAU DES SERVICES ======
  yPos += 4;
  
  // En-têtes
  doc.setFillColor(30, 58, 95);
  doc.rect(10, yPos, 190, 8, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  
  displayText(doc, t.description, 12, yPos + 5.5);
  displayText(doc, t.quantity, 110, yPos + 5.5, { align: "center" });
  displayText(doc, t.unit_price, 140, yPos + 5.5, { align: "center" });
  displayText(doc, t.total, 180, yPos + 5.5, { align: "center" });
  
  yPos += 8;

  // Lignes de services
  doc.setTextColor(51, 51, 51);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  invoice.services.forEach((service, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(10, yPos, 190, 8, "F");
    }
    
    displayText(doc, service.description, 12, yPos + 5.5);
    displayText(doc, service.quantity.toString(), 110, yPos + 5.5, { align: "center" });
    displayText(doc, `${service.unit_price.toFixed(3)} ${currency}`, 140, yPos + 5.5, { align: "center" });
    displayText(doc, `${service.amount.toFixed(3)} ${currency}`, 180, yPos + 5.5, { align: "center" });
    
    yPos += 8;
    
    // Ligne de séparation
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.1);
    doc.line(10, yPos, 200, yPos);
  });

  // ====== TOTAUX ======
  yPos += 4;
  
  const totalsX = 110;
  const totalsWidth = 90;
  
  // Box totaux
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(totalsX, yPos, totalsWidth, 30, 2, 2, "F");
  
  let totalsY = yPos + 6;
  doc.setFontSize(11);
  doc.setTextColor(51, 51, 51);
  
  // Sous-total
  displayText(doc, t.subtotal, totalsX + 3, totalsY);
  displayText(doc, `${invoice.subtotal.toFixed(3)} ${currency}`, totalsX + totalsWidth - 3, totalsY, { align: "right" });
  totalsY += 5;
  
  // TVA
  if (invoice.tva_amount && invoice.tva_amount > 0) {
    doc.setDrawColor(224, 224, 224);
    doc.line(totalsX + 3, totalsY - 2, totalsX + totalsWidth - 3, totalsY - 2);
    displayText(doc, `${t.tva} (${invoice.tva_rate}%)`, totalsX + 3, totalsY);
    displayText(doc, `${invoice.tva_amount.toFixed(3)} ${currency}`, totalsX + totalsWidth - 3, totalsY, { align: "right" });
    totalsY += 5;
  }
  
  // Timbre fiscal
  if (invoice.timbre_fiscal && invoice.timbre_fiscal > 0) {
    doc.setDrawColor(224, 224, 224);
    doc.line(totalsX + 3, totalsY - 2, totalsX + totalsWidth - 3, totalsY - 2);
    displayText(doc, t.stamp, totalsX + 3, totalsY);
    displayText(doc, `${invoice.timbre_fiscal.toFixed(3)} ${currency}`, totalsX + totalsWidth - 3, totalsY, { align: "right" });
    totalsY += 5;
  }
  
  // Total (fond doré)
  doc.setFillColor(184, 134, 11);
  doc.roundedRect(totalsX, totalsY, totalsWidth, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  displayText(doc, t.total, totalsX + 3, totalsY + 6.5);
  displayText(doc, `${invoice.total_amount.toFixed(3)} ${currency}`, totalsX + totalsWidth - 3, totalsY + 6.5, { align: "right" });

  // ====== SIGNATURES ======
  yPos += 50;
  
  // Signature Client
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(10, yPos, 85, 30, 2, 2, "S");
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.5);
  doc.roundedRect(12, yPos + 7, 81, 21, 2, 2, "S");
  
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(10);
  displayText(doc, t.client_signature, 51.5, yPos + 4, { align: "center", style: "bold" });
  doc.setFontSize(8);
  doc.setTextColor(153, 153, 153);
  displayText(doc, t.signature_date, 51.5, yPos + 18, { align: "center" });

  // Cachet TCA
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(115, yPos, 85, 30, 2, 2, "S");
  
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(10);
  displayText(doc, isRTL ? "ختم وتوقيع TCA" : "Cachet et Signature TCA", 157.5, yPos + 4, { align: "center", style: "bold" });

  try {
    const cachetImg = new Image();
    cachetImg.src = cachetTCA;
    await new Promise((resolve) => {
      cachetImg.onload = () => {
        try {
          doc.addImage(cachetImg, "PNG", 125, yPos + 8, 65, 16);
          resolve(true);
        } catch (e) {
          console.warn("Could not add cachet:", e);
          resolve(false);
        }
      };
      cachetImg.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 1000);
    });
  } catch (error) {
    console.warn("Could not load cachet:", error);
  }

  // ====== PIED DE PAGE ======
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 22;
  
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.8);
  doc.line(10, footerY, pageWidth - 10, footerY);

  doc.setFont(isRTL ? "Amiri" : "helvetica", "normal");
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(7);
  
  let footerTextY = footerY + 4;
  displayText(doc, `${t.address}: ${companyInfo.address_ar || ""}`, pageWidth / 2, footerTextY, { align: "center" });
  footerTextY += 3;
  doc.setFont("helvetica", "normal");
  displayText(doc, companyInfo.address_fr || "", pageWidth / 2, footerTextY, { align: "center" });
  footerTextY += 3.5;
  displayText(doc, `Tel: ${companyInfo.phone || ""} | Libya: +218 92 823 7040`, pageWidth / 2, footerTextY, { align: "center" });
  footerTextY += 3;
  displayText(doc, `Web: ${companyInfo.website || ""}`, pageWidth / 2, footerTextY, { align: "center" });
  footerTextY += 4;
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  displayText(doc, isRTL ? "شكراً لثقتكم" : "Merci pour votre confiance", pageWidth / 2, footerTextY, { align: "center" });
};

// ============================================================================
// GÉNÉRATION FACTURE RÉSERVATION HÔTEL (FR)
// ============================================================================

const generateHotelInvoice = async (
  doc: jsPDF,
  invoice: InvoiceData,
  companyInfo: CompanyInfo,
  currency: string,
  pageWidth: number,
): Promise<void> => {
  const t = translations.fr;

  // En-tête avec fond bleu-vert
  doc.setFillColor(15, 76, 92);
  doc.rect(0, 0, pageWidth, 50, "F");

  // Logo TCA
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(10, 8, 30, 30, 3, 3, "F");

  try {
    const logoImg = new Image();
    logoImg.src = companyLogo;
    await new Promise((resolve) => {
      logoImg.onload = () => {
        try {
          doc.addImage(logoImg, "PNG", 12, 10, 26, 26);
          resolve(true);
        } catch (e) {
          console.warn("Could not add logo:", e);
          resolve(false);
        }
      };
      logoImg.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 1000);
    });
  } catch (error) {
    console.warn("Could not load logo:", error);
  }

  // Titre FACTURE TCA
  doc.setTextColor(251, 191, 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("FACTURE TCA", 45, 22);

  // Numéro de facture
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(`N° ${invoice.invoice_number}`, 45, 32);

  // Date
  doc.setFontSize(11);
  doc.text(`Date: ${formatDate(invoice.issue_date)}`, 45, 40);

  // Nom de l'entreprise à droite
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TUNIS CO. CONSULTING", pageWidth - 10, 15, { align: "right" });
  doc.text("AND ASSISTING", pageWidth - 10, 22, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Réservations Hôtelières", pageWidth - 10, 30, { align: "right" });

  // Barre d'informations (fond ambre)
  doc.setFillColor(251, 191, 36);
  doc.rect(0, 50, pageWidth, 22, "F");

  doc.setTextColor(30, 58, 95);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  let yPos = 54;
  doc.text(`${companyInfo.name_fr} | Capital: 5000 Dinars`, 10, yPos);
  yPos += 4;
  doc.text(`Matricule Fiscal: ${companyInfo.tax_id} | Registre de Commerce: ${companyInfo.registration}`, 10, yPos);
  yPos += 4;
  doc.text(`Compte Bancaire: ${companyInfo.bank_account}`, 10, yPos);
  yPos += 4;
  doc.text(`Tél: ${companyInfo.phone}`, 10, yPos);

  // FACTURÉ À
  yPos = 78;
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(10, yPos, 85, 35, 2, 2, "F");
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(1);
  doc.line(10, yPos, 10, yPos + 35);

  doc.setTextColor(15, 76, 92);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("FACTURE A", 13, yPos + 6);

  doc.setTextColor(51, 51, 51);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(invoice.client_name, 13, yPos + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let clientY = yPos + 16;
  doc.text("TUNIS", 13, clientY);
  clientY += 4;
  if (invoice.client_whatsapp) {
    doc.text(invoice.client_whatsapp, 13, clientY);
    clientY += 4;
  }
  if (invoice.client_tax_id) {
    doc.text(`MF: ${invoice.client_tax_id}`, 13, clientY);
  }

  // DÉTAILS DE LA FACTURE
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(100, yPos, 100, 35, 2, 2, "F");
  doc.setDrawColor(251, 191, 36);
  doc.line(100, yPos, 100, yPos + 35);

  doc.setTextColor(15, 76, 92);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DÉTAILS DE LA FACTURE", 103, yPos + 6);

  doc.setTextColor(51, 51, 51);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Numéro: ${invoice.invoice_number}`, 103, yPos + 12);
  doc.text(`Date: ${formatDate(invoice.issue_date)}`, 103, yPos + 16);
  if (invoice.due_date) {
    doc.text(`Échéance: 30 jours`, 103, yPos + 20);
  }

  // Détails de la Réservation avec logo
  yPos = 120;
  doc.setFillColor(255, 248, 232);
  doc.roundedRect(10, yPos, 190, 32, 2, 2, "F");
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(2);
  doc.line(10, yPos, 10, yPos + 32);

  // Ajouter le logo TCA Hôtel
  doc.addImage(tcaHotelLogo, "JPEG", 15, yPos + 2, 10, 10);

  doc.setTextColor(15, 76, 92);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Details de l'hebergement", 27, yPos + 8);

  doc.setTextColor(51, 51, 51);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const hotelName = invoice.hotel_name || "HOTEL";
  doc.text(hotelName.toUpperCase(), 15, yPos + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (invoice.hotel_city) {
    doc.text(`Ville: ${invoice.hotel_city.toUpperCase()}`, 15, yPos + 21);
  }

  let hotelY = yPos + 26;
  if (invoice.hotel_checkin_date && invoice.hotel_checkout_date) {
    const dates = `Check-in: ${formatDate(invoice.hotel_checkin_date)}  •  Check-out: ${formatDate(invoice.hotel_checkout_date)}`;
    doc.text(dates, 15, hotelY);
  }

  if (invoice.hotel_guest_name) {
    doc.setFont("helvetica", "bold");
    doc.text(`Client: ${invoice.hotel_guest_name.toUpperCase()}`, 130, yPos + 21);
  }

  if (invoice.hotel_room_type) {
    doc.setFont("helvetica", "normal");
    doc.text(`Type: ${invoice.hotel_room_type}`, 130, yPos + 26);
  }

  // Tableau des services
  yPos = 160;
  const tableData = invoice.services.map((service) => [
    hasArabicCharacters(service.description)
      ? processArabicText(service.description)
      : service.description.toUpperCase(),
    service.quantity.toString(),
    formatAmount(service.unit_price, currency),
    formatAmount(service.amount, currency),
  ]);

  const hasArabicInServices = invoice.services.some((s) => hasArabicCharacters(s.description));

  autoTable(doc, {
    startY: yPos,
    head: [["DESCRIPTION", "QUANTITÉ", "PRIX UNITAIRE", "MONTANT"]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: [15, 76, 92],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "left",
      font: "helvetica",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 51, 51],
      font: hasArabicInServices ? "Amiri" : "helvetica",
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 90, halign: "left" },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
    },
    alternateRowStyles: {
      fillColor: [255, 248, 232],
    },
  });

  // Section des totaux
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const totalsX = pageWidth - 80;
  let totalsY = finalY;

  doc.setFillColor(248, 249, 250);
  doc.roundedRect(totalsX, totalsY, 70, 40, 2, 2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  // Sous-total
  doc.setTextColor(15, 76, 92);
  doc.text("Sous-total:", totalsX + 3, totalsY + 6);
  doc.setTextColor(51, 51, 51);
  doc.text(formatAmount(invoice.subtotal, currency), totalsX + 67, totalsY + 6, { align: "right" });
  totalsY += 7;

  // TVA
  if (invoice.tva_amount) {
    doc.setTextColor(15, 76, 92);
    doc.text(`TVA (${invoice.tva_rate}%):`, totalsX + 3, totalsY + 6);
    doc.setTextColor(51, 51, 51);
    doc.text(formatAmount(invoice.tva_amount, currency), totalsX + 67, totalsY + 6, { align: "right" });
    totalsY += 7;
  }

  // Timbre fiscal
  if (invoice.timbre_fiscal) {
    doc.setTextColor(15, 76, 92);
    doc.text("Timbre Fiscal:", totalsX + 3, totalsY + 6);
    doc.setTextColor(51, 51, 51);
    doc.text(formatAmount(invoice.timbre_fiscal, currency), totalsX + 67, totalsY + 6, { align: "right" });
    totalsY += 7;
  }

  // Total
  doc.setFillColor(251, 191, 36);
  doc.roundedRect(totalsX, totalsY + 3, 70, 12, 2, 2, "F");

  doc.setTextColor(30, 58, 95);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL:", totalsX + 3, totalsY + 11);
  doc.text(formatAmount(invoice.total_amount, currency), totalsX + 67, totalsY + 11, { align: "right" });

  // Section signatures
  const signatureY = totalsY + 25;

  // Décharge Client
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.roundedRect(10, signatureY, 85, 25, 2, 2, "S");

  doc.setTextColor(102, 102, 102);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Décharge Client", 52.5, signatureY + 7, { align: "center" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("Cachet et Signature", 52.5, signatureY + 12, { align: "center" });

  // Signature TCA avec cachet
  doc.roundedRect(pageWidth - 95, signatureY, 85, 25, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Signature TCA", pageWidth - 52.5, signatureY + 7, { align: "center" });

  // Ajouter le cachet TCA
  try {
    const cachetImg = new Image();
    cachetImg.src = cachetTCA;
    await new Promise((resolve) => {
      cachetImg.onload = () => {
        try {
          doc.addImage(cachetImg, "PNG", pageWidth - 87, signatureY + 3, 70, 18);
          resolve(true);
        } catch (e) {
          console.warn("Could not add cachet:", e);
          resolve(false);
        }
      };
      cachetImg.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 1000);
    });
  } catch (error) {
    console.warn("Could not load cachet:", error);
  }

  // Pied de page avec adresse bilingue
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 22;

  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(0.5);
  doc.line(10, footerY, pageWidth - 10, footerY);

  // Texte "Adresse"
  doc.setTextColor(15, 76, 92);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Adresse:", pageWidth / 2, footerY + 3, { align: "center" });

  // Adresse en arabe
  doc.setFont("Amiri", "normal");
  doc.setFontSize(7);
  doc.text(
    processArabicText("عدد 85 شارع فلسطين، البلفدير 1002 - B2 - 3 الطابق الثاني عمارة القدس"),
    pageWidth / 2,
    footerY + 6.5,
    { align: "center" },
  );

  // Adresse en anglais
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Palestine St. 85 Blevedair 1002 - B2 - 3 2nd floor Alquds Building", pageWidth / 2, footerY + 10, {
    align: "center",
  });

  // Contact et site web
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("+216 28 846 888 - +216 29 549 995 | www.tunis-consulting.com", pageWidth / 2, footerY + 14, { align: "center" });

  // "Merci pour votre confiance"
  doc.setTextColor(102, 102, 102);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Merci pour votre confiance", pageWidth / 2, footerY + 18, { align: "center" });
};

// ============================================================================
// EXPORT PAR DÉFAUT
// ============================================================================

export default generateInvoicePDF;
