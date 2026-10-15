/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Delegate, CRKMeeting, NotificationItem, AgendaItem, AgendaMaterial, VotingArchiveItem, PendingDelegate } from '../types.js';
import {
  Shield, Users, Clipboard, PlusCircle, Play, Pause, SkipForward,
  FileCheck, Download, Edit2, Key, Info, CheckCircle, XCircle, ListPlus,
  Monitor, UserPlus, UserCheck, UserX, Eye, EyeOff, Lock, Trash2, RotateCcw,
  Search, Filter, Printer, Clock, Bell, MessageSquare, BarChart3, History,
  Paperclip, Upload, FileText
} from 'lucide-react';
import PrintReportModal from './PrintReportModal';
import AnalyticsDashboard from './AnalyticsDashboard';
import MeetingHistoryPanel from './MeetingHistoryPanel';

interface AdminDashboardProps {
  meeting: CRKMeeting | null;
  delegates: Delegate[];
  notifications: NotificationItem[];
  allDelegates: Delegate[];
  pendingDelegates: PendingDelegate[];
  meetingHistory?: CRKMeeting[];
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
  onDeleteMaterial?: (agendaItemId: string, materialId: string) => Promise<void>;
  onSelectAgenda: (agendaItemId: string) => Promise<void>;
  onSetMeetingStatus: (status: 'товлогдсон' | 'идэвхтэй' | 'дууссан') => Promise<void>;
  onViewProjector: () => void;
  onClearNotifications: () => Promise<void>;
  onRefreshState?: () => Promise<void>;
  onDeleteHistoryMeeting?: (meetingId: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}

export default function AdminDashboard({
  meeting,
  delegates,
  notifications,
  allDelegates,
  pendingDelegates,
  meetingHistory = [],
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
  onDeleteMaterial,
  onSelectAgenda,
  onSetMeetingStatus,
  onViewProjector,
  onClearNotifications,
  onRefreshState,
  onDeleteHistoryMeeting,
  onDeleteComment
}: AdminDashboardProps) {
  // Navigation Tabs for Sub-panels
  const [adminTab, setAdminTab] = useState<'control' | 'delegates' | 'meeting' | 'reports' | 'analytics' | 'history'>('control');

  // Real-time Meeting Elapsed Duration Timer
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
  
  // Search & Filter state for delegates tab
  const [delegateSearch, setDelegateSearch] = useState('');
  const [partyFilter, setPartyFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');

  // Print Report Modal state
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Deletion selection states
  const [selectedNotifIds, setSelectedNotifIds] = useState<string[]>([]);
  const [selectedVoteArchiveIds, setSelectedVoteArchiveIds] = useState<string[]>([]);

  const handleDeleteSingleNotification = async (id: string) => {
    if (!confirm('Энэ мэдэгдлийг устгах уу?')) return;
    const res = await fetch('/api/admin/notification/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      setSelectedNotifIds(prev => prev.filter(x => x !== id));
      if (onRefreshState) await onRefreshState();
    }
  };

  const handleDeleteSelectedNotifications = async () => {
    if (selectedNotifIds.length === 0) return;
    if (!confirm(`Сонгосон ${selectedNotifIds.length} мэдэгдлийг устгах уу?`)) return;
    const res = await fetch('/api/admin/notification/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedNotifIds })
    });
    if (res.ok) {
      setSelectedNotifIds([]);
      if (onRefreshState) await onRefreshState();
    }
  };

  const handleDeleteSingleVoteArchive = async (id: string) => {
    if (!confirm('Энэ санал хураалтын архивыг устгах уу?')) return;
    if (meeting) {
      meeting.votingArchive = meeting.votingArchive.filter(v => v.id !== id);
    }
    setSelectedVoteArchiveIds(prev => prev.filter(x => x !== id));
    const res = await fetch('/api/admin/voting-archive/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      if (onRefreshState) await onRefreshState();
    } else {
      const data = await res.json();
      alert(data.error || 'Устгахад алдаа гарлаа.');
    }
  };

  const handleDeleteSelectedVoteArchives = async () => {
    if (selectedVoteArchiveIds.length === 0) return;
    if (!confirm(`Сонгосон ${selectedVoteArchiveIds.length} санал хураалтын архивыг устгах уу?`)) return;
    if (meeting) {
      meeting.votingArchive = meeting.votingArchive.filter(v => !selectedVoteArchiveIds.includes(v.id));
    }
    const targetIds = [...selectedVoteArchiveIds];
    setSelectedVoteArchiveIds([]);
    const res = await fetch('/api/admin/voting-archive/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: targetIds })
    });
    if (res.ok) {
      if (onRefreshState) await onRefreshState();
    } else {
      const data = await res.json();
      alert(data.error || 'Устгахад алдаа гарлаа.');
    }
  };

  const handleCleanAllArchives = async () => {
    if (!confirm('Бүх санал хураалтын архив, мэдэгдлүүд болон дууссан хурлын түүхийг бүрэн цэвэрлэх үү?')) return;
    if (meeting) {
      meeting.votingArchive = [];
    }
    setSelectedVoteArchiveIds([]);
    setSelectedNotifIds([]);
    const res = await fetch('/api/admin/clean-archives', { method: 'POST' });
    if (res.ok) {
      if (onRefreshState) await onRefreshState();
      alert('✓ Бүх архив болон хурлын түүхийг бүрэн цэвэрлэж шинэчиллээ.');
    } else {
      alert('Цэвэрлэхэд алдаа гарлаа.');
    }
  };
  
  // Create meeting inputs
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newAgendas, setNewAgendas] = useState<{ id: string; title: string }[]>([]);
  const [tempAgendaInput, setTempAgendaInput] = useState('');
  const [pendingMaterials, setPendingMaterials] = useState<Record<string, Partial<AgendaMaterial>[]>>({});

  // Meeting Creation Broadcast & Attendance Timer states
  const [autoAttendanceDelay, setAutoAttendanceDelay] = useState<number>(0);
  const [sendSmsBroadcast, setSendSmsBroadcast] = useState(true);
  const [sendEmailBroadcast, setSendEmailBroadcast] = useState(true);
  const [broadcastLogModal, setBroadcastLogModal] = useState<{
    open: boolean;
    title: string;
    smsCount: number;
    emailCount: number;
    autoDelay: number;
  }>({ open: false, title: '', smsCount: 0, emailCount: 0, autoDelay: 0 });

  // Add material inputs
  const [selectedAgendaForMat, setSelectedAgendaForMat] = useState('');
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState<'pdf' | 'docx' | 'xlsx'>('pdf');
  const [matSize, setMatSize] = useState('2.4 MB');
  const [matContent, setMatContent] = useState('');
  const [matFile, setMatFile] = useState<File | null>(null);
  const [matAccessLevel, setMatAccessLevel] = useState<'Нийтэд нээлттэй' | 'Зөвхөн Төлөөлөгчдөд' | 'Хязгаарлагдмал'>('Зөвхөн Төлөөлөгчдөд');
  const [matUploading, setMatUploading] = useState(false);

  const availableAgendas = newAgendas.length > 0 ? newAgendas : (meeting?.agenda || []);

  // Voting setup inputs
  const [votingTitle, setVotingTitle] = useState('');

  useEffect(() => {
    if (!meeting) return;
    const activeItem = meeting.agenda.find(ag => ag.id === meeting.activeAgendaItemId);
    if (activeItem) setVotingTitle(activeItem.title);
  }, [meeting?.id, meeting?.activeAgendaItemId]);

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

      // Automated attendance timer handling
      if (autoAttendanceDelay === 0) {
        await onToggleAttendance(true);
      } else {
        setTimeout(async () => {
          try {
            await onToggleAttendance(true);
          } catch (err) {
            console.error('Failed to auto-open attendance:', err);
          }
        }, autoAttendanceDelay * 60 * 1000);
      }

      // Open Broadcast Confirmation Modal
      setBroadcastLogModal({
        open: true,
        title: newTitle,
        smsCount: sendSmsBroadcast ? allDelegates.length : 0,
        emailCount: sendEmailBroadcast ? allDelegates.length : 0,
        autoDelay: autoAttendanceDelay
      });

      showToast('Шинэ хуралдаан амжилттай үүсэж, зарлан мэдээлэл цацагдлаа.');
      setPendingMaterials({});
      setAdminTab('control');
    } catch (e) {
      alert('Алдаа гарлаа.');
    }
  };

  // Auto-select valid agenda for material loader
  useEffect(() => {
    if (newAgendas.length > 0) {
      if (!selectedAgendaForMat || !newAgendas.some(ag => ag.id === selectedAgendaForMat)) {
        setSelectedAgendaForMat(newAgendas[0].id);
      }
    } else if (meeting && meeting.agenda.length > 0) {
      if (!selectedAgendaForMat || !meeting.agenda.some(ag => ag.id === selectedAgendaForMat)) {
        setSelectedAgendaForMat(meeting.agenda[0].id);
      }
    }
  }, [newAgendas, meeting]);

  const handleAddAgendaText = () => {
    if (tempAgendaInput.trim()) {
      const newId = `pre-${Date.now()}`;
      setNewAgendas(prev => [...prev, { id: newId, title: tempAgendaInput.trim() }]);
      setTempAgendaInput('');
      if (!selectedAgendaForMat) {
        setSelectedAgendaForMat(newId);
      }
    }
  };

  const handleRemoveAgendaIndex = (idx: number) => {
    const target = newAgendas[idx];
    const filtered = newAgendas.filter((_, i) => i !== idx);
    setNewAgendas(filtered);
    if (target) {
      setPendingMaterials(prev => {
        const next = { ...prev };
        delete next[target.id];
        return next;
      });
      if (selectedAgendaForMat === target.id) {
        setSelectedAgendaForMat(filtered[0]?.id || '');
      }
    }
  };

  const handleDeleteMaterial = async (agendaId: string, materialId: string) => {
    const isPending = newAgendas.some(ag => ag.id === agendaId);
    if (isPending) {
      setPendingMaterials(prev => ({
        ...prev,
        [agendaId]: (prev[agendaId] || []).filter(m => m.id !== materialId)
      }));
      showToast('Материал хасагдлаа.');
      return;
    }
    if (onDeleteMaterial) {
      try {
        await onDeleteMaterial(agendaId, materialId);
        showToast('Материал амжилттай устгагдлаа.');
      } catch {
        alert('Материал устгахад алдаа гарлаа.');
      }
    }
  };

  const handleAddMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgendaForMat || !matTitle) {
      alert('Хэлэлцэх асуудал болон файлын нэрийг оруулна уу.');
      return;
    }

    let uploadedFileUrl: string | undefined;
    if (matFile) {
      if (matFile.size > 20 * 1024 * 1024) {
        alert('Файл 20MB-аас хэтэрсэн байна. Файлын хэмжээг багасгаад дахин оролдоно уу.');
        return;
      }
      setMatUploading(true);
      try {
        uploadedFileUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Файл унших алдаа'));
          reader.readAsDataURL(matFile);
        });
        const fileSizeKB = Math.round(matFile.size / 1024);
        if (fileSizeKB >= 1024) setMatSize(`${(fileSizeKB / 1024).toFixed(1)} MB`);
        else setMatSize(`${fileSizeKB} KB`);
      } catch (err: unknown) {
        alert((err instanceof Error ? err.message : null) || 'Файл уншиж чадсангүй.');
        setMatUploading(false);
        return;
      }
      setMatUploading(false);
    }

    const isPending = newAgendas.some(ag => ag.id === selectedAgendaForMat);
    if (isPending) {
      const mat: Partial<AgendaMaterial> = {
        id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: matTitle,
        fileType: matType,
        fileSize: matSize,
        contentSummary: matContent || 'Орон нутгийн танилцуулга материал.',
        fileUrl: uploadedFileUrl,
        accessLevel: matAccessLevel
      };
      setPendingMaterials(prev => ({
        ...prev,
        [selectedAgendaForMat]: [...(prev[selectedAgendaForMat] || []), mat]
      }));
      showToast(`✓ "${matTitle}" амжилттай хавсаргагдлаа.`);
      setMatTitle(''); setMatContent(''); setMatFile(null);
      return;
    }
    try {
      await onAddMaterial(selectedAgendaForMat, {
        title: matTitle,
        fileType: matType,
        fileSize: matSize,
        contentSummary: matContent || 'Орон нутгийн танилцуулга материал сумын төлөөлөгчдөд танилцуулах заалт уншлага.',
        fileUrl: uploadedFileUrl,
        accessLevel: matAccessLevel
      });
      showToast(`✓ "${matTitle}" амжилттай хавсаргагдлаа.`);
      setMatTitle(''); setMatContent(''); setMatFile(null);
    } catch {
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
    let yes = 0, no = 0, abstain = 0;
    votesArr.forEach(([, value]) => {
      if (value.choice === 'Зөвшөөрсөн') yes++;
      else if (value.choice === 'Татгалзсан') no++;
      else if (value.choice === 'Түтгэлзсэн') abstain++;
    });

    const total = yes + no + abstain;
    const yesPercent = total > 0 ? Math.round((yes / total) * 100) : 0;
    const noPercent = total > 0 ? Math.round((no / total) * 100) : 0;
    const abstainPercent = total > 0 ? Math.round((abstain / total) * 100) : 0;

    content += `---------------------------------------------------------\n`;
    content += `Зөвшөөрсөн: ${yes} (${yesPercent}%)\n`;
    content += `Татгалзсан: ${no} (${noPercent}%)\n`;
    content += `Түтгэлзсэн: ${abstain} (${abstainPercent}%)\n`;
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
  const attendancePercentage = meeting && allDelegates.length > 0 ? Math.round((presentDelegatesCount / allDelegates.length) * 100) : 0;
  const isQuorumReached = attendancePercentage >= 50;

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
          <button
            onClick={() => setAdminTab('analytics')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1.5 ${
              adminTab === 'analytics' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            <BarChart3 size={13} />
            Аналитик
          </button>
          <button
            onClick={() => setAdminTab('history')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1.5 ${
              adminTab === 'history' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            <History size={13} />
            Хуралдааны түүх ({meetingHistory.length})
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
          ) : meeting.status === 'дууссан' ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center max-w-3xl mx-auto space-y-6 animate-fadeIn">
              <div className="h-16 w-16 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center mx-auto border border-slate-200 shadow-inner">
                <CheckCircle size={36} className="text-emerald-600" />
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">ХУРАЛДААНЫ ТӨЛӨВ: АЛБАН ЁСООР ДУУССАН</span>
                <h3 className="text-2xl font-black text-slate-900">{meeting.title}</h3>
                <p className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-3 mt-1">
                  <span>Огноо: {meeting.date} | Эхэлсэн цаг: {meeting.time}</span>
                  <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-mono font-bold border border-blue-200 flex items-center gap-1.5 text-[11px]">
                    <Clock size={12} className="animate-pulse text-blue-600" /> Үргэлжилсэн цаг: {meetingDurationStr}
                  </span>
                </p>
              </div>

              {/* Stat badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-mono block uppercase font-bold">Бүртгэгдсэн ирц</span>
                  <span className="text-xl font-bold text-emerald-700 font-mono">{presentDelegatesCount} / {allDelegates.length}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-mono block uppercase font-bold">Хэлэлцсэн асуудал</span>
                  <span className="text-xl font-bold text-blue-700 font-mono">{meeting.agenda.length} сэдэв</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                  <span className="text-[10px] text-slate-400 font-mono block uppercase font-bold">Явуулсан санал асуулга</span>
                  <span className="text-xl font-bold text-purple-700 font-mono">{meeting.votingArchive.length} шийдвэр</span>
                </div>
              </div>

              {/* Quick Action buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Printer size={15} className="text-blue-400" />
                  📄 Хурлын Эцсийн Протокол Хэвлэх / PDF
                </button>

                <button
                  type="button"
                  onClick={() => setAdminTab('reports')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <FileCheck size={15} />
                  📊 Тайлан & Архив харах
                </button>

                <button
                  type="button"
                  onClick={() => setAdminTab('meeting')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer border border-slate-200"
                >
                  <PlusCircle size={15} />
                  Шинэ хурал үүсгэх
                </button>

                <button
                  type="button"
                  onClick={() => { if (confirm('Хуралдааныг буцаан сэргээж идэвхтэй болгох уу?')) onSetMeetingStatus('идэвхтэй'); }}
                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-bold text-xs px-4 py-3 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-transparent hover:border-amber-200"
                  title="Буцаан сэргээх"
                >
                  <RotateCcw size={14} />
                  Хуралдаан сэргээх
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Энэ хуралдаан болон өмнөх бүх түүхийг цэвэрлэж, ямар ч хурал өмнө болж байгаагүй анхны цэвэр төлөвт оруулах уу?')) {
                      const res = await fetch('/api/admin/meeting/clear-all', { method: 'POST' });
                      if (res.ok) {
                        if (onRefreshState) await onRefreshState();
                        alert('✓ Хуралдааны түүхийг бүрэн цэвэрлэлээ.');
                      } else {
                        alert('Цэвэрлэхэд алдаа гарлаа.');
                      }
                    }
                  }}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold text-xs px-4 py-3 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-transparent hover:border-rose-200"
                  title="Хурлын түүхийг цэвэрлэх"
                >
                  <Trash2 size={14} />
                  Хурлын түүхийг цэвэрлэх
                </button>
              </div>
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

                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-center space-y-1.5">
                      <span className="block text-2xl font-bold font-mono text-slate-850">{presentDelegatesCount} / {allDelegates.length}</span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Бүртгүүлсэн төлөөлөгч ({attendancePercentage}%)</span>
                      <div className={`mt-2 p-1.5 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 ${
                        isQuorumReached ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
                      }`}>
                        <span>{isQuorumReached ? '✓ Ирцийн Кворум БҮРДСЭН (50%+1)' : '⚠️ Кворум ХҮРЭЭГҮЙ'}</span>
                      </div>
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

                    <button
                      onClick={() => setShowPrintModal(true)}
                      className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Printer size={14} className="text-blue-400" />
                      📄 Хурлын Протокол Хэвлэх / PDF
                    </button>
                  </div>
                </div>

                {/* MEETING STATUS CONTROL BOX */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider border-b pb-2.5 mb-3 flex items-center justify-between">
                    <span>ХУРАЛДААНЫ ЯВЦ УДИРДАХ</span>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      meeting.status === 'идэвхтэй' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {meeting.status === 'идэвхтэй' ? '🟢 ЯВАГДАЖ БАЙНА' : '⏸️ ТОВЛОГДСОН'}
                    </span>
                  </h3>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => { if (confirm('Хуралдааныг албан ёсоор эхлүүлэх үү?')) onSetMeetingStatus('идэвхтэй'); }}
                      disabled={meeting.status === 'идэвхтэй'}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer"
                    >
                      🟢 Хуралдаан эхлүүлэх
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (confirm('Хуралдааныг хойшлуулах уу?')) onSetMeetingStatus('товлогдсон'); }}
                      disabled={meeting.status === 'товлогдсон'}
                      className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer"
                    >
                      ⏸️ Хуралдаан хойшлуулах
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (confirm('Хуралдааныг дуусгах уу? Ирц, санал хураалт, дараалал бүгд хаагдана.')) onSetMeetingStatus('дууссан'); }}
                      className="w-full bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer"
                    >
                      🔴 Хуралдаан дуусгах
                    </button>
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

                        {(() => {
                          const votes = Object.values(meeting.voting.votes);
                          const totalVotes = votes.length;
                          const yesCount = votes.filter(v => v.choice === 'Батлах' || v.choice === 'Зөвшөөрсөн').length;
                          const noCount = votes.filter(v => v.choice === 'Татгалзах' || v.choice === 'Татгалзсан').length;
                          const abstainCount = votes.filter(v => v.choice === 'Санал гаргах' || v.choice === 'Түтгэлзсэн').length;

                          const yesPct = totalVotes > 0 ? Math.round((yesCount / totalVotes) * 100) : 0;
                          const noPct = totalVotes > 0 ? Math.round((noCount / totalVotes) * 100) : 0;
                          const abstainPct = totalVotes > 0 ? Math.round((abstainCount / totalVotes) * 100) : 0;

                          return (
                            <div className="space-y-2 font-mono text-xs">
                              <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold border-b border-slate-150 pb-1">
                                <span>Өгсөн санал: <strong>{totalVotes} / {presentDelegatesCount}</strong></span>
                                {meeting.voting.remainingSeconds !== undefined && (
                                  <span className={`font-bold ${meeting.voting.remainingSeconds <= 15 ? 'text-rose-600 animate-pulse' : 'text-blue-600'}`}>
                                    ⏱️ {meeting.voting.remainingSeconds}с
                                  </span>
                                )}
                              </div>

                              {(() => {
                                const isRes = meeting.voting.title.includes('ТОГТООЛЫН ТӨСӨЛ');
                                return (
                                  <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-xl text-emerald-800 shadow-sm">
                                      <div className="text-[10px] font-sans font-bold">{isRes ? '👍 Батлах' : '👍 Зөвшөөрсөн'}</div>
                                      <div className="text-sm font-black mt-0.5">{yesCount} <span className="text-[10px] text-emerald-600 font-bold">({yesPct}%)</span></div>
                                    </div>
                                    <div className="bg-rose-50 border border-rose-200 p-2 rounded-xl text-rose-800 shadow-sm">
                                      <div className="text-[10px] font-sans font-bold">{isRes ? '👎 Татгалзах' : '👎 Татгалзсан'}</div>
                                      <div className="text-sm font-black mt-0.5">{noCount} <span className="text-[10px] text-rose-600 font-bold">({noPct}%)</span></div>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl text-amber-800 shadow-sm">
                                      <div className="text-[10px] font-sans font-bold">{isRes ? '✍️ Санал гаргах' : '✋ Түтгэлзсэн'}</div>
                                      <div className="text-sm font-black mt-0.5">{abstainCount} <span className="text-[10px] text-amber-600 font-bold">({abstainPct}%)</span></div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })()}

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onStartVoting(meeting.activeAgendaItemId || 'agenda-01', meeting.voting.title)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 border border-slate-200"
                            title="Санал хураалтын хугацааг 30 секундээр дахин сунгах"
                          >
                            <Clock size={12} className="text-blue-600" /> +30сек сунгах
                          </button>
                          <button
                            type="button"
                            onClick={onStopVoting}
                            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition cursor-pointer"
                          >
                            Дуусгах / Нийтлэх
                          </button>
                        </div>
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => onStartVoting(meeting.activeAgendaItemId || 'agenda-01', votingTitle || 'Зарчмын зөрүүтэй санал хураалт')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                          >
                            🗳️ Энгийн санал хураалт
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const activeItem = meeting.agenda.find(ag => ag.id === (meeting.activeAgendaItemId || 'agenda-01'));
                              const title = activeItem ? `📜 ТОГТООЛЫН ТӨСӨЛ БАТЛАХ: ${activeItem.title}` : `📜 ТОГТООЛЫН ТӨСӨЛ БАТЛАХ`;
                              onStartVoting(meeting.activeAgendaItemId || 'agenda-01', title);
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                          >
                            📜 Тогтоолын төсөл батлах
                          </button>
                        </div>
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

          {/* SEARCH & FILTER BAR */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={delegateSearch}
                onChange={(e) => setDelegateSearch(e.target.value)}
                placeholder="Төлөөлөгчийг нэр, нэвтрэх нэр, утасаар хайх..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <select
                value={partyFilter}
                onChange={(e) => setPartyFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none cursor-pointer font-medium"
              >
                <option value="ALL">Бүх Нам/Бүлэг</option>
                <option value="МАН">МАН</option>
                <option value="АН">АН</option>
                <option value="ХҮН">ХҮН</option>
                <option value="Бяраа">Бяраа</option>
                <option value="Бие даагч">Бие даагч</option>
              </select>

              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none cursor-pointer font-medium"
              >
                <option value="ALL">Бүх Тойрог баг</option>
                {Array.from(new Set(allDelegates.map(d => d.district))).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

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
                {allDelegates
                  .filter(d => {
                    const q = delegateSearch.toLowerCase();
                    const matchQ = d.fullName.toLowerCase().includes(q) || d.username.toLowerCase().includes(q) || d.phone.includes(q);
                    const matchP = partyFilter === 'ALL' || d.party === partyFilter;
                    const matchD = districtFilter === 'ALL' || d.district === districtFilter;
                    return matchQ && matchP && matchD;
                  })
                  .map((d) => {
                  const isPresent = meeting ? !!meeting.attendance[d.id] : false;
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{d.id.toUpperCase()}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          {d.avatarUrl ? (
                            <img src={d.avatarUrl} alt={d.fullName} className="h-6 w-6 rounded object-cover flex-shrink-0" />
                          ) : (
                            <span className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center font-mono text-[9px] text-slate-500 flex-shrink-0">{d.fullName.substring(0,2)}</span>
                          )}
                          <div>
                            <div className="font-bold text-slate-800 leading-tight">{d.fullName}</div>
                            <div className="font-mono text-[10px] text-slate-400 leading-tight">@{d.username}</div>
                          </div>
                        </div>
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

              {/* Attendance Auto-Open Delay */}
              <div>
                <label className="block font-bold text-slate-650 mb-1 flex items-center gap-1.5">
                  <Clock size={13} className="text-blue-600" /> Ирцийн бүртгэл автоматаар нээгдэх цаг
                </label>
                <select
                  value={autoAttendanceDelay}
                  onChange={(e) => setAutoAttendanceDelay(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer text-slate-700 font-medium"
                >
                  <option value={0}>⚡ Хуралдаан товлон цацмагц шууд ирц нээх</option>
                  <option value={5}>⏱️ 5 минутын дараа автоматаар ирц нээх</option>
                  <option value={10}>⏱️ 10 минутын дараа автоматаар ирц нээх</option>
                  <option value={15}>⏱️ 15 минутын дараа автоматаар ирц нээх</option>
                </select>
              </div>

              {/* Notification Broadcast Options */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block flex items-center gap-1.5">
                  <Bell size={13} className="text-blue-600" /> Зарлан мэдээлэл түгээлт (Broadcast)
                </span>
                <div className="flex flex-col sm:flex-row gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-medium">
                    <input
                      type="checkbox"
                      checked={sendSmsBroadcast}
                      onChange={(e) => setSendSmsBroadcast(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>📱 Бүх {allDelegates.length} төлөөлөгч рүү SMS зар илгээх</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-medium">
                    <input
                      type="checkbox"
                      checked={sendEmailBroadcast}
                      onChange={(e) => setSendEmailBroadcast(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>📧 И-мэйл зарлан мэдээлэл тараах</span>
                  </label>
                </div>
              </div>

              {/* Dynamic agendas addition */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-700 text-xs">
                    Хэлэлцэх асуудлын жагсаалт ({newAgendas.length})
                  </label>
                  <span className="text-[10px] text-blue-600 font-mono">
                    Асуудал бүрт файл тусад нь хавсаргана
                  </span>
                </div>
                
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 mb-2.5">
                  {newAgendas.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 text-xs">
                      Одоогоор асуудал нэмэгдээгүй байна. Доорх талбарт асуудлын нэрээ бичиж "Нэмэх" дарна уу.
                    </div>
                  ) : (
                    newAgendas.map((ag, idx) => {
                      const isSelected = selectedAgendaForMat === ag.id;
                      const mats = pendingMaterials[ag.id] || [];
                      return (
                        <div
                          key={ag.id}
                          className={`border rounded-xl p-3 transition space-y-2 ${
                            isSelected
                              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-100 shadow-sm'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div
                              onClick={() => setSelectedAgendaForMat(ag.id)}
                              className="flex-1 cursor-pointer min-w-0"
                            >
                              <div className="flex items-center gap-2">
                                <span className={`h-5 w-5 rounded-full text-[10px] font-bold font-mono flex items-center justify-center shrink-0 ${
                                  isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {idx + 1}
                                </span>
                                <h5 className="font-bold text-xs text-slate-800 truncate">
                                  {ag.title}
                                </h5>
                              </div>
                              <div className="flex items-center gap-2 mt-1 ml-7">
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                                  mats.length > 0
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-200/80 text-slate-500'
                                }`}>
                                  📎 {mats.length} файл хавсаргасан
                                </span>
                                {isSelected && (
                                  <span className="text-[10px] text-blue-600 font-bold font-mono">
                                    ● Сонгогдсон
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedAgendaForMat(ag.id)}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                                title="Энэ асуудалд материал оруулах"
                              >
                                <Paperclip size={11} /> Файл оруулах
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveAgendaIndex(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition cursor-pointer hover:bg-rose-50"
                                title="Асуудлыг устгах"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* List of materials attached to THIS agenda item */}
                          {mats.length > 0 && (
                            <div className="ml-7 pt-1.5 border-t border-slate-200/60 space-y-1">
                              {mats.map((mat) => (
                                <div
                                  key={mat.id}
                                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 flex items-center justify-between gap-2 text-[11px]"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <FileText size={12} className="text-blue-500 shrink-0" />
                                    <span className="font-semibold text-slate-700 truncate">{mat.title}</span>
                                    <span className="text-[9px] font-mono text-slate-400 shrink-0">({mat.fileSize})</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMaterial(ag.id, mat.id!);
                                    }}
                                    className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition shrink-0"
                                    title="Энэ материалыг хасах"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempAgendaInput}
                    onChange={(e) => setTempAgendaInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAgendaText(); } }}
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

          {/* Agenda Material Loader - Per Agenda Item */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ListPlus size={15} className="text-blue-600" /> ХУРАЛДААНЫ ТОХИРОХ МАТЕРИАЛ ХУУЛАХ (ТУС ТУСД НЬ)
              </h4>
              {availableAgendas.length > 0 && (
                <span className="text-[10px] font-mono text-slate-500 font-bold">
                  Нийт {availableAgendas.length} асуудал
                </span>
              )}
            </div>

            {availableAgendas.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 space-y-2">
                <Paperclip size={28} className="mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-500">Эхлээд зүүн талд хэлэлцэх асуудал нэмнэ үү.</p>
                <p className="text-[10px] text-slate-400">Асуудал нэмэгдсэн даруйд энд асуудал тус бүрээр нь файл хавсаргах боломжтой болно.</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* 1. Per-Agenda Pills Selector */}
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1.5">
                    1. Материал хавсаргах асуудлаа сонгоно уу:
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                    {availableAgendas.map((ag, idx) => {
                      const isSel = selectedAgendaForMat === ag.id;
                      const mats = newAgendas.length > 0
                        ? (pendingMaterials[ag.id] || [])
                        : (meeting?.agenda.find(x => x.id === ag.id)?.materials || []);
                      return (
                        <button
                          type="button"
                          key={ag.id}
                          onClick={() => setSelectedAgendaForMat(ag.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                            isSel
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className="truncate max-w-[170px] text-left">
                            {idx + 1}. {ag.title.replace(/^\d+\.\s*/, '')}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                            isSel
                              ? 'bg-white/20 text-white'
                              : (mats.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500')
                          }`}>
                            {mats.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Active Target Agenda Info Box */}
                {(() => {
                  const currentAg = availableAgendas.find(a => a.id === selectedAgendaForMat) || availableAgendas[0];
                  if (!currentAg) return null;
                  const currentMats = newAgendas.length > 0
                    ? (pendingMaterials[currentAg.id] || [])
                    : (meeting?.agenda.find(x => x.id === currentAg.id)?.materials || []);
                  const currentIdx = availableAgendas.findIndex(a => a.id === currentAg.id);

                  return (
                    <div className="space-y-3.5">
                      {/* Active target banner */}
                      <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/80 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[9px] uppercase font-mono font-bold text-blue-600 tracking-wider block">
                            🎯 Одоо материал хавсаргаж буй асуудал
                          </span>
                          <h5 className="font-extrabold text-xs text-slate-900 truncate mt-0.5">
                            {currentIdx + 1}. {currentAg.title.replace(/^\d+\.\s*/, '')}
                          </h5>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-white text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg shrink-0 shadow-2xs">
                          📎 {currentMats.length} файлтай
                        </span>
                      </div>

                      {/* Attached materials list for this selected agenda */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-slate-500 font-mono tracking-wider">
                            Хавсаргасан файлууд ({currentMats.length})
                          </span>
                          {currentMats.length > 0 && (
                            <span className="text-[10px] text-emerald-600 font-medium font-mono">✓ Бэлэн болсон</span>
                          )}
                        </div>

                        {currentMats.length === 0 ? (
                          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center text-slate-400 text-[11px]">
                            Энэ асуудалд хараахан файл ороогүй байна. Доорх формыг ашиглан файл хуулна уу.
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                            {currentMats.map((mat) => (
                              <div
                                key={mat.id}
                                className="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-between gap-2 shadow-2xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                    <FileText size={15} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-xs text-slate-800 truncate">{mat.title}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                      {mat.fileType?.toUpperCase()} · {mat.fileSize} · <span className="text-slate-600 font-medium">{mat.accessLevel}</span>
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {mat.fileUrl && (
                                    <a
                                      href={mat.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="Татаж авах / Үзэх"
                                      className="text-blue-600 hover:text-blue-800 p-1 rounded-lg hover:bg-blue-50 transition"
                                    >
                                      <Download size={13} />
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMaterial(currentAg.id, mat.id!)}
                                    className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                    title="Энэ файлыг устгах"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* File upload form for this specific agenda */}
                      <form onSubmit={handleAddMaterialSubmit} className="space-y-3 pt-3 border-t border-slate-150">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700">
                            2. Шинэ файл хавсаргах:
                          </span>
                          <span className="text-[10px] text-blue-600 font-mono">
                            PDF, Word, Excel (20MB хүртэл)
                          </span>
                        </div>

                        {/* File input */}
                        <div>
                          <input
                            type="file"
                            accept=".pdf,.docx,.xlsx"
                            title="Файл сонгох"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setMatFile(file);
                              if (file) {
                                setMatTitle(file.name);
                                const ext = file.name.split('.').pop()?.toLowerCase();
                                if (ext === 'docx') setMatType('docx');
                                else if (ext === 'xlsx') setMatType('xlsx');
                                else setMatType('pdf');

                                const sizeKB = Math.round(file.size / 1024);
                                if (sizeKB >= 1024) setMatSize(`${(sizeKB / 1024).toFixed(1)} MB`);
                                else setMatSize(`${sizeKB} KB`);
                              }
                            }}
                            className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 outline-none focus:outline-blue-500/50 text-xs cursor-pointer file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                          />
                          {matFile && (
                            <p className="text-[10px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                              ✓ Сонгогдсон: {matFile.name} ({matSize})
                            </p>
                          )}
                        </div>

                        {/* File Name & Access level */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="sm:col-span-2">
                            <label className="block font-bold text-slate-655 mb-1 text-[11px]">Файлын нэр (Монголоор)</label>
                            <input
                              type="text"
                              value={matTitle}
                              onChange={(e) => setMatTitle(e.target.value)}
                              placeholder="Файлын нэр оруулна уу..."
                              className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-semibold"
                              required
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-655 mb-1 text-[11px]">Нууцын зэрэглэл</label>
                            <select
                              value={matAccessLevel}
                              onChange={(e) => setMatAccessLevel(e.target.value as any)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer text-slate-700 text-xs font-medium"
                            >
                              <option value="Зөвхөн Төлөөлөгчдөд">🛡️ Төлөөлөгчдөд</option>
                              <option value="Нийтэд нээлттэй">🌐 Нээлттэй</option>
                              <option value="Хязгаарлагдмал">🔒 Хязгаарлагдмал</option>
                            </select>
                          </div>
                        </div>

                        {/* Optional Content Summary */}
                        <div>
                          <label className="block font-bold text-slate-655 mb-1 text-[11px]">
                            Товч агуулга хураангуй <span className="text-slate-400 font-normal">(заавал биш)</span>
                          </label>
                          <textarea
                            value={matContent}
                            onChange={(e) => setMatContent(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 outline-none resize-none text-xs"
                            placeholder="Энэхүү материалын товч тайлбар..."
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="submit"
                            disabled={matUploading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
                          >
                            {matUploading ? '⏳ Байршуулж байна...' : (
                              <>
                                <Upload size={14} />
                                <span className="truncate">
                                  [{currentIdx + 1}-р асуудал]-д файл хавсаргах
                                </span>
                              </>
                            )}
                          </button>

                          {/* Next agenda shortcut */}
                          {currentIdx < availableAgendas.length - 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAgendaForMat(availableAgendas[currentIdx + 1].id);
                                setMatTitle('');
                                setMatContent('');
                                setMatFile(null);
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2.5 rounded-xl text-xs transition cursor-pointer shrink-0 border border-slate-200 flex items-center gap-1"
                              title="Дараагийн асуудал руу шилжих"
                            >
                              <span>Дараах ({currentIdx + 2})</span>
                              <SkipForward size={12} />
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  );
                })()}
              </div>
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

          {/* NOTIFICATIONS SECTION */}
          <div className="border-t border-slate-200 pt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>🔔</span> Мэдэгдлийн жагсаалт ({notifications.length})
              </h4>
              <div className="flex items-center gap-2">
                {selectedNotifIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteSelectedNotifications}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 size={12} /> Сонгосныг устгах ({selectedNotifIds.length})
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { if (confirm('Бүх мэдэгдлийг цэвэрлэх үү?')) onClearNotifications(); }}
                    className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw size={12} /> Бүгдийг цэвэрлэх
                  </button>
                )}
              </div>
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">Мэдэгдэл байхгүй байна.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {[...notifications].reverse().map(n => {
                  const isChecked = selectedNotifIds.includes(n.id);
                  return (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition ${
                        isChecked ? 'bg-rose-50/70 border-rose-300' : n.isRead ? 'bg-slate-50 border-slate-200' : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedNotifIds(prev => [...prev, n.id]);
                          else setSelectedNotifIds(prev => prev.filter(x => x !== n.id));
                        }}
                        className="mt-0.5 h-4 w-4 text-blue-600 rounded border-slate-300 cursor-pointer flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-bold text-slate-800">{n.title}</span>
                          <span className="text-[9px] font-mono text-slate-400 flex-shrink-0">{new Date(n.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-500 leading-normal">{n.message}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSingleNotification(n.id)}
                        title="Энэ мэдэгдлийг устгах"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* VOTING ARCHIVE */}
          {meeting && meeting.votingArchive.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle size={15} className="text-blue-600" /> Санал хураалтын архив ({meeting.votingArchive.length})
                </h4>
                <div className="flex items-center gap-2">
                  {selectedVoteArchiveIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelectedVoteArchives}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Trash2 size={12} /> Сонгосныг устгах ({selectedVoteArchiveIds.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCleanAllArchives}
                    className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw size={12} /> Бүх архивыг цэвэрлэх
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {[...meeting.votingArchive].reverse().map((item: VotingArchiveItem, idx) => {
                  const yesIds     = Object.entries(item.votes).filter(([, v]) => v.choice === 'Батлах' || v.choice === 'Зөвшөөрсөн').map(([id]) => id);
                  const noIds      = Object.entries(item.votes).filter(([, v]) => v.choice === 'Татгалзах' || v.choice === 'Татгалзсан').map(([id]) => id);
                  const abstainIds = Object.entries(item.votes).filter(([, v]) => v.choice === 'Санал гаргах' || v.choice === 'Түтгэлзсэн').map(([id]) => id);
                  const total  = yesIds.length + noIds.length + abstainIds.length;
                  const yesPct = total > 0 ? Math.round((yesIds.length / total) * 100) : 0;
                  const noPct  = total > 0 ? Math.round((noIds.length  / total) * 100) : 0;
                  const abstainPct = total > 0 ? Math.round((abstainIds.length / total) * 100) : 0;
                  const passed = yesIds.length > noIds.length;
                  const isChecked = selectedVoteArchiveIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-xl p-4 space-y-3 transition ${
                        isChecked ? 'bg-rose-50/50 border-rose-300 shadow-sm' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedVoteArchiveIds(prev => [...prev, item.id]);
                              else setSelectedVoteArchiveIds(prev => prev.filter(x => x !== item.id));
                            }}
                            className="mt-1 h-4 w-4 text-blue-600 rounded border-slate-300 cursor-pointer flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                              #{meeting.votingArchive.length - idx} • {new Date(item.completedAt).toLocaleString()}
                            </span>
                            <p className="text-xs font-bold text-slate-800 mt-0.5 leading-snug">{item.title}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                            passed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {passed ? '✅ БАТЛАГДСАН' : '❌ ТАТГАЛЗАГДСАН'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleVoteArchive(item.id)}
                            title="Энэ санал хураалтын архивыг устгах"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 space-y-1">
                          <div className="flex items-center justify-between font-bold text-emerald-700">
                            <span>{item.title.includes('ТОГТООЛЫН ТӨСӨЛ') ? '👍 Батлах' : '👍 Зөвшөөрсөн'}</span>
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
                            <span>{item.title.includes('ТОГТООЛЫН ТӨСӨЛ') ? '👎 Татгалзах' : '👎 Татгалзсан'}</span>
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

                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 space-y-1">
                          <div className="flex items-center justify-between font-bold text-amber-700">
                            <span>{item.title.includes('ТОГТООЛЫН ТӨСӨЛ') ? '✍️ Санал гаргах' : '✋ Түтгэлзсэн'}</span>
                            <span className="font-mono">{abstainIds.length} ({abstainPct}%)</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {abstainIds.map(id => {
                              const d = allDelegates.find(x => x.id === id);
                              return d ? (
                                <span key={id} className="text-[9px] bg-white border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">{d.fullName}</span>
                              ) : null;
                            })}
                            {abstainIds.length === 0 && <span className="text-[9px] text-slate-400 italic">Санал өгөөгүй</span>}
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

      {/* TAB 5: ANALYTICS DASHBOARD */}
      {adminTab === 'analytics' && (
        <AnalyticsDashboard
          meeting={meeting}
          allDelegates={allDelegates}
          meetingHistory={meetingHistory}
        />
      )}

      {/* TAB 6: MEETING HISTORY ARCHIVE PANEL */}
      {adminTab === 'history' && (
        <MeetingHistoryPanel
          meetingHistory={meetingHistory}
          allDelegates={allDelegates}
          onDeleteHistoryMeeting={onDeleteHistoryMeeting}
        />
      )}

      {showPrintModal && meeting && (
        <PrintReportModal
          meeting={meeting}
          delegates={allDelegates}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* BROADCAST & ATTENDANCE AUTO TIMER LOG MODAL */}
      {broadcastLogModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-800">
            <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-200 shadow-sm">
              <Bell size={28} className="animate-bounce text-blue-600" />
            </div>
            
            <div className="text-center space-y-1">
              <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest block">📢 ЗАРЛАН МЭДЭЭЛЭЛ ТҮГЭЭГДЛЭЭ</span>
              <h3 className="text-lg font-black text-slate-900 leading-snug">{broadcastLogModal.title}</h3>
            </div>

            <div className="space-y-2.5 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs">
              {broadcastLogModal.smsCount > 0 && (
                <div className="flex items-center justify-between text-slate-800 font-medium">
                  <span className="flex items-center gap-2">📱 SMS Зарлан мэдээлэл:</span>
                  <strong className="text-emerald-600 font-bold">✓ {broadcastLogModal.smsCount}/{allDelegates.length} Илгээгдсэн</strong>
                </div>
              )}

              {broadcastLogModal.emailCount > 0 && (
                <div className="flex items-center justify-between text-slate-800 font-medium">
                  <span className="flex items-center gap-2">📧 И-мэйл урилга:</span>
                  <strong className="text-emerald-600 font-bold">✓ {broadcastLogModal.emailCount}/{allDelegates.length} Илгээгдсэн</strong>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-800 font-medium border-t border-slate-200 pt-2">
                <span className="flex items-center gap-2">⏱️ Ирц автоматаар нээгдэх:</span>
                <strong className="text-blue-600 font-bold">
                  {broadcastLogModal.autoDelay === 0 ? '⚡ Шууд нээгдсэн' : `⏱️ ${broadcastLogModal.autoDelay} мин дараа`}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBroadcastLogModal({ open: false, title: '', smsCount: 0, emailCount: 0, autoDelay: 0 })}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer shadow-md"
            >
              Ойлголоо, Хянахад бэлэн
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
