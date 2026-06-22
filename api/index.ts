import express, { Request, Response } from 'express';
import { AppState, CRKMeeting, Delegate, NotificationItem, VotingArchiveItem } from '../src/types.js';

const app = express();
app.use(express.json());

const seedDelegates: Delegate[] = [
  { id: 'rep01', username: 'batbayar', fullName: 'Б.Батбаяр', party: 'МАН', district: '1-р баг (Дундшанд)', phone: '99114567', email: 'batbayar@sainshand.gov.mn', bio: 'ИТХ-ын Төлөөлөгч, Хөдөө аж ахуйн мэргэжилтэн', attendedMeetingsCount: 12, votesCastCount: 45 },
  { id: 'rep02', username: 'enkhbayar', fullName: 'С.Энхбаяр', party: 'МАН', district: '1-р баг (Дундшанд)', phone: '88112345', email: 'enkhbayar.s@sainshand.gov.mn', bio: 'ИТХ-ын Төлөөлөгч, Багш', attendedMeetingsCount: 11, votesCastCount: 42 },
  { id: 'rep03', username: 'dulmaa', fullName: 'Л.Дулмаа', party: 'АН', district: '1-р баг (Дундшанд)', phone: '95123456', email: 'dulmaa.l@sainshand.gov.mn', bio: 'Эрүүл мэндийн салбарын зөвлөх', attendedMeetingsCount: 14, votesCastCount: 48 },
  { id: 'rep04', username: 'bold', fullName: 'Д.Болд', party: 'МАН', district: '2-р баг (Зүүн Колон)', phone: '99015678', email: 'bold.d@sainshand.gov.mn', bio: 'ИТХ-ын төлөөлөгч, Инженер', attendedMeetingsCount: 13, votesCastCount: 47 },
  { id: 'rep05', username: 'ariunbold', fullName: 'Т.Ариунболд', party: 'МАН', district: '2-р баг (Зүүн Колон)', phone: '89115678', email: 'ariunbold@sainshand.gov.mn', bio: 'Хувийн хэвшлийн төлөөлөл', attendedMeetingsCount: 10, votesCastCount: 39 },
  { id: 'rep06', username: 'chimge', fullName: 'Х.Чимэг', party: 'АН', district: '2-р баг (Зүүн Колон)', phone: '91114578', email: 'chimgee.kh@sainshand.gov.mn', bio: 'Жижиг дунд үйлдвэрлэлийг дэмжих холбооны гишүүн', attendedMeetingsCount: 14, votesCastCount: 48 },
  { id: 'rep07', username: 'mungun', fullName: 'Г.Мөнгөнсүх', party: 'МАН', district: '3-р баг (Мааньт)', phone: '99056633', email: 'mungunsukh@sainshand.gov.mn', bio: 'ИТХ-ын Тэргүүлэгч гишүүн', attendedMeetingsCount: 14, votesCastCount: 48 },
  { id: 'rep08', username: 'bayarkhuu', fullName: 'Т.Баярхүү', party: 'МАН', district: '3-р баг (Мааньт)', phone: '88019922', email: 'bayarkhuu@sainshand.gov.mn', bio: 'Дэд бүтцийн хорооны дарга', attendedMeetingsCount: 12, votesCastCount: 43 },
  { id: 'rep09', username: 'altantsetseg', fullName: 'Н.Алтанцэцэг', party: 'АН', district: '3-р баг (Мааньт)', phone: '95663322', email: 'altantsetseg@sainshand.gov.mn', bio: 'Орон нутгийн ТББ-ын тэргүүн', attendedMeetingsCount: 13, votesCastCount: 46 },
  { id: 'rep10', username: 'sukhbat', fullName: 'С.Сүхбат', party: 'ХҮН', district: '3-р баг (Мааньт)', phone: '99887766', email: 'sukhbat@sainshand.gov.mn', bio: 'Эдийн засагч, нийгмийн зүтгэлтэн', attendedMeetingsCount: 9, votesCastCount: 35 },
  { id: 'rep11', username: 'erdenebayar', fullName: 'П.Эрдэнэбаяр', party: 'МАН', district: '4-р баг (Хэрлэн)', phone: '99127788', email: 'erdenebayar@sainshand.gov.mn', bio: 'Хорооны дарга, Хуульч', attendedMeetingsCount: 14, votesCastCount: 48 },
  { id: 'rep12', username: 'otgonpurev', fullName: 'Ж.Отгонпүрэв', party: 'МАН', district: '4-р баг (Хэрлэн)', phone: '89123344', email: 'otgonpurev@sainshand.gov.mn', bio: 'Хүүхэд Гэр Билийн Хөгжлийн зөвлөх', attendedMeetingsCount: 11, votesCastCount: 40 },
  { id: 'rep13', username: 'tuyatsetseg', fullName: 'Б.Туяацэцэг', party: 'АН', district: '4-р баг (Хэрлэн)', phone: '95126677', email: 'tuyatsetseg@sainshand.gov.mn', bio: 'Биеийн тамир спортын хорооны ажилтан', attendedMeetingsCount: 13, votesCastCount: 46 },
  { id: 'rep14', username: 'tuvshinjargal', fullName: 'Г.Түвшинжаргал', party: 'АН', district: '4-р баг (Хэрлэн)', phone: '99441122', email: 'tuvshinjargal@sainshand.gov.mn', bio: 'Байгаль орчны ахлах байцаагч', attendedMeetingsCount: 12, votesCastCount: 44 },
  { id: 'rep15', username: 'khurel', fullName: 'Д.Хүрэлбаатар', party: 'Бие даагч', district: '4-р баг (Хэрлэн)', phone: '88001155', email: 'khurelbaatar@sainshand.gov.mn', bio: 'Ахмад төлөөлөгч, Орон нутгийн түүхч', attendedMeetingsCount: 15, votesCastCount: 48 },
  { id: 'rep16', username: 'byambatsogt', fullName: 'О.Бямбацогт', party: 'МАН', district: '5-р баг (Шандын)', phone: '99451278', email: 'byambatsogt@sainshand.gov.mn', bio: 'Орон нутгийн хөгжлийн бодлогын мэргэжилтэн', attendedMeetingsCount: 11, votesCastCount: 41 },
  { id: 'rep17', username: 'gantulga', fullName: 'Ц.Гантулга', party: 'МАН', district: '5-р баг (Шандын)', phone: '88995511', email: 'gantulga.ts@sainshand.gov.mn', bio: 'ИТХ-ын төлөөлөгч, Бизнес эрхлэгч', attendedMeetingsCount: 13, votesCastCount: 44 },
  { id: 'rep18', username: 'amarsanaa', fullName: 'Т.Амарсанаа', party: 'АН', district: '5-р баг (Шандын)', phone: '95147852', email: 'amarsanaa.t@sainshand.gov.mn', bio: 'Инженерийн байгууламжийн мэргэжилтэн', attendedMeetingsCount: 10, votesCastCount: 38 },
  { id: 'rep19', username: 'munkhtsetseg', fullName: 'Д.Мөнхцэцэг', party: 'МАН', district: '5-р баг (Шандын)', phone: '99110055', email: 'munkhtsetseg@sainshand.gov.mn', bio: 'Эрүүл уур амьсгал орон нутгийн ТББ гишүүн', attendedMeetingsCount: 14, votesCastCount: 48 },
  { id: 'rep20', username: 'enkhbat', fullName: 'Ж.Энхбат', party: 'МАН', district: '6-р баг (Өвөр)', phone: '94123654', email: 'enkhbat.j@sainshand.gov.mn', bio: 'Нийгмийн ажилтан', attendedMeetingsCount: 13, votesCastCount: 45 },
  { id: 'rep21', username: 'sodnam', fullName: 'Р.Содномцэрэн', party: 'МАН', district: '6-р баг (Өвөр)', phone: '88663322', email: 'sodnamts@sainshand.gov.mn', bio: 'Залуучуудын хөгжлийн зөвлөлийн дарга', attendedMeetingsCount: 12, votesCastCount: 43 },
  { id: 'rep22', username: 'purevjav', fullName: 'Б.Пүрэвжав', party: 'АН', district: '6-р баг (Өвөр)', phone: '99004455', email: 'purevjav.b@sainshand.gov.mn', bio: 'ИТХ-ын Төлөөлөгч, Жижиг дунд үйлчилгээ хариуцагч', attendedMeetingsCount: 14, votesCastCount: 47 },
  { id: 'rep23', username: 'tsend', fullName: 'О.Цэнд-Аюуш', party: 'ХҮН', district: '6-р баг (Өвөр)', phone: '89114455', email: 'tsendayush@sainshand.gov.mn', bio: 'Мэдээллийн технологийн салбар зөвлөх', attendedMeetingsCount: 12, votesCastCount: 42 },
  { id: 'rep24', username: 'ganbold', fullName: 'С.Ганболд', party: 'МАН', district: '1-р баг (Дундшанд)', phone: '99221199', email: 'ganbold.s@sainshand.gov.mn', bio: 'Боловсролын салбарын удирдах ажилтан', attendedMeetingsCount: 11, votesCastCount: 40 },
  { id: 'rep25', username: 'oyunchimeg', fullName: 'Ж.Оюунчимэг', party: 'МАН', district: '2-р баг (Зүүн Колон)', phone: '99882244', email: 'oyunchimeg@sainshand.gov.mn', bio: 'Эмч, эрүүл мэндийн байцаагч', attendedMeetingsCount: 14, votesCastCount: 48 },
  { id: 'rep26', username: 'badam', fullName: 'П.Бадамханд', party: 'АН', district: '3-р баг (Мааньт)', phone: '99446688', email: 'badamkhand@sainshand.gov.mn', bio: 'Дорноговь сонины сэтгүүлч', attendedMeetingsCount: 13, votesCastCount: 46 },
  { id: 'rep27', username: 'tsogt', fullName: 'Б.Цогтсайхан', party: 'МАН', district: '4-р баг (Хэрлэн)', phone: '88110022', email: 'tsogtsaikhan@sainshand.gov.mn', bio: 'ИТХ-ын хорооны ажилтан', attendedMeetingsCount: 13, votesCastCount: 45 },
  { id: 'rep28', username: 'uyanga', fullName: 'Л.Уянга', party: 'МАН', district: '5-р баг (Шандын)', phone: '95123399', email: 'uyanga.l@sainshand.gov.mn', bio: 'Орон нутгийн бизнесийн зөвлөх', attendedMeetingsCount: 14, votesCastCount: 47 },
  { id: 'rep29', username: 'narangerel', fullName: 'Т.Нарангэрэл', party: 'МАН', district: '6-р баг (Өвөр)', phone: '89124433', email: 'narangerel@sainshand.gov.mn', bio: 'Нийтийн тээвэр хариуцсан мэргэжилтэн', attendedMeetingsCount: 12, votesCastCount: 44 }
];

seedDelegates.forEach(d => { (d as any).password = '123'; });

let serverMeeting: CRKMeeting = {
  id: 'meeting-14',
  title: 'Сайншанд сумын ИТХ-ын Ээлжит XIV Хуралдаан',
  date: '2026-06-02',
  time: '09:00',
  status: 'идэвхтэй',
  agenda: [
    {
      id: 'agenda-01',
      title: '1. Сайншанд сумын 2026 оны Төсвийн тодотгол, хөгжлийн төлөвлөгөөг хэлэлцэн батлах тухай',
      order: 1,
      materials: [
        { id: 'mat-01', title: 'Сайншанд сумын 2026 Төсвийн Тодотгол Хөгжлийн төлөвлөгөө.pdf', fileType: 'pdf', fileSize: '4.2 MB', contentSummary: 'Нийт орлого 10.5 тэрбум төгрөг, нийт зарлага 11.2 тэрбум төгрөг. Сургууль, цэцэрлэгийн дулаалга, ундны усны шугамын өргөтгөл багтсан.' },
        { id: 'mat-02', title: 'Төсвийн Тодотгол_Судалгаа хүснэгт.xlsx', fileType: 'xlsx', fileSize: '1.8 MB', contentSummary: '1-р баг - 1.2 тэрбум ₮, 3-р баг - 2.5 тэрбум ₮, 5-р баг - 900 сая ₮, 6-р баг - 1.4 тэрбум ₮.' }
      ]
    },
    {
      id: 'agenda-02',
      title: '2. Сумын Хэмжээнд Гэр Хорооллын Дахин Төлөвлөлт, Газар Зохион Байгуулалтын Төлөвлөгөө хуулах',
      order: 2,
      materials: [
        { id: 'mat-03', title: 'Газар Зохион Байгуулалтын Ерөнхий Төлөвлөгөө.docx', fileType: 'docx', fileSize: '2.9 MB', contentSummary: '4, 5, 6-р багийн хэсэгчилсэн газар дахин төлөвлөлтийн зураглал, авто зогсоолыг өргөтгөх, инженерийн шугам сүлжээ татах шаардлагыг тусгасан.' }
      ]
    },
    {
      id: 'agenda-03',
      title: '3. Орон нутгийн байгаль орчныг хамгаалах, аялал жуулчлалын бүсийн тохижилт, зэрлэг ан амьтдыг хамгаалах журам',
      order: 3,
      materials: [
        { id: 'mat-04', title: 'Байгаль орчны төлөвлөгөө 2026.pdf', fileType: 'pdf', fileSize: '3.5 MB', contentSummary: 'Хамарын хийд орчмын аялал жуулчлалын бүсийн Цэвэр орчны журам болон ундны усны эх үүсвэрт шинээр нөөц газрууд үүсгэх ажлыг санхүүжүүлэх тухай журам.' }
      ]
    }
  ],
  activeAgendaItemId: 'agenda-01',
  attendanceOpen: true,
  attendance: {},
  speakerQueue: [],
  currentSpeaker: null,
  voting: { active: false, agendaItemId: 'agenda-01', title: 'Санал хураалт', votes: {} },
  votingArchive: []
};

let serverNotifications: NotificationItem[] = [
  { id: 'notif-1', title: 'Хуралдааны тов зарлагдлаа', message: 'Сайншанд сумын ИТХ-ын Ээлжит XIV хуралдаан 2026 оны 06-р сарын 02-ны 09:00 цагт хуралдахаар товлогдлоо.', timestamp: Date.now() - 7200000, isRead: false },
  { id: 'notif-2', title: 'Шинэ материал орлоо', message: 'Төсвийн тодотгол болон Газар зохион байгуулах төлөвлөгөөний файлуудыг танилцуулга хэсэгт оруулсан байна.', timestamp: Date.now() - 3600000, isRead: false }
];

let appVersion = 1;

function getFullState(): AppState {
  return {
    version: appVersion,
    meeting: serverMeeting,
    delegates: seedDelegates.map(({ password, ...rest }: any) => rest),
    notifications: serverNotifications
  };
}

let sseClients: Response[] = [];

function broadcastState() {
  appVersion += 1;
  const dataString = `data: ${JSON.stringify(getFullState())}\n\n`;
  sseClients.forEach(client => {
    try { client.write(dataString); } catch {}
  });
}

function archiveAndCloseVoting() {
  const v = serverMeeting.voting;
  if (Object.keys(v.votes).length > 0) {
    const archiveItem: VotingArchiveItem = {
      id: `vote-archive-${Date.now()}`,
      agendaItemId: v.agendaItemId,
      title: v.title,
      completedAt: Date.now(),
      votes: { ...v.votes },
      totalPresent: Object.keys(serverMeeting.attendance).length
    };
    serverMeeting.votingArchive.push(archiveItem);
  }
  Object.keys(v.votes).forEach(repId => {
    const d = seedDelegates.find(x => x.id === repId);
    if (d) d.votesCastCount += 1;
  });
  serverMeeting.voting.active = false;
}

setInterval(() => {
  let changed = false;
  if (serverMeeting.currentSpeaker && !serverMeeting.currentSpeaker.isPaused) {
    if (serverMeeting.currentSpeaker.remainingSeconds > 0) {
      serverMeeting.currentSpeaker.remainingSeconds -= 1;
      changed = true;
    } else if (!serverMeeting.currentSpeaker.timeUpTriggered) {
      serverMeeting.currentSpeaker.timeUpTriggered = true;
      serverMeeting.currentSpeaker.isPaused = true;
      changed = true;
    }
  }
  if (serverMeeting.voting?.active) {
    if (serverMeeting.voting.remainingSeconds === undefined) {
      serverMeeting.voting.remainingSeconds = 60;
      serverMeeting.voting.duration = 60;
    }
    if (serverMeeting.voting.remainingSeconds > 0) {
      serverMeeting.voting.remainingSeconds -= 1;
      changed = true;
    } else {
      archiveAndCloseVoting();
      changed = true;
    }
  }
  if (changed) broadcastState();
}, 1000);

app.get('/api/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write(`data: ${JSON.stringify(getFullState())}\n\n`);
  sseClients.push(res);
  req.on('close', () => { sseClients = sseClients.filter(c => c !== res); });
});

app.get('/api/state', (_req: Request, res: Response) => res.json(getFullState()));

app.post('/api/login', (req: Request, res: Response) => {
  const { role, username, password } = req.body;
  if (role === 'admin') {
    if ((username || '').toLowerCase().trim() === 'admin' && password === 'admin')
      return res.json({ success: true, role: 'admin' });
    return res.status(401).json({ error: 'Админы нэвтрэх нэр эсвэл нууц үг буруу байна.' });
  }
  if (role === 'delegate') {
    const d = seedDelegates.find(x => x.username.toLowerCase() === (username || '').toLowerCase().trim());
    if (d && ((d as any).password || '123') === password)
      return res.json({ success: true, role: 'delegate', delegateId: d.id });
    return res.status(401).json({ error: 'Төлөөлөгчийн нэвтрэх нэр эсвэл нууц үг буруу байна.' });
  }
  res.status(400).json({ error: 'Буруу хүсэлт ирлээ.' });
});

app.post('/api/attendance/register', (req: Request, res: Response) => {
  const { delegateId } = req.body;
  if (!serverMeeting.attendanceOpen) return res.status(400).json({ error: 'Ирц бүртгэл хаагдсан байна.' });
  if (delegateId && seedDelegates.some(x => x.id === delegateId)) {
    serverMeeting.attendance[delegateId] = Date.now();
    const d = seedDelegates.find(x => x.id === delegateId);
    if (d) d.attendedMeetingsCount += 1;
    broadcastState();
    return res.json({ success: true });
  }
  res.status(400).json({ error: 'Хүчингүй Төлөөлөгчийн ID' });
});

app.post('/api/speaker-queue/join', (req: Request, res: Response) => {
  const { delegateId } = req.body;
  if (!delegateId || !seedDelegates.some(x => x.id === delegateId)) return res.status(400).json({ error: 'Delegate not found' });
  if (serverMeeting.speakerQueue.some(x => x.delegateId === delegateId)) return res.status(400).json({ error: 'Та аль хэдийн дараалалд орсон байна.' });
  if (serverMeeting.currentSpeaker?.delegateId === delegateId) return res.status(400).json({ error: 'Та одоо үг хэлж байна.' });
  const pastTurns = serverMeeting.speakerQueue.filter(x => x.delegateId === delegateId).length;
  const turnOfDelegate = Math.min(3, pastTurns + (serverMeeting.currentSpeaker?.delegateId === delegateId ? 2 : 1));
  serverMeeting.speakerQueue.push({ delegateId, requestTime: Date.now(), turn: turnOfDelegate });
  broadcastState();
  res.json({ success: true });
});

app.post('/api/speaker-queue/leave', (req: Request, res: Response) => {
  const { delegateId } = req.body;
  serverMeeting.speakerQueue = serverMeeting.speakerQueue.filter(x => x.delegateId !== delegateId);
  broadcastState();
  res.json({ success: true });
});

app.post('/api/vote/submit', (req: Request, res: Response) => {
  const { delegateId, choice } = req.body;
  if (!serverMeeting.voting.active) return res.status(400).json({ error: 'Идэвхтэй санал хураалт явагдаагүй байна.' });
  if (!delegateId || !seedDelegates.some(x => x.id === delegateId)) return res.status(400).json({ error: 'Төлөөлөгч олдсонгүй.' });
  if (!serverMeeting.attendance[delegateId]) return res.status(400).json({ error: 'Та эхлээд ирцээ бүртгүүлнэ үү.' });
  serverMeeting.voting.votes[delegateId] = { choice, timestamp: Date.now() };
  broadcastState();
  res.json({ success: true });
});

app.post('/api/profile/update', (req: Request, res: Response) => {
  const { delegateId, phone, email, bio } = req.body;
  const d = seedDelegates.find(x => x.id === delegateId);
  if (d) { d.phone = phone || d.phone; d.email = email || d.email; d.bio = bio || d.bio; broadcastState(); return res.json({ success: true }); }
  res.status(404).json({ error: 'Delegate not found' });
});

app.post('/api/admin/attendance/toggle', (req: Request, res: Response) => {
  serverMeeting.attendanceOpen = req.body.open;
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/meeting/status', (req: Request, res: Response) => {
  const { status } = req.body;
  serverMeeting.status = status;
  if (status === 'дууссан') { serverMeeting.attendanceOpen = false; serverMeeting.currentSpeaker = null; serverMeeting.speakerQueue = []; serverMeeting.voting.active = false; }
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/agenda/select', (req: Request, res: Response) => {
  serverMeeting.activeAgendaItemId = req.body.agendaItemId;
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/voting/start', (req: Request, res: Response) => {
  const { agendaItemId, title } = req.body;
  serverMeeting.voting = { active: true, agendaItemId, title: title || 'Санал хураалт эхэллээ', votes: {}, remainingSeconds: 60, duration: 60 };
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/voting/stop', (_req: Request, res: Response) => {
  archiveAndCloseVoting();
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/speaker/next', (_req: Request, res: Response) => {
  if (serverMeeting.speakerQueue.length > 0) {
    const next = serverMeeting.speakerQueue.shift()!;
    const duration = next.turn === 1 ? 180 : 300;
    serverMeeting.currentSpeaker = { delegateId: next.delegateId, remainingSeconds: duration, duration, isPaused: false, turn: next.turn };
  } else { serverMeeting.currentSpeaker = null; }
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/speaker/select-direct', (req: Request, res: Response) => {
  const { delegateId, turn } = req.body;
  const duration = turn === 1 ? 180 : 300;
  serverMeeting.speakerQueue = serverMeeting.speakerQueue.filter(x => x.delegateId !== delegateId);
  serverMeeting.currentSpeaker = { delegateId, remainingSeconds: duration, duration, isPaused: false, turn: turn || 1 };
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/speaker/control', (req: Request, res: Response) => {
  const { action } = req.body;
  if (serverMeeting.currentSpeaker) {
    if (action === 'play') serverMeeting.currentSpeaker.isPaused = false;
    else if (action === 'pause') serverMeeting.currentSpeaker.isPaused = true;
    else if (action === 'add_time') serverMeeting.currentSpeaker.remainingSeconds = Math.min(serverMeeting.currentSpeaker.duration + 300, serverMeeting.currentSpeaker.remainingSeconds + 60);
    else if (action === 'sub_time') serverMeeting.currentSpeaker.remainingSeconds = Math.max(0, serverMeeting.currentSpeaker.remainingSeconds - 60);
    broadcastState();
    return res.json({ success: true });
  }
  res.status(400).json({ error: 'No active speaker' });
});

app.post('/api/admin/speaker/skip', (_req: Request, res: Response) => { serverMeeting.currentSpeaker = null; broadcastState(); res.json({ success: true }); });
app.post('/api/admin/speaker/clear', (_req: Request, res: Response) => { serverMeeting.speakerQueue = []; serverMeeting.currentSpeaker = null; broadcastState(); res.json({ success: true }); });

app.post('/api/admin/delegate/reset-password', (req: Request, res: Response) => {
  const d = seedDelegates.find(x => x.id === req.body.delegateId);
  if (d) { (d as any).password = '123'; return res.json({ success: true }); }
  res.status(404).json({ error: 'Delegate not found' });
});

app.post('/api/admin/delegate/edit', (req: Request, res: Response) => {
  const { delegateId, fullName, party, district, phone, email } = req.body;
  const d = seedDelegates.find(x => x.id === delegateId);
  if (d) { d.fullName = fullName || d.fullName; d.party = party || d.party; d.district = district || d.district; d.phone = phone || d.phone; d.email = email || d.email; broadcastState(); return res.json({ success: true }); }
  res.status(404).json({ error: 'Delegate not found' });
});

app.post('/api/admin/meeting/create', (req: Request, res: Response) => {
  const { title, date, time, agenda } = req.body;
  serverMeeting = {
    id: `meeting-${Date.now()}`, title: title || 'Шинэ Хуралдаан', date: date || new Date().toISOString().split('T')[0], time: time || '09:00', status: 'идэвхтэй',
    agenda: agenda || [{ id: 'agenda-1', title: '1. Орон нутгийн зорилтот хөтөлбөрийн биелэлтийн хяналт', order: 1, materials: [] }],
    activeAgendaItemId: agenda?.[0]?.id || 'agenda-1', attendanceOpen: true, attendance: {}, speakerQueue: [], currentSpeaker: null,
    voting: { active: false, agendaItemId: agenda?.[0]?.id || 'agenda-1', title: 'Санал хураалт', votes: {} }, votingArchive: []
  };
  serverNotifications.push({ id: `notif-${Date.now()}`, title: 'Шинэ хурал нээгдлээ', message: `"${serverMeeting.title}" амжилттай үүсэж, ирцийн бүртгэл нээгдлээ.`, timestamp: Date.now(), isRead: false });
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/agenda/material/add', (req: Request, res: Response) => {
  const { agendaItemId, material } = req.body;
  const agendaItem = serverMeeting.agenda.find(ag => ag.id === agendaItemId);
  if (agendaItem) {
    const newMat = { id: `mat-${Date.now()}`, title: material.title || 'Шинэ материал.pdf', fileType: material.fileType || 'pdf', fileSize: material.fileSize || '1.2 MB', contentSummary: material.contentSummary || 'Орон нутгийн танилцуулга материал.' };
    agendaItem.materials.push(newMat);
    serverNotifications.push({ id: `notif-${Date.now()}`, title: 'Шинэ файл оруулав', message: `"${newMat.title}" нэртэй хуралдааны материал нэмэгдлээ.`, timestamp: Date.now(), isRead: false });
    broadcastState();
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Agenda not found' });
});

app.post('/api/system/reset', (_req: Request, res: Response) => {
  serverMeeting = {
    id: `meeting-14-${Date.now()}`, title: 'Сайншанд сумын ИТХ-ын Ээлжит XIV Хуралдаан', date: '2026-06-02', time: '09:00', status: 'идэвхтэй',
    agenda: [
      { id: 'agenda-01', title: '1. Сайншанд сумын 2026 оны Төсвийн тодотгол, хөгжлийн төлөвлөгөөг хэлэлцэн батлах тухай', order: 1, materials: [{ id: 'mat-01', title: 'Сайншанд сумын 2026 Төсвийн Тодотгол.pdf', fileType: 'pdf', fileSize: '4.2 MB', contentSummary: 'Нийт орлого 10.5 тэрбум төгрөг, нийт зарлага 11.2 тэрбум төгрөг.' }] },
      { id: 'agenda-02', title: '2. Сумын Хэмжээнд Гэр Хорооллын Дахин Төлөвлөлт', order: 2, materials: [] },
      { id: 'agenda-03', title: '3. Орон нутгийн байгаль орчныг хамгаалах журам', order: 3, materials: [] }
    ],
    activeAgendaItemId: 'agenda-01', attendanceOpen: true, attendance: {}, speakerQueue: [], currentSpeaker: null,
    voting: { active: false, agendaItemId: 'agenda-01', title: 'Санал хураалт', votes: {} }, votingArchive: []
  };
  broadcastState();
  res.json({ success: true });
});

export default app;
