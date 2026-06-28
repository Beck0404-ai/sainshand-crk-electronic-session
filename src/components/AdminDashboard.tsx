/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Delegate, CRKMeeting, NotificationItem, AgendaItem, AgendaMaterial, VotingArchiveItem, PendingDelegate } from '../types.js';
import {
  Shield, Users, Clipboard, PlusCircle, Play, Pause, SkipForward,
  FileCheck, Download, Edit2, Key, Info, CheckCircle, XCircle, ListPlus,
  Monitor, UserPlus, UserCheck, UserX, Eye, EyeOff, Lock, Trash2, RotateCcw
} from 'lucide-react';

interface AdminDashboardProps {
  meeting: CRKMeeting | null;
  delegates: Delegate[];
  notifications: NotificationItem[];
  allDelegates: Delegate[];
  pendingDelegates: PendingDelegate[];
  onToggleAttendance: (open: boolean) => Promise<void>;
  onStartVoting: (agendaItemId: string, title: string) => Promise<void>;
  onStopVoting: () => Promise<void>;
  onNextSpeaker: () => Promise<void>;
  onDirectSelectSpeaker: (delegateId: string, turn: number) => Promise<void>;
  onControlSpeaker: (action: 'play' | 'pause' | 'add_time' | 'sub_time') => Promise<void>;
  onSkipSpeaker: () => Promise<void>;
  onClearQueue: () => Promise<void>;
  onResetPassword: (delegateId: string) => Promise<void>;
  onGetCredentials: (delegateId: string) => Promise<{ username: string; password: string }>;
  onChangePassword: (delegateId: string, newPassword: string) => Promise<void>;
  onDeleteDelegate: (delegateId: string) => Promise<void>;
  onEditDelegate: (delegateId: string, data: Partial<Delegate>) => Promise<void>;
  onApproveDelegate: (pendingId: string) => Promise<void>;
  onRejectDelegate: (pendingId: string) => Promise<void>;
  onAddDelegate: (data: { username: string; fullName: string; party: string; district: string; phone: string; email: string; bio?: string }) => Promise<void>;
  onCreateMeeting: (meetingData: { title: string; date: string; time: string; agenda: AgendaItem[] }) => Promise<void>;
  onAddMaterial: (agendaItemId: string, material: Partial<AgendaMaterial>) => Promise<void>;
  onSelectAgenda: (agendaItemId: string) => Promise<void>;
  onSetMeetingStatus: (status: 'товлогдсон' | 'идэвхтэй' | 'дууссан') => Promise<void>;
  onViewProjector: () => void;
}

export default function AdminDashboard({
  meeting,
  delegates,
  notifications,
  allDelegates,
  pendingDelegates,
  onToggleAttendance,
  onStartVoting,
  onStopVoting,
  onNextSpeaker,
  onDirectSelectSpeaker,
  onControlSpeaker,
  onSkipSpeaker,
  onClearQueue,
  onResetPassword,
  onGetCredentials,
  onChangePassword,
  onDeleteDelegate,
  onEditDelegate,
  onApproveDelegate,
  onRejectDelegate,
  onAddDelegate,
  onCreateMeeting,
  onAddMaterial,
  onSelectAgenda,
  onSetMeetingStatus,
  onViewProjector
}: AdminDashboardProps) {
  // Navigation Tabs for Sub-panels
  const [adminTab, setAdminTab] = useState<'control' | 'delegates' | 'meeting' | 'reports'>('control');
  
  // Create meeting inputs
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newAgendas, setNewAgendas] = useState<{ id: string; title: string }[]>([]);
  const [tempAgendaInput, setTempAgendaInput] = useState('');
  const [pendingMaterials, setPendingMaterials] = useState<Record<string, Partial<AgendaMaterial>[]>>({});

  // Add material inputs
  const [selectedAgendaForMat, setSelectedAgendaForMat] = useState('');
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState<'pdf' | 'docx' | 'xlsx'>('pdf');
  const [matSize, setMatSize] = useState('2.4 MB');
  const [matContent, setMatContent] = useState('');

  // Voting setup inputs
  const [votingTitle, setVotingTitle] = useState('Сайншанд сумын төсвийн тодотголыг дэмжих эсэх санал хураалт');

  // Direct custom speaker triggers
  const [directSpeakerId, setDirectSpeakerId] = useState('');
  const [directSpeakerTurn, setDirectSpeakerTurn] = useState(1);

  // Credentials modal state
  const [credentialsModal, setCredentialsModal] = useState<{ delegate: Delegate; username: string; password: string } | null>(null);
  const [credNewPassword, setCredNewPassword] = useState('');
  const [credShowPassword, setCredShowPassword] = useState(false);
  const [credSaving, setCredSaving] = useState(false);

  // Edit delegate details modal overlay state
  const [editingDelegate, setEditingDelegate] = useState<Delegate | null>(null);
  const [editName, setEditName] = useState('');
  const [editParty, setEditParty] = useState<'МАН' | 'АН' | 'ХҮН' | 'Бие даагч'>('МАН');
  const [editDistrict, setEditDistrict] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Add delegate form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFullName, setAddFullName] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addParty, setAddParty] = useState<'МАН' | 'АН' | 'ХҮН' | 'Бяраа' | 'Бие даагч'>('МАН');
  const [addDistrict, setAddDistrict] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addBio, setAddBio] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAgendas.length === 0) {
      alert('Хэлэлцэх асуудал оруулах шаардлагатай.');
      return;
    }
    const parsedAgendas: AgendaItem[] = newAgendas.map((ag, i) => ({
      id: ag.id,
      title: `${i + 1}. ${ag.title}`,
      order: i + 1,
      materials: (pendingMaterials[ag.id] || []) as AgendaMaterial[]
    }));
    
    try {
      await onCreateMeeting({
        title: newTitle,
        date: newDate,
        time: newTime,
        agenda: parsedAgendas
      });
      showToast('Шинэ хуралдаан амжилттай үүсэж сувгаар цацагдлаа.');
      setPendingMaterials({});
      setAdminTab('control');
    } catch (e) {
      alert('Алдаа гарлаа.');
    }
  };

  const handleAddAgendaText = () => {
    if (tempAgendaInput.trim()) {
      setNewAgendas([...newAgendas, { id: `pre-${Date.now()}`, title: tempAgendaInput.trim() }]);
      setTempAgendaInput('');
    }
  };

  const handleRemoveAgendaIndex = (idx: number) => {
    setNewAgendas(newAgendas.filter((_, i) => i !== idx));
  };

  const handleAddMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgendaForMat || !matTitle) {
      alert('Хэлэлцэх асуудал болон файлын нэрийг оруулна уу.');
      return;
    }
    const isPending = newAgendas.some(ag => ag.id === selectedAgendaForMat);
    if (isPending) {
      const mat: Partial<AgendaMaterial> = {
        id: `mat-${Date.now()}`,
        title: matTitle,
        fileType: matType,
        fileSize: matSize,
        contentSummary: matContent || 'Орон нутгийн танилцуулга материал.'
      };
      setPendingMaterials(prev => ({
        ...prev,
        [selectedAgendaForMat]: [...(prev[selectedAgendaForMat] || []), mat]
      }));
      showToast('Материал хуралдаан үүсэхэд нэмэгдэнэ.');
      setMatTitle('');
      setMatContent('');
      return;
    }
    try {
      await onAddMaterial(selectedAgendaForMat, {
        title: matTitle,
        fileType: matType,
        fileSize: matSize,
        contentSummary: matContent || 'Орон нутгийн танилцуулга материал сумын төлөөлөгчдөд танилцуулах заалт уншлага.'
      });
      showToast('Файл амжилттай хавсаргагдлаа.');
      setMatTitle('');
      setMatContent('');
    } catch (e) {
      alert('Материал хавсаргахад алдаа гарлаа.');
    }
  };

  const handleOpenEditModal = (d: Delegate) => {
    setEditingDelegate(d);
    setEditName(d.fullName);
    setEditParty(d.party as any);
    setEditDistrict(d.district);
    setEditPhone(d.phone);
    setEditEmail(d.email);
  };

  const handleSaveEditDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDelegate) return;
    try {
      await onEditDelegate(editingDelegate.id, {
        fullName: editName,
        party: editParty,
        district: editDistrict,
        phone: editPhone,
        email: editEmail
      });
      showToast('Төлөөлөгчийн мэдээллийг хурдан засварлалаа.');
      setEditingDelegate(null);
    } catch (err) {
      alert('Засварлахад алдаа хуулав.');
    }
  };

  const handleResetPasswordClick = async (dId: string) => {
    if (confirm('Энэхүү төлөөлөгчийн нэвтрэх нууц үгийг сэргээж "123" болгох уу?')) {
      await onResetPassword(dId);
      showToast('Төлөөлөгчийн нууц үг амжилттай шинэчлэгдлээ.');
    }
  };

  const handleOpenCredentials = async (d: Delegate) => {
    const creds = await onGetCredentials(d.id);
    setCredentialsModal({ delegate: d, username: creds.username, password: creds.password });
    setCredNewPassword('');
    setCredShowPassword(false);
  };

  const handleSaveNewPassword = async () => {
    if (!credentialsModal) return;
    if (!credNewPassword || credNewPassword.length < 3) { alert('Нууц үг хамгийн багадаа 3 тэмдэгт байна.'); return; }
    setCredSaving(true);
    try {
      await onChangePassword(credentialsModal.delegate.id, credNewPassword);
      setCredentialsModal({ ...credentialsModal, password: credNewPassword });
      setCredNewPassword('');
      showToast('Нууц үг амжилттай солигдлоо.');
    } catch (e: any) {
      alert(e.message || 'Алдаа гарлаа.');
    } finally {
      setCredSaving(false);
    }
  };

  const handleApprove = async (pendingId: string, name: string) => {
    await onApproveDelegate(pendingId);
    showToast(`"${name}" зөвшөөрөгдөж системд нэмэгдлээ.`);
  };

  const handleReject = async (pendingId: string, name: string) => {
    if (confirm(`"${name}"-ийн бүртгэлийн хүсэлтийг татгалзах уу?`)) {
      await onRejectDelegate(pendingId);
      showToast('Бүртгэлийн хүсэлт татгалзагдлаа.');
    }
  };

  const handleAddDelegateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFullName || !addUsername || !addDistrict || !addPhone || !addEmail) {
      alert('Бүх талбарыг бөглөнө үү.');
      return;
    }
    try {
      await onAddDelegate({ username: addUsername, fullName: addFullName, party: addParty, district: addDistrict, phone: addPhone, email: addEmail, bio: addBio || undefined });
      showToast(`"${addFullName}" амжилттай нэмэгдлээ. Анхны нууц үг: 123`);
      setShowAddForm(false);
      setAddFullName(''); setAddUsername(''); setAddDistrict(''); setAddPhone(''); setAddEmail(''); setAddBio('');
    } catch {
      alert('Алдаа гарлаа.');
    }
  };

  const handleDirectSpeakerTrigger = async () => {
    if (!directSpeakerId) {
      alert('Төлөөлөгчийг сонгоно уу.');
      return;
    }
    await onDirectSelectSpeaker(directSpeakerId, directSpeakerTurn);
    showToast('Төлөөлөгчийн үг хэлэх микрофон, цагийг шууд идэвхжүүллээ.');
    setDirectSpeakerId('');
  };

  // CSV Report Exports ("Татах авах" Excel, PDF simulation format)
  const downloadAttendanceReport = () => {
    if (!meeting) return;
    const presentList = Object.keys(meeting.attendance);
    
    let content = `САЙНШАНД СУМЫН ИРГЭДИЙН ТӨЛӨӨЛӨГЧДИЙН ХУРАЛ (ИТХ)\n`;
    content += `ХУРАЛДААНЫ ИРЦИЙН БҮРТГЭЛИЙН ТАЙЛАН ЗААЛ\n`;
    content += `Хуралдаан: ${meeting.title}\n`;
    content += `Огноо: ${meeting.date} ${meeting.time}\n`;
    content += `Нэгтгэсэн Огноо: ${new Date().toLocaleString()}\n`;
    content += `---------------------------------------------------------\n`;
    content += `№, Төлөөлөгчийн нэр, Нам, Ирцийн төлөв, Бүртгүүлсэн цаг\n`;
    
    allDelegates.forEach((d, i) => {
      const isPresent = !!meeting.attendance[d.id];
      const checkInTime = isPresent ? new Date(meeting.attendance[d.id]).toLocaleTimeString() : '-';
      const statusText = isPresent ? 'ИРСЭН' : 'ИРЭЭГҮЙ / ТАСАЛСАН';
      content += `${i + 1}, ${d.fullName}, ${d.party}, ${statusText}, ${checkInTime}\n`;
    });

    const isPresentCount = presentList.length;
    const percent = Math.round((isPresentCount / allDelegates.length) * 100);
    content += `---------------------------------------------------------\n`;
    content += `НИЙТ ИРЦ: ${isPresentCount} / ${allDelegates.length} төлөөлөгч (${percent}%)\n`;

    // Download Blob action
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/csv;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = `${meeting.title}_Ирцийн_Тайлан.csv`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('Ирцийн тайлан файлыг татахыг эхлүүллээ.');
  };

  const downloadVotingReport = () => {
    if (!meeting) return;
    const votesArr = Object.entries(meeting.voting.votes);
    
    let content = `САЙНШАНД СУМЫН ИРГЭДИЙН ТӨЛӨӨЛӨГЧДИЙН ХУРАЛ (ИТХ)\n`;
    content += `САНАЛ ХУРААЛТЫН ТӨРӨЛЖСӨН ҮР ДҮНГИЙН ТАЙЛАН\n`;
    content += `Хуралдаан: ${meeting.title}\n`;
    content += `Санал асуулга: ${meeting.voting.title}\n`;
    content += `Нэгтгэсэн Огноо: ${new Date().toLocaleString()}\n`;
    content += `---------------------------------------------------------\n`;
    content += `№, Төлөөлөгчийн нэр, Нам, Сонголт, Хураалгасан Огноо\n`;

    // Let's filter present ones who can vote
    allDelegates.forEach((d, i) => {
      const hasVoted = !!meeting.voting.votes[d.id];
      const voteVal = hasVoted ? meeting.voting.votes[d.id].choice : 'ТАТГАЛЗСАН САНАЛ ӨГӨӨГҮЙ';
      const voteTime = hasVoted ? new Date(meeting.voting.votes[d.id].timestamp).toLocaleTimeString() : '-';
      content += `${i + 1}, ${d.fullName}, ${d.party}, ${voteVal}, ${voteTime}\n`;
    });

    // Counts
    let yes = 0, no = 0;
    votesArr.forEach(([, value]) => {
      if (value.choice === 'Зөвшөөрсөн') yes++;
      else if (value.choice === 'Татгалзсан') no++;
    });

    const total = yes + no;
    const yesPercent = total > 0 ? Math.round((yes / total) * 100) : 0;
    const noPercent = total > 0 ? Math.round((no / total) * 100) : 0;

    content += `---------------------------------------------------------\n`;
    content += `Зөвшөөрсөн: ${yes} (${yesPercent}%)\n`;
    content += `Татгалзсан: ${no} (${noPercent}%)\n`;
    content += `Нийт Санал Хураасан: ${total} / ${Object.keys(meeting.attendance).length} хуралдаж буй төлөөлөгч\n`;

    // Download Blob action
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/csv;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = `${meeting.title}_Санал_Хураалтын_Үр_Дүн.csv`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('Санал хураалтын үр дүн тайланг татахыг эхлүүллээ.');
  };

  const presentDelegatesCount = meeting ? Object.keys(meeting.attendance).length : 0;
  const attendancePercentage = meeting ? Math.round((presentDelegatesCount / allDelegates.length) * 100) : 0;

  // Render timer label
  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6" id="admin-main-section">
      
      {/* Toast Alert message */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-white border border-slate-200 border-l-4 border-l-blue-600 text-slate-800 p-4 rounded-xl shadow-lg z-50 animate-fadeIn text-xs flex items-center gap-2">
          <Info size={15} className="text-blue-600" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* EDIT DELEGATE MODAL OVERLAY */}
      {/* Credentials modal */}
      {credentialsModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border text-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="font-bold text-sm text-slate-950 border-b pb-3 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <Lock size={15} className="text-blue-600" /> Нэвтрэх мэдээлэл
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Нэр</span>
                <span className="font-semibold text-slate-800">{credentialsModal.delegate.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Нэвтрэх нэр</span>
                <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">{credentialsModal.username}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Одоогийн нууц үг</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700 flex-1">
                    {credShowPassword ? credentialsModal.password : '••••••'}
                  </span>
                  <button type="button" onClick={() => setCredShowPassword(!credShowPassword)}
                    className="p-1.5 bg-slate-100 rounded hover:bg-slate-200 transition text-slate-500 cursor-pointer">
                    {credShowPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              <div className="border-t pt-3 space-y-2">
                <span className="text-slate-400 block mb-1">Нууц үг солих</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={credNewPassword}
                    onChange={e => setCredNewPassword(e.target.value)}
                    placeholder="Шинэ нууц үг оруулах..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button type="button" onClick={handleSaveNewPassword} disabled={credSaving || !credNewPassword}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer">
                    {credSaving ? '...' : 'Хадгалах'}
                  </button>
                </div>
                <button type="button" onClick={async () => {
                  if (!credentialsModal) return;
                  await onResetPassword(credentialsModal.delegate.id);
                  setCredentialsModal({ ...credentialsModal, password: '123' });
                  showToast('Нууц үг "123" болгож сэргээгдлээ.');
                }} className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 cursor-pointer py-1">
                  <RotateCcw size={11} /> "123" болгож сэргээх
                </button>
              </div>
            </div>
            <button onClick={() => setCredentialsModal(null)}
              className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600 py-2 cursor-pointer">
              Хаах
            </button>
          </div>
        </div>
      )}

      {editingDelegate && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleSaveEditDelegate} className="bg-white border text-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="font-bold text-sm text-slate-950 border-b pb-3 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <Edit2 size={16} className="text-blue-600" /> Төлөөлөхийн мэдээлэл засварлах
            </h3>
            <div className="space-y-3.5 text-xs text-left">
              <div>
                <label className="block font-bold text-slate-500 mb-1">Овог Нэр</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-205 outline-none focus:outline-blue-500/50 bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Нам / Бүлэг</label>
                <select
                  value={editParty}
                  onChange={(e) => setEditParty(e.target.value as any)}
                  title="Нам / Бүлэг сонгох"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-205 outline-none focus:outline-blue-500/50 bg-slate-50"
                >
                  <option value="МАН">МАН</option>
                  <option value="АН">АН</option>
                  <option value="ХҮН">ХҮН</option>
                  <option value="Бие даагч">Бие даагч</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Тойрог баг</label>
                <input
                  type="text"
                  value={editDistrict}
                  onChange={(e) => setEditDistrict(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-205 outline-none focus:outline-blue-500/50 bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Утас</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-205 outline-none focus:outline-blue-500/50 bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">И-мэйл хаяг</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-205 outline-none focus:outline-blue-500/50 bg-slate-50"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex-1 cursor-pointer transition shadow-sm"
              >
                Хадгалах
              </button>
              <button
                type="button"
                onClick={() => setEditingDelegate(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-605 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition"
              >
                Болих
              </button>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!editingDelegate) return;
                if (confirm(`"${editingDelegate.fullName}"-ийг системээс бүрмөсөн устгах уу?`)) {
                  await onDeleteDelegate(editingDelegate.id);
                  setEditingDelegate(null);
                  showToast(`"${editingDelegate.fullName}" устгагдлаа.`);
                }
              }}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 py-2 rounded-lg transition cursor-pointer border border-transparent hover:border-rose-200"
            >
              <Trash2 size={12} /> Төлөөлөгчийг устгах
            </button>
          </form>
        </div>
      )}

      {/* DASHBOARD GRID HEAD */}
      <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-205 pb-4 mb-6 gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
              <Shield className="text-blue-600" /> Администраторын хяналтын хэсэг
            </h2>
            <button
              onClick={onViewProjector}
              className="hidden sm:flex bg-blue-50 hover:bg-blue-100 text-blue-600 font-black text-[10px] px-2.5 py-1 rounded-lg transition border border-blue-200/60 shadow-sm cursor-pointer items-center gap-1.5 uppercase tracking-wider font-mono animate-pulse"
              title="Танхимын Том Дэлгэц Нээх"
            >
              <Monitor size={12} />
              Танхимын Дэлгэц нээх
            </button>
          </div>
          <p className="text-xs text-slate-450 mt-1">
            Ирц бүртгэл, санал хураалт, үг хэлэх микрофон болон {allDelegates.length} төлөөлөгчдийн системийн үйл ажиллагаанд хяналт тавих хуудас
          </p>
        </div>

        {/* ADMIN TAB SELECTORS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onViewProjector}
            className="sm:hidden bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-[11px] px-3 py-1.5 rounded-xl transition border border-blue-200/60 shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <Monitor size={13} />
            Дэлгэц
          </button>

          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setAdminTab('control')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
              adminTab === 'control' ? 'bg-blue-605 text-white bg-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            Хурлын явц хянах
          </button>
          <button
            onClick={() => setAdminTab('delegates')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1.5 ${
              adminTab === 'delegates' ? 'bg-blue-605 text-white bg-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            Төлөөлөгчид хянах
            {pendingDelegates.filter(p => p.status === 'хүлээгдэж буй').length > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 leading-none">
                {pendingDelegates.filter(p => p.status === 'хүлээгдэж буй').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setAdminTab('meeting')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
              adminTab === 'meeting' ? 'bg-blue-605 text-white bg-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            Хурал үүсгэх & Материал
          </button>
          <button
            onClick={() => setAdminTab('reports')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
              adminTab === 'reports' ? 'bg-blue-605 text-white bg-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            Тайлан, Архив
          </button>
        </div>
        </div>
      </div>

      {/* TAB 1: RUNTIME SESSION MONITORING CONTROL */}
      {adminTab === 'control' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* CRITICAL STATE CONTROL PANELS ROW */}
          {!meeting ? (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-800">
              <Clipboard className="mx-auto text-slate-400 mb-3 animate-pulse" size={32} />
              <p className="text-slate-600 font-bold mb-3 text-sm">Идэвхтэй хуралдаан олдсонгүй</p>
              <button
                onClick={() => setAdminTab('meeting')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer shadow-sm"
              >
                Шинэ хуралдаан үүсгэх
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

              {/* Attendance & Voting Control Panel */}
              <div className="md:col-span-4 space-y-6">
                
                {/* ATTENDANCE TOGGLE BOX */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider border-b pb-2.5 mb-3 flex items-center justify-between">
                    <span>ИРЦИЙН БҮРТГЭЛ УДИРДАХ</span>
                    <span className={`h-2 w-2 rounded-full ${meeting.attendanceOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  </h3>

                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-450 font-medium">Статус:</span>
                      <strong className={`text-xs font-bold ${meeting.attendanceOpen ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {meeting.attendanceOpen ? 'Нээлттэй' : 'Хаагдсан'}
                      </strong>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center">
                      <span className="block text-2xl font-bold font-mono text-slate-850">{presentDelegatesCount} / {allDelegates.length}</span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Бүртгүүлсэн төлөөлөгч ({attendancePercentage}%)</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onToggleAttendance(true)}
                        disabled={meeting.attendanceOpen}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-2 rounded-lg flex-1 transition cursor-pointer"
                      >
                        Нээх
                      </button>
                      <button
                        onClick={() => onToggleAttendance(false)}
                        disabled={!meeting.attendanceOpen}
                        className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs py-2 rounded-lg flex-1 transition cursor-pointer"
                      >
                        Хаах
                      </button>
                    </div>
                  </div>
                </div>

                {/* VOTING CONTROL BOX */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider border-b pb-2.5 mb-3 flex items-center justify-between">
                    <span>ШУУД САНАЛ ХУРААЛТ</span>
                    <span className={`h-2 w-2 rounded-full ${meeting.voting.active ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  </h3>

                  <div className="space-y-3">
                    {meeting.voting.active ? (
                      <div className="space-y-3 animate-fadeIn">
                        <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg text-xs">
                          <div className="font-bold text-rose-800">Санал асуулга явагдаж байна:</div>
                          <div className="text-slate-600 mt-1">{meeting.voting.title}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            Санал: <strong className="text-rose-600 font-bold">{Object.keys(meeting.voting.votes).length}</strong>/{presentDelegatesCount}
                          </div>
                          {meeting.voting.remainingSeconds !== undefined && (
                            <div className={`p-2.5 rounded-lg border ${
                              meeting.voting.remainingSeconds <= 15 ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse font-bold' : 'bg-slate-50 border-slate-200 text-slate-705 font-bold'
                            }`}>
                              Хугацаа: <strong className="font-bold">{meeting.voting.remainingSeconds}с</strong>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={onStopVoting}
                          className="w-full bg-rose-605 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition cursor-pointer"
                        >
                          Санал хураалт унтраах / Нийтлэх
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Сэдвийн агуулга</label>
                          <textarea
                            value={votingTitle}
                            onChange={(e) => setVotingTitle(e.target.value)}
                            rows={2}
                            className="w-full text-xs px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 focus:outline-blue-500/50 font-sans resize-none"
                            placeholder="Санал хураалтын асуулт"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Холбох асуудал</label>
                          <select
                            value={meeting.activeAgendaItemId || ''}
                            onChange={(e) => onSelectAgenda(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer bg-slate-50 outline-none"
                          >
                            {meeting.agenda.map(ag => (
                              <option key={ag.id} value={ag.id}>Асуудал #{ag.order}: {ag.title.substring(0, 32)}...</option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => onStartVoting(meeting.activeAgendaItemId || 'agenda-01', votingTitle)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition cursor-pointer"
                        >
                          Санал хураалт эхлүүлэх
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Speaker Timer Command Panel */}
              <div className="md:col-span-8 space-y-6">
                
                {/* ACTIVE SPEAKER TIMER BOX */}
                <div className="bg-white rounded-2xl p-5 text-slate-800 shadow-sm border border-slate-205 relative overflow-hidden">
                  <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2.5 mb-3 flex items-center justify-between">
                    <span>Үг хэлэх хугацаа удирдах самбар</span>
                    <span className="text-[9px] font-mono text-slate-400">Бодит хугацааны удирдлага</span>
                  </h3>

                  {meeting.currentSpeaker ? (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                      
                      <div className="md:col-span-6 space-y-3">
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <span className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase flex items-center justify-center">
                            {allDelegates.find(x => x.id === meeting.currentSpeaker?.delegateId)?.fullName.substring(0, 2) || '...' }
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {allDelegates.find(x => x.id === meeting.currentSpeaker?.delegateId)?.fullName || 'Тодорхойгүй'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Идэвхтэй: {meeting.currentSpeaker.turn} дэх удаа үг хэлж байна
                            </div>
                          </div>
                        </div>

                        {/* Interactive Clock Timer adjustment buttons */}
                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                          <button
                            onClick={() => onControlSpeaker('add_time')}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-705 py-1.5 rounded-lg cursor-pointer font-bold text-[10px]"
                            title="Хугацааг 1 минут нэмэх"
                          >
                            ⏱️ +1 мин нэмэх
                          </button>
                          <button
                            onClick={() => onControlSpeaker('sub_time')}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-705 py-1.5 rounded-lg cursor-pointer font-bold text-[10px]"
                            title="Хугацааг 1 минут хасах"
                          >
                            ⏱️ -1 мин хасах
                          </button>
                        </div>
                      </div>

                      {/* Ticking graphic & control actions */}
                      <div className="md:col-span-6 flex flex-col items-center justify-center space-y-4">
                        <div className="text-center">
                          <span className={`text-4xl font-mono font-bold tracking-wider block leading-tight ${
                            meeting.currentSpeaker.remainingSeconds <= 30 ? 'text-rose-600 animate-pulse' : 'text-slate-800'
                          }`}>
                            {formatSeconds(meeting.currentSpeaker.remainingSeconds)}
                          </span>
                          <span className="text-[9px] text-slate-405 uppercase tracking-widest mt-1.5 block">Шууд секунд уншилт</span>
                        </div>

                        {/* Big button row */}
                        <div className="flex gap-2 w-full max-w-xs">
                          {meeting.currentSpeaker.isPaused ? (
                            <button
                              onClick={() => onControlSpeaker('play')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg flex-1 cursor-pointer flex items-center justify-center gap-1 text-xs font-bold transition shadow-sm"
                            >
                              <Play size={13} fill="currentColor" /> Үргэлжлүүлэх
                            </button>
                          ) : (
                            <button
                              onClick={() => onControlSpeaker('pause')}
                              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg flex-1 cursor-pointer flex items-center justify-center gap-1 text-xs font-bold transition shadow-sm"
                            >
                              <Pause size={13} fill="currentColor" /> Түр зогсоох
                            </button>
                          )}

                          <button
                            onClick={onSkipSpeaker}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1 transition text-xs font-bold shadow-sm"
                            title="Яриаг дуусгах"
                          >
                            <SkipForward size={13} /> Төгсгөх
                          </button>
                        </div>

                      </div>

                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-405 text-xs">
                      Одоогоор идэвхтэй үг хэлж буй төлөөлөгч байхгүй байна. Дараагийн спикерийг үүсгэх эсвэл дуудна уу.
                    </div>
                  )}
                </div>

                {/* SPEAKER QUEUE WORKFLOW & DIRECT TRIGGER */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Speaker sequence manager */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between border-b pb-2 mb-3">
                      <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <span>Үг хэлэх сувгийн дараалал</span>
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] px-1.5 rounded font-mono font-bold">{meeting.speakerQueue.length}</span>
                      </h4>
                      {meeting.speakerQueue.length > 0 && (
                        <button
                          onClick={onClearQueue}
                          className="text-rose-600 hover:text-rose-800 text-[10px] font-bold cursor-pointer"
                        >
                          Дарааллыг устгах
                        </button>
                      )}
                    </div>

                    {meeting.speakerQueue.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4">Одоогоор үг хэлэх дараалал хоосон байна.</p>
                    ) : (
                      <div className="space-y-2 mb-4 max-h-[160px] overflow-y-auto pr-1">
                        {meeting.speakerQueue.map((item, index) => {
                          const qDelegate = allDelegates.find(x => x.id === item.delegateId);
                          return (
                            <div key={item.delegateId} className="bg-slate-50 border border-slate-150 p-2 rounded-lg flex items-center justify-between gap-1">
                              <span className="h-5 w-5 bg-white border border-slate-200 text-slate-700 rounded-full text-[10px] font-bold flex items-center justify-center font-mono">
                                {index + 1}
                              </span>
                              <div className="flex-1 truncate mx-1.5 text-left">
                                <span className="text-xs font-bold text-slate-800 truncate block">{qDelegate?.fullName}</span>
                                <span className="text-[9px] text-slate-400 block font-mono">Дараалал: {item.turn}-р удаа</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <button
                      onClick={onNextSpeaker}
                      disabled={meeting.speakerQueue.length === 0}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 px-3 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                    >
                      <PlusCircle size={14} /> Заалнаас цаглаж дуудах
                    </button>
                  </div>

                  {/* Force Direct Speaker select */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider border-b pb-2">
                      ТӨЛӨӨЛӨГЧИЙГ ШУУД ОРУУЛАХ
                    </h4>
                    <p className="text-[10px] text-slate-450 leading-normal">
                      Дараалалд ороогүй төлөөлөгчийн микрофон, цагийг шууд нээх бол доорхоос сонгож удирдах боломжтой.
                    </p>

                    <div>
                      <select
                        value={directSpeakerId}
                        onChange={(e) => setDirectSpeakerId(e.target.value)}
                        className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer outline-none"
                      >
                        <option value="">-- Төлөөлөхийг сонгох --</option>
                        {allDelegates.map(d => (
                          <option key={d.id} value={d.id}>{d.fullName} ({d.district.split(' ')[0]})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={directSpeakerTurn}
                        onChange={(e) => setDirectSpeakerTurn(Number(e.target.value))}
                        className="text-xs px-2 py-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer text-slate-655"
                        title="Хэд дэх удаа"
                      >
                        <option value={1}>1 дэх удаа (3 мин)</option>
                        <option value={2}>2 дахь удаа (5 мин)</option>
                        <option value={3}>3 дахь удаа (5 мин)</option>
                      </select>

                      <button
                        onClick={handleDirectSpeakerTrigger}
                        className="bg-blue-650 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg flex-1 cursor-pointer transition text-center shadow-sm"
                      >
                        Спикер Нээх
                      </button>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* TAB 2: ACTIVE DELEGATES MONITOR REGISTRY */}
      {adminTab === 'delegates' && (
        <div className="space-y-4 animate-fadeIn">

          {/* PENDING REGISTRATIONS */}
          {pendingDelegates.filter(p => p.status === 'хүлээгдэж буй').length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
                <UserPlus size={14} className="text-amber-600" />
                ХҮЛЭЭГДЭЖ БУЙ БҮРТГЭЛИЙН ХҮСЭЛТ ({pendingDelegates.filter(p => p.status === 'хүлээгдэж буй').length})
              </h4>
              <div className="space-y-2">
                {pendingDelegates.filter(p => p.status === 'хүлээгдэж буй').map(p => (
                  <div key={p.id} className="bg-white border border-amber-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{p.fullName}</span>
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">{p.username}</span>
                        <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded font-bold">{p.party}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{p.district} • {p.phone} • {p.email}</div>
                      {p.bio && <div className="text-[10px] text-slate-400 italic truncate">{p.bio}</div>}
                      <div className="text-[9px] text-amber-600 font-mono">Ирүүлсэн: {new Date(p.submittedAt).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(p.id, p.fullName)}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        <UserCheck size={11} /> Зөвшөөрөх
                      </button>
                      <button
                        onClick={() => handleReject(p.id, p.fullName)}
                        className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        <UserX size={11} /> Татгалзах
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MAIN DELEGATES TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-3.5">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users size={16} className="text-blue-600" /> ИТХ нийт төлөөлөгчдийн ирц бүртгэл ({allDelegates.length} хэрэглэгч)
            </h4>
            <div className="flex items-center gap-2">
              <div className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] px-3 py-1.5 rounded-lg flex items-center font-mono font-bold">
                Ирсэн: {meeting ? Object.keys(meeting.attendance).length : 0} / {allDelegates.length}
              </div>
              <button
                onClick={() => setShowAddForm(v => !v)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
              >
                <UserPlus size={12} /> Шинэ нэмэх
              </button>
            </div>
          </div>

          {/* ADD DELEGATE FORM */}
          {showAddForm && (
            <form onSubmit={handleAddDelegateSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-fadeIn">
              <h5 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus size={12} className="text-blue-600" /> Шинэ төлөөлөгч шууд нэмэх (анхны нууц үг: 123)
              </h5>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-500 mb-1 text-[10px]">Овог нэр</label>
                  <input type="text" value={addFullName} onChange={e => setAddFullName(e.target.value)} required placeholder="Б.Батбаяр" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1 text-[10px]">Нэвтрэх нэр</label>
                  <input type="text" value={addUsername} onChange={e => setAddUsername(e.target.value)} required placeholder="batbayar" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-400 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1 text-[10px]">Нам</label>
                  <select value={addParty} onChange={e => setAddParty(e.target.value as any)} aria-label="Нам сонгох" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white outline-none cursor-pointer">
                    <option value="МАН">МАН</option>
                    <option value="АН">АН</option>
                    <option value="ХҮН">ХҮН</option>
                    <option value="Бяраа">Бяраа</option>
                    <option value="Бие даагч">Бие даагч</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1 text-[10px]">Тойрог / Баг</label>
                  <input type="text" value={addDistrict} onChange={e => setAddDistrict(e.target.value)} required placeholder="1-р баг" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1 text-[10px]">Утас</label>
                  <input type="text" value={addPhone} onChange={e => setAddPhone(e.target.value)} required placeholder="99xxxxxx" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-400 font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1 text-[10px]">И-мэйл</label>
                  <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} required placeholder="email@example.com" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-400" />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-500 mb-1 text-[10px]">Товч танилцуулга (заавал биш)</label>
                  <input type="text" value={addBio} onChange={e => setAddBio(e.target.value)} placeholder="ИТХ-ын Төлөөлөгч..." className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-400" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition">
                  Нэмэх
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition">
                  Болих
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono">
                  <th className="py-2.5 px-3 uppercase tracking-wider">Код</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">Овог Нэр</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">Тойрог баг</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">Ирцийн төлөв</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">Утасны дугаар</th>
                  <th className="py-2.5 px-3 text-right uppercase tracking-wider">Удирдлага</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {allDelegates.map((d) => {
                  const isPresent = meeting ? !!meeting.attendance[d.id] : false;
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{d.id.toUpperCase()}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-850 flex items-center gap-2">
                        <span className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center font-mono text-[9px] text-slate-500">{d.fullName.substring(0,2)}</span>
                        <span>{d.fullName}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">{d.district}</td>
                      <td className="py-2.5 px-3 font-medium">
                        {isPresent ? (
                          <span className="text-emerald-700 flex items-center gap-1"><CheckCircle size={12} className="text-emerald-500" /> Ирсэн</span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1"><XCircle size={12} /> Хоцорсон / Ирээгүй</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{d.phone}</td>
                      <td className="py-2.5 px-3 text-right flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenCredentials(d)}
                          className="p-1 px-1.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 transition cursor-pointer"
                          title="Нэвтрэх мэдээлэл харах / нууц үг солих"
                        >
                          <Key size={12} />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(d)}
                          className="p-1 px-1.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 transition cursor-pointer"
                          title="Засварлах"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`"${d.fullName}"-ийг системээс устгах уу?`)) {
                              await onDeleteDelegate(d.id);
                              showToast(`"${d.fullName}" устгагдлаа.`);
                            }
                          }}
                          className="p-1 px-1.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                          title="Устгах"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}

      {/* TAB 3: MEETING GENERATION EDITOR & FILE LOADER */}
      {adminTab === 'meeting' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          
          {/* Creator form */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
              <PlusCircle size={15} className="text-blue-600" /> ШИНЭ ЦАХИМ ХУРАЛДААН ҮҮСГЭХ
            </h4>

            <form onSubmit={handleCreateMeetingSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-650 mb-1">Хуралдааны нэр сэдэв</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 outline-none focus:outline-blue-500/50 font-bold text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-650 mb-1">Огноо сонгох</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 tracking-wider font-mono cursor-pointer outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-650 mb-1">Эхлэх цаг</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 tracking-wider font-mono cursor-pointer outline-none"
                    required
                  />
                </div>
              </div>

              {/* Dynamic agendas addition */}
              <div>
                <label className="block font-bold text-slate-650 mb-1">Хэлэлцэх асуудлын жагсаалт ({newAgendas.length})</label>
                
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 mb-2">
                  {newAgendas.map((ag, idx) => (
                    <div key={ag.id} className="bg-slate-50 border border-slate-150 p-2 rounded-lg flex items-center justify-between gap-2">
                      <span className="truncate flex-1 font-sans text-[11px] text-slate-700">
                        {idx + 1}. {ag.title}
                        {pendingMaterials[ag.id]?.length ? (
                          <span className="ml-1.5 text-blue-500 font-mono text-[9px]">({pendingMaterials[ag.id].length} материал)</span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAgendaIndex(idx)}
                        className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer font-mono text-[10px]"
                      >
                        [Устгах]
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempAgendaInput}
                    onChange={(e) => setTempAgendaInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 outline-none"
                    placeholder="Шинэ асуудал оруулах..."
                  />
                  <button
                    type="button"
                    onClick={handleAddAgendaText}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-lg text-xs cursor-pointer flex-shrink-0"
                  >
                    Нэмэх
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-150 pt-4">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm cursor-pointer text-xs"
                >
                  Хуралдааныг товлон цацаж эхлүүлэх
                </button>
              </div>

            </form>
          </div>

          {/* Agenda Material Loader */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
              <ListPlus size={15} className="text-blue-600" /> ХУРАЛДААНЫ ТОХИРОХ МАТЕРИАЛ ХУУЛАХ
            </h4>

            {(meeting || newAgendas.length > 0) ? (
              <form onSubmit={handleAddMaterialSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-650 mb-1">Холбогдох асуудал</label>
                  <select
                    value={selectedAgendaForMat}
                    onChange={(e) => setSelectedAgendaForMat(e.target.value)}
                    title="Холбогдох асуудал сонгох"
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 outline-none cursor-pointer"
                    required
                  >
                    <option value="">-- Асуудал сонгох --</option>
                    {meeting
                      ? meeting.agenda.map(ag => (
                          <option key={ag.id} value={ag.id}>{ag.title.substring(0, 60)}</option>
                        ))
                      : newAgendas.map((ag, i) => (
                          <option key={ag.id} value={ag.id}>{i + 1}. {ag.title.substring(0, 55)}</option>
                        ))
                    }
                  </select>
                  {!meeting && (
                    <p className="text-[10px] text-amber-600 mt-1">Зүүн талд хэлэлцэх асуудал нэмсний дараа автоматаар гарна</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block font-bold text-slate-655 mb-1">Файлын нэр (Монголоор)</label>
                    <input
                      type="text"
                      value={matTitle}
                      onChange={(e) => setMatTitle(e.target.value)}
                      placeholder="Төсвийн зардлын судалгаа.pdf"
                      className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-655 mb-1">Төрөл</label>
                    <select
                      value={matType}
                      onChange={(e) => setMatType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer text-slate-600"
                    >
                      <option value="pdf">PDF</option>
                      <option value="docx">Word (docx)</option>
                      <option value="xlsx">Excel (xlsx)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-655 mb-1">Стандарт хэмжээ</label>
                    <input
                      type="text"
                      value={matSize}
                      onChange={(e) => setMatSize(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200"
                      required
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <span className="text-[9px] text-slate-400 pb-2 italic font-semibold uppercase">Хувилах баримтын сан</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-655 mb-1">Материалын товч агуулга хураангуй</label>
                  <textarea
                    value={matContent}
                    onChange={(e) => setMatContent(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 outline-none resize-none"
                    placeholder="Энэхүү сургалтын төсөл нь Сайншанд багийн залуусыг бэлтгэхэд зориулсан бодит төсөвт төлөвлөгөө юм ..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-lg text-xs transition cursor-pointer shadow-sm"
                >
                  Материал системд байршуулах (Upload)
                </button>
              </form>
            ) : (
              <p className="text-slate-400 italic text-center py-6">Эхлээд идэвхтэй хурал үүсгэнэ үү.</p>
            )}
          </div>

        </div>
      )}

      {/* TAB 4: CSV / REPORTS EXPORT EXCEL GENERATORS */}
      {adminTab === 'reports' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-2xl mx-auto text-slate-800 space-y-6 animate-fadeIn">
          
          <div className="text-center pb-4 border-b border-slate-200">
            <Clipboard className="mx-auto text-blue-600 mb-2" size={32} />
            <h3 className="font-bold text-base text-slate-900 uppercase tracking-wide">Тайлан нэгтгэн татах хэсэг</h3>
            <p className="text-xs text-slate-550 mt-1 leading-normal">
              ИТХ-ын хуралд оролцсон {allDelegates.length} төлөөлөгчдийн ирц түүхэн мэдээлэл болон идэвхжүүлсэн санал хураалтын тайлангуудыг баталгаат хэлбэрээр татах үзүүлэлт.
            </p>
          </div>

          {!meeting ? (
            <p className="text-slate-400 text-center italic py-4">Сонгосон идэвхтэй хуралдаан байхгүй байна.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Reports block 1 */}
              <div className="border border-slate-200 rounded-xl p-4 hover:border-blue-500 transition-all space-y-3 flex flex-col justify-between bg-slate-50">
                <div>
                  <h4 className="font-bold text-slate-850 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                    <FileCheck className="text-blue-600" size={14} /> 1. Ирцийн нэгдсэн тайлан
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    Нийт {allDelegates.length} хуралдааны төлөөлөгчдийн ирцийг Excel судалгаанд оруулахад зориулсан хэлбэрээр татаж авах.
                  </p>
                </div>
                <button
                  onClick={downloadAttendanceReport}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition shadow-sm"
                >
                  <Download size={13} /> Ирцийн тайлан татах (.csv)
                </button>
              </div>

              {/* Reports block 2 */}
              <div className="border border-slate-200 rounded-xl p-4 hover:border-blue-500 transition-all space-y-3 flex flex-col justify-between bg-slate-50">
                <div>
                  <h4 className="font-bold text-slate-850 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                    <CheckCircle className="text-blue-600" size={14} /> 2. Санал хураалтын үр дүн
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    Одоогийн санал хураалтын зөвшөөрсөн, татгалзсан, түдгэлзсэн хувиудын бүрэн нэрсийн жагсаалтаар хуулбар.
                  </p>
                </div>
                <button
                  onClick={downloadVotingReport}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-lg text-xs flex items-center justify-center gap-1 cursor-pointer transition shadow-sm"
                >
                  <Download size={13} /> Санал хураалт татах (.csv)
                </button>
              </div>

            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-[10px] text-slate-500 leading-normal font-mono">
             ℹ️ <strong>Тайлбар:</strong> Татаж авсан файлууд нь Монгол Барилгын стандартын дагуу нарийвчлан кодлогдсон тул Microsoft Excel, Google Sheets-д ашиглахад бүрэн нийцтэй байна.
          </div>

          {/* VOTING ARCHIVE */}
          {meeting && meeting.votingArchive.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
                <CheckCircle size={15} className="text-blue-600" /> Санал хураалтын архив ({meeting.votingArchive.length})
              </h4>

              <div className="space-y-3">
                {[...meeting.votingArchive].reverse().map((item: VotingArchiveItem, idx) => {
                  const yesIds = Object.entries(item.votes).filter(([, v]) => v.choice === 'Зөвшөөрсөн').map(([id]) => id);
                  const noIds  = Object.entries(item.votes).filter(([, v]) => v.choice === 'Татгалзсан').map(([id]) => id);
                  const total  = yesIds.length + noIds.length;
                  const yesPct = total > 0 ? Math.round((yesIds.length / total) * 100) : 0;
                  const noPct  = total > 0 ? Math.round((noIds.length  / total) * 100) : 0;
                  const passed = yesIds.length > noIds.length;

                  return (
                    <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                            #{meeting.votingArchive.length - idx} • {new Date(item.completedAt).toLocaleString()}
                          </span>
                          <p className="text-xs font-bold text-slate-800 mt-0.5 leading-snug">{item.title}</p>
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg flex-shrink-0 ${
                          passed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {passed ? '✅ БАТЛАГДСАН' : '❌ ТАТГАЛЗАГДСАН'}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 space-y-1">
                          <div className="flex items-center justify-between font-bold text-emerald-700">
                            <span>👍 Зөвшөөрсөн</span>
                            <span className="font-mono">{yesIds.length} ({yesPct}%)</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {yesIds.map(id => {
                              const d = allDelegates.find(x => x.id === id);
                              return d ? (
                                <span key={id} className="text-[9px] bg-white border border-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">{d.fullName}</span>
                              ) : null;
                            })}
                            {yesIds.length === 0 && <span className="text-[9px] text-slate-400 italic">Санал өгөөгүй</span>}
                          </div>
                        </div>

                        <div className="bg-rose-50 border border-rose-100 rounded-lg p-2.5 space-y-1">
                          <div className="flex items-center justify-between font-bold text-rose-700">
                            <span>👎 Татгалзсан</span>
                            <span className="font-mono">{noIds.length} ({noPct}%)</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {noIds.map(id => {
                              const d = allDelegates.find(x => x.id === id);
                              return d ? (
                                <span key={id} className="text-[9px] bg-white border border-rose-200 text-rose-700 px-1.5 py-0.5 rounded-full font-bold">{d.fullName}</span>
                              ) : null;
                            })}
                            {noIds.length === 0 && <span className="text-[9px] text-slate-400 italic">Санал өгөөгүй</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-[9px] text-slate-400 font-mono text-right">
                        Нийт {total} / {item.totalPresent} ирц бүртгэгдсэн төлөөлөгч санал өгсөн
                      </div>
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
}
