import { QRCodeSVG } from 'qrcode.react';

interface ClientQRCodeProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
}

export function ClientQRCode({ 
  value, 
  size = 200, 
  level = 'M',
  includeMargin = true 
}: ClientQRCodeProps) {
  // Check if value is empty or invalid
  if (!value || value.trim() === '') {
    return (
      <div className="flex items-center justify-center p-4 bg-muted/50 rounded text-muted-foreground">
        <p className="text-sm">بيانات غير صالحة</p>
      </div>
    );
  }

  try {
    return (
      <div className="flex items-center justify-center p-2 bg-white rounded">
        <QRCodeSVG
          value={value}
          size={size}
          level={level}
          includeMargin={includeMargin}
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
    );
  } catch (error) {
    console.error('QR Code generation error:', error);
    return (
      <div className="flex items-center justify-center p-4 bg-muted/50 rounded text-destructive">
        <p className="text-sm">خطأ في إنشاء رمز QR</p>
      </div>
    );
  }
}
