import React from 'react';

export type DateRange = 'day' | 'week' | 'month' | 'year';

interface DateRangeSelectorProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  className?: string;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ 
  selectedRange, 
  onRangeChange, 
  className = '' 
}) => {
  const ranges: { value: DateRange; label: string }[] = [
    { value: 'day', label: 'Hari' },
    { value: 'week', label: 'Minggu' },
    { value: 'month', label: 'Bulan' },
    { value: 'year', label: 'Tahun' },
  ];

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
        Rentang Waktu:
      </span>
      <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
        {ranges.map((range) => (
          <button
            key={range.value}
            onClick={() => onRangeChange(range.value)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedRange === range.value
                ? 'bg-brand-primary text-white'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DateRangeSelector;