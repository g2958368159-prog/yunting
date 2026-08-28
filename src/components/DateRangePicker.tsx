import { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isSameDay, isBefore, isAfter } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(parseISO(startDate || format(new Date(), 'yyyy-MM-dd')));
  const [selectionStep, setSelectionStep] = useState<'start' | 'end'>('start');
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const startObj = startDate ? parseISO(startDate) : null;
  const endObj = endDate ? parseISO(endDate) : null;

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const startDayIndex = daysInMonth[0].getDay();
  const blanks = Array.from({ length: startDayIndex }, (_, i) => i);

  const handleDayClick = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    if (selectionStep === 'start') {
      onChange(dayStr, dayStr);
      setSelectionStep('end');
    } else {
      if (startObj && isBefore(day, startObj)) {
        // 选定的结束时间比开始时间早，重置为新的开始时间
        onChange(dayStr, dayStr);
      } else {
        onChange(startDate, dayStr);
        setSelectionStep('start'); // 完成一个闭环
      }
    }
  };

  return (
    <div className="w-full max-w-[280px] select-none bg-surface border border-tertiary/10 rounded-xl p-3 shadow-sm mx-auto">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-medium text-primary text-sm">
          {format(currentMonth, 'yyyy年MM月')}
        </h3>
        <div className="flex gap-1 text-tertiary">
          <button type="button" onClick={prevMonth} className="hover:text-primary transition-colors p-1 rounded hover:bg-surface-hover"><ChevronLeft size={16} /></button>
          <button type="button" onClick={nextMonth} className="hover:text-primary transition-colors p-1 rounded hover:bg-surface-hover"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center mb-1">
        {weekDays.map(day => (
          <div key={day} className="text-[11px] text-tertiary font-medium py-1">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1" onMouseLeave={() => setHoverDate(null)}>
        {blanks.map(i => (
          <div key={`blank-${i}`} className="h-8" />
        ))}
        {daysInMonth.map(day => {
          const isStart = startObj && isSameDay(day, startObj);
          const isEnd = endObj && isSameDay(day, endObj);
          
          let isInRange = false;
          if (startObj && endObj && isAfter(day, startObj) && isBefore(day, endObj)) {
            isInRange = true;
          } else if (startObj && selectionStep === 'end' && hoverDate && isAfter(day, startObj) && isBefore(day, hoverDate)) {
            isInRange = true;
          }

          const isRangeStart = isStart && ((endObj && startObj && isAfter(endObj, startObj)) || (selectionStep === 'end' && hoverDate && startObj && isAfter(hoverDate, startObj)));
          const isRangeEnd = isEnd && startObj && endObj && isBefore(startObj, endObj);
          const isHoverEnd = selectionStep === 'end' && hoverDate && startObj && isSameDay(day, hoverDate) && isAfter(hoverDate, startObj);

          return (
            <div 
              key={day.toISOString()} 
              className="relative h-8 flex items-center justify-center"
              onMouseEnter={() => setHoverDate(day)}
            >
              {/* 区间背景连线 */}
              {(isInRange || isRangeStart || isRangeEnd || isHoverEnd) && (
                <div className={cn(
                  "absolute inset-y-0.5 bg-accent/15",
                  (isRangeStart) ? "left-1/2 right-0" : "",
                  (isRangeEnd || isHoverEnd) ? "left-0 right-1/2" : "",
                  (isInRange) ? "inset-x-0" : ""
                )} />
              )}
              
              <button
                type="button"
                onClick={() => handleDayClick(day)}
                className={cn(
                  "relative h-7 w-7 rounded-full text-[13px] flex items-center justify-center transition-colors z-10",
                  (isStart || isEnd) 
                    ? "bg-accent text-white font-medium shadow-sm" 
                    : isInRange 
                      ? "text-accent font-medium"
                      : "text-primary hover:bg-surface-hover"
                )}
              >
                {format(day, 'd')}
              </button>
            </div>
          );
        })}
      </div>
      
      <div className="mt-2 text-center h-4">
        <span className="text-[11px] text-tertiary">
          {selectionStep === 'start' ? '请选择开始日期' : '请选择结束日期 (点自身可单日)'}
        </span>
      </div>
    </div>
  );
}
