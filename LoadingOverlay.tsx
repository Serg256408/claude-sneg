import React from 'react';

interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
}

export function LoadingOverlay({ visible, text }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex flex-col items-center justify-center modal-backdrop-enter">
      <div className="w-10 h-10 spinner border-white/80 border-t-transparent mb-4" />
      {text && <p className="text-white text-sm font-bold">{text}</p>}
    </div>
  );
}

interface ButtonSpinnerProps {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

export function LoadingButton({ loading, children, loadingText, className = '', onClick, disabled, type = 'button' }: ButtonSpinnerProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`${className} ${loading ? 'opacity-80 cursor-wait' : ''}`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 spinner" />
          {loadingText || 'Загрузка...'}
        </span>
      ) : children}
    </button>
  );
}
