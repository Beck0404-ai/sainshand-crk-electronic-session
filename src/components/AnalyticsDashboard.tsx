/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CRKMeeting, Delegate } from '../types.js';
import { BarChart3, PieChart, Users, CheckCircle, Award, Activity } from 'lucide-react';

interface AnalyticsDashboardProps {
  meeting: CRKMeeting | null;
  allDelegates: Delegate[];
  meetingHistory?: CRKMeeting[];
}

export default function AnalyticsDashboard({ meeting, allDelegates, meetingHistory = [] }: AnalyticsDashboardProps) {
  const totalDelegatesCount = 29;
  const presentCount = meeting ? Object.keys(meeting.attendance || {}).length : 0;
  const attendanceRate = Math.round((presentCount / totalDelegatesCount) * 100);

  // Voting Archive stats
  const archiveItems = meeting?.votingArchive || [];
  let totalVotesPassed = 0;
  let totalVotesFailed = 0;
  let totalYesVotes = 0;
  let totalNoVotes = 0;
  let totalAbstainVotes = 0;

  archiveItems.forEach(item => {
    const yes = Object.values(item.votes).filter(v => v.choice === 'Батлах' || v.choice === 'Зөвшөөрсөн').length;
    const no = Object.values(item.votes).filter(v => v.choice === 'Татгалзах' || v.choice === 'Татгалзсан').length;
    const abstain = Object.values(item.votes).filter(v => v.choice === 'Санал гаргах' || v.choice === 'Түтгэлзсэн').length;
    totalYesVotes += yes;
    totalNoVotes += no;
    totalAbstainVotes += abstain;
    if (yes > no) totalVotesPassed++;
    else totalVotesFailed++;
  });

  const totalVotesCastAll = totalYesVotes + totalNoVotes + totalAbstainVotes;
  const yesPct = totalVotesCastAll > 0 ? Math.round((totalYesVotes / totalVotesCastAll) * 100) : 0;
  const noPct = totalVotesCastAll > 0 ? Math.round((totalNoVotes / totalVotesCastAll) * 100) : 0;
  const abstainPct = totalVotesCastAll > 0 ? Math.round((totalAbstainVotes / totalVotesCastAll) * 100) : 0;

  // Party breakdown stats
  const parties = ['МАН', 'АН', 'ХҮН', 'Бие даагч'];
  const partyStats = parties.map(p => {
    const partyDelegates = allDelegates.filter(d => d.party === p);
    const presentInParty = partyDelegates.filter(d => meeting?.attendance && !!meeting.attendance[d.id]).length;
    const rate = partyDelegates.length > 0 ? Math.round((presentInParty / partyDelegates.length) * 100) : 0;
    return { party: p, total: partyDelegates.length, present: presentInParty, rate };
  });

  // Top delegates by votes cast
  const sortedDelegates = [...allDelegates].sort((a, b) => (b.votesCastCount || 0) - (a.votesCastCount || 0));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ирцийн Бүрэн Хувь</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{attendanceRate}%</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{presentCount} / {totalDelegatesCount} Төлөөлөгч</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Нийт Санал Хураалт</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{archiveItems.length}</p>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">✅ {totalVotesPassed} Батлагдсан</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Зөвшөөрсөн Саналын Хувь</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{yesPct}%</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Нийт {totalVotesCastAll} саналаас</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Түүхийн Архив</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{meetingHistory.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Хадгалагдсан хуралдаан</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Activity size={24} />
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Party Attendance Bar Chart & Voting Pie Breakdown */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Party Attendance Bar Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-600" /> Нам/Холбоодын Ирцийн Харьцуулалт
              </h3>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">Бодит цаг</span>
            </div>

            <div className="space-y-3 pt-2">
              {partyStats.map(stat => (
                <div key={stat.party} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{stat.party} ({stat.present}/{stat.total})</span>
                    <span className="font-mono">{stat.rate}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        stat.party === 'МАН' ? 'bg-rose-500' :
                        stat.party === 'АН' ? 'bg-blue-500' :
                        stat.party === 'ХҮН' ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${stat.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Voting Breakdown SVG Donut & Detailed Totals */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <PieChart size={16} className="text-indigo-600" /> Санал Хураалтын Нийт Бүтэц
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Нийт {totalVotesCastAll} санал</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* SVG Donut Chart */}
              <div className="flex justify-center py-2">
                <svg className="w-36 h-36" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {yesPct > 0 && (
                    <path
                      className="text-emerald-500 transition-all duration-700"
                      strokeDasharray={`${yesPct}, 100`}
                      strokeWidth="3.8"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  )}
                  <text x="18" y="20.5" className="text-[7px] font-bold fill-slate-800" textAnchor="middle">{yesPct}%</text>
                </svg>
              </div>

              {/* Legend stats */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2 font-bold text-emerald-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span>Зөвшөөрсөн / Батлах</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-800">{totalYesVotes} ({yesPct}%)</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 border border-rose-100">
                  <div className="flex items-center gap-2 font-bold text-rose-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <span>Татгалзсан / Татгалзах</span>
                  </div>
                  <span className="font-mono font-bold text-rose-800">{totalNoVotes} ({noPct}%)</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-2 font-bold text-amber-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span>Түтгэлзсэн / Санал гаргах</span>
                  </div>
                  <span className="font-mono font-bold text-amber-800">{totalAbstainVotes} ({abstainPct}%)</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Delegate Activity Leaderboard */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Award size={16} className="text-amber-500" /> Төлөөлөгчдийн Саналын Идэвх
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Шилдэг оролцоо</span>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {sortedDelegates.slice(0, 10).map((d, index) => {
                const isPresent = meeting?.attendance && !!meeting.attendance[d.id];
                return (
                  <div key={d.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                        index === 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        index === 1 ? 'bg-slate-200 text-slate-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{d.fullName}</p>
                        <p className="text-[9px] text-slate-400">{d.party} • {d.district}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        isPresent ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isPresent ? 'Ирсэн' : 'Эзгүй'}
                      </span>
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                        {d.votesCastCount || 0} санал
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
