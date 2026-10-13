/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Delegate, CRKMeeting, NotificationItem, AgendaMaterial } from '../types.js';
import {
  CheckCircle, Clock, Volume2, AlertTriangle, FileText,
  Download, Users, BookOpen, CheckSquare, History, Bell, Mail, Phone, ArrowRight,
  Menu, X, Send, Search, Lock, Shield, Globe, FileEdit, Save, User, Camera, Upload, Trash2, Image as ImageIcon, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DelegateDashboardProps {
  delegate: Delegate;
  meeting: CRKMeeting | null;
  notifications: NotificationItem[];
  allDelegates: Delegate[];
  onRegisterAttendance: () => Promise<void>;
  onJoinSpeakerQueue: () => Promise<void>;
  onLeaveSpeakerQueue: () => Promise<void>;
  onSubmitVote: (choice: 'Батлах' | 'Татгалзах' | 'Санал гаргах' | 'Зөвшөөрсөн' | 'Татгалзсан' | 'Түтгэлзсэн') => Promise<void>;
  onUpdateProfile: (data: { phone: string; email: string; bio: string; avatarUrl?: string; materialNotes?: Record<string, string> }) => Promise<void>;
  onSaveMaterialNote?: (materialId: string, text: string) => Promise<void>;
  onDeleteMaterialNote?: (materialId: string) => Promise<void>;
  onLogout: () => void;
  onSubmitComment?: (agendaItemId: string, text: string) => Promise<void>;
}

export default function DelegateDashboard({
  delegate,
  meeting,
  notifications,
  allDelegates,
  onRegisterAttendance,
  onJoinSpeakerQueue,
  onLeaveSpeakerQueue,
  onSubmitVote,
  onUpdateProfile,
  onSaveMaterialNote,
  onDeleteMaterialNote,
  onLogout,
  onSubmitComment
}: DelegateDashboardProps) {
  const [selectedAgendaId, setSelectedAgendaId] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);

  // Meeting Elapsed Duration Timer
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

  const handleSendComment = async (agendaItemId: string) => {
    const text = commentInputs[agendaItemId]?.trim();
    if (!text) return;
    setSubmittingComment(agendaItemId);
    try {
      if (onSubmitComment) {
        await onSubmitComment(agendaItemId, text);
      } else {
        await fetch('/api/delegate/agenda/comment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delegateId: delegate.id, agendaItemId, text })
        });
      }
      setCommentInputs(prev => ({ ...prev, [agendaItemId]: '' }));
    } catch (e) {
      alert('Тайлбар бичихэд алдаа гарлаа.');
    } finally {
      setSubmittingComment(null);
    }
  };

  const [profilePhone, setProfilePhone] = useState(delegate.phone);
  const [profileEmail, setProfileEmail] = useState(delegate.email);
  const [profileBio, setProfileBio] = useState(delegate.bio || '');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(delegate.avatarUrl || '');

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Зургийн хэмжээ 5MB-аас бага байх шаардлагатай.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setProfileAvatarUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Delegate Profile Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState<'info' | 'stats' | 'security' | 'notes'>('info');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileToast, setProfileToast] = useState<string | null>(null);

  const showProfileToastMsg = (msg: string) => {
    setProfileToast(msg);
    setTimeout(() => setProfileToast(null), 3500);
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput || newPasswordInput.length < 3) {
      alert('Нууц үг доод тал нь 3 тэмдэгттэй байна.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      alert('Шинэ нууц үгүүд хоорондоо тарахгүй байна.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/admin/delegate/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delegateId: delegate.id, newPassword: newPasswordInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showProfileToastMsg('✓ Нууц үг амжилттай солигдлоо!');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
      } else {
        alert(data.error || 'Нууц үг солиход алдаа гарлаа.');
      }
    } catch {
      alert('Сервэртэй холбогдоход алдаа гарлаа.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const [pdfViewer, setPdfViewer] = useState<AgendaMaterial | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [readMaterialIds, setReadMaterialIds] = useState<string[]>([]);
  const [submittingChoice, setSubmittingChoice] = useState<string | null>(null);

  const handleDelegateVoteClick = async (choice: 'Батлах' | 'Татгалзах' | 'Санал гаргах' | 'Зөвшөөрсөн' | 'Татгалзсан' | 'Түтгэлзсэн') => {
    setSubmittingChoice(choice);
    try {
      await onSubmitVote(choice);
    } finally {
      setSubmittingChoice(null);
    }
  };

  // Keyword Search in Agenda Materials
  const [matSearchQuery, setMatSearchQuery] = useState('');

  // Personal Sticky Notes for Agenda Materials (synced with user's profile in DB and localStorage)
  const [materialNotes, setMaterialNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`material_notes_${delegate.id}`);
      const localNotes = saved ? JSON.parse(saved) : {};
      return { ...localNotes, ...(delegate.materialNotes || {}) };
    } catch {
      return delegate.materialNotes || {};
    }
  });

  const [noteSaveStatus, setNoteSaveStatus] = useState<Record<string, 'saved' | 'saving'>>({});
  const saveTimersRef = useRef<Record<string, any>>({});

  // Sync if delegate.materialNotes updates from backend
  useEffect(() => {
    if (delegate.materialNotes) {
      setMaterialNotes(prev => ({
        ...prev,
        ...delegate.materialNotes
      }));
    }
  }, [delegate.materialNotes]);

  const handleSaveMaterialNote = (materialId: string, text: string) => {
    const updated = { ...materialNotes, [materialId]: text };
    setMaterialNotes(updated);
    try {
      localStorage.setItem(`material_notes_${delegate.id}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save note to localStorage:', e);
    }

    setNoteSaveStatus(prev => ({ ...prev, [materialId]: 'saving' }));

    if (saveTimersRef.current[materialId]) {
      clearTimeout(saveTimersRef.current[materialId]);
    }

    saveTimersRef.current[materialId] = setTimeout(async () => {
      try {
        if (onSaveMaterialNote) {
          await onSaveMaterialNote(materialId, text);
        } else {
          await fetch('/api/delegate/note/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delegateId: delegate.id, materialId, text })
          });
        }
        setNoteSaveStatus(prev => ({ ...prev, [materialId]: 'saved' }));
      } catch (err) {
        console.error('Failed to sync note to profile:', err);
      }
    }, 600);
  };

  const handleDeleteMaterialNote = async (materialId: string) => {
    const updated = { ...materialNotes };
    delete updated[materialId];
    setMaterialNotes(updated);
    try {
      localStorage.setItem(`material_notes_${delegate.id}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save note to localStorage:', e);
    }
    try {
      if (onDeleteMaterialNote) {
        await onDeleteMaterialNote(materialId);
      } else {
        await fetch('/api/delegate/note/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delegateId: delegate.id, materialId })
        });
      }
      showProfileToastMsg('✓ Тэмдэглэлийг амжилттай устгалаа.');
    } catch (err) {
      console.error('Failed to delete note from profile:', err);
    }
  };

  const getNoteMaterialInfo = (materialId: string) => {
    if (meeting?.agenda) {
      for (const ag of meeting.agenda) {
        const mat = ag.materials?.find(m => m.id === materialId);
        if (mat) {
          return {
            agendaTitle: ag.title,
            materialTitle: mat.title,
            fileType: mat.fileType
          };
        }
      }
    }
    return {
      agendaTitle: 'ИТХ-ын хуралдааны асуудал',
      materialTitle: `Хавсаргасан баримт #${materialId}`,
      fileType: 'pdf'
    };
  };

  const playTimerBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.log('Timer alert audio trigger skipped');
    }
  };

  React.useEffect(() => {
    if (meeting?.currentSpeaker?.delegateId === delegate.id && meeting?.currentSpeaker?.remainingSeconds === 0 && meeting?.currentSpeaker?.timeUpTriggered) {
      playTimerBeep();
    }
  }, [meeting?.currentSpeaker?.remainingSeconds]);

  const isCheckedIn = meeting ? !!meeting.attendance[delegate.id] : false;
  const isCurrentlyInQueue = meeting ? meeting.speakerQueue.some(x => x.delegateId === delegate.id) : false;
  const myQueuePosition = meeting ? meeting.speakerQueue.findIndex(x => x.delegateId === delegate.id) + 1 : 0;
  const isSpeakingNow = meeting?.currentSpeaker?.delegateId === delegate.id;
  const activeSpeakerDelegate = meeting?.currentSpeaker ? allDelegates.find(x => x.id === meeting.currentSpeaker?.delegateId) : null;
  const hasVoted = meeting?.voting.active && meeting.voting.votes[delegate.id];
  const myVoteValue = hasVoted ? meeting.voting.votes[delegate.id].choice : null;
  const unreadCount = notifications.filter(x => !x.isRead).length;

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await onUpdateProfile({ phone: profilePhone, email: profileEmail, bio: profileBio });
      setIsEditingProfile(false);
    } catch (err) {
      alert('Профайл хадгалахад алдаа гарлаа.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const triggerSimulatedDownload = (material: AgendaMaterial) => {
    setDownloadedIds(prev => [...prev, material.id]);
    const element = document.createElement("a");
    const file = new Blob([
      `Сайншанд сумын ИТХ-ын Цахим систем\nХэлэлцэх Материал: ${material.title}\nХэмжээ: ${material.fileSize}\n\nТайлбар:\n${material.contentSummary}\n\nЭнэхүү файлыг системээс амжилттай татаж авлаа.\nТатаж авсан огноо: ${new Date().toLocaleString()}`
    ], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = material.title.replace(/\.pdf|\.xlsx|\.docx/, '.txt');
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const openPdfMaterial = (material: AgendaMaterial) => {
    setPdfViewer(material);
    if (!readMaterialIds.includes(material.id)) {
      setReadMaterialIds(prev => [...prev, material.id]);
    }
  };

  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const toggleAgendaItem = (id: string) => {
    setSelectedAgendaId(prev => (prev === id ? null : id));
  };

  const isAgendaExpanded = (itemId: string) =>
    selectedAgendaId === itemId ||
    (!selectedAgendaId && itemId === meeting?.activeAgendaItemId);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6" id="delegate-screen-area">

      {/* PDF VIEWER MODAL */}
      <AnimatePresence>
        {pdfViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 z-[60] flex flex-col backdrop-blur-sm"
          >
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`h-7 w-7 rounded flex items-center justify-center font-bold text-[8px] uppercase flex-shrink-0 text-white ${
                  pdfViewer.fileType === 'pdf' ? 'bg-rose-500' : pdfViewer.fileType === 'docx' ? 'bg-indigo-500' : 'bg-emerald-500'
                }`}>
                  {pdfViewer.fileType}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{pdfViewer.title}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{pdfViewer.fileSize}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPdfViewer(null)}
                className="flex-shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition flex items-center gap-1.5"
              >
                ✕ Хаах
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {pdfViewer.fileUrl ? (
                <iframe
                  src={pdfViewer.fileUrl}
                  className="w-full h-full border-0"
                  title={pdfViewer.title}
                  allowFullScreen
                />
              ) : (
                <div className="h-full overflow-y-auto bg-white p-8 max-w-3xl mx-auto">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{pdfViewer.contentSummary}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACTIVE VOTING POPUP MODAL */}
      <AnimatePresence>
        {meeting?.voting.active && isCheckedIn && !hasVoted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl relative text-slate-800"
            >
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 text-blue-600">
                  <AlertTriangle className="animate-pulse" size={20} />
                  <span className={`text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                    meeting.voting.title.includes('ТОГТООЛЫН ТӨСӨЛ')
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}>
                    {meeting.voting.title.includes('ТОГТООЛЫН ТӨСӨЛ') ? '📜 ТОГТООЛЫН ТӨСӨЛ ЭЦЭСЛЭН БАТЛАХ' : 'Шууд санал хураалт'}
                  </span>
                </div>
                {meeting.voting.remainingSeconds !== undefined && (
                  <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full ${
                    meeting.voting.remainingSeconds <= 15 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-blue-100 text-blue-700'
                  }`}>
                    Үлдсэн: {meeting.voting.remainingSeconds}с
                  </span>
                )}
              </div>
              {meeting.voting.remainingSeconds !== undefined && (
                <div className="w-full bg-slate-100 h-1.5 rounded-full mb-4 overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-1000 ${meeting.voting.remainingSeconds <= 15 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${(meeting.voting.remainingSeconds / 60) * 105}%`, maxWidth: '100%' }}
                  />
                </div>
              )}
              <h3 className="text-base md:text-lg font-bold text-slate-900 mb-4 leading-tight">{meeting.voting.title}</h3>
              <p className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed mb-6">
                ℹ️ Сайншанд сумын ИТХ-ын дэгийн дагуу таны өгсөн саналыг бодит хугацаанд заалны том дэлгэцэнд шууд нэгтгэн харуулах тул саналаа нягталж, хариуцлагатай сонголт хийнэ үү.
              </p>
              {(() => {
                const isResolutionVote = meeting.voting.title.includes('ТОГТООЛЫН ТӨСӨЛ');
                const opt1Label = isResolutionVote ? 'Батлах' : 'Зөвшөөрсөн';
                const opt2Label = isResolutionVote ? 'Татгалзах' : 'Татгалзсан';
                const opt3Label = isResolutionVote ? 'Санал гаргах' : 'Түтгэлзсэн';
                const opt3Icon  = isResolutionVote ? '✍️' : '✋';

                return (
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      disabled={submittingChoice !== null}
                      onClick={() => handleDelegateVoteClick(opt1Label as any)}
                      className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-bold py-3.5 px-3 rounded-xl transition flex flex-col items-center justify-center gap-1 cursor-pointer text-xs shadow-md"
                    >
                      <span className="text-xl">👍</span>
                      <span>{submittingChoice === opt1Label ? 'Илгээж байна...' : opt1Label}</span>
                    </button>

                    <button
                      type="button"
                      disabled={submittingChoice !== null}
                      onClick={() => handleDelegateVoteClick(opt2Label as any)}
                      className="bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white font-bold py-3.5 px-3 rounded-xl transition flex flex-col items-center justify-center gap-1 cursor-pointer text-xs shadow-md"
                    >
                      <span className="text-xl">👎</span>
                      <span>{submittingChoice === opt2Label ? 'Илгээж байна...' : opt2Label}</span>
                    </button>

                    <button
                      type="button"
                      disabled={submittingChoice !== null}
                      onClick={() => handleDelegateVoteClick(opt3Label as any)}
                      className="bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-50 text-white font-bold py-3.5 px-3 rounded-xl transition flex flex-col items-center justify-center gap-1 cursor-pointer text-xs shadow-md"
                    >
                      <span className="text-xl">{opt3Icon}</span>
                      <span>{submittingChoice === opt3Label ? 'Илгээж байна...' : opt3Label}</span>
                    </button>
                  </div>
                );
              })()}
              <div className="mt-5 text-center text-[10px] text-slate-400 font-mono">
                Сайншанд сумын ИТХ-ын Цахим хуралдааны технологийн нэгдсэн хяналт
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SLIDE-OUT SIDEBAR DRAWER */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed right-0 top-0 h-full w-80 bg-white z-50 shadow-2xl flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700 bg-slate-900 flex-shrink-0">
                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest">Сайншанд сумын ИТХ</span>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  aria-label="Цэс хаах"
                  className="h-8 w-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer scrollable content */}
              <div className="flex-1 overflow-y-auto">

                {/* PROFILE CARD inside drawer */}
                <div className="p-4 border-b border-slate-100">
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    {/* Card top: avatar + name */}
                    <div className="bg-slate-900 px-4 py-4 flex items-center gap-3">
                      {(profileAvatarUrl || delegate.avatarUrl) ? (
                        <img src={profileAvatarUrl || delegate.avatarUrl} alt={delegate.fullName} className="h-12 w-12 rounded-xl object-cover shadow-sm flex-shrink-0" />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-sm flex-shrink-0">
                          {delegate.fullName.substring(0, 3)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Тойрог: {delegate.district.split(' ')[0]}</p>
                        <p className="font-bold text-white text-sm leading-tight mt-0.5 truncate">{delegate.fullName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{delegate.email}</p>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="p-4">
                      {isEditingProfile ? (
                        <form onSubmit={handleProfileSave} className="space-y-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Мэдээлэл засварлах</span>
                            <button type="button" onClick={() => setIsEditingProfile(false)}
                              className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer transition">Болих</button>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Утасны дугаар</label>
                            <input type="text" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)}
                              placeholder="Утасны дугаар"
                              className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline outline-blue-500/50 outline-2 bg-slate-50" required />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">И-мэйл хаяг</label>
                            <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)}
                              placeholder="И-мэйл хаяг"
                              className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline outline-blue-500/50 outline-2 bg-slate-50" required />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Товч намтар</label>
                            <textarea value={profileBio} onChange={(e) => setProfileBio(e.target.value)} rows={2}
                              placeholder="Товч намтар..."
                              className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline outline-blue-500/50 outline-2 bg-slate-50 resize-none" />
                          </div>
                          <button type="submit" disabled={isSavingProfile}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg cursor-pointer transition">
                            {isSavingProfile ? 'Хадгалж байна...' : 'Хадгалах'}
                          </button>
                        </form>
                      ) : (
                        <div className="space-y-3">
                          <div className="text-[11px] text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-normal">
                            {delegate.bio || 'Төлөөлөгчийн танилцуулга байхгүй байна.'}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                              <span className="block text-base font-bold text-slate-800 font-mono">{delegate.attendedMeetingsCount}</span>
                              <span className="text-[9px] text-slate-400">Оролцсон хурал</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                              <span className="block text-base font-bold text-slate-800 font-mono">{delegate.votesCastCount}</span>
                              <span className="text-[9px] text-slate-400">Өгсөн санал</span>
                            </div>
                          </div>
                          <div className="text-slate-500 text-[11px] space-y-1.5">
                            <div className="flex items-center gap-2"><Phone size={11} className="text-slate-400 flex-shrink-0" /> {delegate.phone}</div>
                            <div className="flex items-center gap-2"><Mail size={11} className="text-slate-400 flex-shrink-0" /> {delegate.email}</div>
                          </div>
                          <button type="button" onClick={() => setIsEditingProfile(true)}
                            className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-2">
                            <Mail size={12} /> Мэдээлэл засварлах
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notifications section */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Bell size={15} className="text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Мэдэгдэл</h4>
                    {unreadCount > 0 && (
                      <span className="h-5 min-w-[20px] px-1.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center">
                      <Bell size={24} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Одоогоор мэдэгдэл алга байна.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map(item => (
                        <div key={item.id} className={`p-3 rounded-xl border ${item.isRead ? 'bg-slate-50 border-slate-200' : 'bg-blue-50 border-blue-200'}`}>
                          <div className="flex items-start justify-between gap-1.5 mb-1">
                            <span className="text-xs font-bold text-slate-800 leading-tight">{item.title}</span>
                            <span className="text-[8px] font-mono text-slate-400 flex-shrink-0">{new Date(item.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-normal">{item.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Archive section */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <History size={15} className="text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Миний архив</h4>
                  </div>
                  <div className="space-y-2.5">
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckSquare size={14} className="text-slate-400" />
                        <span className="text-xs text-slate-600">Одоогийн хурлын ирц</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isCheckedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                        {isCheckedIn ? 'Ирсэн' : 'Бүртгэгдээгүй'}
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FileText size={14} className="text-slate-400" />
                        <span className="text-xs text-slate-600">Танилцсан материал</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-lg">{readMaterialIds.length} файл</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Send size={14} className="text-slate-400" />
                        <span className="text-xs text-slate-600">Өгсөн нийт санал</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-lg">{delegate.votesCastCount}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle size={14} className="text-slate-400" />
                        <span className="text-xs text-slate-600">Оролцсон хурлын тоо</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-lg">{delegate.attendedMeetingsCount}</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 italic mt-3 leading-normal">
                    Дэлгэрэнгүй архивын файлыг ИТХ-ын хурлын зохион байгуулах албанаас лавлана уу.
                  </p>
                </div>

                {/* Logout */}
                <div className="p-5">
                  <button
                    type="button"
                    onClick={() => { if (confirm('Системээс гарах уу?')) onLogout(); }}
                    className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <X size={13} />
                    Системээс гарах
                  </button>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* MAIN AREA COL_SPAN_9 */}
        <div className="lg:col-span-9 space-y-5">

          {/* DELEGATE EXECUTIVE PROFILE BANNER */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-4 text-center sm:text-left min-w-0">
              {(profileAvatarUrl || delegate.avatarUrl) ? (
                <img
                  src={profileAvatarUrl || delegate.avatarUrl}
                  alt={delegate.fullName}
                  className="h-14 w-14 rounded-2xl object-cover shadow-md flex-shrink-0 border-2 border-white"
                />
              ) : (
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xl flex items-center justify-center shadow-md flex-shrink-0 border-2 border-white">
                  {delegate.fullName.substring(0, 2)}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full border border-blue-150">
                    Төлөөлөгч · {delegate.id.toUpperCase()}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    delegate.party === 'МАН' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    delegate.party === 'АН' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    delegate.party === 'ХҮН' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {delegate.party}
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    📍 {delegate.district}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate">
                  {delegate.fullName}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  📞 {delegate.phone} · 📧 {delegate.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-center">
              {meeting?.status === 'идэвхтэй' && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-2xs">
                  <Clock size={13} className="animate-pulse text-blue-600" />
                  <span>{meetingDurationStr}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
              >
                <User size={15} className="text-blue-400" />
                <span>Миний профайл</span>
              </button>
            </div>
          </div>

          {/* VOTED BANNER */}
          {meeting?.voting.active && hasVoted && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-emerald-600" size={20} />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Таны санал бүртгэгдсэн</h4>
                  <p className="text-[10px] text-slate-500">{meeting.voting.title}</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold">
                Санал: {myVoteValue}
              </span>
            </div>
          )}

          {/* MEETING FINISHED BANNER FOR DELEGATES */}
          {meeting?.status === 'дууссан' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-4 animate-fadeIn">
              <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle size={28} />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-700 block mb-1">
                  ✓ ХУРАЛДААН АЛБАН ЁСООР ДУУССАН
                </span>
                <h3 className="text-xl font-black text-slate-900">{meeting.title}</h3>
                <p className="text-xs text-slate-500 mt-1.5 font-medium">
                  Ирцийн статус: <strong className={isCheckedIn ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>{isCheckedIn ? '✓ Ирц баталгаажсан' : 'Ирц бүртгүүлээгүй'}</strong> | 
                  Хэлэлцсэн асуудал: <strong className="text-slate-800 font-bold">{meeting.agenda.length} сэдэв</strong> | 
                  Санал асуулга: <strong className="text-purple-700 font-bold">{meeting.votingArchive.length} шийдвэр</strong>
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500 font-mono inline-block">
                ℹ️ Хуралдаан дууссан бөгөөд та доорх хэсгээс материалууд болон хувийн тэмдэглэлээ үзэх боломжтой.
              </div>
            </div>
          )}

          {/* SPEAKER QUEUE ACTION PANEL */}
          {meeting && meeting.status !== 'дууссан' && isCheckedIn && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Volume2 className="text-blue-600 flex-shrink-0 animate-pulse" size={20} />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Үг хэлэх хүсэлт</h4>
                  {isCurrentlyInQueue ? (
                    <p className="text-xs text-blue-700 mt-0.5">Та дарааллын <strong>{myQueuePosition}</strong>-т байна.</p>
                  ) : isSpeakingNow ? (
                    <p className="text-xs text-emerald-700 font-bold mt-0.5">Та одоо үг хэлж байна!</p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-0.5">Дарааллд орж үг хэлэх хүсэлт илгээнэ үү.</p>
                  )}
                </div>
              </div>
              <div className="w-full sm:w-auto">
                {isSpeakingNow ? (
                  <div className="bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 justify-center">
                    <span className="animate-ping h-2 w-2 rounded-full bg-white opacity-90 inline-block"></span>
                    Микрофон нээлттэй
                  </div>
                ) : isCurrentlyInQueue ? (
                  <button type="button" onClick={onLeaveSpeakerQueue}
                    className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-2.5 rounded-xl transition w-full cursor-pointer">
                    Дарааллаас гарах
                  </button>
                ) : (
                  <button type="button" onClick={onJoinSpeakerQueue}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-bold text-xs px-5 py-2.5 rounded-xl transition w-full cursor-pointer">
                    Дараалалд орох
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ХЭЛЭЛЦЭХ АСУУДАЛ - Large accordion */}
          {!meeting ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <BookOpen size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Одоогоор идэвхтэй хурал байхгүй байна.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

              {/* Section header */}
              <div className="bg-slate-900 px-6 py-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <BookOpen size={14} className="text-blue-400" />
                  <span className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-widest">Хэлэлцэх асуудал</span>
                </div>
                <h3 className="text-base font-bold text-white leading-tight">{meeting.title}</h3>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">{meeting.agenda.length} асуудал хэлэлцэгдэх</p>
                
                <div className="mt-3 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={matSearchQuery}
                    onChange={(e) => setMatSearchQuery(e.target.value)}
                    placeholder="Материал агуулгаас 'төсөв', 'газар', 'тогтоол', 'заалт' гэж хайх..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-400 outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Accordion items */}
              {meeting.agenda.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm text-slate-400 italic">Хэлэлцэх асуудал бүртгэгдээгүй байна.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {meeting.agenda.map((item, idx) => {
                    const isActive = meeting.activeAgendaItemId === item.id;
                    const isExpanded = isAgendaExpanded(item.id);

                    return (
                      <div key={item.id} className={isActive ? 'border-l-4 border-blue-600' : 'border-l-4 border-transparent'}>

                        {/* Toggle button */}
                        <button
                          type="button"
                          onClick={() => toggleAgendaItem(item.id)}
                          className={`w-full text-left px-6 py-5 flex items-start justify-between gap-4 transition cursor-pointer ${
                            isExpanded ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                              isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                {isActive && (
                                  <span className="bg-blue-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Идэвхтэй асуудал</span>
                                )}
                                <span className="text-[9px] text-slate-400 font-mono">{item.materials.length} материал</span>
                              </div>
                              <p className={`font-bold text-sm leading-snug ${isExpanded ? 'text-blue-800' : 'text-slate-800'}`}>
                                {item.title}
                              </p>
                            </div>
                          </div>
                          <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                            isExpanded ? 'bg-blue-100 text-blue-600 rotate-180' : 'bg-slate-100 text-slate-400'
                          }`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </div>
                        </button>
                        {/* Expanded materials */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              key={`mat-${item.id}`}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22 }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 pb-6 pt-2 bg-blue-50/20">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                  Хавсаргасан баримт бичгүүд ({item.materials.length})
                                </p>
                                {item.materials.length === 0 ? (
                                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                                    <FileText size={22} className="text-slate-200 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400 italic">Энэ асуудалд материал хавсаргаагүй байна.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {item.materials
                                      .filter(mat => {
                                        const q = matSearchQuery.toLowerCase().trim();
                                        if (!q) return true;
                                        return mat.title.toLowerCase().includes(q) ||
                                               mat.contentSummary.toLowerCase().includes(q) ||
                                               (mat.accessLevel && mat.accessLevel.toLowerCase().includes(q));
                                      })
                                      .map(mat => (
                                       <div key={mat.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

                                         {/* Material header */}
                                         <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100">
                                           <div className="flex items-center gap-3 min-w-0 flex-1">
                                             <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 text-white shadow-sm ${
                                               mat.fileType === 'pdf' ? 'bg-rose-500' : mat.fileType === 'docx' ? 'bg-indigo-500' : 'bg-emerald-500'
                                             }`}>
                                               {mat.fileType}
                                             </div>
                                             <div className="flex-1 min-w-0">
                                               <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                                 <span className="font-bold text-slate-800 text-sm leading-tight truncate">{mat.title}</span>
                                                 {mat.accessLevel && (
                                                   <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                                                     mat.accessLevel === 'Нийтэд нээлттэй' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                     mat.accessLevel === 'Хязгаарлагдмал' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                     'bg-blue-50 text-blue-700 border-blue-200'
                                                   }`}>
                                                     {mat.accessLevel === 'Нийтэд нээлттэй' ? <Globe size={10} /> :
                                                      mat.accessLevel === 'Хязгаарлагдмал' ? <Lock size={10} /> : <Shield size={10} />}
                                                     {mat.accessLevel}
                                                   </span>
                                                 )}
                                               </div>
                                               <p className="text-[11px] text-slate-400 font-mono">{mat.fileSize}</p>
                                             </div>
                                           </div>

                                           <div className="flex items-center gap-2 flex-shrink-0">
                                             {mat.fileUrl && (
                                               <button
                                                 type="button"
                                                 onClick={() => openPdfMaterial(mat)}
                                                 className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer text-xs font-bold shadow-sm"
                                               >
                                                 <FileText size={14} />
                                                 Нээж үзэх
                                               </button>
                                             )}
                                             <button
                                               type="button"
                                               onClick={() => triggerSimulatedDownload(mat)}
                                               className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer text-xs font-bold"
                                             >
                                               <Download size={14} />
                                               Татах
                                             </button>
                                           </div>
                                         </div>

                                         {/* Material body */}
                                         {mat.fileUrl ? (
                                           <button
                                             type="button"
                                             onClick={() => openPdfMaterial(mat)}
                                             className="w-full p-4 flex items-center gap-4 bg-blue-50/40 hover:bg-blue-50 transition cursor-pointer text-left group"
                                           >
                                             <div className="h-12 w-12 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                               <FileText size={24} className="text-rose-400" />
                                             </div>
                                             <div className="flex-1">
                                               <p className="font-bold text-slate-700 group-hover:text-blue-700 transition text-xs">Файлыг нээж үзэх</p>
                                               <p className="text-[11px] text-slate-400 mt-0.5">Дарж баримтыг шууд нээнэ</p>
                                             </div>
                                             <ArrowRight size={18} className="text-blue-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                                           </button>
                                         ) : (
                                           <div className="p-4 text-xs leading-relaxed text-slate-600 whitespace-pre-wrap">
                                             {mat.contentSummary}
                                           </div>
                                         )}

                                         {/* DELEGATE PERSONAL STICKY NOTE */}
                                         <div className="p-3.5 bg-amber-50/70 border-t border-amber-200/80">
                                           <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-amber-900">
                                             <span className="flex items-center gap-1.5">
                                               <FileEdit size={13} className="text-amber-600" /> Миний хувийн тэмдэглэл (Sticky Note)
                                             </span>
                                             <div className="flex items-center gap-2">
                                               {noteSaveStatus[mat.id] === 'saving' ? (
                                                 <span className="text-[9px] text-amber-700 font-mono flex items-center gap-1 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
                                                   <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                                                   Профайлд хадгалж байна...
                                                 </span>
                                               ) : materialNotes[mat.id]?.trim() ? (
                                                 <span className="text-[9px] text-emerald-800 font-mono font-bold flex items-center gap-1 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
                                                   <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                                                   ✓ Профайлд хадгалагдсан
                                                 </span>
                                               ) : (
                                                 <span className="text-[9px] text-amber-700/80 font-mono">
                                                   ☁️ Профайлд хадгалагдана
                                                 </span>
                                               )}
                                               <span className="text-[9px] text-amber-800 font-mono flex items-center gap-0.5">
                                                 <Lock size={10} /> Зөвхөн танд харагдана
                                               </span>
                                             </div>
                                           </div>
                                           <textarea
                                             value={materialNotes[mat.id] || ''}
                                             onChange={(e) => handleSaveMaterialNote(mat.id, e.target.value)}
                                             rows={2}
                                             placeholder="Асуулт, санал эсвэл үг хэлэхэд ашиглах тэмдэглэлээ энд бичнэ үү..."
                                             className="w-full text-xs p-2.5 bg-white/80 border border-amber-300 rounded-xl text-amber-950 outline-none focus:border-amber-500 font-sans resize-none shadow-inner"
                                           />
                                         </div>

                                       </div>
                                     ))}
                                  </div>
                                )}
                                {/* AGENDA COMMENTS SECTION */}
                                  <div className="p-4 bg-slate-100/70 border-t border-slate-200/80 space-y-3">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                      <span className="flex items-center gap-1.5">
                                        <MessageSquare size={14} className="text-blue-600" /> Асуудалтай холбоотой санал / тайлбарууд ({(meeting?.agendaComments || []).filter(c => c.agendaItemId === item.id).length})
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-mono">Нийтэд харагдана</span>
                                    </div>

                                    {/* Existing comments */}
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                      {(meeting?.agendaComments || []).filter(c => c.agendaItemId === item.id).length === 0 ? (
                                        <p className="text-[11px] text-slate-400 italic">Санал тайлбар бичигдээгүй байна.</p>
                                      ) : (
                                        (meeting?.agendaComments || []).filter(c => c.agendaItemId === item.id).map(c => (
                                          <div key={c.id} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex items-start gap-2 shadow-2xs">
                                            {c.avatarUrl ? (
                                              <img src={c.avatarUrl} alt={c.delegateName} className="h-6 w-6 rounded-full object-cover border" />
                                            ) : (
                                              <div className="h-6 w-6 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center flex-shrink-0">
                                                {c.delegateName.substring(0, 2)}
                                              </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center justify-between text-[10px]">
                                                <span className="font-bold text-slate-800">{c.delegateName}</span>
                                                <span className="text-[9px] text-slate-400 font-mono">{new Date(c.createdAt).toLocaleTimeString()}</span>
                                              </div>
                                              <p className="text-slate-600 text-[11px] mt-0.5">{c.text}</p>
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>

                                    {/* Input comment */}
                                    <div className="flex items-center gap-2 pt-1">
                                      <input
                                        type="text"
                                        value={commentInputs[item.id] || ''}
                                        onChange={(e) => setCommentInputs({ ...commentInputs, [item.id]: e.target.value })}
                                        placeholder="Энэ асуудалд тайлбар/санал бичих..."
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendComment(item.id); }}
                                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSendComment(item.id)}
                                        disabled={submittingComment === item.id || !commentInputs[item.id]?.trim()}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer flex items-center gap-1 flex-shrink-0 shadow-xs"
                                      >
                                        <Send size={12} />
                                        Илгээх
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                        </AnimatePresence>

                      </div>
                    );
                  })}
                </div>
              )}

              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
                <span className="text-[9px] text-slate-400 font-mono">🔒 Сайншанд сумын Төрийн цахим хуулиар хамгаалагдсан материалууд</span>
              </div>
            </div>
          )}

          {/* SPEAKER QUEUE LIST */}
          {meeting && meeting.status !== 'дууссан' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h4 className="font-bold text-slate-800 text-xs mb-4 flex items-center gap-2 uppercase tracking-wide">
                <Users size={14} className="text-blue-600" /> Үг хэлэхээр дарааллд буй төлөөлөгчид ({meeting.speakerQueue.length})
              </h4>
              {meeting.speakerQueue.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Одоогоор дарааллд ороогүй байна.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {meeting.speakerQueue.map((item, index) => {
                    const queueDelegate = allDelegates.find(x => x.id === item.delegateId);
                    const isMe = item.delegateId === delegate.id;
                    return (
                      <div key={item.delegateId} className={`p-3 rounded-xl border flex items-center justify-between gap-2 shadow-sm ${isMe ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="h-5 w-5 bg-white border border-slate-200 text-slate-700 rounded-full font-bold text-[10px] flex items-center justify-center font-mono shadow-sm">
                            {index + 1}
                          </span>
                          <div className="truncate">
                            <p className="text-xs text-slate-800 font-bold truncate">{queueDelegate?.fullName}</p>
                            <p className="text-[9px] text-slate-400 font-mono italic">{item.turn}-р дахь асуулт</p>
                          </div>
                        </div>
                        {isMe && <span className="text-[7px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">Минийх</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT SIDEBAR COL_SPAN_3 — жижиг */}
        <div className="lg:col-span-3 space-y-3">

          {/* Drawer товч */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="relative h-8 w-8 bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
              title="Цэс нээх"
            >
              <Menu size={15} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[14px] px-0.5 bg-rose-500 rounded-full text-[7px] flex items-center justify-center font-bold text-white border border-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* ИРЦИЙН БҮРТГЭЛ — жижиг */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
            <h4 className="font-bold text-slate-700 text-[10px] mb-2 flex items-center gap-1.5 uppercase tracking-wide">
              <CheckSquare size={11} className="text-blue-600" /> Ирц бүртгэл
            </h4>
            {!meeting ? (
              <p className="text-[10px] text-slate-400">Хурал олдсонгүй.</p>
            ) : isCheckedIn ? (
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center gap-2">
                <CheckCircle className="text-emerald-500 flex-shrink-0" size={15} />
                <div>
                  <div className="text-[10px] font-bold text-emerald-800">Баталгаажсан</div>
                  <div className="text-[8px] text-emerald-600 font-mono mt-0.5">
                    {new Date(meeting.attendance[delegate.id]).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ) : meeting.attendanceOpen ? (
              <button type="button" onClick={onRegisterAttendance}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer text-[10px]">
                <CheckCircle size={11} /> Бүртгүүлэх
              </button>
            ) : (
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-center">
                <AlertTriangle className="text-slate-300 mx-auto mb-1" size={13} />
                <div className="text-[9px] font-semibold text-slate-500">Бүртгэл хаагдсан</div>
              </div>
            )}
          </div>

          {/* ҮГ ХЭЛЖ БУЙ — жижиг */}
          {meeting && meeting.status !== 'дууссан' && (
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
              <h4 className="text-[8px] text-blue-600 font-mono font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                <Clock size={10} className="animate-pulse" /> Үг хэлж буй
              </h4>
              {meeting.currentSpeaker ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold text-[9px] uppercase flex-shrink-0">
                      {activeSpeakerDelegate ? activeSpeakerDelegate.fullName.substring(0, 3) : '...'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-[10px] truncate">{activeSpeakerDelegate?.fullName || 'Тодорхойгүй'}</div>
                      <div className="text-[8px] text-slate-400 font-mono">{meeting.currentSpeaker.turn}-р асуулт</div>
                    </div>
                  </div>
                  <div className="bg-slate-50 py-2.5 rounded-lg border border-slate-200 text-center relative">
                    <div className={`text-2xl font-mono font-bold tracking-widest ${meeting.currentSpeaker.remainingSeconds <= 30 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                      {formatSeconds(meeting.currentSpeaker.remainingSeconds)}
                    </div>
                    <div className="text-[8px] text-slate-400 mt-0.5">Үлдсэн</div>
                    {meeting.currentSpeaker.isPaused && (
                      <span className="absolute top-1 right-1 bg-amber-50 text-amber-700 text-[7px] font-bold px-1 py-0.5 rounded border border-amber-200">Зогссон</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 text-slate-400 text-[10px]">Одоогоор байхгүй.</div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* DELEGATE EXECUTIVE PROFILE MODAL */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full overflow-hidden shadow-2xl text-slate-800 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-600/30 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/30">
                    <User size={22} />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-widest block">САЙНШАНД СУМЫН ИТХ</span>
                    <h3 className="text-base font-bold text-white">Төлөөлөгчийн Хувийн Хэрэг & Профайл</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Toast banner inside profile */}
              {profileToast && (
                <div className="bg-emerald-600 text-white font-bold text-xs px-4 py-2 text-center animate-fadeIn">
                  {profileToast}
                </div>
              )}

              {/* Content scrollable */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                
                {/* Identity banner */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                  {(profileAvatarUrl || delegate.avatarUrl) ? (
                    <img
                      src={profileAvatarUrl || delegate.avatarUrl}
                      alt={delegate.fullName}
                      className="h-16 w-16 rounded-2xl object-cover shadow-md flex-shrink-0 border-2 border-white"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-2xl flex items-center justify-center shadow-md flex-shrink-0 border-2 border-white">
                      {delegate.fullName.substring(0, 2)}
                    </div>
                  )}
                  <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full border border-blue-200">
                        {delegate.id.toUpperCase()}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        delegate.party === 'МАН' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        delegate.party === 'АН' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        delegate.party === 'ХҮН' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-slate-200 text-slate-800 border-slate-300'
                      }`}>
                        {delegate.party}
                      </span>
                      <span className="text-xs font-bold text-slate-700 bg-slate-200/70 px-2.5 py-0.5 rounded-full border border-slate-300">
                        📍 {delegate.district}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 leading-tight">{delegate.fullName}</h2>
                    <p className="text-xs text-slate-500 font-mono">Нэвтрэх нэр: @{delegate.username}</p>
                  </div>
                </div>

                {/* Profile Tabs */}
                <div className="flex border-b border-slate-200 font-bold text-xs gap-4">
                  <button
                    type="button"
                    onClick={() => setProfileTab('info')}
                    className={`pb-3 px-1 transition border-b-2 cursor-pointer ${
                      profileTab === 'info' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    📋 Үндсэн мэдээлэл & Зураг
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileTab('stats')}
                    className={`pb-3 px-1 transition border-b-2 cursor-pointer ${
                      profileTab === 'stats' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    📊 Идэвхжүүлэлт & Ирц
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileTab('notes')}
                    className={`pb-3 px-1 transition border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      profileTab === 'notes' ? 'border-amber-600 text-amber-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    📝 Миний тэмдэглэлүүд
                    {Object.entries(materialNotes).filter(([_, t]) => t?.trim()).length > 0 && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border border-amber-300">
                        {Object.entries(materialNotes).filter(([_, t]) => t?.trim()).length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileTab('security')}
                    className={`pb-3 px-1 transition border-b-2 cursor-pointer whitespace-nowrap ${
                      profileTab === 'security' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🔑 Нууц үг солих
                  </button>
                </div>

                {/* TAB 1: INFO & EDIT PHOTO */}
                {profileTab === 'info' && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setIsSavingProfile(true);
                    try {
                      await onUpdateProfile({
                        phone: profilePhone,
                        email: profileEmail,
                        bio: profileBio,
                        avatarUrl: profileAvatarUrl
                      });
                      showProfileToastMsg('✓ Мэдээлэл болон зураг амжилттай хадгалагдлаа!');
                    } catch {
                      alert('Хадгалахад алдаа гарлаа.');
                    } finally {
                      setIsSavingProfile(false);
                    }
                  }} className="space-y-4 text-xs">
                    
                    {/* PHOTO UPLOAD SECTION */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                      <label className="block font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                        <Camera size={14} className="text-blue-600" /> Төлөөлөгчийн профайл зураг солих
                      </label>

                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        {/* Avatar preview */}
                        <div className="relative group flex-shrink-0">
                          {profileAvatarUrl ? (
                            <img
                              src={profileAvatarUrl}
                              alt={delegate.fullName}
                              className="h-16 w-16 rounded-2xl object-cover border-2 border-white shadow-md"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-2xl flex items-center justify-center shadow-md border-2 border-white">
                              {delegate.fullName.substring(0, 2)}
                            </div>
                          )}
                        </div>

                        {/* File upload actions */}
                        <div className="flex-1 space-y-2 text-center sm:text-left">
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <label className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm">
                              <Upload size={13} />
                              <span>Зураг оруулах (.jpg, .png)</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarFileUpload}
                                className="hidden"
                              />
                            </label>

                            {profileAvatarUrl && (
                              <button
                                type="button"
                                onClick={() => setProfileAvatarUrl('')}
                                className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 size={13} />
                                <span>Зураг арилгах</span>
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">
                            ℹ️ Та утас эсвэл компьютерээсээ өөрийн зургийг сонгож шууд хадгалах боломжтой.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <Phone size={13} className="text-blue-600" /> Утасны дугаар
                        </label>
                        <input
                          type="text"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-mono text-slate-800 font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                          <Mail size={13} className="text-blue-600" /> И-мэйл хаяг
                        </label>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-slate-800 font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <FileEdit size={13} className="text-blue-600" /> Төлөөлөгчийн зарчим, товч танилцуулга (Bio)
                      </label>
                      <textarea
                        value={profileBio}
                        onChange={(e) => setProfileBio(e.target.value)}
                        rows={3}
                        placeholder="Төлөөлөгчийн баримтлах зарчим, ажлын товч туршлага..."
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-slate-800 resize-none font-sans leading-relaxed"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2"
                    >
                      <Save size={14} />
                      {isSavingProfile ? 'Хадгалж байна...' : 'Мэдээлэл болон Зургаа Хадгалах'}
                    </button>
                  </form>
                )}

                {/* TAB 4: MY PERSONAL NOTES */}
                {profileTab === 'notes' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-amber-900 flex items-center gap-2 text-xs">
                          <FileEdit size={14} className="text-amber-600" /> Миний хувийн тэмдэглэлүүд (Sticky Notes)
                        </h4>
                        <p className="text-[11px] text-amber-800/80 mt-1 leading-relaxed">
                          Эдгээр тэмдэглэлүүд нь зөвхөн таны хувийн профайлд найдвартай хадгалагддаг бөгөөд бусад төлөөлөгч болон админд харагдахгүй.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-xl border border-amber-300 flex-shrink-0">
                        Нийт {Object.entries(materialNotes).filter(([_, t]) => t?.trim()).length} тэмдэглэл
                      </span>
                    </div>

                    {Object.entries(materialNotes).filter(([_, t]) => t?.trim()).length === 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-2">
                        <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
                          <FileEdit size={24} />
                        </div>
                        <h5 className="font-bold text-slate-800 text-xs">Одоогоор хадгалсан тэмдэглэл алга байна</h5>
                        <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                          Хуралдааны хэлэлцэх асуудлын материал дээр байрлах "Миний хувийн тэмдэглэл (Sticky Note)" хэсэгт бичсэнээр энд автоматаар найдвартай хадгалагдана.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {Object.entries(materialNotes)
                          .filter(([_, t]) => t?.trim())
                          .map(([matId, noteText]) => {
                            const info = getNoteMaterialInfo(matId);
                            return (
                              <div key={matId} className="bg-white border border-amber-200/90 rounded-2xl p-3.5 shadow-sm space-y-2">
                                <div className="flex items-start justify-between gap-2 border-b border-amber-100 pb-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[10px] font-bold text-amber-800 truncate flex items-center gap-1.5">
                                      <BookOpen size={11} className="text-blue-600 flex-shrink-0" />
                                      <span>{info.agendaTitle}</span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5 mt-0.5">
                                      <FileText size={12} className="text-rose-500 flex-shrink-0" />
                                      <span>{info.materialTitle}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMaterialNote(matId)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer flex-shrink-0"
                                    title="Тэмдэглэл устгах"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                                <textarea
                                  value={noteText}
                                  onChange={(e) => handleSaveMaterialNote(matId, e.target.value)}
                                  rows={2}
                                  className="w-full text-xs p-2 bg-amber-50/50 border border-amber-200 rounded-xl text-slate-800 outline-none focus:border-amber-400 resize-none font-sans"
                                  placeholder="Тэмдэглэл бичих..."
                                />
                                <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono pt-0.5">
                                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                                    Профайлд хадгалагдсан
                                  </span>
                                  <span>Өөрчлөхөд автоматаар шинэчлэгдэнэ</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: STATS */}
                {profileTab === 'stats' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl">
                        <span className="block text-2xl font-black text-blue-700 font-mono">{delegate.attendedMeetingsCount}</span>
                        <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mt-1 block">Оролцсон хурал</span>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl">
                        <span className="block text-2xl font-black text-emerald-700 font-mono">{delegate.votesCastCount}</span>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mt-1 block">Өгсөн санал</span>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-2xl">
                        <span className="block text-2xl font-black text-purple-700 font-mono">96%</span>
                        <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider mt-1 block">Ирцийн хувь</span>
                      </div>
                      <div
                        onClick={() => setProfileTab('notes')}
                        className="bg-amber-50 hover:bg-amber-100/80 border border-amber-200 p-3.5 rounded-2xl cursor-pointer transition shadow-xs group"
                        title="Дарж хувийн тэмдэглэлүүдээ үзэх"
                      >
                        <span className="block text-2xl font-black text-amber-700 font-mono group-hover:scale-105 transition-transform">
                          {Object.entries(materialNotes).filter(([_, t]) => t?.trim()).length}
                        </span>
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mt-1 block flex items-center justify-center gap-1">
                          Хувийн тэмдэглэл <span className="text-amber-600 font-normal">→</span>
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 text-xs">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <CheckSquare size={14} className="text-blue-600" /> Одоогийн хуралдааны ирцийн төлөв
                      </h4>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-slate-600">Одоогийн хурал:</span>
                        <strong className="text-slate-900 font-bold">{meeting ? meeting.title : 'Хуралгүй'}</strong>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                        <span className="text-slate-600">Ирцийн бүртгэл:</span>
                        <span className={`font-bold px-2.5 py-0.5 rounded-full ${
                          isCheckedIn ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {isCheckedIn ? '✓ Баталгаажсан (Ирсэн)' : 'Бүртгүүлээгүй'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: SECURITY & CHANGE PASSWORD */}
                {profileTab === 'security' && (
                  <form onSubmit={handlePasswordChangeSubmit} className="space-y-4 text-xs">
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <Lock size={14} className="text-blue-600" /> Аюулгүй байдал & Нууц үг
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Системд нэвтрэх нууц үгээ эндээс шууд шинэчлэх боломжтой. Нууц үгээ хариуцлагатай хадгална уу.
                      </p>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Шинэ нууц үг оруулна уу</label>
                      <input
                        type="password"
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="Шинэ нууц үг"
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-mono text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Шинэ нууц үг дахин оруулна уу</label>
                      <input
                        type="password"
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="Шинэ нууц үг баталгаажуулах"
                        className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-mono text-slate-800"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2"
                    >
                      <Lock size={14} />
                      {isChangingPassword ? 'Шинэчилж байна...' : 'Нууц үгийг Шинэчлэх'}
                    </button>
                  </form>
                )}

              </div>

              {/* Footer */}
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-center flex items-center justify-between text-[10px] text-slate-400 font-mono flex-shrink-0">
                <span>🔒 Сайншанд сумын ИТХ-ын Төлөөлөгчийн Баталгаажсан Баримт</span>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Хаах
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
