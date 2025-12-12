/**
 * Parse QR code data and extract searchable information
 * Expected format from QR scanner: "الاسم: name\nرقم العميل: CL1234\nرقم الجواز: ABC123\nواتساب: +123456"
 * Or physical scanner format: ":   : CL1205 : ad589601: +8613910856542"
 */
export function parseQRCode(qrData: string): {
  clientId?: string;
  passportNumber?: string;
  whatsappNumber?: string;
  fullName?: string;
  searchTerms: string[];
  primarySearchTerm: string;
} {
  // Clean the data
  const cleanData = qrData.trim();
  
  // Try physical scanner format first (colon-separated)
  if (cleanData.includes(':')) {
    // Split by colon, trim spaces, and filter out empty/whitespace-only parts
    const parts = cleanData.split(':')
      .map(p => p.trim())
      .filter(p => p && p.length > 0);
    
    console.log('🔍 Parts extraites du QR:', parts);
    
    let clientId: string | undefined;
    let passportNumber: string | undefined;
    let whatsappNumber: string | undefined;
    const searchTerms: string[] = [];
    
    // Look for client ID pattern (CL followed by numbers)
    for (const part of parts) {
      const upperPart = part.toUpperCase();
      
      // Client ID: CL suivi de chiffres
      if (upperPart.match(/^CL\d+$/i)) {
        clientId = upperPart;
        searchTerms.push(upperPart);
        console.log('✅ Client ID trouvé:', upperPart);
      } 
      // WhatsApp: commence par + ou est un long numéro
      else if (part.startsWith('+') || part.match(/^\d{10,}$/)) {
        whatsappNumber = part;
        searchTerms.push(part);
        console.log('✅ WhatsApp trouvé:', part);
      } 
      // Passport: alphanumeric de 6+ caractères (mais pas un client ID)
      else if (part.match(/^[A-Z0-9]{6,}$/i) && !part.match(/^CL\d+$/i)) {
        passportNumber = part.toUpperCase();
        searchTerms.push(part.toUpperCase());
        console.log('✅ Passeport trouvé:', part.toUpperCase());
      }
    }
    
    // Primary search term is client ID, fallback to first available
    const primarySearchTerm = clientId || passportNumber || whatsappNumber || cleanData;
    
    return {
      clientId,
      passportNumber,
      whatsappNumber,
      searchTerms: searchTerms.length > 0 ? searchTerms : [cleanData],
      primarySearchTerm
    };
  }
  
  // Try Arabic format (line-separated with labels)
  const searchTerms: string[] = [];
  let clientId: string | undefined;
  let passportNumber: string | undefined;
  let whatsappNumber: string | undefined;
  let fullName: string | undefined;
  
  // Extract client ID
  if (cleanData.includes("رقم العميل:")) {
    const match = cleanData.match(/رقم العميل:\s*([^\n]+)/);
    if (match) {
      clientId = match[1].trim();
      searchTerms.push(clientId);
    }
  }
  
  // Extract passport number
  if (cleanData.includes("رقم الجواز:")) {
    const match = cleanData.match(/رقم الجواز:\s*([^\n]+)/);
    if (match && match[1].trim() !== "غير محدد") {
      passportNumber = match[1].trim();
      searchTerms.push(passportNumber);
    }
  }
  
  // Extract WhatsApp number
  if (cleanData.includes("واتساب:")) {
    const match = cleanData.match(/واتساب:\s*([^\n]+)/);
    if (match && match[1].trim() !== "غير محدد") {
      whatsappNumber = match[1].trim();
      searchTerms.push(whatsappNumber);
    }
  }
  
  // Extract full name
  if (cleanData.includes("الاسم:")) {
    const match = cleanData.match(/الاسم:\s*([^\n]+)/);
    if (match) {
      fullName = match[1].trim();
      searchTerms.push(fullName);
    }
  }
  
  // Primary search term (prioritize client_id)
  const primarySearchTerm = clientId || passportNumber || whatsappNumber || fullName || cleanData;
  
  return {
    clientId,
    passportNumber,
    whatsappNumber,
    fullName,
    searchTerms: searchTerms.length > 0 ? searchTerms : [cleanData],
    primarySearchTerm
  };
}

/**
 * Generate QR code data string from client information
 */
export function generateQRCodeData(client: {
  full_name: string;
  client_id_number?: string;
  passport_number?: string;
  whatsapp_number?: string;
}): string {
  return `الاسم: ${client.full_name}
رقم العميل: ${client.client_id_number || 'غير محدد'}
رقم الجواز: ${client.passport_number || 'غير محدد'}
واتساب: ${client.whatsapp_number || 'غير محدد'}`;
}
