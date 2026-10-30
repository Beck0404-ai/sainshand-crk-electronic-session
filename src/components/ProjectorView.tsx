/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Delegate, CRKMeeting } from '../types.js';
import { User, Users, Clock, Vote, AlertCircle, LayoutDashboard } from 'lucide-react';
import { playTimerEndSound, playVoteStartSound } from '../utils/soundUtils';

interface ProjectorViewProps {
  meeting: CRKMeeting | null;
  delegates: Delegate[];
  onBackToAdmin: () => void;
}

export default function ProjectorView({ meeting, delegates, onBackToAdmin }: ProjectorViewProps) {
  // Theme state: High-Contrast Dark vs Executive Light
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [meetingDurationStr, setMeetingDurationStr] = useState<string>('00:00:00');

  useEffect(() => {
    if (!meeting?.startedAt || meeting.status !== 'идэвхтэй') {
      setMeetingDurationStr('00:00:00');
      return;
    }
    const updateTimer = () => {
      const elapsedSec = Math.max(0, Math.floor((Date.now() - (meeting.startedAt || Date.now())) / 1000));
      const hrs = Math.floor(elapsedSec / 3600);
      const mins = Math.floor((elapsedSec % 3600) / 60);
      const secs = elapsedSec % 60;
      setMeetingDurationStr(
        `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [meeting?.startedAt, meeting?.status]);

  // Audio chime effect triggers
  const prevSpeakerTimeRef = useRef<number | undefined>(undefined);
  const prevVotingActiveRef = useRef<boolean | undefined>(undefined);

  // Aggregate statistics
  const presentCount = meeting ? Object.keys(meeting.attendance).length : 0;
  const totalCount = delegates.length;
  const attendancePercentage = Math.round((presentCount / totalCount) * 100) || 0;

  // Active speaker details
  const activeSpeaker = meeting?.currentSpeaker;
  const activeSpeakerDelegate = activeSpeaker ? delegates.find(x => x.id === activeSpeaker.delegateId) : null;

  // Next 3 people in line to speak
  const upcomingSpeakers = meeting ? meeting.speakerQueue.slice(0, 3) : [];

  // Voting analysis
  const isVotingActive = meeting?.voting.active;

  useEffect(() => {
    if (activeSpeaker?.remainingSeconds === 0 && prevSpeakerTimeRef.current !== 0 && prevSpeakerTimeRef.current !== undefined) {
      playTimerEndSound();
    }
    prevSpeakerTimeRef.current = activeSpeaker?.remainingSeconds;
  }, [activeSpeaker?.remainingSeconds]);

  useEffect(() => {
    if (isVotingActive && !prevVotingActiveRef.current) {
      playVoteStartSound();
    }
    prevVotingActiveRef.current = isVotingActive;
  }, [isVotingActive]);
  const votes = meeting?.voting.votes || {};
  const votedCount = Object.keys(votes).length;

  const yesVotesList: Delegate[] = [];
  const noVotesList: Delegate[] = [];
  const abstainVotesList: Delegate[] = [];

  delegates.forEach(d => {
    if (meeting?.attendance[d.id]) {
      const voteItem = votes[d.id];
      if (voteItem) {
        if (voteItem.choice === 'Батлах' || voteItem.choice === 'Зөвшөөрсөн') yesVotesList.push(d);
        else if (voteItem.choice === 'Татгалзах' || voteItem.choice === 'Татгалзсан') noVotesList.push(d);
        else if (voteItem.choice === 'Санал гаргах' || voteItem.choice === 'Түтгэлзсэн') abstainVotesList.push(d);
      }
    }
  });

  const totalVotesCount = yesVotesList.length + noVotesList.length + abstainVotesList.length;
  const yesPercent = totalVotesCount > 0 ? Math.round((yesVotesList.length / totalVotesCount) * 100) : 0;
  const noPercent = totalVotesCount > 0 ? Math.round((noVotesList.length / totalVotesCount) * 100) : 0;
  const abstainPercent = totalVotesCount > 0 ? Math.round((abstainVotesList.length / totalVotesCount) * 100) : 0;

  // Format timer
  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Render clean, stable voter badges for each voting selection (гүйлгэхгүй, шууд тогтвортой харуулах)
  const renderVotersList = (list: Delegate[], badgeColorClass: string, bgClass: string) => {
    if (list.length === 0) {
      return (
        <div className="py-2 text-xs italic text-blue-300/40 bg-blue-950/30 px-3 rounded-lg border border-blue-900/30 text-center font-medium">
          Санал одоогоор өгөөгүй байна...
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 mt-1">
        {list.map((v) => (
          <span 
            key={v.id} 
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-xl font-bold shadow-xs transition-colors ${badgeColorClass} ${bgClass}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
            <span>{v.fullName}</span>
            <span className="text-[9px] opacity-70 font-mono">({v.district})</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={`min-h-screen p-6 font-sans flex flex-col justify-between relative overflow-hidden transition-colors duration-300 ${
      isDarkMode ? 'bg-[#030c1e] text-slate-100' : 'bg-slate-100 text-slate-900'
    }`} id="projector-big-screen">
      {/* Dynamic Keyframes injected here for full cross-browser seamless scrolling ticker support */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes marqueeVerticalSlow {
          0% { transform: translateY(0%); }
          100% { transform: translateY(-50%); }
        }
        .animate-marquee-slow {
          display: flex;
          width: max-content;
          animation: marquee 24s linear infinite;
        }
        .animate-marquee-slow-vertical {
          display: flex;
          flex-direction: column;
          animation: marqueeVerticalSlow 45s linear infinite;
        }
        .animate-marquee-slow-vertical:hover {
          animation-play-state: paused;
        }
      `}} />

      {/* Decorative ambiance elements */}
      <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none ${isDarkMode ? 'bg-blue-600/10' : 'bg-blue-500/5'}`}></div>
      <div className={`absolute bottom-[-20%] right-[-15%] w-[60%] h-[60%] rounded-full blur-[140px] pointer-events-none ${isDarkMode ? 'bg-blue-500/5' : 'bg-indigo-500/5'}`}></div>

      {/* HEADER BAR FOR PROJECTOR PORTAL */}
      <div className={`border-b pb-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 z-10 relative ${isDarkMode ? 'border-blue-900/60' : 'border-slate-300'}`}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Сайншанд сумын лого" className="h-11 w-11 rounded-xl object-cover shadow-lg shadow-blue-500/20 flex-shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-500 font-mono">Сувгийн Танхимын Үзүүлэлт</span>
            <h2 className={`text-base md:text-lg font-extrabold tracking-tight leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Сайншанд сумын ИТХ-ын Цахим Танхим
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {meeting?.status === 'идэвхтэй' && (
            <div className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 font-mono font-bold text-xs shadow-lg ${isDarkMode ? 'bg-[#0b162c] border border-blue-800/80 text-blue-300' : 'bg-white border border-slate-300 text-blue-700'}`}>
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
              <span>⏱️ {meetingDurationStr}</span>
            </div>
          )}

          {meeting && (
            <div className={`px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-lg ${isDarkMode ? 'bg-[#0b162c] border border-blue-800/80 shadow-black/30' : 'bg-white border border-slate-300 shadow-slate-300/50'}`}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="text-right">
                <span className="text-[8px] text-blue-500 block uppercase font-mono tracking-wider font-extrabold">ИТДЭВХТЭЙ ХЭЛЭЛЦҮҮЛЭГ</span>
                <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>{meeting.title}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsDarkMode(prev => !prev)}
            className={`flex items-center gap-2 text-[11px] font-bold px-3.5 py-2.5 rounded-xl border transition cursor-pointer shadow-md ${
              isDarkMode 
                ? 'bg-blue-950/80 hover:bg-blue-900 border-blue-700/60 text-blue-200' 
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800'
            }`}
            title="Танхимын гэрэлтүүлгээс хамааран сэдэв сэлгэх"
          >
            {isDarkMode ? '☀️ Гэгээлэг (Light)' : '🌙 Харанхуй (Dark)'}
          </button>

          <button
            type="button"
            onClick={onBackToAdmin}
            className={`flex items-center gap-2 text-[11px] font-bold px-3.5 py-2.5 rounded-xl border transition cursor-pointer ${
              isDarkMode
                ? 'bg-blue-900/60 hover:bg-blue-800/80 border-blue-700/60 text-blue-200 hover:text-white'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-900 text-white'
            }`}
            title="Админ хэсэгрүү буцах"
          >
            <LayoutDashboard size={14} />
            Админ хэсэг
          </button>
        </div>
      </div>

      {/* CORE BENTO GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 items-stretch z-10 relative">
        
        {/* LEFT COLUMN: ACTIVE SPEAKER & SPEAKER QUEUE (SPAN 4) */}
        <div className="xl:col-span-4 flex flex-col gap-6 justify-between">
          
          {/* SPEAKER BOX */}
          <div className={`rounded-3xl border p-6 flex flex-col justify-between flex-1 relative overflow-hidden transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-[#0b162c] border-blue-900/60 shadow-2xl text-slate-100' 
              : 'bg-white border-slate-300 text-slate-900 shadow-xl'
          }`}>
            
            <div className="space-y-4">
              <h3 className="text-blue-400 font-mono font-bold uppercase text-[10px] tracking-widest flex items-center gap-1.5 border-b border-blue-900/40 pb-2">
                <Clock className="text-blue-400" size={13} /> ОДОО ҮГ ХЭЛЖ БУЙ ТӨЛӨӨЛӨГЧ
              </h3>

              {activeSpeaker && activeSpeakerDelegate ? (
                <div className="space-y-4 mt-2">
                  <div className="flex items-center gap-3 bg-blue-950/40 p-4 rounded-xl border border-blue-900/50">
                    <div className="h-12 w-12 bg-blue-600 rounded-xl text-white font-bold flex items-center justify-center text-lg shadow-md">
                      {activeSpeakerDelegate.fullName.substring(0, 2)}
                    </div>
                    <div>
                      <div className="text-base font-bold text-white leading-tight">
                        {activeSpeakerDelegate.fullName}
                      </div>
                      <div className="text-[10px] text-blue-300 mt-1 flex items-center gap-2 font-mono font-semibold">
                        <span>{activeSpeakerDelegate.district}</span>
                      </div>
                    </div>
                  </div>

                  {/* LARGE COUNTDOWN CLOCK */}
                  <div className="bg-blue-950/60 py-8 rounded-2xl border border-blue-900/50 text-center relative overflow-hidden">
                    {/* Pulsing countdown glow */}
                    {activeSpeaker.remainingSeconds <= 30 && (
                      <div className="absolute inset-0 bg-rose-600/10 animate-pulse"></div>
                    )}
                    <span className={`text-6xl font-mono font-bold tracking-widest block ${
                      activeSpeaker.remainingSeconds <= 30 ? 'text-rose-500 animate-pulse' : 'text-blue-100'
                    }`}>
                      {formatSeconds(activeSpeaker.remainingSeconds)}
                    </span>
                    <span className="text-[9px] text-blue-400 uppercase tracking-widest block mt-2 font-mono font-bold">ҮГ ХЭЛЭХ ҮЛДЭЖ БУЙ ХУГАЦАА</span>
                    <span className="text-[10px] bg-blue-900/40 border border-blue-800 px-2.5 py-0.5 rounded-lg inline-block mt-3 text-blue-300 font-bold uppercase tracking-wider font-mono">
                      {activeSpeaker.turn}-р дахь асуулт
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-16 text-blue-300/40 space-y-2">
                  <User size={32} />
                  <p className="text-xs">Одоогоор индэр дээр идэвхтэй үг хэлж буй төлөөлөгч байхгүй байна.</p>
                </div>
              )}
            </div>

            {/* QUEUE SEQUENCE PREVIEW */}
            <div className="border-t border-blue-900/40 pt-5 mt-4 space-y-3">
              <h4 className="text-blue-400 font-mono text-[9px] uppercase tracking-widest font-bold">
                ДАРААГИЙН СУВГИЙН ТӨЛӨӨЛӨГЧИД ({meeting ? meeting.speakerQueue.length : 0})
              </h4>

              {upcomingSpeakers.length === 0 ? (
                <p className="text-xs text-blue-300/40 italic">Дараалал одоогоор хоосон байна.</p>
              ) : (
                <div className="space-y-1.5">
                  {upcomingSpeakers.map((item, index) => {
                    const queueRep = delegates.find(x => x.id === item.delegateId);
                    return (
                      <div key={item.delegateId} className="bg-blue-950/40 p-2.5 rounded-lg border border-blue-900/50 flex items-center justify-between text-xs text-blue-100">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-5 h-5 rounded-full bg-blue-900 border border-blue-800 text-blue-300 text-[10px] font-bold flex items-center justify-center font-mono shadow-sm">{index + 1}</span>
                          <span className="font-bold text-slate-100 truncate">{queueRep?.fullName}</span>
                        </div>
                        <span className="text-[9px] text-blue-300 font-mono font-semibold">{item.turn}-р удаа</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* CENTER COLUMN: LIVE VOTING (SPAN 5) */}
        <div className="xl:col-span-5 flex flex-col justify-between font-sans">
          
          <div className={`rounded-3xl border p-6 flex flex-col justify-between flex-grow relative overflow-hidden transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-[#0b162c] border-blue-900/60 shadow-2xl text-slate-100' 
              : 'bg-white border-slate-300 text-slate-900 shadow-xl'
          }`}>
            
            <div className="space-y-4">
              <h3 className="text-blue-400 font-mono font-bold uppercase text-[10px] tracking-widest flex items-center gap-1.5 border-b border-blue-900/40 pb-2 mb-2">
                <Vote size={13} className="text-blue-400" /> САНАЛ ХУРААЛТЫН ШУУД НЭГТГЭЛ
              </h3>

              {isVotingActive ? (
                <div className="space-y-5">

                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-grow">
                      <span className="text-[9px] uppercase font-mono font-bold text-blue-400 block tracking-wider">АТ КОРЕНТ САНАЛ АСУУЛГА</span>
                      <h3 className="text-sm md:text-base font-extrabold text-white mt-0.5 whitespace-normal leading-tight font-sans">
                        {meeting.voting.title}
                      </h3>
                    </div>
                    {meeting?.voting.remainingSeconds !== undefined && (
                      <div className="flex flex-col items-center justify-center bg-blue-950/80 border border-blue-800/50 rounded-2xl px-4 py-2 flex-shrink-0 shadow-lg min-w-[100px]">
                        <span className="text-[8px] uppercase tracking-wider text-blue-400 font-mono font-bold">Хугацаа</span>
                        <span className={`text-2xl font-mono font-black ${
                          meeting.voting.remainingSeconds <= 15 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'
                        }`}>
                          {meeting.voting.remainingSeconds}с
                        </span>
                      </div>
                    )}
                  </div>

                  {/* VOTE STATS PROGRESS BAR COLUMNS */}
                  {(() => {
                    const isRes = meeting.voting.title.includes('ТОГТООЛЫН ТӨСӨЛ');
                    const label1 = isRes ? '👍 Батлах' : '👍 Зөвшөөрсөн';
                    const label2 = isRes ? '👎 Татгалзах' : '👎 Татгалзсан';
                    const label3 = isRes ? '✍️ Санал гаргах' : '✋ Түтгэлзсэн';
                    const text1 = isRes ? 'Батлах' : 'Зөвшөөрсөн';
                    const text2 = isRes ? 'Татгалзах' : 'Татгалзсан';
                    const text3 = isRes ? 'Санал гаргах' : 'Түтгэлзсэн';

                    return (
                      <div className="space-y-5">
                        {/* YES STAT */}
                        <div className="space-y-2 bg-blue-950/40 p-4 rounded-xl border border-blue-900/40">
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs uppercase tracking-wide">
                              {label1}: {yesVotesList.length} төлөөлөгч
                            </span>
                            <span className="text-2xl font-mono font-black text-emerald-400">{yesPercent}%</span>
                          </div>

                          <div className="h-4 w-full bg-blue-950 rounded-full overflow-hidden border border-blue-900/60 shadow-inner">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" style={{ width: `${yesPercent}%` }}></div>
                          </div>

                          {/* Voters list */}
                          <div className="pt-1">
                            {renderVotersList(yesVotesList, 'text-emerald-400', 'bg-emerald-500/10 border border-emerald-500/20')}
                          </div>
                        </div>

                        {/* NO STAT */}
                        <div className="space-y-2 bg-blue-950/40 p-4 rounded-xl border border-blue-900/40">
                          <div className="flex items-center justify-between">
                            <span className="text-rose-400 font-bold flex items-center gap-1.5 text-xs uppercase tracking-wide">
                              {label2}: {noVotesList.length} төлөөлөгч
                            </span>
                            <span className="text-2xl font-mono font-black text-rose-400">{noPercent}%</span>
                          </div>

                          <div className="h-4 w-full bg-blue-950 rounded-full overflow-hidden border border-blue-900/60 shadow-inner">
                            <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" style={{ width: `${noPercent}%` }}></div>
                          </div>

                          <div className="pt-1">
                            {renderVotersList(noVotesList, 'text-rose-400', 'bg-rose-500/10 border border-rose-500/20')}
                          </div>
                        </div>

                        {/* ABSTAIN STAT */}
                        <div className="space-y-2 bg-blue-950/40 p-4 rounded-xl border border-blue-900/40">
                          <div className="flex items-center justify-between">
                            <span className="text-amber-400 font-bold flex items-center gap-1.5 text-xs uppercase tracking-wide">
                              {label3}: {abstainVotesList.length} төлөөлөгч
                            </span>
                            <span className="text-2xl font-mono font-black text-amber-400">{abstainPercent}%</span>
                          </div>

                          <div className="h-4 w-full bg-blue-950 rounded-full overflow-hidden border border-blue-900/60 shadow-inner">
                            <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" style={{ width: `${abstainPercent}%` }}></div>
                          </div>

                          <div className="pt-1">
                            {renderVotersList(abstainVotesList, 'text-amber-400', 'bg-amber-500/10 border border-amber-500/20')}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              ) : meeting && meeting.votingArchive.length > 0 ? (
                // FINAL RESULT VIEW — shows last archived vote
                (() => {
                  const last = meeting.votingArchive[meeting.votingArchive.length - 1];
                  const lastYes: Delegate[] = [];
                  const lastNo: Delegate[] = [];
                  const lastAbstain: Delegate[] = [];
                  delegates.forEach(d => {
                    const v = last.votes[d.id];
                    if (v?.choice === 'Зөвшөөрсөн') lastYes.push(d);
                    else if (v?.choice === 'Татгалзсан') lastNo.push(d);
                    else if (v?.choice === 'Түтгэлзсэн') lastAbstain.push(d);
                  });
                  const lastTotal = lastYes.length + lastNo.length + lastAbstain.length;
                  const lastYesPct = lastTotal > 0 ? Math.round((lastYes.length / lastTotal) * 100) : 0;
                  const lastNoPct = lastTotal > 0 ? Math.round((lastNo.length / lastTotal) * 100) : 0;
                  const lastAbstainPct = lastTotal > 0 ? Math.round((lastAbstain.length / lastTotal) * 100) : 0;
                  const passed = lastYes.length > lastNo.length;

                  return (
                    <div className="space-y-4">
                      {/* Result banner */}
                        <div className={`rounded-2xl p-4 border text-center ${
                          passed
                            ? 'bg-emerald-500/10 border-emerald-500/40'
                            : 'bg-rose-500/10 border-rose-500/40'
                        }`}>
                          <div className="text-[9px] uppercase font-mono font-bold text-blue-400 tracking-widest mb-1">ЭЦСИЙН ҮР ДҮН</div>
                          <div className={`text-2xl font-black tracking-tight mb-1 ${passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {passed ? '✅ БАТЛАГДЛАА' : '❌ ТАТГАЛЗАГДЛАА'}
                          </div>
                          <p className="text-white/80 text-xs font-semibold leading-snug">{last.title}</p>
                          <div className="text-[9px] text-blue-400 font-mono mt-1">
                            {new Date(last.completedAt).toLocaleTimeString()} • Нийт {lastTotal}/{last.totalPresent} санал өгсөн
                          </div>
                        </div>

                        {/* YES block */}
                        <div className="bg-blue-950/40 rounded-xl border border-blue-900/40 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-400 font-bold text-xs uppercase tracking-wide">👍 Зөвшөөрсөн — {lastYes.length} төлөөлөгч</span>
                            <span className="text-2xl font-mono font-black text-emerald-400">{lastYesPct}%</span>
                          </div>
                          <div className="h-3 w-full bg-blue-950 rounded-full overflow-hidden border border-blue-900/60">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: `${lastYesPct}%` }}></div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {lastYes.length === 0
                              ? <span className="text-[10px] text-blue-300/40 italic">Санал өгөөгүй</span>
                              : lastYes.map(d => (
                                <span key={d.id} className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-bold">{d.fullName}</span>
                              ))
                            }
                          </div>
                        </div>

                        {/* NO block */}
                        <div className="bg-blue-950/40 rounded-xl border border-blue-900/40 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-rose-400 font-bold text-xs uppercase tracking-wide">👎 Татгалзсан — {lastNo.length} төлөөлөгч</span>
                            <span className="text-2xl font-mono font-black text-rose-400">{lastNoPct}%</span>
                          </div>
                          <div className="h-3 w-full bg-blue-950 rounded-full overflow-hidden border border-blue-900/60">
                            <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full" style={{ width: `${lastNoPct}%` }}></div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {lastNo.length === 0
                              ? <span className="text-[10px] text-blue-300/40 italic">Санал өгөөгүй</span>
                              : lastNo.map(d => (
                                <span key={d.id} className="text-[10px] bg-rose-500/10 border border-rose-500/30 text-rose-300 px-2 py-0.5 rounded-full font-bold">{d.fullName}</span>
                              ))
                            }
                          </div>
                        </div>

                        {/* ABSTAIN block */}
                        <div className="bg-blue-950/40 rounded-xl border border-blue-900/40 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-amber-400 font-bold text-xs uppercase tracking-wide">✋ Түтгэлзсэн — {lastAbstain.length} төлөөлөгч</span>
                            <span className="text-2xl font-mono font-black text-amber-400">{lastAbstainPct}%</span>
                          </div>
                          <div className="h-3 w-full bg-blue-950 rounded-full overflow-hidden border border-blue-900/60">
                            <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" style={{ width: `${lastAbstainPct}%` }}></div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {lastAbstain.length === 0
                              ? <span className="text-[10px] text-blue-300/40 italic">Санал өгөөгүй</span>
                              : lastAbstain.map(d => (
                                <span key={d.id} className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full font-bold">{d.fullName}</span>
                              ))
                            }
                          </div>
                        </div>

                        {/* Archive count */}
                        {meeting.votingArchive.length > 1 && (
                          <div className="text-center text-[9px] text-blue-400/60 font-mono">
                            Нийт {meeting.votingArchive.length} санал хураалт архивлагдсан
                          </div>
                        )}
                      </div>
                  );
                })()
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-20 text-blue-300/40 space-y-3">
                  <AlertCircle size={38} />
                  <div>
                    <h4 className="font-bold text-blue-200 text-xs">Идэвхтэй санал хураалт явагдаагүй байна</h4>
                    <p className="text-[9px] text-blue-400 mt-1 uppercase tracking-widest font-mono">Шийдвэрлэх асуудлаар админы тохиргоог хүлээнэ үү</p>
                  </div>
                </div>
              )}
            </div>

            {/* TOTAL CAST STATS BAR */}
            {isVotingActive && (
              <div className="border-t border-blue-900/40 pt-3 mt-4 text-center text-blue-300/40 text-[10px] font-mono flex items-center justify-between font-bold">
                <span>ӨГСӨН САНАЛ: {totalVotesCount} / {presentCount}</span>
                <span>ИРЦИЙН ИРЭЛТ: {Math.round((totalVotesCount / presentCount) * 100) || 0}% саналжсан</span>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: CHAMBER ATTENDANCE MAP & VERTICAL DELEGATES TICKER (SPAN 3) */}
        <div className="xl:col-span-3 flex flex-col justify-between">
          
          <div className={`rounded-3xl border p-5 flex flex-col justify-between flex-grow relative overflow-hidden transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-[#0b162c] border-blue-900/60 shadow-2xl text-slate-100' 
              : 'bg-white border-slate-300 text-slate-900 shadow-xl'
          }`}>
            
            <div className="space-y-3 flex flex-col h-full">
              <h3 className="text-blue-400 font-mono font-bold uppercase text-[10px] tracking-widest flex items-center justify-between border-b border-blue-900/40 pb-2">
                <span className="flex items-center gap-1.5"><Users size={13} /> ТАНХИМЫН ИРЦ</span>
                <span className="text-blue-300 font-mono text-[9px] font-bold">
                  {presentCount}/{totalCount} ({attendancePercentage}%)
                </span>
              </h3>

              <div className="bg-blue-950/40 p-2.5 rounded-xl border border-blue-900/50 text-center flex-shrink-0">
                <div className="text-xl font-mono font-bold text-white">{presentCount} / {totalCount}</div>
                <div className="text-[9px] text-blue-400 font-mono uppercase tracking-widest mt-0.5 font-bold">БҮРТГЭГДСЭН ИРЭЛТ ({attendancePercentage}%)</div>
              </div>

              {/* SLOW SCROLLING ATTENDED DELEGATES LIST (Зөвхөн ирсэн төлөөлөгчид маш удаанаар гүйнэ) */}
              <div className="pt-1 flex-1 flex flex-col min-h-[360px]">
                <div className="flex items-center justify-between text-[9px] text-blue-400 uppercase tracking-widest mb-1.5 font-mono font-bold">
                  <span>📜 ИРСЭН ТӨЛӨӨЛӨГЧИД</span>
                  <span className="text-emerald-400 font-mono">{presentCount} / {totalCount}</span>
                </div>

                {(() => {
                  const attendedDelegates = delegates.filter(d => meeting ? !!meeting.attendance[d.id] : false);
                  if (attendedDelegates.length === 0) {
                    return (
                      <div className="relative flex-1 min-h-[340px] max-h-[500px] flex flex-col items-center justify-center text-center py-20 text-blue-300/40 rounded-2xl bg-blue-950/70 border border-blue-900/60 p-4 space-y-2 shadow-inner">
                        <Users size={32} />
                        <p className="text-xs font-sans">Танхимд одоогоор ирц бүртгүүлсэн төлөөлөгч байхгүй байна.</p>
                      </div>
                    );
                  }

                  // Нэр давхардахгүй байх: 4 ба түүнээс цөөн төлөөлөгч байвал шууд нэг нэгээр тогтвортой харуулна
                  // 4-өөс олон төлөөлөгч танхимд ирсэн үед л дэлгэцэнд багтаахын тулд маш удаанаар гүйнэ
                  const isLongList = attendedDelegates.length > 4;
                  const displayList = isLongList
                    ? [...attendedDelegates, ...attendedDelegates]
                    : attendedDelegates;

                  return (
                    <div className="relative flex-1 min-h-[340px] max-h-[500px] overflow-hidden rounded-2xl bg-blue-950/70 border border-blue-900/60 p-2 shadow-inner">
                      {isLongList && (
                        <>
                          {/* Soft top and bottom gradient fades */}
                          <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#0b162c] to-transparent z-10 pointer-events-none" />
                          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#0b162c] to-transparent z-10 pointer-events-none" />
                        </>
                      )}

                      <div className={isLongList ? "animate-marquee-slow-vertical space-y-2" : "space-y-2"}>
                        {displayList.map((d, idx) => {
                          const didVote = isVotingActive ? !!votes[d.id] : false;
                          const officialIndex = delegates.findIndex(x => x.id === d.id);
                          const seatNo = String(officialIndex >= 0 ? officialIndex + 1 : idx + 1).padStart(2, '0');

                          let voteBadgeText = null;
                          if (isVotingActive && didVote) {
                            const choice = votes[d.id]?.choice;
                            if (choice === 'Зөвшөөрсөн' || choice === 'Батлах') voteBadgeText = '👍 Зөвшөөрсөн';
                            else if (choice === 'Татгалзсан' || choice === 'Татгалзах') voteBadgeText = '👎 Татгалзсан';
                            else if (choice === 'Түтгэлзсэн' || choice === 'Санал гаргах') voteBadgeText = '✋ Түтгэлзсэн';
                          }

                          return (
                            <div
                              key={`${d.id}-${idx}`}
                              className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between border transition-all duration-300 bg-emerald-500/15 border-emerald-500/40 text-emerald-200 shadow-sm"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="h-6 w-6 rounded-lg font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0 bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                                  {seatNo}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-bold truncate text-xs leading-snug">{d.fullName}</p>
                                  <p className="text-[10px] font-mono opacity-80 truncate text-emerald-300/80">{d.party} • {d.district}</p>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-500/40 flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Ирсэн
                                </span>
                                {voteBadgeText && (
                                  <span className="text-[8px] font-mono text-amber-300 font-bold">{voteBadgeText}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* SEATING MAP LEGEND */}
              <div className="pt-3 border-t border-blue-900/40 space-y-1.5 text-[9px] text-blue-300/70 font-mono flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 bg-emerald-500/30 border border-emerald-500/40 rounded-sm"></div>
                    <span className="text-emerald-300">Ирц бүртгүүлсэн төлөөлөгчид</span>
                  </div>
                  <span className="text-blue-400/80 text-[8px] font-mono">
                    {presentCount > 4 ? 'Удаанаар дээшээ гүйнэ' : 'Танхимын ирц'}
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* FOOTER PUBLIC BRAND BAR */}
      <div className="border-t border-blue-900/60 pt-3 mt-6 text-center text-[10px] text-blue-400 font-mono flex flex-wrap items-center justify-between gap-2 z-10 relative font-semibold">
        <span>Сайншанд сумын ИТХ-ын Цахим систем © 2026</span>
        <span className="flex items-center gap-1 text-blue-400">
          <span>● Үйл ажиллагааны ирц нэгтгэл ил тод</span>
        </span>
      </div>

    </div>
  );
}
