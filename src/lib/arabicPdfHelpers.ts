/**
 * Helpers pour le traitement de texte arabe dans les PDFs
 * Version simplifiée pour compatibilité avec pdfGenerator.ts
 */

import jsPDF from 'jspdf';
import { AMIRI_FONT_BASE64 } from './amiriFontBase64';

/**
 * Configure la police arabe pour un document jsPDF
 */
export const setupArabicFont = async (doc: jsPDF): Promise<void> => {
  try {
    doc.addFileToVFS('Amiri-Regular.ttf', AMIRI_FONT_BASE64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    doc.setFont('Amiri');
  } catch (error) {
    console.error('Error setting up Arabic font:', error);
    doc.setFont('helvetica');
  }
};

/**
 * Détecte si un texte contient des caractères arabes
 */
const hasArabicCharacters = (text: string): boolean => {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicPattern.test(text);
};

/**
 * Traite le texte arabe pour l'affichage correct dans le PDF
 * Le texte arabe reste dans son ordre naturel (droite à gauche)
 */
export const processArabicText = (text: string): string => {
  if (!text || !hasArabicCharacters(text)) {
    return text;
  }
  
  // Retourner le texte tel quel pour écriture RTL normale
  return text;
};
