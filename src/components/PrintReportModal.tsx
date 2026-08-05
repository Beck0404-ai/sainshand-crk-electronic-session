import React from 'react';
import { CRKMeeting, Delegate } from '../types';
import { Printer, X, FileText, CheckCircle2, XCircle, MinusCircle, Users } from 'lucide-react';

interface PrintReportModalProps {
  meeting: CRKMeeting;
  delegates: Delegate[];
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  meeting,
  delegates,
  onClose,
}) => {
  const presentCount = Object.keys(meeting.attendance || {}).length;
  const totalDelegates = delegates.length;
  const attendancePercent = totalDelegates > 0 
    ? Math.round((presentCount / totalDelegates) * 100) 
    : 0;
  const isQuorumReached = attendancePercent >= 50;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-lg">Хурлын Протокол & Тайлан</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Хэвлэх / PDF хадгалах
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Area */}
        <div className="p-8 sm:p-12 overflow-y-auto print:p-0 print:overflow-visible text-slate-800 space-y-8 print:text-black">
          
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-6 text-center space-y-2">
            <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">
              Сайншанд Сумын Иргэдийн Төлөөлөгчдийн Хурал
            </h1>
            <h2 className="text-2xl font-black text-blue-950">
              {meeting.title}
            </h2>
            <p className="text-sm text-slate-600 font-medium">
              Огноо: <span className="font-semibold text-slate-900">{meeting.date}</span> | Цаг: <span className="font-semibold text-slate-900">{meeting.time}</span> | Байршил: ИТХ-ын Хуралдааны Танхим
            </p>
          </div>

          {/* Attendance Section */}
          <div className="bg-slate-50 print:bg-white p-5 rounded-xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-200 pb-2">
              <Users className="w-5 h-5 text-blue-600 print:hidden" />
              1. Ирцийн Мэдээлэл & Кворум
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="bg-white print:border print:border-slate-300 p-3 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block">Нийт төлөөлөгч</span>
                <span className="text-lg font-bold text-slate-900">{totalDelegates} хүн</span>
              </div>
              <div className="bg-white print:border print:border-slate-300 p-3 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block">Ирцэнд бүртгэгдсэн</span>
                <span className="text-lg font-bold text-emerald-700">{presentCount} хүн</span>
              </div>
              <div className="bg-white print:border print:border-slate-300 p-3 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block">Ирцийн хувь</span>
                <span className="text-lg font-bold text-blue-700">{attendancePercent}%</span>
              </div>
              <div className="bg-white print:border print:border-slate-300 p-3 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block">Хуралдааны кворум</span>
                <span className={`text-sm font-bold ${isQuorumReached ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isQuorumReached ? '✓ Бүрдсэн' : '✗ Хүрээгүй'}
                </span>
              </div>
            </div>
          </div>

          {/* Agenda Items */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-base border-b border-slate-200 pb-2">
              2. Хэлэлцсэн Асуудлууд
            </h3>
            {meeting.agenda.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Хэлэлцэх асуудал бүртгэгдээгүй байна.</p>
            ) : (
              <ol className="list-decimal list-inside space-y-2 text-sm font-medium text-slate-800">
                {meeting.agenda.map((item, index) => (
                  <li key={item.id} className="p-2.5 bg-slate-50 print:bg-white rounded-lg border border-slate-100 print:border-slate-200">
                    <span className="font-semibold text-slate-900">{index + 1}. {item.title}</span>
                    {item.discussionSummary && (
                      <p className="text-xs text-slate-600 mt-1 pl-4 border-l-2 border-slate-300">
                        {item.discussionSummary}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Voting Results Archive */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-base border-b border-slate-200 pb-2">
              3. Санал Асуулгын Шийдвэрүүд
            </h3>
            {!meeting.votingArchive || meeting.votingArchive.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Явуулсан санал асуулга байхгүй байна.</p>
            ) : (
              <div className="space-y-4">
                {meeting.votingArchive.map((v, i) => {
                  const votes = Object.values(v.votes);
                  const yesCount = votes.filter(x => x.choice === 'Зөвшөөрсөн').length;
                  const noCount = votes.filter(x => x.choice === 'Татгалзсан').length;
                  const passCount = votes.filter(x => x.choice === 'Түтгэлзсэн').length;
                  const isPassed = yesCount > (v.totalPresent / 2);

                  return (
                    <div key={v.id || i} className="border border-slate-300 rounded-xl p-4 space-y-3 bg-white">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-bold text-sm text-slate-900">
                          3.{i + 1} {v.title}
                        </span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                          isPassed 
                            ? 'bg-emerald-100 text-emerald-800 print:bg-white print:border print:border-emerald-800' 
                            : 'bg-rose-100 text-rose-800 print:bg-white print:border print:border-rose-800'
                        }`}>
                          {isPassed ? 'БАТАЛСАН' : 'ДЭМЖИГДЭЭГҮЙ'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-center">
                        <div className="p-2 bg-emerald-50 print:bg-white border border-emerald-200 rounded-lg flex items-center justify-center gap-1 text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 print:hidden" />
                          Зөвшөөрсөн: {yesCount}
                        </div>
                        <div className="p-2 bg-rose-50 print:bg-white border border-rose-200 rounded-lg flex items-center justify-center gap-1 text-rose-800">
                          <XCircle className="w-4 h-4 text-rose-600 print:hidden" />
                          Татгалзсан: {noCount}
                        </div>
                        <div className="p-2 bg-amber-50 print:bg-white border border-amber-200 rounded-lg flex items-center justify-center gap-1 text-amber-800">
                          <MinusCircle className="w-4 h-4 text-amber-600 print:hidden" />
                          Түтгэлзсэн: {passCount}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs font-semibold text-slate-800 border-t border-slate-200">
            <div className="space-y-12">
              <p>ХУРАЛДААНЫ ДАРГА: ....................................... /..................../</p>
            </div>
            <div className="space-y-12">
              <p>НАРИЙН БИЧГИЙН ДАРГА: ................................. /..................../</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PrintReportModal;
