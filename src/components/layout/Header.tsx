import React from 'react';
import { Button } from '@/components/ui/button';
import { Activity, Plus, List, Send } from 'lucide-react';
import { UserMenu } from '@/components/auth/UserMenu';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  onViewChange?: (view: string) => void;
  activeView?: string;
  showNavigation?: boolean;
  onSendScheduled?: () => void;
  sendingPosts?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onViewChange, 
  activeView = 'dashboard',
  showNavigation = true,
  onSendScheduled,
  sendingPosts = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Определяем, находимся ли мы на главной странице
  const isMainPage = location.pathname === '/';

  return (
    <header className="border-b bg-card shadow-sm">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <h1 
            className="text-2xl font-bold tracking-tight cursor-pointer" 
            onClick={() => navigate('/')}
          >
            TelePost Scheduler
          </h1>
          
          {showNavigation && isMainPage && (
            <div className="lg:flex gap-2 items-center hidden">
              <Button
                variant={activeView === 'dashboard' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange && onViewChange('dashboard')}
              >
                <Activity className="h-4 w-4 mr-2" />
                Дашборд
              </Button>
              <Button
                variant={activeView === 'editor' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange && onViewChange('editor')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Создать пост
              </Button>
              <Button
                variant={activeView === 'posts' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange && onViewChange('posts')}
              >
                <List className="h-4 w-4 mr-2" />
                Посты
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isMainPage && onSendScheduled && (
            <Button variant="outline" onClick={onSendScheduled} disabled={sendingPosts}>
              {sendingPosts ? (
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-current"></div>
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Отправить запланированные
            </Button>
          )}
          <UserMenu />
        </div>
      </div>
      
      {showNavigation && isMainPage && (
        <div className="flex lg:hidden border-t overflow-x-auto">
          <Button
            variant={activeView === 'dashboard' ? 'default' : 'ghost'}
            className="flex-1 rounded-none"
            onClick={() => onViewChange && onViewChange('dashboard')}
          >
            <Activity className="h-4 w-4 mr-2" />
            Дашборд
          </Button>
          <Button
            variant={activeView === 'editor' ? 'default' : 'ghost'}
            className="flex-1 rounded-none"
            onClick={() => onViewChange && onViewChange('editor')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Создать
          </Button>
          <Button
            variant={activeView === 'posts' ? 'default' : 'ghost'}
            className="flex-1 rounded-none"
            onClick={() => onViewChange && onViewChange('posts')}
          >
            <List className="h-4 w-4 mr-2" />
            Посты
          </Button>
        </div>
      )}
    </header>
  );
}; 