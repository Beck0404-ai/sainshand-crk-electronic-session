/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Delegate } from '../types.js';
import { Shield, Monitor, User, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface RoleSwitcherProps {
  currentRole: 'admin' | 'projector' | 'delegate';
  currentDelegateId: string | null;
  delegates: Delegate[];
  onRoleChange: (role: 'admin' | 'projector' | 'delegate', delegateId: string | null) => void;
  onResetSystem: () => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

export default function RoleSwitcher({
  currentRole,
  currentDelegateId,
  delegates,
  onRoleChange,
  onResetSystem,
  connectionStatus
}: RoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const selectedDelegate = delegates.find(d => d.id === currentDelegateId);

  const handleReset = async () => {
    if (confirm('Системийн төлөвийг эхний байдалд оруулах уу?')) {
      setIsResetting(true);
      try {
        await onResetSystem();
      } catch (e) {
        console.error(e);
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 text-slate-700 text-xs shadow-sm z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {currentRole === 'admin' && (
          <div className="flex items-center gap-2 font-mono">
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                connectionStatus === 'connected' ? 'bg-emerald-400' : connectionStatus === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                connectionStatus === 'connected' ? 'bg-emerald-500' : connectionStatus === 'connecting' ? 'bg-amber-500' : 'bg-rose-500'
              }`}></span>
            </span>
            <span className="text-slate-500 font-medium">
              {connectionStatus === 'connected' ? 'Интеграци: Идэвхтэй харилцаа (SSE)' : connectionStatus === 'connecting' ? 'Холбогдож байна...' : 'Сүлжээ тасарсан'}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 mr-2">
          {/* Active indicator */}
          <div className="bg-slate-55 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-200">
            <span className="text-slate-400">Одоогийн эрх:</span>
            {currentRole === 'admin' && (
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 border border-blue-100">
                <Shield size={12} /> Админ
              </span>
            )}
            {currentRole === 'projector' && (
              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 border border-indigo-100">
                <Monitor size={12} /> Танхимын дэлгэц
              </span>
            )}
            {currentRole === 'delegate' && (
              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 border border-emerald-100">
                <User size={12} /> {selectedDelegate ? selectedDelegate.fullName : 'Төлөөлөгч'}
              </span>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium px-3 py-1.5 rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer"
          >
            Хэрэглэгч солих {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button
            onClick={handleReset}
            disabled={isResetting}
            title="Системийн ирц, санал, дарааллыг эхний байдалд шилжүүлэх"
            className="bg-slate-100 hover:bg-slate-200 hover:text-blue-600 p-2 rounded-lg border border-slate-200 transition text-slate-500 flex items-center justify-center cursor-pointer"
          >
            <RefreshCw size={13} className={isResetting ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="bg-slate-50 border-t border-slate-200 p-6 animate-fadeIn shadow-inner">
          <div className="max-w-7xl mx-auto space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Admins & Projector */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-sm">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5 text-[11px]">Үндсэн эрх сонгох</h4>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { onRoleChange('admin', null); setIsOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition cursor-pointer text-xs ${
                      currentRole === 'admin' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-50 hover:bg-slate-100 border border-slate-150 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5"><Shield size={14} /> Хурлын Администратор</span>
                    <span className="text-[9px] opacity-80">Удирдах</span>
                  </button>
                  <button
                    onClick={() => { onRoleChange('projector', null); setIsOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition cursor-pointer text-xs ${
                      currentRole === 'projector' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-50 hover:bg-slate-100 border border-slate-150 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5"><Monitor size={14} /> Танхимын том дэлгэц</span>
                    <span className="text-[9px] opacity-80">Проектор</span>
                  </button>
                </div>
              </div>

              {/* Description helper */}
              <div className="md:col-span-2 bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-center shadow-sm">
                <p className="text-slate-500 leading-relaxed text-xs">
                  💡 <strong>Бодит хугацааны симуляци:</strong> Энэхүү систем нь бодит хугацааны (real-time) синхрончлолтой. Хөгжүүлэгчид үйл ажиллагааг бүрэн шалгахын тулд хөтчийн өөр цонхонд энэхүү хуудсыг давхар нээж, алинд нь ч өөр өөр эрхээр сонгон нэвтэрч үйлдэл хийхэд нөгөө таб дахь статус, санал хураалт, болон спикерийн цаг хуудас сэргээх шаардлагагүйгээр бодит хугацаанд шууд шинэчлэгдэх боломжтой.
                </p>
              </div>
            </div>

            {/* Delegates grid list */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-sm">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1.5 text-[11px]">
                ИТХ-ЫН ТӨЛӨӨЛӨГЧИД СИМУЛЯЦЛАХ (29 Төлөөлөгч)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
                {delegates.map((d) => {
                  const isActive = currentRole === 'delegate' && currentDelegateId === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        onRoleChange('delegate', d.id);
                        setIsOpen(false);
                      }}
                      className={`text-left p-2 rounded-lg border transition cursor-pointer flex flex-col justify-between truncate ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold border-blue-600 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900'
                      }`}
                      title={`${d.fullName} (${d.district})`}
                    >
                      <div className="font-bold flex items-center justify-between border-b pb-1 border-slate-205 text-[11px] mb-1">
                        <span>{d.fullName}</span>
                      </div>
                      <span className={`text-[9px] truncate ${isActive ? 'text-white/80' : 'text-slate-400'}`}>{d.district}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
