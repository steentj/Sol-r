import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getLocationName } from './services/locationService';
import SunChart, { Theme } from './components/SunChart';
import { getSystemLanguage, translations, Language } from './utils/i18n';

interface LocationState {
  coords: {
    lat: number;
    lng: number;
  } | null;
  name: string;
  loading: boolean;
  error: string | null;
}

// Define theme colors/keys separate from names since names are localized
const themeColors: Record<string, Omit<Theme, 'name'>> = {
  amber: { key: 'amber', primary: '#f59e0b', secondary: '#fbbf24', text: '#d97706' },
  sky: { key: 'sky', primary: '#0ea5e9', secondary: '#38bdf8', text: '#0284c7' },
  emerald: { key: 'emerald', primary: '#10b981', secondary: '#34d399', text: '#059669' },
  rose: { key: 'rose', primary: '#f43f5e', secondary: '#fb7185', text: '#e11d48' },
  slate: { key: 'slate', primary: '#64748b', secondary: '#94a3b8', text: '#475569' },
};

const App: React.FC = () => {
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  // Default to today
  const [selectedDateStr, setSelectedDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [currentTheme, setCurrentTheme] = useState<string>('amber');
  const [lang] = useState<Language>(getSystemLanguage()); // Detect language once on mount
  const t = translations[lang]; // Current translations

  const [location, setLocation] = useState<LocationState>({
    coords: null,
    name: '',
    loading: true,
    error: null,
  });

  const fetchLocationName = useCallback(async (lat: number, lng: number) => {
    try {
      const name = await getLocationName(lat, lng, lang);
      setLocation(prev => ({ ...prev, name }));
    } catch (err) {
      // Keep coordinates but show generic name if API fails
      setLocation(prev => ({ ...prev, name: `${lat.toFixed(2)}, ${lng.toFixed(2)}` }));
    }
  }, [lang]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, loading: false, error: 'Geolocation is not supported by your browser' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(prev => ({ 
          ...prev, 
          coords: { lat: latitude, lng: longitude },
          loading: false,
          error: null
        }));
        fetchLocationName(latitude, longitude);
      },
      (error) => {
        let errorMsg = t.locationError;
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = t.permissionError;
        }
        setLocation(prev => ({ ...prev, loading: false, error: errorMsg }));
      }
    );
  }, [fetchLocationName, t]);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    setCurrentYear(newYear);
    
    // When year changes, try to keep the same month/day but update the year in selectedDateStr
    // If Feb 29 on non-leap year, Date object handles it (rolls to Mar 1)
    if (selectedDateStr) {
      const parts = selectedDateStr.split('-');
      const month = parts[1];
      const day = parts[2];
      const newDate = new Date(newYear, parseInt(month) - 1, parseInt(day));
      // Adjust back to string YYYY-MM-DD (local time approximation)
      // Safest way to get YYYY-MM-DD from local params
      const y = newDate.getFullYear();
      const m = String(newDate.getMonth() + 1).padStart(2, '0');
      const d = String(newDate.getDate()).padStart(2, '0');
      setSelectedDateStr(`${y}-${m}-${d}`);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateStr = e.target.value;
    setSelectedDateStr(newDateStr);
    
    // Update year to match selected date
    if (newDateStr) {
      const year = parseInt(newDateStr.split('-')[0], 10);
      if (year !== currentYear) {
        setCurrentYear(year);
      }
    }
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentTheme(e.target.value);
  };

  // Construct the full theme object with localized name
  const currentThemeObj = useMemo(() => ({
    ...themeColors[currentTheme],
    name: t.themes[currentTheme as keyof typeof t.themes]
  }), [currentTheme, t.themes]);

  // Generate year options (current - 10 to current + 10)
  const yearOptions = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="flex-none bg-white border-b border-slate-200 shadow-sm z-10 p-2 md:p-4 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2 bg-slate-100 rounded-lg" style={{ color: currentThemeObj.primary }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate">{t.appTitle}</h1>
              {location.coords && (
                <p className="text-sm text-slate-500 font-medium truncate">
                  {location.name || t.locating}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 justify-end w-full md:w-auto">
            
            {/* Theme Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="theme-select" className="text-sm font-semibold text-slate-600 hidden lg:block">{t.themeLabel}</label>
              <div className="relative">
                <select
                  id="theme-select"
                  value={currentTheme}
                  onChange={handleThemeChange}
                  className="appearance-none bg-slate-100 border border-slate-300 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-sm leading-tight focus:outline-none focus:bg-white focus:border-slate-500 transition-colors cursor-pointer"
                >
                  {Object.entries(themeColors).map(([key, config]) => (
                    <option key={key} value={key}>{t.themes[key as keyof typeof t.themes]}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>

            {/* Date Selector */}
             <div className="flex items-center gap-2">
              <label htmlFor="date-select" className="text-sm font-semibold text-slate-600 hidden lg:block">{t.dateLabel}</label>
              <div className="relative">
                <input 
                  type="date"
                  id="date-select"
                  value={selectedDateStr}
                  onChange={handleDateChange}
                  className="bg-slate-100 border border-slate-300 text-slate-700 py-1.5 px-3 rounded-lg text-sm leading-tight focus:outline-none focus:bg-white focus:border-slate-500 transition-colors cursor-pointer"
                />
              </div>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="year-select" className="text-sm font-semibold text-slate-600 hidden lg:block">{t.yearLabel}</label>
              <div className="relative">
                <select
                  id="year-select"
                  value={currentYear}
                  onChange={handleYearChange}
                  className="appearance-none bg-slate-100 border border-slate-300 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-sm leading-tight focus:outline-none focus:bg-white focus:border-slate-500 transition-colors cursor-pointer"
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>

          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative w-full h-full overflow-hidden p-2 md:p-6 lg:p-8">
        
        {location.loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm z-20">
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="w-12 h-12 border-4 border-slate-300 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${currentThemeObj.primary} transparent ${currentThemeObj.primary} ${currentThemeObj.primary}` }}></div>
              <p className="font-medium" style={{ color: currentThemeObj.text }}>{t.acquiringLocation}</p>
            </div>
          </div>
        )}

        {location.error && (
          <div className="absolute inset-0 flex items-center justify-center z-20 p-4">
             <div className="max-w-md w-full bg-white border border-red-200 rounded-xl shadow-lg p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{t.locationRequired}</h3>
                <p className="text-slate-600 mb-6">{location.error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
                >
                  {t.retry}
                </button>
             </div>
          </div>
        )}

        {location.coords && !location.loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full h-full flex flex-col overflow-hidden">
             <div className="flex-none p-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: currentThemeObj.primary }}></div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.daylightHours}</span>
                </div>
                {/* Removed static hover instruction, replaced by date selector presence implicitly */}
             </div>
             <div className="flex-1 p-2 md:p-4 min-h-0">
               <SunChart 
                 year={currentYear} 
                 latitude={location.coords.lat} 
                 longitude={location.coords.lng}
                 theme={currentThemeObj}
                 locale={lang}
                 tooltipLabels={t.tooltip}
                 selectedDateStr={selectedDateStr}
               />
             </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;