/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Delegate, CRKMeeting, NotificationItem, AgendaMaterial } from '../types.js';
import {
  CheckCircle, Clock, Volume2, AlertTriangle, FileText,
  Download, Users, BookOpen, CheckSquare, History, Bell, Mail, Phone, ArrowRight,
  Menu, X, Send
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
  onSubmitVote: (choice: 'Зөвшөөрсөн' | 'Татгалзсан' | 'Түтгэлзсэн') => Promise<void>;
  onUpdateProfile: (data: { phone: string; email: string; bio: string }) => Promise<void>;
  onLogout: () => void;
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
  onLogout
}: DelegateDashboardProps) {
  const [selectedAgendaId, setSelectedAgendaId] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [profilePhone, setProfilePhone] = useState(delegate.phone);
  const [profileEmail, setProfileEmail] = useState(delegate.email);
  const [profileBio, setProfileBio] = useState(delegate.bio || '');

  const [pdfViewer, setPdfViewer] = useState<AgendaMaterial | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [readMaterialIds, setReadMaterialIds] = useState<string[]>([]);

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
    <div className="max-w-7xl mx-auto px-4 py-6 pb-24" id="delegate-screen-area">

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
                <div className="flex items-center gap-2.5 text-blue-600">
                  <AlertTriangle className="animate-pulse" size={20} />
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider">Шууд санал хураалт</span>
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
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => onSubmitVote('Зөвшөөрсөн')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition flex flex-col items-center justify-center gap-1 cursor-pointer text-xs">
                  <span className="text-base">👍</span>
                  <span>Зөвшөөрсөн</span>
                </button>
                <button onClick={() => onSubmitVote('Татгалзсан')}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl transition flex flex-col items-center justify-center gap-1 cursor-pointer text-xs">
                  <span className="text-base">👎</span>
                  <span>Татгалзсан</span>
                </button>
                <button onClick={() => onSubmitVote('Түтгэлзсэн')}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl transition flex flex-col items-center justify-center gap-1 cursor-pointer text-xs">
                  <span className="text-base">✋</span>
                  <span>Түтгэлзсэн</span>
                </button>
              </div>
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
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 bg-slate-900 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-sm">
                    {delegate.fullName.substring(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm leading-tight">{delegate.fullName}</p>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">Тойрог: {delegate.district.split(' ')[0]}</p>
                  </div>
                </div>
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

                {/* Profile + Logout */}
                <div className="p-5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Бусад</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => { setIsSidebarOpen(false); setIsEditingProfile(true); }}
                      className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 px-3.5"
                    >
                      <Mail size={13} className="text-slate-400" />
                      Профайл засварлах
                    </button>
                    <button
                      onClick={() => { if (confirm('Системээс гарах уу?')) onLogout(); }}
                      className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 px-3.5"
                    >
                      <X size={13} />
                      Системээс гарах
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* SIDEBAR COL_SPAN_4 */}
        <div className="lg:col-span-4 space-y-5">

          {/* PROFILE CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
              <div className="h-12 w-12 rounded-xl bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-sm flex-shrink-0">
                {delegate.fullName.substring(0, 3)}
              </div>
              <div className="truncate">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold font-mono">Тойрог: {delegate.district.split(' ')[0]}</span>
                <h3 className="font-bold text-slate-900 text-sm tracking-tight leading-tight mt-1">{delegate.fullName}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">{delegate.email}</p>
              </div>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleProfileSave} className="mt-4 space-y-3">
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
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={isSavingProfile}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex-1 cursor-pointer transition">
                    {isSavingProfile ? 'Хадгалж байна...' : 'Хадгалах'}
                  </button>
                  <button type="button" onClick={() => setIsEditingProfile(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition">
                    Болих
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="text-[11px] text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-normal">
                  {delegate.bio || 'Төлөөлөгчийн танилцуулга байхгүй байна.'}
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg">
                    <span className="block text-base font-bold text-slate-800 font-mono">{delegate.attendedMeetingsCount}</span>
                    <span className="text-[9px] text-slate-400 font-medium">Оролцсон хурал</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg">
                    <span className="block text-base font-bold text-slate-800 font-mono">{delegate.votesCastCount}</span>
                    <span className="text-[9px] text-slate-400 font-medium">Өгсөн санал</span>
                  </div>
                </div>
                <div className="text-slate-500 text-[11px] space-y-1 pt-1">
                  <div className="flex items-center gap-1.5"><Phone size={11} className="text-slate-400" /> {delegate.phone}</div>
                  <div className="flex items-center gap-1.5"><Mail size={11} className="text-slate-400" /> {delegate.email}</div>
                </div>
              </div>
            )}
          </div>

          {/* ATTENDANCE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h4 className="font-bold text-slate-900 text-xs mb-3 flex items-center gap-2 uppercase tracking-wide">
              <CheckSquare size={14} className="text-blue-600" /> Ирц бүртгэл
            </h4>
            {!meeting ? (
              <p className="text-xs text-slate-500">Холбогдох идэвхтэй хурал олдсонгүй.</p>
            ) : isCheckedIn ? (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center gap-2.5">
                <CheckCircle className="text-emerald-500 flex-shrink-0" size={20} />
                <div>
                  <div className="text-xs font-bold text-emerald-800">Ирц баталгаажсан</div>
                  <div className="text-[9px] text-emerald-600 font-mono mt-0.5 font-semibold">
                    Бүртгэсэн: {new Date(meeting.attendance[delegate.id]).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ) : meeting.attendanceOpen ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed">Ирцийн бүртгэл нээлттэй байна. Товчийг дарж ирцээ баталгаажуулна уу.</p>
                <button type="button" onClick={onRegisterAttendance}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer text-xs">
                  <CheckCircle size={15} /> Ирц Бүртгүүлэх
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
                <AlertTriangle className="text-slate-400 mx-auto mb-1" size={16} />
                <div className="text-xs font-semibold text-slate-600">Ирц бүртгэл хаагдсан</div>
                <div className="text-[10px] text-slate-400 mt-1">Хуралдааны ирц нээхийг хүлээж байна.</div>
              </div>
            )}
          </div>

          {/* ACTIVE SPEAKER TIMER */}
          {meeting && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h4 className="text-[9px] text-blue-600 font-mono font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Clock size={12} className="animate-pulse" /> Үг хэлж буй төлөөлөгч
              </h4>
              {meeting.currentSpeaker ? (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                      {activeSpeakerDelegate ? activeSpeakerDelegate.fullName.substring(0, 3) : '...'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{activeSpeakerDelegate?.fullName || 'Тодорхойгүй'}</div>
                      <div className="text-[9px] text-slate-400 font-mono font-semibold">{meeting.currentSpeaker.turn} дэх удаа асуулт</div>
                    </div>
                  </div>
                  <div className="bg-slate-50 px-4 py-3.5 rounded-xl border border-slate-200 text-center relative">
                    <div className={`text-4xl font-mono font-bold tracking-widest ${meeting.currentSpeaker.remainingSeconds <= 30 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                      {formatSeconds(meeting.currentSpeaker.remainingSeconds)}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1">Үлдсэн хугацаа</div>
                    {meeting.currentSpeaker.isPaused && (
                      <span className="absolute top-2 right-2 bg-amber-50 text-amber-700 text-[8px] font-bold px-1 py-0.5 rounded uppercase border border-amber-200">Түр зогссон</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400 text-xs">Одоогоор үг хэлж буй төлөөлөгч байхгүй.</div>
              )}
            </div>
          )}

        </div>

        {/* MAIN AREA COL_SPAN_8 */}
        <div className="lg:col-span-8 space-y-5">

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

          {/* SPEAKER QUEUE ACTION PANEL */}
          {meeting && isCheckedIn && (
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
                                  Хавсаргасан баримт бичгүүд
                                </p>
                                {item.materials.length === 0 ? (
                                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                                    <FileText size={22} className="text-slate-200 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400 italic">Энэ асуудалд материал хавсаргаагүй байна.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {item.materials.map(mat => (
                                      <div key={mat.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

                                        {/* Material header */}
                                        <div className="p-4 flex items-center gap-4 border-b border-slate-100">
                                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-sm uppercase flex-shrink-0 text-white shadow-sm ${
                                            mat.fileType === 'pdf' ? 'bg-rose-500' : mat.fileType === 'docx' ? 'bg-indigo-500' : 'bg-emerald-500'
                                          }`}>
                                            {mat.fileType}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 text-sm leading-tight truncate">{mat.title}</p>
                                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{mat.fileSize}</p>
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
                                            className="w-full p-5 flex items-center gap-4 bg-blue-50/40 hover:bg-blue-50 transition cursor-pointer text-left group"
                                          >
                                            <div className="h-14 w-14 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                              <FileText size={28} className="text-rose-400" />
                                            </div>
                                            <div className="flex-1">
                                              <p className="font-bold text-slate-700 group-hover:text-blue-700 transition text-sm">Файлыг нээж үзэх</p>
                                              <p className="text-xs text-slate-400 mt-0.5">Дарж PDF баримтыг шууд нээнэ</p>
                                            </div>
                                            <ArrowRight size={20} className="text-blue-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                                          </button>
                                        ) : (
                                          <div className="p-5 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                                            {mat.contentSummary}
                                          </div>
                                        )}

                                      </div>
                                    ))}
                                  </div>
                                )}
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
          {meeting && (
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
      </div>

      {/* FIXED FLOATING MENU BUTTON */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl shadow-xl flex items-center justify-center cursor-pointer transition z-30"
        title="Цэс нээх"
      >
        <Menu size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 bg-rose-500 rounded-full text-[9px] flex items-center justify-center font-bold text-white border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

    </div>
  );
}
