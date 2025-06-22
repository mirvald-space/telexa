import React from 'react';
import { Button } from '@/components/ui/button';
import { Activity, Plus, List } from 'lucide-react';
import { UserMenu } from '@/components/auth/UserMenu';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  onViewChange?: (view: string) => void;
  activeView?: string;
  showNavigation?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onViewChange, 
  activeView = 'dashboard',
  showNavigation = true
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Определяем, находимся ли мы на главной странице
  const isMainPage = location.pathname === '/';

  return (
    <header className="max-w-4xl flex justify-between items-center mx-auto p-4">

        <div className="flex items-center gap-4">
          <h1 
            className="text-2xl font-bold tracking-tight cursor-pointer" 
            onClick={() => navigate('/')}
          >
            Telexa
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
          {isMainPage && onViewChange && (
            <Button
              className="bg-[#0088cc] hover:bg-[#0077b6] text-white"
              size="sm"
              onClick={() => onViewChange('editor')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Создать пост
            </Button>
          )}
          <UserMenu />

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
            className="flex-1 rounded-none bg-[#0088cc] hover:bg-[#0077b6] text-white"
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