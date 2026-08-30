import { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import type { DateString, Task } from '../types';

interface CalendarWidgetProps {
  tasks: Task[];
  targetDate: DateString;
  onChangeDate: (date: DateString) => void;
  physicalToday: DateString;
}

export function CalendarWidget({ tasks, targetDate, onChangeDate, physicalToday }: CalendarWidgetProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(parseISO(targetDate)));

  const targetDateObj = parseISO(targetDate);
  const todayObj = parseISO(physicalToday);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-medium text-primary text-sm">
          {format(currentMonth, 'yyyy年MM月')}
        </h3>
        <div className="flex gap-1 text-tertiary">
          <button onClick={prevMonth} className="hover:text-primary transition-colors p-1 rounded hover:bg-surface-hover"><ChevronLeft size={16} /></button>
          <button onClick={nextMonth} className="hover:text-primary transition-colors p-1 rounded hover:bg-surface-hover"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-[11px] text-tertiary font-medium py-1">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {calendarDays.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const isSelected = isSameDay(day, targetDateObj);
          const isToday = isSameDay(day, todayObj);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          // 核心点逻辑：依照新规
          let hasUnfinished = false;
          let hasFinished = false;

          for (const t of tasks) {
            if (t.is_deleted) continue;
            
            const [start, endStr] = t.creation_date.split('_');
            const end = endStr || start;
            
            const belongsToDay = dayStr >= start && dayStr <= end;
            
            if (belongsToDay && !t.completion_date) {
              hasUnfinished = true;
            }
            if (t.completion_date && dayStr >= start && dayStr <= t.completion_date) {
              hasFinished = true;
            }
          }

          return (
            <button
              key={day.toISOString()}
              onClick={() => {
                onChangeDate(dayStr);
                if (!isCurrentMonth) {
                  setCurrentMonth(startOfMonth(day));
                }
              }}
              className={cn(
                "h-8 w-8 mx-auto rounded-md text-sm flex items-center justify-center transition-colors relative flex-col",
                isSelected 
                  ? "bg-accent text-white font-medium shadow-sm" 
                  : cn(
                      "hover:bg-surface-hover",
                      !isCurrentMonth ? "text-tertiary opacity-40 font-normal" : (isToday ? "text-accent font-medium" : "text-primary")
                    )
              )}
            >
              <span>{isToday && isCurrentMonth ? '今' : format(day, 'd')}</span>
              {(hasUnfinished || hasFinished) && (
                <span className={cn(
                  "absolute bottom-1 w-1 h-1 rounded-full",
                  hasUnfinished ? "bg-orange-400" : "bg-tertiary/40",
                  isSelected && hasUnfinished ? "bg-white/80" : "",
                  isSelected && !hasUnfinished && hasFinished ? "bg-white/50" : ""
                )} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
