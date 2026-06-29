/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppState, Delegate, CRKMeeting, NotificationItem, AgendaItem, AgendaMaterial } from './types.js';
import RoleSwitcher from './components/RoleSwitcher.js';
import Header from './components/Header.js';
import DelegateDashboard from './components/DelegateDashboard.js';
import AdminDashboard from './components/AdminDashboard.js';
import ProjectorView from './components/ProjectorView.js';
import { Shield, Users, Monitor, ChevronRight, Landmark, UserPlus } from 'lucide-react';

export default function App() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [currentRole, setCurrentRole] = useState<'admin' | 'projector' | 'delegate' | null>(null);
  const [currentDelegateId, setCurrentDelegateId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  // Login Form States
  const [loginRoleTab, setLoginRoleTab] = useState<'delegate' | 'admin' | 'register'>('delegate');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Registration form states
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regParty, setRegParty] = useState<'МАН' | 'АН' | 'ХҮН' | 'Бяраа' | 'Бие даагч'>('МАН');
  const [regDistrict, setRegDistrict] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regBio, setRegBio] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Restore session from sessionStorage on page load/refresh
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('crkSession');
      if (saved) {
        const { role, delegateId } = JSON.parse(saved);
        if (role) {
          setCurrentRole(role);
          setCurrentDelegateId(delegateId || null);
        }
      }
    } catch {}
  }, []);

  // Load state and connect SSE
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      setConnectionStatus('connecting');
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        setConnectionStatus('connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const state: AppState = JSON.parse(event.data);
          setAppState(state);
        } catch (err) {
          console.error('Error parsing sse state updates', err);
        }
      };

      eventSource.onerror = () => {
        setConnectionStatus('disconnected');
        eventSource?.close();
        // Try auto reconnecting in 3 seconds
        reconnectTimeout = setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  if (!appState) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 p-6 font-sans">
        <img src="/logo.png" alt="ИТХ лого" className="h-20 w-20 object-contain mb-4 animate-pulse" />
        <h2 className="text-sm font-semibold tracking-tight text-slate-700">Сайншанд сумын ИТХ-ын систем</h2>
        <p className="text-[10px] text-slate-400 mt-1 font-mono tracking-wider">СЕРВЕРТЭЙ ХОЛБОГДОЖ БАЙНА...</p>
      </div>
    );
  }

  const { delegates, meeting, notifications, pendingDelegates } = appState;

  // Global action dispatcher helpers
  const handleRoleChange = (role: 'admin' | 'projector' | 'delegate', delegateId: string | null) => {
    setCurrentRole(role);
    setCurrentDelegateId(delegateId);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('crkSession');
    setCurrentRole(null);
    setCurrentDelegateId(null);
    setUsernameInput('');
    setPasswordInput('');
    setLoginError(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: loginRoleTab,
          username: usernameInput.trim(),
          password: passwordInput
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const role = data.role || null;
        const delegateId = data.delegateId || null;
        sessionStorage.setItem('crkSession', JSON.stringify({ role, delegateId }));
        setCurrentRole(role);
        setCurrentDelegateId(delegateId);
        setUsernameInput('');
        setPasswordInput('');
        setLoginError(null);
      } else {
        setLoginError(data.error || 'Нэвтрэх нэр эсвэл нууц үг буруу байна.');
      }
    } catch (err) {
      setLoginError('Сервэртэй холбогдох явцад алдаа гарлаа.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsRegistering(true);
    try {
      const res = await fetch('/api/delegate/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername.trim(),
          fullName: regFullName.trim(),
          party: regParty,
          district: regDistrict.trim(),
          phone: regPhone.trim(),
          email: regEmail.trim(),
          bio: regBio.trim(),
          password: regPassword
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRegSuccess(true);
      } else {
        setLoginError(data.error || 'Бүртгэлд алдаа гарлаа.');
      }
    } catch {
      setLoginError('Сервэртэй холбогдох явцад алдаа гарлаа.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleResetSystem = async () => {
    await fetch('/api/system/reset', { method: 'POST' });
  };

  // Delegate actions
  const registerAttendance = async () => {
    if (!currentDelegateId) return;
    const res = await fetch('/api/attendance/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delegateId: currentDelegateId })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Ирц бүртгэлд алдаа гарлаа.');
    }
  };

  const joinSpeakerQueue = async () => {
    if (!currentDelegateId) return;
    const res = await fetch('/api/speaker-queue/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delegateId: currentDelegateId })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Дараалалд ороход алдаа гарлаа.');
    }
  };

  const leaveSpeakerQueue = async () => {
    if (!currentDelegateId) return;
    const res = await fetch('/api/speaker-queue/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delegateId: currentDelegateId })
    });
  };

  const submitVote = async (choice: 'Зөвшөөрсөн' | 'Татгалзсан' | 'Түтгэлзсэн') => {
    if (!currentDelegateId) return;
    const res = await fetch('/api/vote/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delegateId: currentDelegateId, choice })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Санал илгээхэд алдаа гарлаа.');
    }
  };

  const updateProfile = async (data: { phone: string; email: string; bio: string }) => {
    if (!currentDelegateId) return;
    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delegateId: currentDelegateId, ...data })
    });
  };

  // Administrator actions
  const toggleAttendance = async (open: boolean) => {
    await fetch('/api/admin/attendance/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ open })
    });
  };

  const startVoting = async (agendaItemId: string, title: string) => {
    await fetch('/api/admin/voting/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agendaItemId, title })
    });
  };

  const stopVoting = async () => {
    await fetch('/api/admin/voting/stop', { method: 'POST' });
  };

  const nextSpeaker = async () => {
    await fetch('/api/admin/speaker/next', { method: 'POST' });
  };

  const directSelectSpeaker = async (delegateId: string, turn: number) => {
    await fetch('/api/admin/speaker/select-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delegateId, turn })
    });
  };

  const controlSpeaker = async (action: 'play' | 'pause' | 'add_time' | 'sub_time') => {
    await fetch('/api/admin/speaker/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
  };

  const skipSpeaker = async () => {
    await fetch('/api/admin/speaker/skip', { method: 'POST' });
  };

  const clearQueue = async () => {
    await fetch('/api/admin/speaker/clear', { method: 'POST' });
  };

  const resetPassword = async (delegateId: string) => {
    await fetch('/api/admin/delegate/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delegateId })
    });
  };

  const getCredentials = async (delegateId: string): Promise<{ username: string; password: string }> => {
    const res = await fetch(`/api/admin/delegate/${delegateId}/credentials`);
    return res.json();
  };

  const changePassword = async (delegateId: string, newPassword: string) => {
    const res = await fetch('/api/admin/delegate/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delegateId, newPassword })
    });
    if (!res.ok) throw new Error((await res.json()).error);
  };

  const approveDelegate = async (pendingId: string) => {
    await fetch('/api/admin/delegate/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pendingId })
    });
  };

  const rejectDelegate = async (pendingId: string) => {
    await fetch('/api/admin/delegate/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pendingId })
    });
  };

  const addDelegateDirectly = async (data: { username: string; fullName: string; party: string; district: string; phone: string; email: string; bio?: string }) => {
    await fetch('/api/admin/delegate/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  };

  const editDelegate = async (delegateId: string, data: Partial<Delegate>) => {
    await fetch('/api/admin/delegate/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delegateId, ...data })
    });
  };

  const deleteDelegate = async (delegateId: string) => {
    await fetch('/api/admin/delegate/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delegateId })
    });
  };

  const createMeeting = async (meetingData: { title: string; date: string; time: string; agenda: AgendaItem[] }) => {
    await fetch('/api/admin/meeting/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meetingData)
    });
  };

  const addMaterial = async (agendaItemId: string, material: Partial<AgendaMaterial>) => {
    await fetch('/api/admin/agenda/material/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agendaItemId, material })
    });
  };

  const selectAgenda = async (agendaItemId: string) => {
    await fetch('/api/admin/agenda/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agendaItemId })
    });
  };

  const setMeetingStatus = async (status: 'товлогдсон' | 'идэвхтэй' | 'дууссан') => {
    await fetch('/api/admin/meeting/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  };

  const activeDelegate = delegates.find(d => d.id === currentDelegateId);

  // If no role is selected, show a beautiful, high-fidelity portal entry page with login requirements
  if (currentRole === null) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between relative" id="portal-minimalist">
        
        <div className="max-w-xl mx-auto w-full px-6 py-12 flex-grow flex flex-col justify-center gap-8 relative z-10 animate-fadeIn">
          
          {/* Main big display header */}
          <div className="text-center space-y-3">
            <img src="/logo.png" alt="Сайншанд сумын лого" className="h-20 w-20 rounded-full object-cover shadow-sm mx-auto" />

            <div className="space-y-1.5">
              <span className="text-[9px] text-blue-600 font-mono font-bold tracking-widest block uppercase">Дорноговь аймаг • Сайншанд сум</span>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 max-w-2xl mx-auto">
                Цахим хуралдааны нэгдсэн систем
              </h1>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
            {/* Login Role Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => { setLoginRoleTab('delegate'); setUsernameInput(''); setPasswordInput(''); setLoginError(null); setRegSuccess(false); }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-r border-slate-200 transition ${
                  loginRoleTab === 'delegate' ? 'bg-white text-blue-600 border-b-2 border-b-blue-600 font-black' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                }`}
              >
                <Users size={14} />
                Төлөөлөгч
              </button>
              <button
                type="button"
                onClick={() => { setLoginRoleTab('admin'); setUsernameInput('admin'); setPasswordInput(''); setLoginError(null); setRegSuccess(false); }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-r border-slate-200 transition ${
                  loginRoleTab === 'admin' ? 'bg-white text-blue-600 border-b-2 border-b-blue-600 font-black' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                }`}
              >
                <Shield size={14} />
                Администратор
              </button>
              <button
                type="button"
                onClick={() => { setLoginRoleTab('register'); setLoginError(null); setRegSuccess(false); }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                  loginRoleTab === 'register' ? 'bg-white text-emerald-600 border-b-2 border-b-emerald-600 font-black' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                }`}
              >
                <UserPlus size={14} />
                Бүртгүүлэх
              </button>
            </div>

            {/* Registration Form */}
            {loginRoleTab === 'register' ? (
              <div className="p-6">
                {regSuccess ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="text-3xl">✅</div>
                    <p className="text-sm font-bold text-emerald-700">Бүртгэлийн хүсэлт амжилттай илгээгдлээ!</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Таны мэдээлэл администраторт хүргэгдлээ. Зөвшөөрөгдсөний дараа нэвтрэх боломжтой болно.
                    </p>
                    <button
                      type="button"
                      onClick={() => { setLoginRoleTab('delegate'); setRegSuccess(false); setRegFullName(''); setRegUsername(''); setRegDistrict(''); setRegPhone(''); setRegEmail(''); setRegBio(''); setRegPassword(''); }}
                      className="mt-2 text-xs text-blue-600 font-bold underline cursor-pointer"
                    >
                      Нэвтрэх хэсэгт буцах
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="space-y-3">
                    {loginError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 text-[11px] font-medium">
                        ⚠️ {loginError}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Овог нэр</label>
                        <input type="text" value={regFullName} onChange={e => setRegFullName(e.target.value)}
                          placeholder="Ж: Б.Батбаяр" required
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Нэвтрэх нэр</label>
                        <input type="text" value={regUsername} onChange={e => setRegUsername(e.target.value)}
                          placeholder="batbayar" required
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Нууц үг</label>
                        <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)}
                          placeholder="Нууц үг" required
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono tracking-widest" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Нам / Холбоо</label>
                        <select value={regParty} onChange={e => setRegParty(e.target.value as any)} required
                          aria-label="Нам / Холбоо сонгох"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 cursor-pointer">
                          <option value="МАН">МАН</option>
                          <option value="АН">АН</option>
                          <option value="ХҮН">ХҮН</option>
                          <option value="Бяраа">Бяраа</option>
                          <option value="Бие даагч">Бие даагч</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Тойрог / Баг</label>
                        <input type="text" value={regDistrict} onChange={e => setRegDistrict(e.target.value)}
                          placeholder="Ж: 1-р баг" required
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Утасны дугаар</label>
                        <input type="text" value={regPhone} onChange={e => setRegPhone(e.target.value)}
                          placeholder="99xxxxxx" required
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">И-мэйл</label>
                        <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                          placeholder="email@example.com" required
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Товч танилцуулга (заавал биш)</label>
                        <textarea value={regBio} onChange={e => setRegBio(e.target.value)} rows={2}
                          placeholder="Та өөрийгөө товчхон танилцуулна уу..."
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 resize-none" />
                      </div>
                    </div>
                    <button type="submit" disabled={isRegistering}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer select-none transition disabled:opacity-50">
                      {isRegistering ? 'Илгээж байна...' : 'Бүртгэлийн хүсэлт илгээх'}
                      {!isRegistering && <ChevronRight size={14} />}
                    </button>
                    <p className="text-[10px] text-slate-400 text-center">
                      Хүсэлтийг администратор хянаж зөвшөөрнө.
                    </p>
                  </form>
                )}
              </div>
            ) : (
              <>
                {/* Login Form Body */}
                <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
                  {loginError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 text-[11px] font-medium leading-relaxed">
                      ⚠️ {loginError}
                    </div>
                  )}

                  {loginRoleTab === 'delegate' ? (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Нэвтрэх нэр</label>
                        <input
                          type="text"
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          placeholder="Нэвтрэх нэр эсвэл дээрээс сонгоно уу"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Админы Нэвтрэх нэр</label>
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="Жишээ: admin"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Нууц үг</label>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Пассворд оруулна уу"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-blue-500 tracking-widest font-mono"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer select-none transition disabled:opacity-50"
                  >
                    {isLoggingIn ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
                    {!isLoggingIn && <ChevronRight size={14} />}
                  </button>
                </form>

              </>
            )}
          </div>


        </div>

        {/* Outer footer */}
        <div className="bg-white border-t border-slate-200 py-3 text-center text-[9px] text-slate-400 font-mono">
          Сайншанд сумын Иргэдийн Төлөөлөгчдийн Хурал © 2026. Системийн цахим боловсруулалт.
        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      
      {/* Top Identity Switcher - admin only */}
      {currentRole === 'admin' && (
        <RoleSwitcher
          currentRole={currentRole}
          currentDelegateId={currentDelegateId}
          delegates={delegates}
          onRoleChange={handleRoleChange}
          onResetSystem={handleResetSystem}
          connectionStatus={connectionStatus}
        />
      )}

      {/* Primary branding header for active workspaces */}
      {currentRole !== 'projector' && (
        <Header 
          currentRole={currentRole} 
          currentDelegateId={currentDelegateId} 
          delegates={delegates}
          meeting={meeting}
          onLogout={handleLogout}
        />
      )}

      {/* DASHBOARD ROUTING ENGINE */}
      <main className="flex-grow">
        {currentRole === 'delegate' && activeDelegate && (
          <DelegateDashboard
            delegate={activeDelegate}
            meeting={meeting}
            notifications={notifications}
            allDelegates={delegates}
            onRegisterAttendance={registerAttendance}
            onJoinSpeakerQueue={joinSpeakerQueue}
            onLeaveSpeakerQueue={leaveSpeakerQueue}
            onSubmitVote={submitVote}
            onUpdateProfile={updateProfile}
            onLogout={handleLogout}
          />
        )}

        {currentRole === 'admin' && (
          <AdminDashboard
            meeting={meeting}
            delegates={delegates.filter(d => meeting ? !!meeting.attendance[d.id] : false)}
            notifications={notifications}
            allDelegates={delegates}
            pendingDelegates={pendingDelegates}
            onToggleAttendance={toggleAttendance}
            onStartVoting={startVoting}
            onStopVoting={stopVoting}
            onNextSpeaker={nextSpeaker}
            onDirectSelectSpeaker={directSelectSpeaker}
            onControlSpeaker={controlSpeaker}
            onSkipSpeaker={skipSpeaker}
            onClearQueue={clearQueue}
            onResetPassword={resetPassword}
            onGetCredentials={getCredentials}
            onChangePassword={changePassword}
            onDeleteDelegate={deleteDelegate}
            onEditDelegate={editDelegate}
            onApproveDelegate={approveDelegate}
            onRejectDelegate={rejectDelegate}
            onAddDelegate={addDelegateDirectly}
            onCreateMeeting={createMeeting}
            onAddMaterial={addMaterial}
            onSelectAgenda={selectAgenda}
            onSetMeetingStatus={setMeetingStatus}
            onViewProjector={() => handleRoleChange('projector', null)}
          />
        )}

        {currentRole === 'projector' && (
          <ProjectorView
            meeting={meeting}
            delegates={delegates}
            onBackToAdmin={() => handleRoleChange('admin', null)}
          />
        )}
      </main>

      {/* Small subtle page footer */}
      {currentRole !== 'projector' && (
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 font-mono">
          Сайншанд сумын ИТХ-ын Цахим хуралдааны систем. Хувилбар V1.0.0 (Бодит хугацаатай)
        </footer>
      )}

    </div>
  );
}

