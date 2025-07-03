import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PromoHeaderProps {
  onNavigate: (path: string) => void;
}

const PromoHeader: React.FC<PromoHeaderProps> = ({ onNavigate }) => {
  return (
    <header className="border-b">
      <div className="container mx-auto flex justify-between items-center py-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Telexa</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => onNavigate('/auth')}>
            Войти
          </Button>
          <Button onClick={() => onNavigate('/auth')}>
            Регистрация
          </Button>
        </div>
      </div>
    </header>
  );
};

interface PromoHeroProps {
  onNavigate: (path: string) => void;
}

const PromoHero: React.FC<PromoHeroProps> = ({ onNavigate }) => {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Планируйте посты для Telegram без лишних хлопот
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl">
              Telexa помогает создавать, планировать и автоматически публиковать контент в ваших Telegram-каналах.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                size="lg" 
                className="bg-[#0088cc] hover:bg-[#0077b6] text-white"
                onClick={() => onNavigate('/auth')}
              >
                Начать бесплатно
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => onNavigate('/auth')}
              >
                Узнать больше
              </Button>
            </div>
          </div>
          <div className="flex-1">
            <img 
              src="/promo-hero.svg" 
              alt="Telexa Dashboard Preview" 
              className="rounded-lg shadow-2xl"
              style={{ maxWidth: '100%' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

const PromoPage: React.FC = () => {
  const navigate = useNavigate();
  
  const handleNavigate = (path: string) => {
    navigate(path);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <PromoHeader onNavigate={handleNavigate} />
      <PromoHero onNavigate={handleNavigate} />
    </div>
  );
};

export default PromoPage; 