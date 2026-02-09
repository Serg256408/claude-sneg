import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  dark?: boolean;
}

export function FormField({ label, required, error, hint, children, dark = true }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className={`text-xs font-bold ${dark ? 'text-slate-400' : 'text-slate-700'}`}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
      {hint && !error && (
        <p className={`text-xs mt-1 ${dark ? 'text-slate-600' : 'text-slate-400'}`}>
          {hint}
        </p>
      )}
    </div>
  );
}
