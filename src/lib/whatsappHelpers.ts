import { supabase } from "@/integrations/supabase/client";

interface Client {
  id?: string;
  full_name: string;
  client_id_number?: string;
  whatsapp_number?: string;
  passport_number?: string;
  assigned_employee?: string;
  embassy_receipt_date?: string;
  user_id?: string;
}

// Détecte automatiquement le type d'appareil
const isMobile = () => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
};

export const sendWhatsAppMessage = async (client: Client, message: string) => {
  if (!client.whatsapp_number) {
    console.warn('No WhatsApp number for client:', client.full_name);
    return;
  }

  // Clean the phone number (remove spaces, dashes, etc.)
  const cleanNumber = client.whatsapp_number.replace(/[\s\-\(\)]/g, '');
  
  // Ensure the number starts with the country code
  let formattedNumber = cleanNumber;
  if (!cleanNumber.startsWith('+')) {
    // If it starts with 0, replace with +218 (Libya)
    if (cleanNumber.startsWith('0')) {
      formattedNumber = '+218' + cleanNumber.substring(1);
    } else if (!cleanNumber.startsWith('218')) {
      // Add Libya country code if not present
      formattedNumber = '+218' + cleanNumber;
    } else {
      formattedNumber = '+' + cleanNumber;
    }
  }

  // Encode the message for URL
  const encodedMessage = encodeURIComponent(message);
  const cleanPhone = formattedNumber.replace(/\+/g, '');
  
  // Détection automatique: mobile utilise whatsapp://, desktop utilise web
  const isMobileDevice = isMobile();
  
  if (isMobileDevice) {
    // Pour mobile: utiliser le protocole whatsapp:// avec fallback vers wa.me
    const mobileProtocol = `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
    const universalUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    // Essayer d'ouvrir l'app WhatsApp
    window.location.href = mobileProtocol;
    
    // Fallback vers wa.me après un court délai si l'app ne s'ouvre pas
    setTimeout(() => {
      window.open(universalUrl, '_blank');
    }, 500);
  } else {
    // Pour desktop: utiliser WhatsApp Web
    const webUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
    window.open(webUrl, '_blank');
  }
};

export const getVisaStatusUpdateMessage = (client: Client, newStatus: string): string => {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  
  const messages: { [key: string]: string } = {
    "تم استلام معاملتكم": `مرحباً ${client.full_name}،

📨 تم استلام معاملتكم بنجاح!

سيتم البدء في معالجة طلبكم في أقرب وقت ممكن.

📋 معلومات الطلب:
• رقم العميل: ${client.client_id_number || 'غير محدد'}
• رقم الجواز: ${client.passport_number || 'غير محدد'}
• الموظف المسؤول: ${client.assigned_employee || 'غير محدد'}
• التاريخ: ${currentDate}

شكراً لثقتكم بنا.

📲 للتواصل معنا عبر الواتساب:

📍 إذا كنتم في ليبيا:
نضال – ‪+218912384046‬ https://wa.me/218912384046

📍 إذا كنتم في تونس:
•  أميرة – ‪+21628846888‬ https://wa.me/21628846888
•  أميمة – ‪+21622655723‬ https://wa.me/21622655723
•  سفيان – ‪+21629549995‬ https://wa.me/21629549995
•  محمد – ‪+21622437558‬ https://wa.me/21622437558

📌 للمتابعة ومعرفة كل جديد تفضلوا بزيارة صفحتنا على فيسبوك:
اضغط هنا https://www.facebook.com/share/1GuHc8Lpev/?mibextid=wwXIfr

شكرًا لثقتكم، ونحن في خدمتكم دائمًا.`,

    "تم التقديم في السيستام": `مرحباً ${client.full_name}،

📝 تم التقديم في السيستام!

تم إدخال معلوماتكم في نظام التأشيرات بنجاح.

📋 الحالة الحالية: تم التقديم في السيستام
📅 التاريخ: ${currentDate}

سيتم إعلامكم بأي تحديثات جديدة.

شكراً لثقتكم بنا.

📲 للتواصل معنا عبر الواتساب:

📍 إذا كنتم في ليبيا:
نضال – ‪+218912384046‬ https://wa.me/218912384046

📍 إذا كنتم في تونس:
•  أميرة – ‪+21628846888‬ https://wa.me/21628846888
•  أميمة – ‪+21622655723‬ https://wa.me/21622655723
•  سفيان – ‪+21629549995‬ https://wa.me/21629549995
•  محمد – ‪+21622437558‬ https://wa.me/21622437558

📌 للمتابعة ومعرفة كل جديد تفضلوا بزيارة صفحتنا على فيسبوك:
اضغط هنا https://www.facebook.com/share/1GuHc8Lpev/?mibextid=wwXIfr

شكرًا لثقتكم، ونحن في خدمتكم دائمًا.`,

    "تم التقديم إلى السفارة": `مرحباً ${client.full_name}،

🏛️ تم التقديم إلى السفارة!

تم إرسال جوازك الي السفارة.
${client.embassy_receipt_date ? `📅 تاريخ الاستلام من السفارة: ${client.embassy_receipt_date}` : ''}

📋 الحالة الحالية: قيد المعالجة في السفارة
📅 التاريخ: ${currentDate}

نحن بانتظار الرد من السفارة وسنبقيكم على اطلاع.

شكراً لثقتكم بنا.

📲 للتواصل معنا عبر الواتساب:

📍 إذا كنتم في ليبيا:
نضال – ‪+218912384046‬ https://wa.me/218912384046

📍 إذا كنتم في تونس:
•  أميرة – ‪+21628846888‬ https://wa.me/21628846888
•  أميمة – ‪+21622655723‬ https://wa.me/21622655723
•  سفيان – ‪+21629549995‬ https://wa.me/21629549995
•  محمد – ‪+21622437558‬ https://wa.me/21622437558

📌 للمتابعة ومعرفة كل جديد تفضلوا بزيارة صفحتنا على فيسبوك:
اضغط هنا https://www.facebook.com/share/1GuHc8Lpev/?mibextid=wwXIfr

شكرًا لثقتكم، ونحن في خدمتكم دائمًا.`,

    "تم قبول التأشيرة": `🎉 تهانينا!

مرحباً ${client.full_name}،

🎊 تم قبول التأشيرة الخاصة بك!

📋 الحالة الحالية: تمت الموافقة على التأشيرة
📅 التاريخ: ${currentDate}

يمكنكم الآن تسليم جواز السفر إذا لم يكن متوفراً لنا.

شكراً لثقتكم بنا.

📲 للتواصل معنا عبر الواتساب:

📍 إذا كنتم في ليبيا:
نضال – ‪+218912384046‬ https://wa.me/218912384046

📍 إذا كنتم في تونس:
•  أميرة – ‪+21628846888‬ https://wa.me/21628846888
•  أميمة – ‪+21622655723‬ https://wa.me/21622655723
•  سفيان – ‪+21629549995‬ https://wa.me/21629549995
•  محمد – ‪+21622437558‬ https://wa.me/21622437558

📌 للمتابعة ومعرفة كل جديد تفضلوا بزيارة صفحتنا على فيسبوك:
اضغط هنا https://www.facebook.com/share/1GuHc8Lpev/?mibextid=wwXIfr

شكرًا لثقتكم، ونحن في خدمتكم دائمًا.`,

    "غير موافق عليها التأشيرة": `مرحباً ${client.full_name}،

نأسف لإبلاغكم بأنه لم تتم الموافقة على طلب التأشيرة هذه المرة.

📋 الحالة الحالية: غير موافق عليها
📅 التاريخ: ${currentDate}

يرجى التواصل معنا لمعرفة التفاصيل والخيارات المتاحة.

نحن هنا لمساعدتكم.

📲 للتواصل معنا عبر الواتساب:

📍 إذا كنتم في ليبيا:
نضال – ‪+218912384046‬ https://wa.me/218912384046

📍 إذا كنتم في تونس:
•  أميرة – ‪+21628846888‬ https://wa.me/21628846888
•  أميمة – ‪+21622655723‬ https://wa.me/21622655723
•  سفيان – ‪+21629549995‬ https://wa.me/21629549995
•  محمد – ‪+21622437558‬ https://wa.me/21622437558

📌 للمتابعة ومعرفة كل جديد تفضلوا بزيارة صفحتنا على فيسبوك:
اضغط هنا https://www.facebook.com/share/1GuHc8Lpev/?mibextid=wwXIfr

شكرًا لثقتكم، ونحن في خدمتكم دائمًا.`,

    "اكتملت العملية": `مرحباً ${client.full_name}،

نحيطكم علمًا بأنه تم استلام جواز سفركم من السفارة مختوم بالتأشيرة، ونرجو منكم استلام جواز سفركم في أسرع وقت ممكن.

• بالنسبة للجوازات التونسية: التحول على عين المكان إلى مقر شركتنا
• بالنسبة للجوازات الليبية: رجاء الاتصال بمندوبنا في ليبيا السيد نضال

📲 للتواصل معنا عبر الواتساب:

📍 إذا كنتم في ليبيا:
نضال – ‪+218912384046‬ https://wa.me/218912384046

📍 إذا كنتم في تونس:
•  أميرة – ‪+21628846888‬ https://wa.me/21628846888
•  أميمة – ‪+21622655723‬ https://wa.me/21622655723
•  سفيان – ‪+21629549995‬ https://wa.me/21629549995
•  محمد – ‪+21622437558‬ https://wa.me/21622437558

📌 للمتابعة ومعرفة كل جديد تفضلوا بزيارة صفحتنا على فيسبوك:
اضغط هنا https://www.facebook.com/share/1GuHc8Lpev/?mibextid=wwXIfr

شكرًا لثقتكم، ونحن في خدمتكم دائمًا.`
  };

  return messages[newStatus] || `مرحباً ${client.full_name}،

تم تحديث حالة تأشيرتك إلى: *${newStatus}*

📋 معلومات الطلب:
• رقم العميل: ${client.client_id_number || 'غير محدد'}
• التاريخ: ${currentDate}

شكراً لثقتكم بنا.

---
شركة تونس للاستشارات والخدمات
📱 Facebook: https://www.facebook.com/share/1D4dHp2z74/?mibextid=wwXIfr`;
};

export const sendVisaStatusUpdate = async (client: Client, newStatus: string) => {
  const message = getVisaStatusUpdateMessage(client, newStatus);
  
  // Send WhatsApp message
  await sendWhatsAppMessage(client, message);
  
  // Log to history
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    await supabase.from('whatsapp_message_history').insert({
      client_id: client.id,
      visa_status: newStatus,
      user_id: client.user_id
    });
    
    // Send push notification to assigned employee
    await supabase.functions.invoke('send-push-notification', {
      body: {
        clientId: client.id,
        title: 'تحديث حالة التأشيرة',
        body: `${client.full_name}: ${newStatus}`,
        tag: `client-${client.id}`,
        data: {
          clientId: client.id,
          clientName: client.full_name,
          newStatus: newStatus,
        }
      }
    });
  } catch (error) {
    console.error('Error logging message or sending push notification:', error);
  }
};

export const sendUrgentMessage = async (client: Client) => {
  const message = `مرحباً ${client.full_name}،

عاجل – تم قبول تأشيرتكم

نحيطكم علمًا بأنه تم قبول تأشيرتكم، ونرجو منكم تسليم جواز سفركم في أقرب وقت ممكن لإتمام الإجراءات النهائية.

📲 للتواصل معنا عبر الواتساب:

📍 إذا كنتم في ليبيا:
نضال – ‪+218912384046‬ https://wa.me/218912384046

📍 إذا كنتم في تونس:
•  أميرة – ‪+21628846888‬ https://wa.me/21628846888
•  أميمة – ‪+21622655723‬ https://wa.me/21622655723
•  سفيان – ‪+21629549995‬ https://wa.me/21629549995
•  محمد – ‪+21622437558‬ https://wa.me/21622437558

📌 للمتابعة ومعرفة كل جديد تفضلوا بزيارة صفحتنا على فيسبوك:
اضغط هنا https://www.facebook.com/share/1GuHc8Lpev/?mibextid=wwXIfr

شكرًا لثقتكم، ونحن في خدمتكم دائمًا.`;

  await sendWhatsAppMessage(client, message);
  
  // Log to history
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.from('whatsapp_message_history').insert({
      client_id: client.id,
      visa_status: 'رسالة عاجلة - تم قبول التأشيرة',
      user_id: client.user_id
    });
  } catch (error) {
    console.error('Error logging message:', error);
  }
};

export const sendCantonCompletedMessage = async (client: Client) => {
  const message = `مرحباً ${client.full_name}،

إشعار هام من شركة تونس للاستشارات والمساعدة (TCA)

نودّ إعلامكم بأنه تمّ إيقاف قبول تأشيرات معرض كانتون –  
وبهذه المناسبة، تتقدّم شركة TCA بخالص الشكر والتقدير لكل من اختار خدماتنا ووضع ثقته فينا 🙏

نعتذر لكم عن عدم التمكّن من الحصول على التأشيرة لهذه الدورة، ونتمنى أن نلتقي بكم في الدورات القادمة، بإذن الله.
🔸 نذكّركم بأن معرض كانتون يُقام مرتين في السنة:

	•	في شهر أبريل
	•	وفي شهر أكتوبر


شكرًا لتفهمكم وثقتكم المستمرة.
مع خالص تحيات فريق TCA – تونس للاستشارات والمساعدة 🇹🇳🇱🇾🇨🇳

📲 للتواصل معنا عبر الواتساب:


📍 إذا كنتم في ليبيا:
نضال – ‪+218912384046‬ https://wa.me/218912384046


📍 إذا كنتم في تونس:
•  أميرة – ‪+21628846888‬ https://wa.me/21628846888
•  أميمة – ‪+21622655723‬ https://wa.me/21622655723
•  سفيان – ‪+21629549995‬ https://wa.me/21629549995
•  محمد – ‪+21622437558‬ https://wa.me/21622437558


📌 للمتابعة ومعرفة كل جديد تفضلوا بزيارة صفحتنا على فيسبوك:
اضغط هنا https://www.facebook.com/share/1GuHc8Lpev/?mibextid=wwXIfr`;

  await sendWhatsAppMessage(client, message);
  
  // Log to history
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.from('whatsapp_message_history').insert({
      client_id: client.id,
      visa_status: 'نهاية معرض كانتون',
      user_id: client.user_id
    });
  } catch (error) {
    console.error('Error logging message:', error);
  }
};

export const sendPersonalAttendanceMessage = async (client: Client, date: string, time: string) => {
  const message = `مرحباً ${client.full_name}،

📝 تم التقديم في السفارة!

نعلمكم بانهو لديكم موعد بالحضور الشخصي في 
📅 التاريخ: ${date} مع الساعة ${time}

نرجو من سيادتكم الالتزام بالموعد  لا تتحمل شركتنا اي اشكال في حالة التاخر علي الموعد 

📲 للتواصل معنا عبر الواتساب:

📍 إذا كنتم في ليبيا:
نضال – ‪+218912384046‬ https://wa.me/218912384046

📍 إذا كنتم في تونس:
•  أميرة – ‪+21628846888‬ https://wa.me/21628846888
•  أميمة – ‪+21622655723‬ https://wa.me/21622655723
•  سفيان – ‪+21629549995‬ https://wa.me/21629549995
•  محمد – ‪+21622437558‬ https://wa.me/21622437558

📌 للمتابعة ومعرفة كل جديد تفضلوا بزيارة صفحتنا على فيسبوك:
اضغط هنا https://www.facebook.com/share/1GuHc8Lpev/?mibextid=wwXIfr

شكرًا لثقتكم، ونحن في خدمتكم دائمًا.`;

  await sendWhatsAppMessage(client, message);
  
  // Log to history
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.from('whatsapp_message_history').insert({
      client_id: client.id,
      visa_status: `موعد حضور شخصي - ${date} ${time}`,
      user_id: client.user_id
    });
  } catch (error) {
    console.error('Error logging message:', error);
  }
};

export const sendPaymentReminderMessage = async (client: Client) => {
  const message = `مرحباً ${client.full_name}،

🔔 تذكير بالدفع:
نرجو منكم التفضل بإتمام عملية الدفع في أقرب وقت ممكن حتى نتمكن من مواصلة الإجراءات بدون تأخير.

سيتم إعلامكم بأي تحديثات جديدة فور توفرها.

📍 عنوان المكتب:
https://maps.app.goo.gl/wiNAZ3G4U9VQQMMr8?g_st=ipc

📲 للتواصل معنا عبر الواتساب:

📍 إذا كنتم في ليبيا:
نضال – +218912384046
https://wa.me/218912384046

📍 إذا كنتم في تونس:
• أميرة – +21628846888
https://wa.me/21628846888
• أميمة – +21622655723
https://wa.me/21622655723
• سفيان – +21629549995
https://wa.me/21629549995
• محمد – +21622437558
https://wa.me/21622437558

📌 للمتابعة ومعرفة كل جديد تفضلوا بزيارة صفحتنا على فيسبوك:
https://www.facebook.com/share/1GuHc8Lpev/?mibextid=wwXIfr

شكرًا لثقتكم، ونحن في خدمتكم دائمًا.`;

  await sendWhatsAppMessage(client, message);
  
  // Log to history
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.from('whatsapp_message_history').insert({
      client_id: client.id,
      visa_status: 'تذكير بالدفع',
      user_id: client.user_id
    });
  } catch (error) {
    console.error('Error logging message:', error);
  }
};
