
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { monthNames } from './calendarUtils';

interface CalendarHeaderProps {
  currentDate: Date;
  onNavigateMonth: (direction: 'prev' | 'next') => void;
  onGoToToday: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  onNavigateMonth,
  onGoToToday
}) => {
  return (
    <div className="pb-4">
      <div className="flex items-center justify-between">
        <div className="text-gray-900 flex items-center gap-2 text-lg font-semibold">
          <CalendarIcon className="w-5 h-5" />
          Schedule Calendar
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onGoToToday}
            variant="outline"
            size="sm"
            className="border-gray-200"
          >
            Today
          </Button>
          <Button
            onClick={() => onNavigateMonth('prev')}
            variant="outline"
            size="sm"
            className="border-gray-200 p-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => onNavigateMonth('next')}
            variant="outline"
            size="sm"
            className="border-gray-200 p-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
      </div>
    </div>
  );
};
