import React, { useState, useEffect, useRef, useCallback } from 'react';

// DaData API ключ из environment variables
const DADATA_API_KEY = import.meta.env.VITE_DADATA_API_KEY || '';

interface AddressInputProps {
  value: string;
  onChange: (address: string, coords?: [number, number]) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
}

interface DaDataSuggestion {
  value: string;
  unrestricted_value: string;
  data: {
    geo_lat: string | null;
    geo_lon: string | null;
    city: string | null;
    street: string | null;
    house: string | null;
    region: string | null;
  };
}

export default function AddressInput({
  value,
  onChange,
  placeholder = 'Введите адрес...',
  className = '',
  label,
  required = false,
}: AddressInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<DaDataSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Синхронизация с внешним value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce timer при unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Поиск подсказок через DaData
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Token ${DADATA_API_KEY}`,
          },
          body: JSON.stringify({
            query,
            count: 7,
            // Ограничиваем Москвой и Московской областью
            locations: [
              { region: 'Москва' },
              { region: 'Московская' },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Ошибка API');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setIsOpen((data.suggestions || []).length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Ошибка получения подсказок:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Обработка ввода с debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  // Выбор подсказки
  const handleSelectSuggestion = (suggestion: DaDataSuggestion) => {
    const address = suggestion.value;
    setInputValue(address);
    setIsOpen(false);
    setSuggestions([]);

    // Извлекаем координаты если есть
    const lat = suggestion.data.geo_lat ? parseFloat(suggestion.data.geo_lat) : null;
    const lon = suggestion.data.geo_lon ? parseFloat(suggestion.data.geo_lon) : null;

    if (lat && lon) {
      onChange(address, [lat, lon]);
    } else {
      onChange(address);
    }
  };

  // Обработка клавиатуры
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Форматирование подсказки для отображения
  const formatSuggestion = (suggestion: DaDataSuggestion) => {
    const parts: string[] = [];
    if (suggestion.data.city) parts.push(suggestion.data.city);
    if (suggestion.data.street) parts.push(suggestion.data.street);
    if (suggestion.data.house) parts.push(`д. ${suggestion.data.house}`);
    return parts.length > 0 ? parts.join(', ') : suggestion.value;
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-bold text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          className={className}
        />

        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown с подсказками */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-[#1a2234] rounded-xl border border-white/10 shadow-2xl max-h-64 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-blue-600/30 transition-colors
                ${index === selectedIndex ? 'bg-blue-600/30' : ''}
                ${index === 0 ? 'rounded-t-xl' : ''}
                ${index === suggestions.length - 1 ? 'rounded-b-xl' : 'border-b border-white/5'}
              `}
            >
              <div className="font-bold text-white truncate">{formatSuggestion(suggestion)}</div>
              <div className="text-xs text-slate-400 truncate mt-0.5">{suggestion.value}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
