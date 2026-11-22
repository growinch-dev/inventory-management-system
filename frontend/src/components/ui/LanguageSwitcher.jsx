import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const LanguageSwitcher = ({ variant = 'default' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { language, setLanguage, availableLanguages } = useLanguage();

  const currentLang = availableLanguages.find(l => l.code === language);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  if (variant === 'compact') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            isOpen ? 'bg-secondary-100 text-secondary' : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary'
          }`}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <Globe size={18} />
          <span className="uppercase">{language}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-secondary-100 py-1.5 animate-scale-in origin-top-right z-50">
            {availableLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between w-full px-4 py-2.5 text-sm transition-colors ${
                  language === lang.code
                    ? 'bg-primary-50 text-primary font-medium'
                    : 'text-secondary-700 hover:bg-secondary-50'
                }`}
              >
                <span>{lang.nativeName}</span>
                {language === lang.code && <Check size={16} className="text-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
          isOpen ? 'bg-secondary-100 text-secondary' : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe size={18} />
        <span>{currentLang?.nativeName}</span>
        <ChevronDown size={16} className={`text-secondary-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-secondary-100 py-1.5 animate-scale-in origin-top-right z-50">
          {availableLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`flex items-center justify-between w-full px-4 py-2.5 text-sm transition-colors ${
                language === lang.code
                  ? 'bg-primary-50 text-primary font-medium'
                  : 'text-secondary-700 hover:bg-secondary-50'
              }`}
            >
              <div className="flex flex-col items-start">
                <span>{lang.nativeName}</span>
                <span className="text-xs text-secondary-400">{lang.name}</span>
              </div>
              {language === lang.code && <Check size={16} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
