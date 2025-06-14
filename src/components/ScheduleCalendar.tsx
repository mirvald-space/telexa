
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CalendarHeader } from './calendar/CalendarHeader';
import { CalendarGrid } from './calendar/CalendarGrid';
import { UpcomingPosts } from './calendar/UpcomingPosts';
import { getDaysInMonth, getFirstDayOfMonth } from './calendar/calendarUtils';
import type { Post } from '@/pages/Index';

interface ScheduleCalendarProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
}

export const Calendar: React.FC<ScheduleCalendarProps> = ({ posts, onPostClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  // Create calendar grid
  const calendarDays = [];
  
  // Empty cells for days before the first day of month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div className="space-y-6">
      <Card className="border-gray-200">
        <CardHeader>
          <CalendarHeader
            currentDate={currentDate}
            onNavigateMonth={navigateMonth}
            onGoToToday={goToToday}
          />
        </CardHeader>
        <CardContent>
          <CalendarGrid
            currentDate={currentDate}
            calendarDays={calendarDays}
            posts={posts}
            onPostClick={onPostClick}
          />
        </CardContent>
      </Card>

      <UpcomingPosts posts={posts} onPostClick={onPostClick} />
    </div>
  );
};
