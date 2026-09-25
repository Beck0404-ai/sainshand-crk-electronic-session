/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CRKMeeting, Delegate } from '../types.js';
import { History, Calendar, Clock, CheckCircle, Trash2, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface MeetingHistoryPanelProps {
  meetingHistory: CRKMeeting[];
  allDelegates: Delegate[];
  onDeleteHistoryMeeting?: (meetingId: string) => Promise<void>;
}

export default function MeetingHistoryPanel({ meetingHistory, allDelegates, onDeleteHistoryMeeting }: MeetingHistoryPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <History size={18} className="text-indigo-600" /> Өмнөх Хуралдааны Архивын Түүх ({meetingHistory.length})
        </h3>
        <span className="text-[11px] text-slate-400 font-mono">Автоматаар архивлагдсан</span>
      </div>

      {meetingHistory.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-2">
          <History size={32} className="mx-auto text-slate-300" />
          <p className="text-xs font-bold text-slate-600">Одоогоор архивлагдсан хуралдаан байхгүй байна.</p>
          <p className="text-[11px] text-slate-400">Шинэ хуралдаан үүсгэхэд өмнөх хуралдаан энд автоматаар архивлагдана.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetingHistory.map((m, idx) => {
            const isExpanded = expandedId === m.id;
            const presentCount = Object.keys(m.attendance || {}).length;
            const votingCount = m.votingArchive ? m.votingArchive.length : 0;

            return (
              <div key={m.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition">
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(m.id)}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-700 font-mono font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                      #{meetingHistory.length - idx}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{m.title}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {m.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {m.time}
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-sans font-bold">
                          Ирц: {presentCount}/29
                        </span>
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-sans font-bold">
                          Санал хураалт: {votingCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                      {m.status}
                    </span>
                    {onDeleteHistoryMeeting && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`"${m.title}" хуралдааны архивыг устгах уу?`)) {
                            onDeleteHistoryMeeting(m.id);
                          }
                        }}
                        title="Архиваас устгах"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                    <button type="button" className="p-1.5 text-slate-400 rounded-lg">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4">
                    {/* Agendas List */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <FileText size={14} className="text-blue-600" /> Хэлэлцсэн Асуудлууд ({m.agenda.length})
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {m.agenda.map((ag, i) => (
                          <div key={ag.id} className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                            <p className="font-bold text-slate-800">{i + 1}. {ag.title}</p>
                            {ag.materials && ag.materials.length > 0 && (
                              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                                📄 {ag.materials.length} файл материал хавсаргагдсан
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Voting Archives inside history */}
                    {m.votingArchive && m.votingArchive.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <CheckCircle size={14} className="text-emerald-600" /> Санал Хураалтын Үр Дүн ({m.votingArchive.length})
                        </p>
                        <div className="space-y-2">
                          {m.votingArchive.map(v => {
                            const yes = Object.values(v.votes).filter(x => x.choice === 'Батлах' || x.choice === 'Зөвшөөрсөн').length;
                            const no = Object.values(v.votes).filter(x => x.choice === 'Татгалзах' || x.choice === 'Татгалзсан').length;
                            const passed = yes > no;
                            return (
                              <div key={v.id} className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                                <span className="font-bold text-slate-800 truncate">{v.title}</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {passed ? '✅ БАТЛАГДСАН' : '❌ ТАТГАЛЗАГДСАН'} ({yes}👍 / {no}👎)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
