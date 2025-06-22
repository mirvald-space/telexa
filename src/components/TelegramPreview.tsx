import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TelegramPreviewProps {
  content: string;
  imageUrl?: string;
  chatId?: string;
  scheduledDate?: Date;
}

export const TelegramPreview: React.FC<TelegramPreviewProps> = ({
  content,
  imageUrl,
  chatId,
  scheduledDate,
}) => {
  // Parse HTML for preview
  const renderFormattedContent = () => {
    // Преобразуем переносы строк в теги <br>
    const contentWithLineBreaks = content.replace(/\n/g, '<br>');
    return { __html: contentWithLineBreaks };
  };

  return (
    <Card className="bg-white border-gray-200 h-fit sticky top-4">
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="text-gray-900 text-lg">
          Предпросмотр в Telegram
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="bg-[#F5F5F5] h-full min-h-[400px] flex flex-col">
          {/* Telegram header */}
          <div className="bg-[#0088cc] text-white p-3 flex items-center">
            <div className="flex-1">
              <div className="font-medium">Ваш канал</div>
              <div className="text-xs opacity-80">Предпросмотр сообщения</div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </div>
          
          {/* Message bubble */}
          <div className="flex-1 p-4">
            <div className="bg-white rounded-lg shadow-sm p-3 max-w-[80%] relative">
              {imageUrl && (
                <div className="mb-2">
                  <img
                    src={imageUrl}
                    alt="Предпросмотр поста"
                    className="w-full rounded-lg"
                  />
                </div>
              )}
              {content ? (
                <div 
                  className="prose prose-sm max-w-none text-gray-800"
                  dangerouslySetInnerHTML={renderFormattedContent()}
                ></div>
              ) : (
                <div className="text-gray-400 italic">Здесь будет отображаться текст вашего поста</div>
              )}
              
              <div className="text-xs text-gray-500 text-right mt-1 flex justify-end items-center gap-1">
                {scheduledDate ? (
                  <>
                    {new Date(scheduledDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </>
                ) : (
                  <>
                    {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </>
                )}
              </div>
            </div>
            
            {/* Channel info */}
            {chatId && (
              <div className="mt-2 text-sm text-gray-600 flex items-center gap-1">
                <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">@</span>
                <span>{chatId}</span>
              </div>
            )}
          </div>
          
          {/* Telegram input area */}
          <div className="bg-white border-t border-gray-200 p-3 flex items-center gap-2">
            <div className="bg-gray-100 rounded-full flex-1 h-10"></div>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0088cc]">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 8.5a1.5 1.5 0 1 1-1.5 1.5 1.5 1.5 0 0 1 1.5-1.5m-5 0a1.5 1.5 0 1 1-1.5 1.5 1.5 1.5 0 0 1 1.5-1.5m10 0a1.5 1.5 0 1 1-1.5 1.5 1.5 1.5 0 0 1 1.5-1.5" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0088cc]">
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 