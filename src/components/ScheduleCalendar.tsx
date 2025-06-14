
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import type { Post } from '@/pages/Index';

interface ScheduleCalendarProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
}

export const Calendar: React.FC<ScheduleCalendarProps> = ({ posts, onPostClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getPostsForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return posts.filter(post => 
      new Date(post.scheduled_time).toDateString() === dateStr
    );
  };

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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const today = new Date();
  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && 
                         currentDate.getFullYear() === today.getFullYear();

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
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Schedule Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={goToToday}
                variant="outline"
                size="sm"
                className="border-gray-200"
              >
                Today
              </Button>
              <Button
                onClick={() => navigateMonth('prev')}
                variant="outline"
                size="sm"
                className="border-gray-200 p-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => navigateMonth('next')}
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
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
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
                return <div key={index} className="p-2 h-20"></div>;
              }

              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const dayPosts = getPostsForDate(date);
              const isToday = isCurrentMonth && day === today.getDate();
              const isPast = date < today;

              return (
                <div
                  key={day}
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
                      {dayPosts.slice(0, 2).map(post => (
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
                      {dayPosts.length > 2 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{dayPosts.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Posts */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Upcoming Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {posts
              .filter(post => 
                post.status === 'scheduled' && 
                new Date(post.scheduled_time) > new Date()
              )
              .sort((a, b) => 
                new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
              )
              .slice(0, 5)
              .map(post => (
                <div
                  key={post.id}
                  onClick={() => onPostClick(post)}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-all border border-gray-100"
                >
                  <div className="flex-1">
                    <p className="text-gray-900 text-sm truncate max-w-md">
                      {post.content}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(post.scheduled_time).toLocaleString()}
                    </p>
                  </div>
                  <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                    <Clock className="w-3 h-3 mr-1" />
                    Scheduled
                  </Badge>
                </div>
              ))
            }
            {posts.filter(post => 
              post.status === 'scheduled' && 
              new Date(post.scheduled_time) > new Date()
            ).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No upcoming posts scheduled
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
