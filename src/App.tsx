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
import { Shield, Users, Monitor, ChevronRight, CornerDownRight, Landmark } from 'lucide-react';

export default function App() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [currentRole, setCurrentRole] = useState<'admin' | 'projector' | 'delegate' | null>(null);
  const [currentDelegateId, setCurrentDelegateId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  // Login Form States
  const [loginRoleTab, setLoginRoleTab] = useState<'delegate' | 'admin'>('delegate');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
        <Landmark className="text-blue-600 animate-pulse mb-3" size={40} id="loading-landmark" />
        <h2 className="text-sm font-semibold tracking-tight text-slate-700">Сайншанд сумын ИТХ-ын систем</h2>
        <p className="text-[10px] text-slate-400 mt-1 font-mono tracking-wider">СЕРВЕРТЭЙ ХОЛБОГДОЖ БАЙНА...</p>
      </div>
    );
  }

  const { delegates, meeting, notifications } = appState;

  // Global action dispatcher helpers
  const handleRoleChange = (role: 'admin' | 'projector' | 'delegate', delegateId: string | null) => {
    setCurrentRole(role);
    setCurrentDelegateId(delegateId);
  };

  const handleLogout = () => {
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
        setCurrentRole(data.role || null);
        setCurrentDelegateId(data.delegateId || null);
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

  const submitVote = async (choice: 'Зөвшөөрсөн' | 'Татгалзсан') => {
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

  const editDelegate = async (delegateId: string, data: Partial<Delegate>) => {
    await fetch('/api/admin/delegate/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delegateId, ...data })
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
            <img src="/logo.png" alt="Сайншанд сумын лого" className="h-16 w-16 rounded-xl object-cover shadow-sm mx-auto" />

            <div className="space-y-1.5">
              <span className="text-[9px] text-blue-600 font-mono font-bold tracking-widest block uppercase">Дорноговь аймаг • Сайншанд сум</span>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 max-w-2xl mx-auto">
                Цахим хуралдааны нэгдсэн систем
              </h1>
              <p className="text-[11px] text-slate-400 max-w-lg mx-auto leading-relaxed">
                Ирц бүртгэл, санал хураалт, үг хэлэлтийн дарааллыг бодит хугацаанд удирдах, архивлах цахим зохицуулалтын систем
              </p>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
            {/* Login Role Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setLoginRoleTab('delegate');
                  setUsernameInput('');
                  setPasswordInput('');
                  setLoginError(null);
                }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-r border-slate-200 transition ${
                  loginRoleTab === 'delegate'
                    ? 'bg-white text-blue-600 border-b-2 border-b-blue-600 font-black'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                }`}
              >
                <Users size={14} />
                Төлөөлөгч
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginRoleTab('admin');
                  setUsernameInput('admin'); // prefill for convenience
                  setPasswordInput('');
                  setLoginError(null);
                }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                  loginRoleTab === 'admin'
                    ? 'bg-white text-blue-600 border-b-2 border-b-blue-600 font-black'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                }`}
              >
                <Shield size={14} />
                Администратор
              </button>
            </div>

            {/* Login Form Body */}
            <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
              
              {/* Show error if exists */}
              {loginError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 text-[11px] font-medium leading-relaxed">
                  ⚠️ {loginError}
                </div>
              )}

              {loginRoleTab === 'delegate' ? (
                <>
                  {/* Delegate selector dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Төлөөлөгч сонгох</label>
                    <select
                      onChange={(e) => {
                        const dId = e.target.value;
                        const dObj = delegates.find(x => x.id === dId);
                        if (dObj) {
                          setUsernameInput(dObj.username);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs rounded-lg px-3 py-2 cursor-pointer outline-none focus:border-blue-500"
                      defaultValue=""
                    >
                      <option value="" disabled>-- Сонгох --</option>
                      {delegates.map(d => (
                        <option key={d.id} value={d.id}>{d.fullName} ({d.district.split(' ')[0]})</option>
                      ))}
                    </select>
                  </div>

                  {/* Read-only/typed Username Display */}
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
                /* Admin Input */
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

              {/* Password Input (Shared) */}
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer select-none transition disabled:opacity-50"
              >
                {isLoggingIn ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
                {!isLoggingIn && <ChevronRight size={14} />}
              </button>

            </form>

            {/* Test accounts hints bar */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-3.5 text-[10px] text-slate-500 leading-relaxed space-y-1">
              <div className="font-semibold text-slate-600">💡 Симуляцийн нэвтрэх эрхүүд:</div>
              {loginRoleTab === 'delegate' ? (
                <div>Төлөөлөгчид: <span className="font-mono bg-white border px-1 py-0.5 rounded text-blue-600 font-semibold text-[9px]">Нэрээ сонгоод</span>, нууц үг нь: <span className="font-mono bg-white border px-1 py-0.5 rounded text-slate-700 font-bold text-[9px]">123</span></div>
              ) : (
                <div>Администратор: Нэвтрэх нэр: <span className="font-mono bg-white border px-1 py-0.5 rounded text-slate-700 font-bold text-[9px]">admin</span>, нууц үг нь: <span className="font-mono bg-white border px-1 py-0.5 rounded text-slate-700 font-bold text-[9px]">admin</span></div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-lg text-center text-[10px] text-slate-400 leading-relaxed shadow-sm">
            💡 <strong>Туршилтын горим:</strong> Бодит хугацааны синхрончлолыг шалгахын тулд энэхүү хаягаа давхар цонхонд нээж, нэгэнд нь <span className="font-medium text-slate-600">Төлөөлөгч</span>, нөгөөд нь <span className="font-medium text-slate-600">Админ</span> системээр орж зэрэгцүүлж ашиглаарай.
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
      
      {/* Top Identity Switcher for frictionless testing */}
      <RoleSwitcher
        currentRole={currentRole}
        currentDelegateId={currentDelegateId}
        delegates={delegates}
        onRoleChange={handleRoleChange}
        onResetSystem={handleResetSystem}
        connectionStatus={connectionStatus}
      />

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
          />
        )}

        {currentRole === 'admin' && (
          <AdminDashboard
            meeting={meeting}
            delegates={delegates.filter(d => meeting ? !!meeting.attendance[d.id] : false)}
            notifications={notifications}
            allDelegates={delegates}
            onToggleAttendance={toggleAttendance}
            onStartVoting={startVoting}
            onStopVoting={stopVoting}
            onNextSpeaker={nextSpeaker}
            onDirectSelectSpeaker={directSelectSpeaker}
            onControlSpeaker={controlSpeaker}
            onSkipSpeaker={skipSpeaker}
            onClearQueue={clearQueue}
            onResetPassword={resetPassword}
            onEditDelegate={editDelegate}
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

