import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Monitor } from "lucide-react";

interface WhatsAppChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoice: (useWeb: boolean) => void;
  clientName: string;
}

export function WhatsAppChoiceDialog({ open, onOpenChange, onChoice, clientName }: WhatsAppChoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center">
            إرسال رسالة إلى {clientName}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 p-4">
          <p className="text-center text-muted-foreground">
            اختر طريقة إرسال الرسالة عبر واتساب:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={() => {
                onChoice(true);
                onOpenChange(false);
              }}
              className="h-16 flex flex-col gap-2"
              variant="default"
            >
              <Monitor className="h-6 w-6" />
              <span>واتساب ويب</span>
            </Button>
            <Button
              onClick={() => {
                onChoice(false);
                onOpenChange(false);
              }}
              className="h-16 flex flex-col gap-2"
              variant="outline"
            >
              <Smartphone className="h-6 w-6" />
              <span>تطبيق الهاتف / Windows</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
