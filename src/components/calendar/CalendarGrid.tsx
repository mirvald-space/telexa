
import React from 'react';
import { CalendarDay } from './CalendarDay';
import { getPostsForDate, weekDays } from './calendarUtils';
import type { Post } from '@/pages/Index';

interface CalendarGridProps {
  currentDate: Date;
  calendarDays: (number | null)[];
  posts: Post[];
  onPostClick: (post: Post) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  calendarDays,
  posts,
  onPostClick
}) => {
  const today = new Date();
  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && 
                         currentDate.getFullYear() === today.getFullYear();

  return (
    <div className="grid grid-cols-7 gap-1 mb-4">
      {/* Week day headers */}
      {weekDays.map(day => (
        <div key={day} className="p-2 text-center text-gray-500 font-semibold text-sm">
          {day}
        </div>
      ))}
      
      {/* Calendar days */}
      {calendarDays.map((day, index) => {
        if (day === null) {
          return <CalendarDay key={index} day={null} date={new Date()} posts={[]} isToday={false} isPast={false} onPostClick={onPostClick} />;
        }

        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dayPosts = getPostsForDate(date, posts);
        const isToday = isCurrentMonth && day === today.getDate();
        const isPast = date < today;

        return (
          <CalendarDay
            key={day}
            day={day}
            date={date}
            posts={dayPosts}
            isToday={isToday}
            isPast={isPast}
            onPostClick={onPostClick}
          />
        );
      })}
    </div>
  );
};
