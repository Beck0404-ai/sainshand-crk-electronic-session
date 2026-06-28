/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, Clock, MapPin, Calendar, Award, User, LogOut } from 'lucide-react';
import { Delegate, CRKMeeting } from '../types.js';

interface HeaderProps {
  currentRole: 'admin' | 'projector' | 'delegate';
  currentDelegateId: string | null;
  delegates: Delegate[];
  meeting: CRKMeeting | null;
  onLogout: () => void;
}

export default function Header({
  currentRole,
  currentDelegateId,
  delegates,
  meeting,
  onLogout
}: HeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeDelegate = delegates.find(d => d.id === currentDelegateId);

  // Formatting date in Mongolian format
  const formatMongoDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year} оны ${month}-р сарын ${day}`;
  };

  const formatMongoTime = (date: Date) => {
    const hrs = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    const secs = String(date.getSeconds()).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 shadow-sm relative">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-5 flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        
        {/* Brand Crest + Title */}
        <div className="flex items-center gap-3.5">
          <img src="/logo.png" alt="Сайншанд сумын лого" className="h-12 w-12 rounded-xl object-cover shadow-sm flex-shrink-0" id="header-logo" />

          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-1.5">
              <span className="text-blue-600 text-[9px] uppercase font-bold tracking-widest font-mono">Дорноговь аймаг</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 text-[9px] uppercase font-bold tracking-widest font-mono">Сайншанд сумын ИТХ</span>
            </div>
            <h1 className="text-base md:text-xl font-bold text-slate-900 tracking-tight leading-tight mt-0.5">
              Цахим хуралдааны систем
            </h1>
          </div>
        </div>

        {/* Live Clock & Status Info */}
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 font-mono">
          
          {/* Active meeting details */}
          {meeting && (
            <div className="bg-emerald-50 border border-emerald-150 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="text-[10px] md:text-xs">
                <div className="text-slate-405 font-sans text-[8px] -mb-1 font-bold uppercase tracking-wider">Идэвхтэй хуралдаан</div>
                <div className="text-emerald-700 font-bold max-w-40 truncate font-sans text-[11px]">{meeting.title}</div>
              </div>
            </div>
          )}

          {/* Time and Date Display */}
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 text-left">
            <Clock size={14} className="text-blue-600 animate-pulse" />
            <div className="text-slate-700">
              <div className="text-[8px] text-slate-400 -mb-1">ОДООГИЙН ЦАГ</div>
              <div className="text-xs font-bold tracking-wider">{formatMongoTime(time)}</div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 text-left hidden sm:flex">
            <Calendar size={14} className="text-slate-500" />
            <div className="text-slate-700">
              <div className="text-[8px] text-slate-400 -mb-1">ОДООГИЙН ӨДӨР</div>
              <div className="text-xs font-bold font-sans">{formatMongoDate(time)}</div>
            </div>
          </div>

          {/* User Signout or detail */}
          {currentRole !== 'projector' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 pl-2.5 pr-1.5 py-1 rounded-lg">
              <div className="text-right">
                <div className="text-[8px] text-blue-600 uppercase font-bold tracking-wider">
                  {currentRole === 'admin' ? 'Админ' : 'Төлөөлөгч'}
                </div>
                <div className="text-[11px] font-sans font-bold text-slate-700 -mt-0.5">
                  {currentRole === 'admin' ? 'Хурлын зохион байгуулагч' : (activeDelegate?.fullName || 'Төлөөлөгч')}
                </div>
              </div>
              <button 
                onClick={onLogout}
                title="Гарах"
                className="p-1 px-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
