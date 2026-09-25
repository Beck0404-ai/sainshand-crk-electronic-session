/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CRKMeeting, Delegate } from '../types.js';
import { Search, X, FileText, CheckCircle, Users, MessageSquare } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: CRKMeeting | null;
  allDelegates: Delegate[];
  meetingHistory?: CRKMeeting[];
}

export default function GlobalSearchModal({ isOpen, onClose, meeting, allDelegates, meetingHistory = [] }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');

  // Keyboard shortcut ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.trim().toLowerCase();

  // Search Agendas & Materials
  const agendaResults: { agendaTitle: string; materialTitle?: string; summary?: string }[] = [];
  if (cleanQuery && meeting) {
    meeting.agenda.forEach(ag => {
      if (ag.title.toLowerCase().includes(cleanQuery)) {
        agendaResults.push({ agendaTitle: ag.title });
      }
      ag.materials.forEach(m => {
        if (m.title.toLowerCase().includes(cleanQuery) || m.contentSummary.toLowerCase().includes(cleanQuery)) {
          agendaResults.push({ agendaTitle: ag.title, materialTitle: m.title, summary: m.contentSummary });
        }
      });
    });
  }

  // Search Delegates
  const delegateResults = cleanQuery
    ? allDelegates.filter(d => d.fullName.toLowerCase().includes(cleanQuery) || d.party.toLowerCase().includes(cleanQuery) || d.district.toLowerCase().includes(cleanQuery) || d.phone.includes(cleanQuery))
    : [];

  // Search Voting Archives
  const votingResults = cleanQuery && meeting
    ? (meeting.votingArchive || []).filter(v => v.title.toLowerCase().includes(cleanQuery))
    : [];

  // Search Agenda Comments
  const commentResults = cleanQuery && meeting?.agendaComments
    ? meeting.agendaComments.filter(c => c.text.toLowerCase().includes(cleanQuery) || c.delegateName.toLowerCase().includes(cleanQuery))
    : [];

  const totalResults = agendaResults.length + delegateResults.length + votingResults.length + commentResults.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Search Header Input */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search size={20} className="text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Хайх утгаа бичнэ үү (Хэлэлцэх асуудал, файл материал, төлөөлөгчийн нэр, архив...)..."
            autoFocus
            className="flex-1 text-sm bg-transparent outline-none text-slate-800 font-medium placeholder-slate-400"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 text-xs">
              Цэвэрлэх
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results Container */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {!cleanQuery ? (
            <div className="py-12 text-center space-y-2">
              <Search size={36} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Системээс ухаалаг хайлт хийх</p>
              <p className="text-[11px] text-slate-400">Хэлэлцэх асуудлын нэр, хавсаргасан материал, төлөөлөгчийн овог нэрээр хайна уу.</p>
            </div>
          ) : totalResults === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-8">"{query}" утгаар илэрц олдсонгүй.</p>
          ) : (
            <div className="space-y-4">
              
              {/* Agenda & Material Results */}
              {agendaResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={12} className="text-blue-600" /> Хэлэлцэх Асуудал & Файлууд ({agendaResults.length})
                  </p>
                  <div className="space-y-1.5">
                    {agendaResults.map((res, i) => (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                        <p className="font-bold text-slate-800">{res.agendaTitle}</p>
                        {res.materialTitle && (
                          <p className="text-blue-600 font-medium">📄 Файл: {res.materialTitle}</p>
                        )}
                        {res.summary && (
                          <p className="text-slate-500 text-[11px] leading-relaxed">{res.summary}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delegate Results */}
              {delegateResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={12} className="text-indigo-600" /> Төлөөлөгчид ({delegateResults.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {delegateResults.map(d => (
                      <div key={d.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {d.fullName.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{d.fullName}</p>
                          <p className="text-[9px] text-slate-400">{d.party} • {d.district}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Voting Results */}
              {votingResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle size={12} className="text-emerald-600" /> Санал Хураалтын Архив ({votingResults.length})
                  </p>
                  <div className="space-y-1.5">
                    {votingResults.map(v => (
                      <div key={v.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                        <span className="font-bold text-slate-800 truncate">{v.title}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{new Date(v.completedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comment Results */}
              {commentResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare size={12} className="text-amber-600" /> Тайлбар & Саналууд ({commentResults.length})
                  </p>
                  <div className="space-y-1.5">
                    {commentResults.map(c => (
                      <div key={c.id} className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-700 font-bold">
                          <span>{c.delegateName}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{new Date(c.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-600">{c.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>Нийт {totalResults} илэрц олдсон</span>
          <span>ESC - Гарах</span>
        </div>

      </div>
    </div>
  );
}
