
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import type { Post } from '@/pages/Index';

interface UpcomingPostsProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
}

export const UpcomingPosts: React.FC<UpcomingPostsProps> = ({
  posts,
  onPostClick
}) => {
  const upcomingPosts = posts
    .filter(post => 
      post.status === 'scheduled' && 
      new Date(post.scheduled_time) > new Date()
    )
    .sort((a, b) => 
      new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
    )
    .slice(0, 5);

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-900">Upcoming Posts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingPosts.map(post => (
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
          ))}
          {upcomingPosts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No upcoming posts scheduled
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
