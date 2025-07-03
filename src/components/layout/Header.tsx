import React from 'react';
import { Button } from '@/components/ui/button';
import { Activity, Plus, List, BarChart2 } from 'lucide-react';
import { UserMenu } from '@/components/auth/UserMenu';
import { useNavigate, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  onViewChange?: (view: string) => void;
  activeView?: string;
  showNavigation?: boolean;
  postsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ 
  onViewChange, 
  activeView = 'dashboard',
  showNavigation = true,
  postsCount = 0
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Определяем, находимся ли мы на главной странице
  const isMainPage = location.pathname === '/dashboard';
  const isAnalyticsPage = location.pathname === '/analytics';

  return (
    <header className="max-w-4xl flex justify-between w-full mx-auto p-4">

        <div className="flex items-center gap-4">
          <h1 
            className="text-2xl font-bold tracking-tight cursor-pointer" 
            onClick={() => navigate('/')}
          >
            Telexa
          </h1>
          
          {showNavigation && (
            <div className="lg:flex gap-2 items-center hidden">
              <Button
                variant={activeView === 'dashboard' && !isAnalyticsPage ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  if (isMainPage) {
                    onViewChange && onViewChange('dashboard');
                  } else {
                    navigate('/dashboard');
                  }
                }}
              >
                <Activity className="h-4 w-4 mr-2" />
                Дашборд
              </Button>
              <Button
                variant={activeView === 'posts' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  if (isMainPage) {
                    onViewChange && onViewChange('posts');
                  } else {
                    navigate('/dashboard?view=posts');
                  }
                }}
              >
                <List className="h-4 w-4 mr-2" />
                Посты
                {postsCount > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-gray-200 text-gray-900">
                    {postsCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={isAnalyticsPage ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/analytics')}
              >
                <BarChart2 className="h-4 w-4 mr-2" />
                Аналитика
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {showNavigation && (
            <Button
              className="bg-[#0088cc] hover:bg-[#0077b6] text-white"
              size="sm"
              onClick={() => {
                if (isMainPage) {
                  onViewChange && onViewChange('editor');
                } else {
                  navigate('/dashboard?view=editor');
                }
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Создать пост
            </Button>
          )}
          <UserMenu />

      </div>
      
      {showNavigation && (
        <div className="flex lg:hidden border-t overflow-x-auto">
          <Button
            variant={activeView === 'dashboard' && !isAnalyticsPage ? 'default' : 'ghost'}
            className="flex-1 rounded-none"
            onClick={() => {
              if (isMainPage) {
                onViewChange && onViewChange('dashboard');
              } else {
                navigate('/dashboard');
              }
            }}
          >
            <Activity className="h-4 w-4 mr-2" />
            Дашборд
          </Button>
          <Button
            className="flex-1 rounded-none bg-[#0088cc] hover:bg-[#0077b6] text-white"
            onClick={() => {
              if (isMainPage) {
                onViewChange && onViewChange('editor');
              } else {
                navigate('/dashboard?view=editor');
              }
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Создать
          </Button>
          <Button
            variant={activeView === 'posts' ? 'default' : 'ghost'}
            className="flex-1 rounded-none"
            onClick={() => {
              if (isMainPage) {
                onViewChange && onViewChange('posts');
              } else {
                navigate('/dashboard?view=posts');
              }
            }}
          >
            <List className="h-4 w-4 mr-2" />
            Посты
            {postsCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-gray-200 text-gray-900 text-xs">
                {postsCount}
              </Badge>
            )}
          </Button>
          <Button
            variant={isAnalyticsPage ? 'default' : 'ghost'}
            className="flex-1 rounded-none"
            onClick={() => navigate('/analytics')}
          >
            <BarChart2 className="h-4 w-4 mr-2" />
            Аналитика
          </Button>
        </div>
      )}
    </header>
  );
}; 