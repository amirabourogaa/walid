import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

export default function WhatsAppTest() {
  const [phoneNumber, setPhoneNumber] = useState("21654372272");
  const [message, setMessage] = useState("مرحبا! هذه رسالة تجريبية من نظام إدارة التأشيرات.");
  const [isSending, setIsSending] = useState(false);

  const handleSendTest = async () => {
    if (!phoneNumber || !message) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم الهاتف والرسالة",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-status', {
        body: {
          to: phoneNumber,
          message: message
        }
      });

      if (error) {
        console.error("WhatsApp error:", error);
        toast({
          title: "خطأ في الإرسال",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log("WhatsApp success:", data);
        toast({
          title: "✅ تم الإرسال بنجاح",
          description: `تم إرسال الرسالة إلى ${phoneNumber}`,
        });
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "خطأ",
        description: error.message || "فشل إرسال الرسالة",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">اختبار WhatsApp</CardTitle>
            <CardDescription>
              أرسل رسالة تجريبية عبر WhatsApp Business API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف (بدون +)</Label>
              <Input
                id="phone"
                type="text"
                placeholder="21654372272"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                dir="ltr"
              />
              <p className="text-sm text-muted-foreground">
                أدخل الرقم بالصيغة الدولية بدون + (مثال: 21654372272)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">الرسالة</Label>
              <Textarea
                id="message"
                placeholder="اكتب رسالتك هنا..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleSendTest}
              disabled={isSending}
              className="w-full"
              size="lg"
            >
              {isSending ? (
                "جاري الإرسال..."
              ) : (
                <>
                  <Send className="ml-2 h-4 w-4" />
                  إرسال رسالة تجريبية
                </>
              )}
            </Button>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">ملاحظات:</h3>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>تأكد من إدخال رقم الهاتف بالصيغة الدولية بدون علامة +</li>
                <li>الرقم يجب أن يكون مسجلاً على WhatsApp</li>
                <li>تحقق من صحة Token و Phone Number ID</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
