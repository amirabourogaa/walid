import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvoiceService {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceEmailRequest {
  invoice: {
    invoiceNumber: string;
    clientName: string;
    clientEmail: string;
    clientWhatsapp?: string;
    clientTaxId?: string;
    services: InvoiceService[];
    subtotal: number;
    currency: string;
    tvaRate?: number;
    tvaAmount?: number;
    discountAmount?: number;
    timbreFiscal?: number;
    retenueSourceRate?: number;
    retenueSourceAmount?: number;
    totalAmount: number;
    issueDate: string;
    dueDate?: string;
    notes?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoice }: InvoiceEmailRequest = await req.json();

    console.log("Sending invoice email to:", invoice.clientEmail);

    // Build services table HTML
    const servicesHtml = invoice.services
      .map(
        (service) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${service.description}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${service.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${service.unitPrice.toFixed(3)} ${invoice.currency}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${service.total.toFixed(3)} ${invoice.currency}</td>
        </tr>
      `
      )
      .join("");

    // Build calculations HTML
    let calculationsHtml = `
      <tr>
        <td colspan="3" style="padding: 8px; text-align: right; font-weight: 600;">المجموع الجزئي:</td>
        <td style="padding: 8px; text-align: right; font-weight: 600;">${invoice.subtotal.toFixed(3)} ${invoice.currency}</td>
      </tr>
    `;

    if (invoice.tvaRate && invoice.tvaAmount) {
      calculationsHtml += `
        <tr>
          <td colspan="3" style="padding: 8px; text-align: right;">الضريبة (${invoice.tvaRate}%):</td>
          <td style="padding: 8px; text-align: right;">${invoice.tvaAmount.toFixed(3)} ${invoice.currency}</td>
        </tr>
      `;
    }

    if (invoice.discountAmount && invoice.discountAmount > 0) {
      calculationsHtml += `
        <tr>
          <td colspan="3" style="padding: 8px; text-align: right;">التخفيض:</td>
          <td style="padding: 8px; text-align: right; color: #16a34a;">-${invoice.discountAmount.toFixed(3)} ${invoice.currency}</td>
        </tr>
      `;
    }

    if (invoice.timbreFiscal && invoice.timbreFiscal > 0) {
      calculationsHtml += `
        <tr>
          <td colspan="3" style="padding: 8px; text-align: right;">معلوم الطابع الجبائي:</td>
          <td style="padding: 8px; text-align: right;">${invoice.timbreFiscal.toFixed(3)} TND</td>
        </tr>
      `;
    }

    if (
      invoice.retenueSourceRate &&
      invoice.retenueSourceAmount &&
      invoice.currency === "TND" &&
      invoice.totalAmount > 1000
    ) {
      calculationsHtml += `
        <tr>
          <td colspan="3" style="padding: 8px; text-align: right;">الاقتطاع من المورد (${invoice.retenueSourceRate}%):</td>
          <td style="padding: 8px; text-align: right; color: #dc2626;">-${invoice.retenueSourceAmount.toFixed(3)} ${invoice.currency}</td>
        </tr>
      `;
    }

    calculationsHtml += `
      <tr style="background-color: #f9fafb; font-size: 1.125rem;">
        <td colspan="3" style="padding: 12px; text-align: right; font-weight: 700;">المجموع الإجمالي:</td>
        <td style="padding: 12px; text-align: right; font-weight: 700; color: #a58e4f;">${invoice.totalAmount.toFixed(3)} ${invoice.currency}</td>
      </tr>
    `;

    const emailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>فاتورة ${invoice.invoiceNumber}</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
        <div style="max-width: 800px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #a58e4f 0%, #8b7840 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 2rem;">شركة تونس للإستشارات والمساعدة</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">خدمات رجال الأعمال</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #a58e4f; font-size: 1.875rem; margin: 0;">فاتــورة</h2>
              <p style="color: #6b7280; margin-top: 10px;">رقم الفاتورة: ${invoice.invoiceNumber}</p>
            </div>

            <!-- Invoice Details -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px;">
                <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 1rem;">معلومات العميل</h3>
                <p style="margin: 5px 0; color: #6b7280;"><strong>الاسم:</strong> ${invoice.clientName}</p>
                ${invoice.clientWhatsapp ? `<p style="margin: 5px 0; color: #6b7280;"><strong>واتساب:</strong> ${invoice.clientWhatsapp}</p>` : ""}
                ${invoice.clientTaxId ? `<p style="margin: 5px 0; color: #6b7280;"><strong>المعرف الجبائي:</strong> ${invoice.clientTaxId}</p>` : ""}
                <p style="margin: 5px 0; color: #6b7280;"><strong>البريد:</strong> ${invoice.clientEmail}</p>
              </div>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px;">
                <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 1rem;">تفاصيل الفاتورة</h3>
                <p style="margin: 5px 0; color: #6b7280;"><strong>تاريخ الإصدار:</strong> ${invoice.issueDate}</p>
                ${invoice.dueDate ? `<p style="margin: 5px 0; color: #6b7280;"><strong>تاريخ الاستحقاق:</strong> ${invoice.dueDate}</p>` : ""}
                <p style="margin: 5px 0; color: #6b7280;"><strong>العملة:</strong> ${invoice.currency}</p>
              </div>
            </div>

            <!-- Services Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #a58e4f; color: white;">
                  <th style="padding: 12px; text-align: right; border-radius: 6px 0 0 0;">الوصف</th>
                  <th style="padding: 12px; text-align: center;">الكمية</th>
                  <th style="padding: 12px; text-align: right;">السعر الوحدوي</th>
                  <th style="padding: 12px; text-align: right; border-radius: 0 6px 0 0;">المجموع</th>
                </tr>
              </thead>
              <tbody>
                ${servicesHtml}
              </tbody>
            </table>

            <!-- Calculations -->
            <table style="width: 100%; margin-bottom: 20px;">
              <tbody>
                ${calculationsHtml}
              </tbody>
            </table>

            ${invoice.notes ? `
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-top: 20px;">
                <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 1rem;">ملاحظات</h3>
                <p style="color: #78350f; margin: 0;">${invoice.notes}</p>
              </div>
            ` : ""}
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; color: #6b7280; font-size: 0.875rem;">
            <p style="margin: 5px 0;">شركة تونس للإستشارات والمساعدة</p>
            <p style="margin: 5px 0;">+216 28 846 888 | +216 29 190 039</p>
            <p style="margin: 5px 0;">info@tunis-consulting.com</p>
            <p style="margin: 5px 0;">عدد 85 شارع فلسطين عمارة القدس، الطابق الثاني مكتب رقم 3 تونس، 1002</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'شركة تونس للإستشارات <onboarding@resend.dev>',
        to: [invoice.clientEmail],
        subject: `فاتورة رقم ${invoice.invoiceNumber} - شركة تونس للإستشارات والمساعدة`,
        html: emailHtml,
      })
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(emailResult)}`);
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, data: emailResult }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invoice-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
