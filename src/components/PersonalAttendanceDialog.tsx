import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";

interface PersonalAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (date: string, time: string) => void;
  clientName: string;
}

export function PersonalAttendanceDialog({ 
  open, 
  onOpenChange, 
  onSend, 
  clientName 
}: PersonalAttendanceDialogProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const handleSend = () => {
    if (!date || !time) {
      return;
    }
    onSend(date, time);
    setDate("");
    setTime("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Calendar className="h-5 w-5" />
            <span>رسالة الحضور الشخصي</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 p-4">
          <div className="text-center text-sm text-muted-foreground mb-4">
            إرسال رسالة موعد حضور شخصي إلى: <strong>{clientName}</strong>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">التاريخ</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-right"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="time">الساعة</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="text-right"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSend}
            disabled={!date || !time}
          >
            إرسال الرسالة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
