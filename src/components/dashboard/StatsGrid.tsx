import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, AlertCircle, List } from 'lucide-react';

interface StatsGridProps {
  scheduledCount: number;
  sentCount: number;
  failedCount: number;
  totalCount: number;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  scheduledCount,
  sentCount,
  failedCount,
  totalCount
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="border-gray-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">Запланировано</CardTitle>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{scheduledCount}</div>
          <p className="text-sm text-gray-500 mt-1">Готово к отправке</p>
        </CardContent>
      </Card>
      
      <Card className="border-gray-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">Отправлено</CardTitle>
            <CheckCircle className="h-5 w-5 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{sentCount}</div>
          <p className="text-sm text-gray-500 mt-1">Успешно доставлено</p>
        </CardContent>
      </Card>

      <Card className="border-gray-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">С ошибками</CardTitle>
            <AlertCircle className="h-5 w-5 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{failedCount}</div>
          <p className="text-sm text-gray-500 mt-1">Требуют внимания</p>
        </CardContent>
      </Card>

      <Card className="border-gray-200 bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">Всего</CardTitle>
            <List className="h-5 w-5 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{totalCount}</div>
          <p className="text-sm text-gray-500 mt-1">Все посты</p>
        </CardContent>
      </Card>
    </div>
  );
}; 