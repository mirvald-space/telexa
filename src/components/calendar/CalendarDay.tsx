
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import type { Post } from '@/pages/Index';

interface CalendarDayProps {
  day: number | null;
  date: Date;
  posts: Post[];
  isToday: boolean;
  isPast: boolean;
  onPostClick: (post: Post) => void;
}

export const CalendarDay: React.FC<CalendarDayProps> = ({
  day,
  date,
  posts,
  isToday,
  isPast,
  onPostClick
}) => {
  if (day === null) {
    return <div className="p-2 h-20"></div>;
  }

  return (
    <div
      className={`p-2 h-20 border border-gray-200 rounded-lg transition-all hover:bg-gray-50 ${
        isToday ? 'bg-gray-100 border-gray-300' : 'bg-white'
      } ${isPast ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-col h-full">
        <div className={`text-sm font-semibold mb-1 ${
          isToday ? 'text-gray-900' : 'text-gray-700'
        }`}>
          {day}
        </div>
        <div className="flex-1 space-y-1">
          {posts.slice(0, 2).map(post => (
            <div
              key={post.id}
              onClick={() => onPostClick(post)}
              className="cursor-pointer"
            >
              <Badge 
                className={`text-xs px-1 py-0 truncate block w-full ${
                  post.status === 'scheduled' 
                    ? 'bg-gray-100 text-gray-700 border-gray-200' 
                    : post.status === 'sent'
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-red-100 text-red-700 border-red-200'
                }`}
              >
                <Clock className="w-2 h-2 mr-1 inline" />
                {new Date(post.scheduled_time).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Badge>
            </div>
          ))}
          {posts.length > 2 && (
            <div className="text-xs text-gray-500 text-center">
              +{posts.length - 2} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
