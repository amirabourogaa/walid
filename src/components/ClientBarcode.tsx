import Barcode from 'react-barcode';

interface ClientBarcodeProps {
  value: string;
  displayValue?: boolean;
  width?: number;
  height?: number;
}

export function ClientBarcode({ value, displayValue = true, width = 2, height = 50 }: ClientBarcodeProps) {
  // Check if value is empty or invalid
  if (!value || value === '||N/A') {
    return null;
  }

  // Remove non-ASCII characters (like Arabic text)
  const cleanValue = value.replace(/[^\x00-\x7F]/g, '').trim();
  
  // Check if cleaned value is valid
  if (!cleanValue || cleanValue.length === 0) {
    return null;
  }

  try {
    return (
      <div className="flex items-center justify-center p-2 bg-white rounded">
        <Barcode
          value={cleanValue}
          format="CODE128"
          displayValue={displayValue}
          width={width}
          height={height}
          fontSize={12}
        />
      </div>
    );
  } catch (error) {
    console.error('Barcode generation error:', error);
    return null;
  }
}