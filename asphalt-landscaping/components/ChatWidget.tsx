
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UserRole } from '../types';
import { Send, User, Image, X, Camera, Info } from 'lucide-react';

interface ChatWidgetProps {
  messages: ChatMessage[];
  currentUserRole: UserRole;
  onSendMessage: (text: string, photo?: string) => void;
}

const roleLabels: Record<UserRole, string> = {
  manager: 'Менеджер',
  foreman: 'Бригадир',
  client: 'Заказчик',
};

const roleColors: Record<UserRole, string> = {
  manager: 'text-blue-500',
  foreman: 'text-orange-500',
  client: 'text-green-500',
};

export const ChatWidget: React.FC<ChatWidgetProps> = ({ messages, currentUserRole, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = () => {
    if (inputText.trim() || attachedPhoto) {
      onSendMessage(inputText.trim() || (attachedPhoto ? 'Фото' : ''), attachedPhoto || undefined);
      setInputText('');
      setAttachedPhoto(null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachedPhoto(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b font-semibold text-slate-700 flex justify-between items-center">
        <span className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Рабочий чат
        </span>
        <span className="text-xs text-slate-400 font-normal">
          Вы: {roleLabels[currentUserRole]}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Send size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Нет сообщений</p>
            <p className="text-xs mt-1">Напишите первое сообщение</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.role === currentUserRole;

          // System messages
          if (msg.isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 max-w-[80%] text-center">
                  <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs">
                    <Info size={12} />
                    <span className="font-medium">{msg.text}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              {/* Avatar for others */}
              {!isMe && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-2 text-white text-xs font-bold ${
                  msg.role === 'manager' ? 'bg-blue-500' : msg.role === 'foreman' ? 'bg-orange-500' : 'bg-green-500'
                }`}>
                  {msg.sender.charAt(0)}
                </div>
              )}

              <div className={`max-w-[75%] rounded-2xl overflow-hidden ${
                isMe
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm'
              }`}>
                {/* Sender name + time */}
                <div className="px-4 pt-2 flex justify-between items-center gap-4">
                  <span className={`text-[10px] font-bold ${isMe ? 'text-blue-200' : roleColors[msg.role]}`}>
                    {msg.sender} ({roleLabels[msg.role]})
                  </span>
                  <span className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-300'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Photo */}
                {msg.photo && (
                  <div className="px-2 pt-2">
                    <img
                      src={msg.photo}
                      alt=""
                      className="w-full max-h-48 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setFullscreenPhoto(msg.photo!)}
                    />
                  </div>
                )}

                {/* Text */}
                <p className="px-4 pb-2 pt-1 text-sm">{msg.text}</p>

                {/* Read indicator */}
                {isMe && msg.readBy && msg.readBy.length > 0 && (
                  <div className="px-4 pb-1.5">
                    <span className="text-[9px] text-blue-200/60">
                      Прочитано: {msg.readBy.filter(r => r !== currentUserRole).map(r => roleLabels[r]).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Photo preview */}
      {attachedPhoto && (
        <div className="px-3 pt-2 bg-white border-t border-slate-100 flex items-center gap-2">
          <img src={attachedPhoto} alt="" className="w-12 h-12 rounded-lg object-cover" />
          <span className="text-xs text-slate-500">Фото прикреплено</span>
          <button onClick={() => setAttachedPhoto(null)} className="ml-auto text-slate-400 hover:text-red-500 p-1"><X size={14} /></button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 bg-white border-t flex gap-2">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-slate-400 hover:text-blue-500 transition-colors p-2"
          title="Прикрепить фото"
        >
          <Camera size={18} />
        </button>
        <input
          type="text"
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          placeholder="Написать сообщение..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() && !attachedPhoto}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-2 rounded-lg transition-colors"
        >
          <Send size={18} />
        </button>
      </div>

      {/* Fullscreen photo */}
      {fullscreenPhoto && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setFullscreenPhoto(null)}>
          <img src={fullscreenPhoto} alt="" className="max-w-full max-h-full rounded-lg" />
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setFullscreenPhoto(null)}>
            <X size={32} />
          </button>
        </div>
      )}
    </div>
  );
};
