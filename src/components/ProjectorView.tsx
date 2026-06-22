/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Delegate, CRKMeeting } from '../types.js';
import { User, Users, Clock, Vote, CheckCircle, Award, BookOpen, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProjectorViewProps {
  meeting: CRKMeeting | null;
  delegates: Delegate[];
}

export default function ProjectorView({ meeting, delegates }: ProjectorViewProps) {
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
  const votes = meeting?.voting.votes || {};
  const votedCount = Object.keys(votes).length;

  const yesVotesList: Delegate[] = [];
  const noVotesList: Delegate[] = [];

  delegates.forEach(d => {
    // Check if check-in first (only present can vote on active trials)
    if (meeting?.attendance[d.id]) {
      const voteItem = votes[d.id];
      if (voteItem) {
        if (voteItem.choice === 'Зөвшөөрсөн') {
          yesVotesList.push(d);
        } else if (voteItem.choice === 'Татгалзсан') {
          noVotesList.push(d);
        }
      }
    }
  });

  const totalVotesCount = yesVotesList.length + noVotesList.length;
  const yesPercent = totalVotesCount > 0 ? Math.round((yesVotesList.length / totalVotesCount) * 100) : 0;
  const noPercent = totalVotesCount > 0 ? Math.round((noVotesList.length / totalVotesCount) * 100) : 0;

  // Format timer
  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Helper to render horizontal moving/rolling names block for each voting selection
  const renderMarqueeLine = (list: Delegate[], badgeColorClass: string, bgClass: string, choiceName: string) => {
    if (list.length === 0) {
      return (
        <div className="py-2.5 text-xs italic text-blue-300/40 bg-blue-950/40 px-3 rounded-lg border border-blue-900/30 text-center font-medium">
          Санал одоогоор өгөөгүй байна...
        </div>
      );
    }

    // Repeat the voters' names list to make a seamless scrolling marquee
    const repeatedList = [...list, ...list, ...list, ...list, ...list, ...list];

    return (
      <div className="relative overflow-hidden w-full bg-blue-950/70 py-2 px-2 rounded-xl border border-blue-900/40 mt-1.5 shadow-inner">
        {/* Soft fading edges for professional visual ticker */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-blue-950/90 to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-blue-950/90 to-transparent z-10 pointer-events-none"></div>
        
        <div className="animate-marquee-slow flex items-center gap-3">
          {repeatedList.map((v, idx) => (
            <span 
              key={`${v.id}-${idx}`} 
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full font-bold shadow-sm whitespace-nowrap transition-colors ${badgeColorClass} ${bgClass}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse"></span>
              <span>{v.fullName}</span>
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#030c1e] text-slate-100 min-h-screen p-6 font-sans flex flex-col justify-between relative overflow-hidden" id="projector-big-screen">
      {/* Dynamic Keyframes injected here for full cross-browser seamless scrolling ticker support */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-33.333%); }
        }
        .animate-marquee-slow {
          display: flex;
          width: max-content;
          animation: marquee 24s linear infinite;
        }
        .animate-marquee-slow:hover {
          animation-play-state: paused;
        }
      `}} />

      {/* Decorative ambiance elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-15%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      {/* HEADER BAR FOR PROJECTOR PORTAL */}
      <div className="border-b border-blue-900/60 pb-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 z-10 relative">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Сайншанд сумын лого" className="h-11 w-11 rounded-xl object-cover shadow-lg shadow-blue-500/20 flex-shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 font-mono">Сувгийн Танхимын Үзүүлэлт</span>
            <h2 className="text-base md:text-lg font-extrabold text-white tracking-tight leading-tight">
              Сайншанд сумын ИТХ-ын Цахим Танхим
            </h2>
          </div>
        </div>

        {meeting && (
          <div className="bg-[#0b162c] border border-blue-800/80 px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-lg shadow-black/30">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="text-right">
              <span className="text-[8px] text-blue-400 block uppercase font-mono tracking-wider font-extrabold">ИТДЭВХТЭЙ ХЭЛЭЛЦҮҮЛЭГ</span>
              <span className="text-xs font-bold text-slate-100">{meeting.title}</span>
            </div>
          </div>
        )}
      </div>

      {/* CORE BENTO GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 items-stretch z-10 relative">
        
        {/* LEFT COLUMN: ACTIVE SPEAKER & SPEAKER QUEUE (SPAN 4) */}
        <div className="xl:col-span-4 flex flex-col gap-6 justify-between">
          
          {/* SPEAKER BOX */}
          <div className="bg-[#0b162c] rounded-3xl border border-blue-900/60 p-6 flex flex-col justify-between flex-1 relative overflow-hidden shadow-2xl">
            
            <div className="space-y-4">
              <h3 className="text-blue-400 font-mono font-bold uppercase text-[10px] tracking-widest flex items-center gap-1.5 border-b border-blue-900/40 pb-2">
                <Clock className="animate-pulse text-blue-400" size={13} /> ОДОО ҮГ ХЭЛЖ БУЙ ТӨЛӨӨЛӨГЧ
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
          
          <div className="bg-[#0b162c] rounded-3xl border border-blue-900/60 p-6 flex flex-col justify-between flex-grow shadow-2xl relative overflow-hidden">
            
            <div className="space-y-4">
              <h3 className="text-blue-400 font-mono font-bold uppercase text-[10px] tracking-widest flex items-center gap-1.5 border-b border-blue-900/40 pb-2 mb-2">
                <Vote size={13} className="animate-pulse text-blue-400" /> САНАЛ ХУРААЛТЫН ШУУД НЭГТГЭЛ
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
                  <div className="space-y-5">

                    {/* YES STAT */}
                    <div className="space-y-2 bg-blue-950/40 p-4 rounded-xl border border-blue-900/40">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs uppercase tracking-wide">
                          👍 Зөвшөөрсөн: {yesVotesList.length} төлөөлөгч
                        </span>
                        <span className="text-2xl font-mono font-black text-emerald-400">{yesPercent}%</span>
                      </div>

                      <div className="h-4 w-full bg-blue-950 rounded-full overflow-hidden border border-blue-900/60 shadow-inner">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" style={{ width: `${yesPercent}%` }}></div>
                      </div>

                      {/* Moving/Scrolling Names */}
                      <div className="pt-1">
                        {renderMarqueeLine(yesVotesList, 'text-emerald-400', 'bg-emerald-500/10 border border-emerald-500/20', 'Зөвшөөрсөн')}
                      </div>
                    </div>

                    {/* NO STAT */}
                    <div className="space-y-2 bg-blue-950/40 p-4 rounded-xl border border-blue-900/40">
                      <div className="flex items-center justify-between">
                        <span className="text-rose-400 font-bold flex items-center gap-1.5 text-xs uppercase tracking-wide">
                          👎 Татгалзсан: {noVotesList.length} төлөөлөгч
                        </span>
                        <span className="text-2xl font-mono font-black text-rose-400">{noPercent}%</span>
                      </div>

                      <div className="h-4 w-full bg-blue-950 rounded-full overflow-hidden border border-blue-900/60 shadow-inner">
                        <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" style={{ width: `${noPercent}%` }}></div>
                      </div>

                      {/* Moving/Scrolling Names */}
                      <div className="pt-1">
                        {renderMarqueeLine(noVotesList, 'text-rose-400', 'bg-rose-500/10 border border-rose-500/20', 'Татгалзсан')}
                      </div>
                    </div>

                  </div>

                </div>
              ) : meeting && meeting.votingArchive.length > 0 ? (
                // FINAL RESULT VIEW — shows last archived vote
                (() => {
                  const last = meeting.votingArchive[meeting.votingArchive.length - 1];
                  const lastYes: Delegate[] = [];
                  const lastNo: Delegate[] = [];
                  delegates.forEach(d => {
                    const v = last.votes[d.id];
                    if (v?.choice === 'Зөвшөөрсөн') lastYes.push(d);
                    else if (v?.choice === 'Татгалзсан') lastNo.push(d);
                  });
                  const lastTotal = lastYes.length + lastNo.length;
                  const lastYesPct = lastTotal > 0 ? Math.round((lastYes.length / lastTotal) * 100) : 0;
                  const lastNoPct = lastTotal > 0 ? Math.round((lastNo.length / lastTotal) * 100) : 0;
                  const passed = lastYes.length > lastNo.length;

                  return (
                    <AnimatePresence>
                      <motion.div
                        key={last.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
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

                        {/* Archive count */}
                        {meeting.votingArchive.length > 1 && (
                          <div className="text-center text-[9px] text-blue-400/60 font-mono">
                            Нийт {meeting.votingArchive.length} санал хураалт архивлагдсан
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  );
                })()
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-20 text-blue-300/40 space-y-3">
                  <AlertCircle size={38} className="animate-pulse" />
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

        {/* RIGHT COLUMN: CHAMBER ATTENDANCE MAP (SPAN 3) */}
        <div className="xl:col-span-3 flex flex-col justify-between">
          
          <div className="bg-[#0b162c] rounded-3xl border border-blue-900/60 p-6 flex flex-col justify-between flex-grow shadow-2xl relative overflow-hidden">
            
            <div className="space-y-3">
              <h3 className="text-blue-400 font-mono font-bold uppercase text-[10px] tracking-widest flex items-center gap-1.5 border-b border-blue-900/40 pb-2 mb-2">
                <Users size={13} /> ТАНХИМЫН ИРЦ бүртгэх төлөв
              </h3>

              <div className="bg-blue-950/40 p-2.5 rounded-xl border border-blue-900/50 text-center">
                <div className="text-xl font-mono font-bold text-white">{presentCount} / {totalCount}</div>
                <div className="text-[9px] text-blue-400 font-mono uppercase tracking-widest mt-0.5 font-bold">БҮРТГЭГДСЭН ИРЭЛТ ({attendancePercentage}%)</div>
              </div>

              {/* CHAMBER SEATING MAP SYMBOLS */}
              <div className="pt-2">
                <span className="text-[9px] text-blue-400 uppercase tracking-widest block mb-2 text-center font-mono font-bold">Танхимын суудлын зураглал</span>
                
                {/* 29 grid layout blocks */}
                <div className="grid grid-cols-5 gap-1.5">
                  {delegates.map((d, index) => {
                    const isPresent = meeting ? !!meeting.attendance[d.id] : false;
                    const didVote = isVotingActive ? !!votes[d.id] : false;
                    let voteColor = 'bg-emerald-500 text-white'; // yes
                    if (votes[d.id]?.choice === 'Татгалзсан') voteColor = 'bg-rose-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]';
                    else if (votes[d.id]?.choice === 'Зөвшөөрсөн') voteColor = 'bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]';

                    return (
                      <div 
                        key={d.id}
                        className={`h-6 rounded relative flex items-center justify-center font-mono font-bold text-[9px] transition-all duration-300 tool-tip-parent shadow-sm ${
                          isPresent 
                            ? (isVotingActive && didVote ? `${voteColor} scale-105 ring-1 ring-blue-300` : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40')
                            : 'bg-blue-950/40 text-blue-900/60 border border-blue-900/20'
                        }`}
                        title={`${d.fullName} (${isPresent ? 'Ирсэн' : 'Бүртгүүлээгүй'})`}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SEATING MAP LEGEND */}
              <div className="pt-4 border-t border-blue-900/40 space-y-1.5 text-[9px] text-blue-300/70 font-mono">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-sm"></div>
                  <span>Ирц бүртгүүлсэн (Ирсэн)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 bg-blue-950/40 border border-blue-900/20 rounded-sm"></div>
                  <span>Ороогүй байгаа (Ирээгүй)</span>
                </div>
                {isVotingActive && (
                  <div className="space-y-1 pt-1 border-t border-dashed border-blue-900/40">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 bg-emerald-500 rounded-sm"></div>
                      <span>Зөвшөөрсөн (Сонголт)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 bg-rose-500 rounded-sm"></div>
                      <span>Татгалзсан (Сонголт)</span>
                    </div>
                  </div>
                )}
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
