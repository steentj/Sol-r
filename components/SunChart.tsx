import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip
} from 'recharts';
import { getSunTimes } from '../utils/solarCalc';

export interface Theme {
  key: string;
  name: string;
  primary: string;
  secondary: string;
  text: string;
}

export interface TooltipLabels {
  sunrise: string;
  sunset: string;
  daylight: string;
}

interface SunChartProps {
  year: number;
  latitude: number;
  longitude: number;
  theme: Theme;
  locale: string;
  tooltipLabels: TooltipLabels;
  selectedDateStr: string;
  onDateChange: (dateStr: string) => void;
}

interface DataPoint {
  dateStr: string;
  displayDate: string;
  monthName: string;
  monthNumber: string;
  fullDate: Date;
  // Use minutes from midnight for simpler Y-axis handling
  sunriseMinutes: number | null;
  sunsetMinutes: number | null;
  // Array for range bar: [start, end]
  daylightRange: [number, number] | null; 
}

// Helper to format minutes (0-1440) to HH:mm
const formatTime = (minutes: number | null) => {
  if (minutes === null) return '--:--';
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Component to display static info for selected date
const InfoDashboard = ({ data, theme, labels }: { data: DataPoint | undefined, theme: Theme, labels: TooltipLabels }) => {
  if (!data) return null;
  
  const lengthMinutes = (data.sunsetMinutes !== null && data.sunriseMinutes !== null) 
    ? data.sunsetMinutes - data.sunriseMinutes 
    : 0;
  const lengthHours = Math.floor(lengthMinutes / 60);
  const lengthMinsRemainder = Math.floor(lengthMinutes % 60);

  return (
    <div className="flex flex-wrap gap-4 text-sm md:text-base items-center">
      <div className="flex items-center gap-2">
         <span className="font-bold text-slate-700">{data.displayDate}</span>
      </div>
      <div className="w-px h-4 bg-slate-300 hidden sm:block"></div>
      <div className="flex items-center gap-2">
        <span className="text-slate-500">{labels.sunrise}</span>
        <span className="font-mono font-medium" style={{ color: theme.text }}>{formatTime(data.sunriseMinutes)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-500">{labels.sunset}</span>
        <span className="font-mono font-medium text-slate-700">{formatTime(data.sunsetMinutes)}</span>
      </div>
      <div className="w-px h-4 bg-slate-300 hidden sm:block"></div>
      <div className="flex items-center gap-2">
        <span className="text-slate-500">{labels.daylight}</span>
        <span className="font-mono text-slate-600">{lengthHours}h {lengthMinsRemainder}m</span>
      </div>
    </div>
  );
};

const SunChart: React.FC<SunChartProps> = ({ year, latitude, longitude, theme, locale, tooltipLabels, selectedDateStr, onDateChange }) => {
  // Use ref to track dragging state
  const isDragging = useRef(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    // Check for mobile width (using 640px as standard "sm" breakpoint)
    const mq = window.matchMedia('(max-width: 640px)');
    setIsSmallScreen(mq.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsSmallScreen(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  
  const data = useMemo(() => {
    const days: DataPoint[] = [];
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const dayCount = isLeap ? 366 : 365;

    // Use passed locale for formatting dates
    const dateFormatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
    const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'short' });

    for (let i = 0; i < dayCount; i++) {
      const date = new Date(year, 0, i + 1); // Jan is month 0
      const times = getSunTimes(date, latitude, longitude);
      
      let sunriseMinutes: number | null = null;
      let sunsetMinutes: number | null = null;
      let daylightRange: [number, number] | null = null;

      if (times.sunrise && times.sunset) {
        sunriseMinutes = times.sunrise.getHours() * 60 + times.sunrise.getMinutes();
        sunsetMinutes = times.sunset.getHours() * 60 + times.sunset.getMinutes();
        daylightRange = [sunriseMinutes, sunsetMinutes];
      }

      // Generate date string manually in local time to match input[type="date"] format (YYYY-MM-DD)
      const yStr = date.getFullYear();
      const mStr = String(date.getMonth() + 1).padStart(2, '0');
      const dStr = String(date.getDate()).padStart(2, '0');
      const localDateStr = `${yStr}-${mStr}-${dStr}`;

      days.push({
        dateStr: localDateStr,
        displayDate: dateFormatter.format(date),
        monthName: monthFormatter.format(date),
        monthNumber: String(date.getMonth() + 1),
        fullDate: date,
        sunriseMinutes,
        sunsetMinutes,
        daylightRange
      });
    }
    return days;
  }, [year, latitude, longitude, locale]);

  // Find the data point for the selected date
  const selectedData = useMemo(() => {
    return data.find(d => d.dateStr === selectedDateStr);
  }, [data, selectedDateStr]);

  // Generate ticks for Y Axis (every 2 hours)
  const yTicks = useMemo(() => {
    const ticks = [];
    for (let i = 0; i <= 24; i += 2) {
      ticks.push(i * 60);
    }
    return ticks;
  }, []);

  // Generate ticks for X Axis (Start of each month)
  const xTicks = useMemo(() => {
    return data
      .filter(d => d.fullDate.getDate() === 1)
      .map(d => d.dateStr);
  }, [data]);

  const formatXTick = (value: string) => {
    const point = data.find(d => d.dateStr === value);
    if (!point) return '';
    return isSmallScreen ? point.monthNumber : point.monthName;
  };

  // Interaction handlers
  const handleInteraction = (state: any) => {
    if (!state) return;

    let dateStr: string | undefined;

    // 1. Try to get data from the specific bar being hovered
    if (state.activePayload && state.activePayload.length) {
      dateStr = state.activePayload[0].payload.dateStr;
    } 
    // 2. Fallback: If we are over the chart area but not exactly on a bar (e.g. gaps),
    // Recharts often provides the activeLabel (the X-axis value).
    // Since XAxis dataKey is "dateStr", activeLabel IS the dateStr.
    else if (state.activeLabel) {
      dateStr = state.activeLabel;
    }

    if (dateStr && dateStr !== selectedDateStr) {
      onDateChange(dateStr);
    }
  };

  const handleMouseDown = (state: any) => {
    isDragging.current = true;
    handleInteraction(state);
  };

  const handleMouseMove = (state: any) => {
    if (isDragging.current) {
      handleInteraction(state);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };
  
  const handleMouseLeave = () => {
    // We don't strictly stop dragging on leave to allow for small slips,
    // but typically if mouse leaves the container, events stop firing anyway.
    isDragging.current = false;
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      {/* Persistent Dashboard for Selected Date */}
      <div className="flex-none bg-slate-50 border-b border-slate-100 p-2 md:px-4 min-h-[40px] flex items-center">
         {selectedData ? (
           <InfoDashboard data={selectedData} theme={theme} labels={tooltipLabels} />
         ) : (
           <span className="text-slate-400 text-sm italic">Select a valid date in {year}</span>
         )}
      </div>

      {/* Chart Container using Absolute Positioning Fix for Recharts */}
      <div className="flex-1 min-h-0 relative w-full">
        <div className="absolute inset-0 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
              barCategoryGap={0}
              barGap={0}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="dateStr" 
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={formatXTick}
                ticks={xTicks}
                interval={0}
                stroke="#94a3b8"
              />
              <YAxis 
                domain={[0, 1440]} 
                ticks={yTicks}
                tickFormatter={formatTime}
                tick={{ fill: '#64748b', fontSize: 12 }}
                stroke="#94a3b8"
                width={60}
              />
              
              <ReferenceLine y={12 * 60} stroke="#cbd5e1" strokeDasharray="3 3" />
              
              {/* Highlight the selected date */}
              {selectedData && (
                <ReferenceLine 
                  x={selectedData.dateStr} 
                  stroke={theme.text} 
                  strokeDasharray="2 2"
                  strokeWidth={2}
                />
              )}
              
              {/* Empty tooltip to render the cursor/brush but no content */}
              <Tooltip 
                content={<></>} 
                cursor={{ fill: '#f1f5f9', opacity: 0.5 }} 
                isAnimationActive={false}
              />

              <Bar 
                dataKey="daylightRange" 
                fill={`url(#gradient-${theme.key})`}
                radius={[2, 2, 2, 2]}
                minPointSize={2}
                isAnimationActive={false}
              />
              
              <defs>
                <linearGradient id={`gradient-${theme.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.primary} stopOpacity={0.9}/>
                  <stop offset="100%" stopColor={theme.secondary} stopOpacity={0.9}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SunChart;