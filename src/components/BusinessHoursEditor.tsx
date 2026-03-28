import React, { useState, useEffect } from 'react';
import { DAYS_OF_WEEK } from '../../types';

interface BusinessHours {
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
}

interface BusinessHoursEditorProps {
  hours: BusinessHours[];
  onChange: (hours: BusinessHours[]) => void;
  disabled?: boolean;
}

// Generate time options from 6 AM to 8 PM
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 6; hour <= 20; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const h = hour.toString().padStart(2, '0');
      const m = min.toString().padStart(2, '0');
      times.push({ value: `${h}:${m}`, label: `${h}:${m}` });
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

export const BusinessHoursEditor: React.FC<BusinessHoursEditorProps> = ({ 
  hours, 
  onChange,
  disabled = false 
}) => {
  // Initialize with all days of the week
  const [localHours, setLocalHours] = useState<BusinessHours[]>(() => {
    if (hours && hours.length > 0) {
      return hours;
    }
    // Default: all days closed
    return DAYS_OF_WEEK.map(day => ({
      day_of_week: day.value,
      is_open: false,
      open_time: null,
      close_time: null,
    }));
  });

  useEffect(() => {
    if (hours && hours.length > 0) {
      setLocalHours(hours);
    }
  }, [hours]);

  const handleToggleDay = (dayValue: number) => {
    const updated = localHours.map(h => {
      if (h.day_of_week === dayValue) {
        if (h.is_open) {
          // Closing the day - reset times
          return { ...h, is_open: false, open_time: null, close_time: null };
        } else {
          // Opening the day - set default times
          return { ...h, is_open: true, open_time: '08:00', close_time: '17:00' };
        }
      }
      return h;
    });
    setLocalHours(updated);
    onChange(updated);
  };

  const handleTimeChange = (dayValue: number, field: 'open_time' | 'close_time', value: string) => {
    const updated = localHours.map(h => {
      if (h.day_of_week === dayValue) {
        return { ...h, [field]: value };
      }
      return h;
    });
    setLocalHours(updated);
    onChange(updated);
  };

  // Group days for better layout (Mon-Fri and Sat-Sun)
  const weekdays = localHours.filter(h => h.day_of_week >= 1 && h.day_of_week <= 5);
  const weekends = localHours.filter(h => h.day_of_week === 0 || h.day_of_week === 6);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-slate-800 mb-3">Business Hours</h3>
        <p className="text-sm text-slate-500 mb-4">
          Set your weekly operating schedule. Customers will see when you're open.
        </p>
      </div>

      {/* Weekdays */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-600">Weekdays</h4>
        {weekdays.map(day => {
          const dayInfo = DAYS_OF_WEEK.find(d => d.value === day.day_of_week);
          return (
            <div key={day.day_of_week} className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <div className="w-24 flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={day.is_open}
                    onChange={() => handleToggleDay(day.day_of_week)}
                    disabled={disabled}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-slate-700">
                    {dayInfo?.shortLabel}
                  </span>
                </label>
              </div>
              
              {day.is_open && (
                <div className="flex items-center gap-2 flex-1">
                  <select
                    value={day.open_time || ''}
                    onChange={(e) => handleTimeChange(day.day_of_week, 'open_time', e.target.value)}
                    disabled={disabled}
                    aria-label={`${dayInfo?.shortLabel} opening time`}
                    title="Opening time"
                    className="text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Open</option>
                    {TIME_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <span className="text-slate-400">to</span>
                  <select
                    value={day.close_time || ''}
                    onChange={(e) => handleTimeChange(day.day_of_week, 'close_time', e.target.value)}
                    disabled={disabled}
                    aria-label={`${dayInfo?.shortLabel} closing time`}
                    title="Closing time"
                    className="text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Close</option>
                    {TIME_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {!day.is_open && (
                <span className="text-sm text-slate-400 italic">Closed</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Weekends */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-600">Weekend</h4>
        {weekends.map(day => {
          const dayInfo = DAYS_OF_WEEK.find(d => d.value === day.day_of_week);
          return (
            <div key={day.day_of_week} className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <div className="w-24 flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={day.is_open}
                    onChange={() => handleToggleDay(day.day_of_week)}
                    disabled={disabled}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-slate-700">
                    {dayInfo?.shortLabel}
                  </span>
                </label>
              </div>
              
              {day.is_open && (
                <div className="flex items-center gap-2 flex-1">
                  <select
                    value={day.open_time || ''}
                    onChange={(e) => handleTimeChange(day.day_of_week, 'open_time', e.target.value)}
                    disabled={disabled}
                    aria-label={`${dayInfo?.shortLabel} opening time`}
                    title="Opening time"
                    className="text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Open</option>
                    {TIME_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <span className="text-slate-400">to</span>
                  <select
                    value={day.close_time || ''}
                    onChange={(e) => handleTimeChange(day.day_of_week, 'close_time', e.target.value)}
                    disabled={disabled}
                    aria-label={`${dayInfo?.shortLabel} closing time`}
                    title="Closing time"
                    className="text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Close</option>
                    {TIME_OPTIONS.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {!day.is_open && (
                <span className="text-sm text-slate-400 italic">Closed</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Display-only component for showing business hours on public profile
interface BusinessHoursDisplayProps {
  hours: BusinessHours[];
}

export const BusinessHoursDisplay: React.FC<BusinessHoursDisplayProps> = ({ hours }) => {
  if (!hours || hours.length === 0) {
    return (
      <div className="text-sm text-slate-500 italic">
        Business hours not available
      </div>
    );
  }

  // Check if all days are closed
  const allClosed = hours.every(h => !h.is_open);
  if (allClosed) {
    return (
      <div className="text-sm text-slate-500 italic">
        Hours not set - Please contact us for availability
      </div>
    );
  }

  // Group by open/closed status
  const openDays = hours.filter(h => h.is_open);
  
  if (openDays.length === 0) {
    return (
      <div className="text-sm text-slate-500 italic">
        Currently closed
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {hours.map(day => {
        const dayInfo = DAYS_OF_WEEK.find(d => d.value === day.day_of_week);
        if (!day.is_open) {
          return (
            <div key={day.day_of_week} className="flex justify-between text-sm">
              <span className="text-slate-600">{dayInfo?.label}</span>
              <span className="text-slate-400">Closed</span>
            </div>
          );
        }
        
        const openTime = day.open_time ? day.open_time.slice(0, 5) : '';
        const closeTime = day.close_time ? day.close_time.slice(0, 5) : '';
        
        return (
          <div key={day.day_of_week} className="flex justify-between text-sm">
            <span className="text-slate-600">{dayInfo?.label}</span>
            <span className="text-slate-800 font-medium">
              {openTime} - {closeTime}
            </span>
          </div>
        );
      })}
    </div>
  );
};
