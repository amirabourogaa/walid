import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface StatisticsFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  onExportPDF: () => void;
  showEmployeeFilter?: boolean;
  showCountryFilter?: boolean;
  showStatusFilter?: boolean;
  showSourceFilter?: boolean;
  employees?: { id: string; name: string }[];
  countries?: string[];
}

export interface FilterState {
  periodType: 'day' | 'month' | 'year' | 'custom';
  startDate?: Date;
  endDate?: Date;
  employeeId?: string;
  country?: string;
  invoiceStatus?: 'all' | 'مدفوعة' | 'متأخرة';
  sourceType?: 'all' | 'caisse' | 'bank';
  sourceId?: string;
}

export default function StatisticsFilters({
  onFilterChange,
  onExportPDF,
  showEmployeeFilter = false,
  showCountryFilter = false,
  showStatusFilter = false,
  showSourceFilter = false,
  employees = [],
  countries = [],
}: StatisticsFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    periodType: 'month',
    invoiceStatus: 'all',
    sourceType: 'all',
  });

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Period Type */}
        <div className="space-y-2">
          <Label>الفترة الزمنية</Label>
          <Select
            value={filters.periodType}
            onValueChange={(value) => updateFilter('periodType', value as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">يوم</SelectItem>
              <SelectItem value="month">شهر</SelectItem>
              <SelectItem value="year">سنة</SelectItem>
              <SelectItem value="custom">تاريخ مخصص</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range */}
        {filters.periodType === 'custom' && (
          <>
            <div className="space-y-2">
              <Label>من تاريخ</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-right">
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {filters.startDate ? format(filters.startDate, 'PPP', { locale: ar }) : 'اختر التاريخ'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => updateFilter('startDate', date)}
                    locale={ar}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>إلى تاريخ</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-right">
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {filters.endDate ? format(filters.endDate, 'PPP', { locale: ar }) : 'اختر التاريخ'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => updateFilter('endDate', date)}
                    locale={ar}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </>
        )}

        {/* Employee Filter */}
        {showEmployeeFilter && employees.length > 0 && (
          <div className="space-y-2">
            <Label>الموظف</Label>
            <Select
              value={filters.employeeId}
              onValueChange={(value) => updateFilter('employeeId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="جميع الموظفين" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الموظفين</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Country Filter */}
        {showCountryFilter && countries.length > 0 && (
          <div className="space-y-2">
            <Label>البلد</Label>
            <Select
              value={filters.country}
              onValueChange={(value) => updateFilter('country', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="جميع البلدان" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع البلدان</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Invoice Status Filter */}
        {showStatusFilter && (
          <div className="space-y-2">
            <Label>حالة الفاتورة</Label>
            <Select
              value={filters.invoiceStatus}
              onValueChange={(value) => updateFilter('invoiceStatus', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="مدفوعة">مدفوعة</SelectItem>
                <SelectItem value="متأخرة">متأخرة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Source Filter */}
        {showSourceFilter && (
          <div className="space-y-2">
            <Label>مصدر التحصيل</Label>
            <Select
              value={filters.sourceType}
              onValueChange={(value) => updateFilter('sourceType', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="caisse">الصناديق</SelectItem>
                <SelectItem value="bank">الحسابات البنكية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button onClick={onExportPDF} className="gap-2">
          <Download className="h-4 w-4" />
          تصدير PDF
        </Button>
      </div>
    </div>
  );
}
