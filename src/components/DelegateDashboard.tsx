/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Delegate, CRKMeeting, NotificationItem, AgendaItem, AgendaMaterial } from '../types.js';
import { 
  User, CheckCircle, Clock, Volume2, Key, AlertTriangle, FileText, 
  Download, Users, BookOpen, Send, CheckSquare, History, Bell, Mail, Phone, ArrowRight 
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
  // UI Tabs & Interactive states
  const [activeTab, setActiveTab] = useState<'agenda' | 'notifications' | 'archive'>('agenda');
  const [selectedAgendaId, setSelectedAgendaId] = useState<string | null>(null);
  const [openMaterial, setOpenMaterial] = useState<AgendaMaterial | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Profile form state
  const [profilePhone, setProfilePhone] = useState(delegate.phone);
  const [profileEmail, setProfileEmail] = useState(delegate.email);
  const [profileBio, setProfileBio] = useState(delegate.bio || '');

  // PDF viewer modal
  const [pdfViewer, setPdfViewer] = useState<AgendaMaterial | null>(null);

  // Track downloaded simulated files to mock "таж авах"
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [readMaterialIds, setReadMaterialIds] = useState<string[]>([]);

  // Sound buzz for timers
  const playTimerBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime); // 600 Hz beep
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.8); // Beep for 0.8s
    } catch (e) {
      // Audio permission limits in browser iframe default block
      console.log('Timer alert audio trigger skipped due to iframe constraints');
    }
  };

  // Beep when speaker timer runs down
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

  // Active voting state
  const hasVoted = meeting?.voting.active && meeting.voting.votes[delegate.id];
  const myVoteValue = hasVoted ? meeting.voting.votes[delegate.id].choice : null;

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await onUpdateProfile({
        phone: profilePhone,
        email: profileEmail,
        bio: profileBio
      });
      setIsEditingProfile(false);
    } catch (err) {
      alert('Профайл хадгалахад алдаа гарлаа.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const triggerSimulatedDownload = (material: AgendaMaterial) => {
    setDownloadedIds(prev => [...prev, material.id]);
    
    // Create text file blob to download content summary representation
    const element = document.createElement("a");
    const file = new Blob([
      `Сайншанд сумын ИТХ-ын Цахим систем\nХэлэлцэх Материал: ${material.title}\nХэмжээ: ${material.fileSize}\n\nТайлбар:\n${material.contentSummary}\n\nЭнэхүү файлыг системээс амжилттай татаж авлаа.\nТатаж авсан огноо: ${new Date().toLocaleString()}`
    ], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = material.title.replace(/\.pdf|\.xlsx|\.docx/, '.txt');
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const readMaterial = (material: AgendaMaterial) => {
    setOpenMaterial(material);
    if (!readMaterialIds.includes(material.id)) {
      setReadMaterialIds(prev => [...prev, material.id]);
    }
  };

  // Turn tracking label
  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

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
            {/* Modal header */}
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

            {/* PDF iframe */}
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

      {/* ACTIVE VOTING POPUP MODAL (HIGHEST PRIORITY / REAL-TIME RESPONSE) */}
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
              className="bg-white border border-slate-250 rounded-2xl max-w-lg w-full p-6 shadow-xl relative text-slate-800"
            >
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2.5 text-blue-600">
                  <AlertTriangle className="animate-pulse" size={20} />
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider">Шууд санал хураалт</span>
                </div>
                {meeting.voting.remainingSeconds !== undefined && (
                  <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full ${
                    meeting.voting.remainingSeconds <= 15 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-blue-105 bg-blue-100 text-blue-700'
                  }`}>
                    Үлдсэн: {meeting.voting.remainingSeconds}с
                  </span>
                )}
              </div>

              {meeting.voting.remainingSeconds !== undefined && (
                <div className="w-full bg-slate-100 h-1.5 rounded-full mb-4 overflow-hidden border border-slate-200">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      meeting.voting.remainingSeconds <= 15 ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${(meeting.voting.remainingSeconds / 60) * 105}%`, maxWidth: '100%' }}
                  ></div>
                </div>
              )}

              <h3 className="text-base md:text-lg font-bold text-slate-900 mb-4 leading-tight">
                {meeting.voting.title}
              </h3>

              <p className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed mb-6">
                ℹ️ Сайншанд сумын ИТХ-ын дэгийн дагуу таны өгсөн саналыг бодит хугацаанд заалны том дэлгэцэнд шууд нэгтгэн харуулах тул саналаа нягталж, хариуцлагатай сонголт хийнэ үү.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => onSubmitVote('Зөвшөөрсөн')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition flex flex-col items-center justify-center gap-1 cursor-pointer text-xs"
                >
                  <span className="text-base">👍</span>
                  <span>Зөвшөөрсөн</span>
                </button>

                <button
                  onClick={() => onSubmitVote('Татгалзсан')}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl transition flex flex-col items-center justify-center gap-1 cursor-pointer text-xs"
                >
                  <span className="text-base">👎</span>
                  <span>Татгалзсан</span>
                </button>

                <button
                  onClick={() => onSubmitVote('Түтгэлзсэн')}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl transition flex flex-col items-center justify-center gap-1 cursor-pointer text-xs"
                >
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SIDEBAR COL_SPAN_4 */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* PROFILE CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 relative overflow-hidden" id="delegate-profile-box">
            
            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
              <div className="h-12 w-12 rounded-xl bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-sm flex-shrink-0">
                {delegate.fullName.substring(0, 3)}
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">Тойрог: {delegate.district.split(' ')[0]}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm tracking-tight leading-tight mt-1">{delegate.fullName}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">{delegate.email}</p>
              </div>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleProfileSave} className="mt-4 space-y-3 animate-fadeIn">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Утасны дугаар</label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline outline-blue-500/50 outline-2 bg-slate-50"
                    placeholder="Утасны дугаар"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">И-мэйл хаяг</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline outline-blue-500/50 outline-2 bg-slate-50"
                    placeholder="И-мэйл"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Товч намтар / Мэдээлэл</label>
                  <textarea
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    rows={2}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline outline-blue-500/50 outline-2 bg-slate-50 resize-none"
                    placeholder="Товч намтар..."
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex-1 cursor-pointer transition shadow-sm"
                  >
                    {isSavingProfile ? 'Хадгалж байна...' : 'Хадгалах'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition"
                  >
                    Болих
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="text-[11px] text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-normal">
                  {delegate.bio || 'Төлөөлөгчийн танилцуулга био оруулаагүй байна.'}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-center" id="delegate-stats-grid">
                  <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg">
                    <span className="block text-base font-bold text-slate-800 font-mono">{delegate.attendedMeetingsCount}</span>
                    <span className="text-[9px] text-slate-400 font-medium">Оролцсон хурал</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg">
                    <span className="block text-base font-bold text-slate-800 font-mono">{delegate.votesCastCount}</span>
                    <span className="text-[9px] text-slate-400 font-medium">Өгсөн санал</span>
                  </div>
                </div>

                <div className="text-slate-500 text-[11px] space-y-1 pt-1 font-sans">
                  <div className="flex items-center gap-1.5"><Phone size={11} className="text-slate-400" /> {delegate.phone}</div>
                  <div className="flex items-center gap-1.5"><Mail size={11} className="text-slate-400" /> {delegate.email}</div>
                </div>

                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-605 text-[11px] font-bold py-1.5 rounded-lg transition cursor-pointer"
                >
                  Мэдээлэл засварлах
                </button>
                <button
                  onClick={() => { if (confirm('Системээс гарах уу?')) onLogout(); }}
                  className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-[11px] font-bold py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Системээс гарах
                </button>
              </div>
            )}
          </div>

          {/* ATTENDANCE CORNER */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 relative overflow-hidden" id="attendance-section-box">
            <h4 className="font-bold text-slate-900 text-xs mb-3 flex items-center gap-2 uppercase tracking-wide">
              <CheckSquare size={14} className="text-blue-600" /> Ирц бүртгэл
            </h4>

            {!meeting ? (
              <p className="text-xs text-slate-500">Холбогдох идэвхтэй хурал олдсонгүй.</p>
            ) : isCheckedIn ? (
              <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-lg flex items-center gap-2.5 animate-fadeIn">
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
                <p className="text-xs text-slate-500 leading-relaxed">
                  Сумын ИТХ-ын хуралдааныг эхлүүлэхээр ирцийн бүртгэлийг админаас нээсэн байна. Та доорх товчийг дарж ирцээ баталгаажуулна уу.
                </p>
                <button
                  onClick={onRegisterAttendance}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                >
                  <CheckCircle size={15} />
                  <span>Ирц Бүртгүүлэх</span>
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

          {/* ACTIVE SPEAKER TIMER PANEL */}
          {meeting && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-slate-800 shadow-sm relative overflow-hidden" id="timer-active-delegate-box">
              <h4 className="text-[9px] text-blue-600 font-mono font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Clock size={12} className="animate-pulse" /> Үг хэлж буй төлөөлөгч
              </h4>

              {meeting.currentSpeaker ? (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                      {activeSpeakerDelegate ? activeSpeakerDelegate.fullName.substring(0, 3) : '...' }
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {activeSpeakerDelegate?.fullName || 'Тодорхойгүй'}
                      </div>
                      <div className="text-[9px] text-slate-400 flex items-center gap-1 font-mono font-semibold">
                        <span>{meeting.currentSpeaker.turn} дэх удаа асуулт</span>
                      </div>
                    </div>
                  </div>

                  {/* Gigantic ticking timer */}
                  <div className="bg-slate-50 px-4 py-3.5 rounded-xl border border-slate-200 text-center relative">
                    <div className={`text-4xl font-mono font-bold tracking-widest ${
                      meeting.currentSpeaker.remainingSeconds <= 30 ? 'text-rose-600 animate-pulse' : 'text-slate-805'
                    }`}>
                      {formatSeconds(meeting.currentSpeaker.remainingSeconds)}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1">Үлдсэн хугацаа</div>
                    {meeting.currentSpeaker.isPaused && (
                      <span className="absolute top-2 right-2 bg-amber-50 text-amber-705 text-[8px] font-bold px-1 py-0.5 rounded uppercase border border-amber-205">Түр зогссон</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400 text-xs">
                  Одоогоор идэвхтэй үг хэлж буй төлөөлөгч байхгүй байна.
                </div>
              )}
            </div>
          )}

        </div>

        {/* MAIN AREA COL_SPAN_8 */}
        <div className="lg:col-span-8 space-y-6">

          {/* SIMULTANEOUS VOTING RESIDUAL VIEW (IF ALREADY VOTED) */}
          {meeting?.voting.active && hasVoted && (
            <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-4 flex items-center justify-between shadow-sm animate-fadeIn">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-emerald-600" size={20} />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Таны санал бүртгэгдсэн</h4>
                  <p className="text-[10px] text-slate-500">{meeting.voting.title}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold">
                  Санал: {myVoteValue}
                </span>
                <p className="text-[8px] text-slate-400 mt-1.5 font-mono">Ард талд нэгтгэж байна...</p>
              </div>
            </div>
          )}
          
          {/* NAVIGATION TABS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="delegate-actions-navigator">
            <div className="bg-slate-50 border-b border-slate-200 px-2 flex">
              <button
                onClick={() => setActiveTab('agenda')}
                className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 cursor-pointer transition ${
                  activeTab === 'agenda' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <BookOpen size={13} /> Хэлэлцэх асуудал
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 cursor-pointer transition ${
                  activeTab === 'notifications' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Bell size={13} /> Мэдэгдэл
                {notifications.some(x => !x.isRead) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('archive')}
                className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 cursor-pointer transition ${
                  activeTab === 'archive' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History size={13} /> Миний архив
              </button>
            </div>

            <div className="p-6">
              
              {/* TAB 1: AGENDA & DOCUMENTS DETAILED READER */}
              {activeTab === 'agenda' && (
                <div className="space-y-6">
                  
                  {/* Speaker sequence button row inside agenda */}
                  {meeting && isCheckedIn && (
                    <div className="bg-blue-50/55 border border-blue-150 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Volume2 className="text-blue-600 flex-shrink-0 animate-pulse" size={18} />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Үг хэлэх хүсэлт илгээх дараалал</h4>
                          {isCurrentlyInQueue ? (
                            <p className="text-[11px] text-blue-750">Та асуулт асуух дарааллын <strong>{myQueuePosition}</strong>-т эрэмбэлэгдлээ.</p>
                          ) : isSpeakingNow ? (
                            <p className="text-[11px] text-emerald-700 font-bold">Та одоо үг хэлж байна!</p>
                          ) : (
                            <p className="text-[11px] text-slate-500">Хэлэлцэж буй асуудлаар дараалалд орж үг хэлнэ үү.</p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto">
                        {isSpeakingNow ? (
                          <div className="bg-emerald-600 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 w-full justify-center">
                            <span className="animate-ping h-2 w-2 rounded-full bg-white opacity-95 inline-block"></span>
                            Микрофон нээлттэй
                          </div>
                        ) : isCurrentlyInQueue ? (
                          <button
                            onClick={onLeaveSpeakerQueue}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold px-3.5 py-1.5 rounded-lg transition text-center w-full cursor-pointer"
                          >
                            Дарааллаас гарах
                          </button>
                        ) : (
                          <button
                            onClick={onJoinSpeakerQueue}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-bold text-xs px-4 py-2 rounded-lg transition text-center w-full cursor-pointer flex items-center justify-center gap-1"
                          >
                            Дараалалд орох хүсэлт
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {!meeting ? (
                    <div className="text-center py-8 text-slate-405 text-xs">
                      Одоогоор системд идэвхтэй зохион байгуулагдаж буй хурал байхгүй байна.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      
                      {/* Agenda list */}
                      <div className="md:col-span-5 space-y-2">
                        <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Хэлэлцэх асуудлын жагсаалт
                        </h5>

                        {meeting.agenda.map((item) => {
                          const isActiveDiscussion = meeting.activeAgendaItemId === item.id;
                          const isSelected = selectedAgendaId === item.id || (!selectedAgendaId && item.id === meeting.activeAgendaItemId);
                          return (
                            <button
                              key={item.id}
                              onClick={() => setSelectedAgendaId(item.id)}
                              className={`w-full text-left p-3 rounded-xl border transition cursor-pointer relative ${
                                isSelected 
                                  ? 'bg-slate-900 border-slate-900 text-white' 
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {isActiveDiscussion && (
                                <span className="absolute top-1.5 right-1.5 bg-blue-600 text-[6px] text-white font-bold uppercase tracking-widest px-1.5 py-0.5 rounded">Идэвхтэй асуудал</span>
                              )}
                              <p className="text-xs font-bold font-sans pr-4 line-clamp-2">{item.title}</p>
                              <span className="text-[9px] text-slate-400 mt-1 block font-mono">Баримт: {item.materials.length} файл</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Documents content display / mock screen reader */}
                      <div className="md:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[300px] flex flex-col justify-between">
                        
                        <div>
                          {(() => {
                            const activeAgenda = meeting.agenda.find(
                              item => item.id === (selectedAgendaId || meeting.activeAgendaItemId)
                            ) || meeting.agenda[0];

                            if (!activeAgenda) return <p className="text-slate-400 text-xs">Материал олдсонгүй.</p>;

                            return (
                              <div className="space-y-4">
                                <div className="border-b border-slate-200 pb-3">
                                  <span className="text-[8px] bg-slate-200 text-slate-605 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">дэс дараалал #{activeAgenda.order}</span>
                                  <h4 className="font-bold text-slate-800 text-sm mt-1.5 leading-relaxed">{activeAgenda.title}</h4>
                                </div>

                                <div className="space-y-4">
                                  <h6 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Хавсаргасан баримт бичгүүд (Шууд нээлттэй)</h6>
                                  {activeAgenda.materials.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">Энэ хэлэлцэх асуудалд хавсаргасан материал байхгүй байна.</p>
                                  ) : (
                                    <div className="space-y-4">
                                      {activeAgenda.materials.map(mat => {
                                        const isDownloaded = downloadedIds.includes(mat.id);
                                        return (
                                          <div key={mat.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                                            {/* File header bar */}
                                            <div className="bg-slate-100/80 px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-2 truncate">
                                                <div className={`h-7 w-7 rounded flex items-center justify-center font-bold text-[8px] uppercase flex-shrink-0 text-white ${
                                                  mat.fileType === 'pdf' ? 'bg-rose-500' : mat.fileType === 'docx' ? 'bg-indigo-500' : 'bg-emerald-500'
                                                }`}>
                                                  {mat.fileType}
                                                </div>
                                                <div className="truncate">
                                                  <p className="text-xs text-slate-800 font-bold truncate">{mat.title}</p>
                                                  <p className="text-[9px] text-slate-400 font-mono italic">{mat.fileSize}</p>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {mat.fileUrl && (
                                                  <button
                                                    type="button"
                                                    onClick={() => setPdfViewer(mat)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer text-[10px] font-bold shadow-sm"
                                                  >
                                                    <FileText size={11} />
                                                    Нээж үзэх
                                                  </button>
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={() => triggerSimulatedDownload(mat)}
                                                  className="hover:bg-slate-200 text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer text-[10px] font-bold"
                                                  title="Файл татах"
                                                >
                                                  <Download size={11} />
                                                  <span>Татах</span>
                                                </button>
                                              </div>
                                            </div>

                                            {/* Content: if fileUrl show open prompt, else show summary */}
                                            {mat.fileUrl ? (
                                              <button
                                                type="button"
                                                onClick={() => setPdfViewer(mat)}
                                                className="p-4 bg-blue-50/60 hover:bg-blue-50 text-left transition cursor-pointer group border-b border-slate-100"
                                              >
                                                <div className="flex items-center gap-3">
                                                  <div className="h-10 w-10 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <FileText size={20} className="text-rose-500" />
                                                  </div>
                                                  <div>
                                                    <p className="text-xs font-bold text-slate-700 group-hover:text-blue-700 transition">Файлыг нээж үзэх</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">Дарж PDF баримтыг шууд энэ хуудсанд нээнэ</p>
                                                  </div>
                                                  <ArrowRight size={16} className="text-blue-400 ml-auto group-hover:translate-x-1 transition-transform" />
                                                </div>
                                              </button>
                                            ) : (
                                              <div className="p-3.5 bg-slate-50/50 text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap font-sans border-b border-dashed border-slate-150">
                                                {mat.contentSummary}
                                              </div>
                                            )}

                                            <div className="bg-white p-2 text-center text-[8.5px] text-slate-400 font-mono flex items-center justify-center gap-1 border-t border-slate-100">
                                              <span>📄 Баримтын төгсгөл</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Interactive Reader Box */}
                        {openMaterial && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white text-slate-800 p-3 rounded-lg border border-slate-300 text-[11px] leading-relaxed mt-4 shadow-sm"
                          >
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2 font-mono">
                              <span className="text-blue-600 text-[9px] font-bold">📖 БАРИМТ УНШИХ</span>
                              <button 
                                onClick={() => setOpenMaterial(null)}
                                className="text-slate-400 hover:text-slate-800 font-bold cursor-pointer text-xs"
                              >
                                Хаах ×
                              </button>
                            </div>
                            <h5 className="font-bold text-slate-900 mb-1">{openMaterial.title}</h5>
                            <p className="text-slate-600 mt-1">{openMaterial.contentSummary}</p>
                          </motion.div>
                        )}

                        <div className="text-[9px] text-slate-400 text-center border-t border-slate-200/85 pt-3 mt-4 font-mono">
                          🔒 Сайншанд сумын Төрийн цахим хуулиар хамгаалагдсан материалууд
                        </div>

                      </div>

                    </div>
                  )}

                </div>
              )}

              {/* TAB 2: SYSTEM NOTIFICATIONS */}
              {activeTab === 'notifications' && (
                <div className="space-y-3" id="notifications-log-area">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Удирдлагын мэдэгдэх хуудас
                  </h4>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 text-center">Одоогоор ирсэн мэдэгдэл алга байна.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {notifications.map(item => (
                        <div key={item.id} className="py-3 flex gap-3 first:pt-0 items-start">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-xs font-bold text-slate-800">{item.title}</span>
                              <span className="text-[9px] font-mono text-slate-400">{new Date(item.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">{item.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: HISTORY & ARCHIVE */}
              {activeTab === 'archive' && (
                <div className="space-y-4" id="delegate-history-area">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Миний оролцооны архив үзүүлэлт
                  </h4>
                  
                  <div className="space-y-2">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="text-slate-400" size={14} />
                        <span className="text-xs text-slate-650">Одоогийн хурлын ирц:</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600">{isCheckedIn ? 'ИРСЭН (Бүртгэгдсэн)' : 'БҮРТГЭГДЭЭГҮЙ'}</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="text-slate-400" size={14} />
                        <span className="text-xs text-slate-650">Танилцсан файл, материалууд:</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-700">{readMaterialIds.length} файл сонирхсон</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="text-slate-400" size={14} />
                        <span className="text-xs text-slate-650">Сумын ИТХ-д өгсөн нийт санал:</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-755">{delegate.votesCastCount} нийт санал түүхэнтэй</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic">
                    Засаг захиргаа, сумын хуралдааны нууц хадгалах үүднээс дэлгэрэнгүй хувилбарын файлыг ИТХ-ын хурлын зохион байгуулах албанаас лавлана уу.
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* REALTIME SPEAKER QUEUE LIST */}
          {meeting && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5" id="speaker-queue-display-box">
              <h4 className="font-bold text-slate-800 text-xs mb-4 flex items-center gap-2 uppercase tracking-wide">
                <Users size={14} className="text-blue-600" /> Үг хэлэхээр дараалалд буй төлөөлөгчид ({meeting.speakerQueue.length})
              </h4>

              {meeting.speakerQueue.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Одоогоор асуулт асуух дараалалд ороогүй байна.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {meeting.speakerQueue.map((item, index) => {
                    const queueDelegate = allDelegates.find(x => x.id === item.delegateId);
                    const isMe = item.delegateId === delegate.id;
                    return (
                      <div 
                        key={item.delegateId} 
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 shadow-sm ${
                          isMe ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="h-5 w-5 bg-white border border-slate-200 text-slate-700 rounded-full font-bold text-[10px] flex items-center justify-center font-mono shadow-sm">
                            {index + 1}
                          </span>
                          <div className="truncate">
                            <p className="text-xs text-slate-800 font-bold truncate">{queueDelegate?.fullName}</p>
                            <p className="text-[9px] text-slate-400 font-mono italic">{item.turn}-р дахь асуулт</p>
                          </div>
                        </div>

                        {isMe && (
                          <span className="text-[7px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">Минийх</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
