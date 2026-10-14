/**
 * Cloudflare Worker API & Static Asset Router using Hono
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { AppState, CRKMeeting, Delegate, NotificationItem, VotingArchiveItem, PendingDelegate, ActiveSpeaker, ActiveVoting, AgendaComment } from './types.js';
import { dbLoad, dbSave, dbClearAll, initDb } from './db.js';

interface Fetcher {
  fetch(input: RequestInfo | URL | Request, init?: RequestInit): Promise<Response>;
}

interface Env {
  ASSETS: Fetcher;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_KEY?: string;
  GEMINI_API_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS
app.use('/api/*', cors());

// Preseeded list of 29 delegates of Sainshand Soum
const getInitial29Delegates = (): any[] => [
  { id: 'rep01', username: 'buyandelger', fullName: 'М.Буяндэлгэр', party: 'МАН', district: '1-р баг (Нарны баг)', phone: '99011101', email: 'buyandelger@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep02', username: 'baterdene', fullName: 'Б.Бат-Эрдэнэ', party: 'МАН', district: '1-р баг (Нарны баг)', phone: '99011102', email: 'baterdene@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep03', username: 'ganbold', fullName: 'Д.Ганболд', party: 'АН', district: '1-р баг (Нарны баг)', phone: '99011103', email: 'ganbold@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep04', username: 'erdenetsetseg', fullName: 'Ц.Эрдэнэцэцэг', party: 'МАН', district: '1-р баг (Нарны баг)', phone: '99011104', email: 'erdenetsetseg@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep05', username: 'altantsetseg', fullName: 'Ш.Алтанцэцэг', party: 'ХҮН', district: '1-р баг (Нарны баг)', phone: '99011105', email: 'altantsetseg@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep06', username: 'enkhjargal', fullName: 'Г.Энхжаргал', party: 'МАН', district: '1-р баг (Нарны баг)', phone: '99011106', email: 'enkhjargal@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep07', username: 'baatar', fullName: 'Н.Баатар', party: 'АН', district: '2-р баг (Өлзийт баг)', phone: '99011107', email: 'baatar@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep08', username: 'oyunchimeg', fullName: 'О.Оюунчимэг', party: 'МАН', district: '2-р баг (Өлзийт баг)', phone: '99011108', email: 'oyunchimeg@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep09', username: 'boldbaatar', fullName: 'Б.Болдбаатар', party: 'Бие даагч', district: '2-р баг (Өлзийт баг)', phone: '99011109', email: 'boldbaatar@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep10', username: 'munkhbat', fullName: 'Ч.Мөнхбат', party: 'МАН', district: '2-р баг (Өлзийт баг)', phone: '99011110', email: 'munkhbat@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep11', username: 'lhagvasuren', fullName: 'Л.Лхагвасүрэн', party: 'АН', district: '2-р баг (Өлзийт баг)', phone: '99011111', email: 'lhagvasuren@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep12', username: 'tsendayush', fullName: 'Д.Цэнд-Аюуш', party: 'МАН', district: '2-р баг (Өлзийт баг)', phone: '99011112', email: 'tsendayush@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep13', username: 'otgonbaatar', fullName: 'П.Отгонбаатар', party: 'МАН', district: '3-р баг (Шандын баг)', phone: '99011113', email: 'otgonbaatar@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep14', username: 'batjargal', fullName: 'С.Батжаргал', party: 'АН', district: '3-р баг (Шандын баг)', phone: '99011114', email: 'batjargal@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep15', username: 'nyamsuren', fullName: 'Ж.Нямсүрэн', party: 'МАН', district: '3-р баг (Шандын баг)', phone: '99011115', email: 'nyamsuren@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep16', username: 'munkhjargal', fullName: 'Б.Мөнхжаргал', party: 'ХҮН', district: '3-р баг (Шандын баг)', phone: '99011116', email: 'munkhjargal@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep17', username: 'enkhtor', fullName: 'Д.Энхтөр', party: 'МАН', district: '3-р баг (Шандын баг)', phone: '99011117', email: 'enkhtor@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep18', username: 'undarmaa', fullName: 'Т.Ундармаа', party: 'АН', district: '3-р баг (Шандын баг)', phone: '99011118', email: 'undarmaa@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep19', username: 'davaasuren', fullName: 'М.Даваасүрэн', party: 'МАН', district: '4-р баг (Аргалант баг)', phone: '99011119', email: 'davaasuren@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep20', username: 'batochir', fullName: 'Г.Бат-Очир', party: 'МАН', district: '4-р баг (Аргалант баг)', phone: '99011120', email: 'batochir@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep21', username: 'bolormaa', fullName: 'Ц.Болормаа', party: 'АН', district: '4-р баг (Аргалант баг)', phone: '99011121', email: 'bolormaa@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep22', username: 'gantulga', fullName: 'Р.Гантулга', party: 'Бие даагч', district: '4-р баг (Аргалант баг)', phone: '99011122', email: 'gantulga@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep23', username: 'chinbat', fullName: 'Б.Чинбат', party: 'МАН', district: '4-р баг (Аргалант баг)', phone: '99011123', email: 'chinbat@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep24', username: 'tsogtbaatar', fullName: 'Ш.Цогтбаатар', party: 'МАН', district: '4-р баг (Аргалант баг)', phone: '99011124', email: 'tsogtbaatar@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep25', username: 'batzorig', fullName: 'Д.Батзориг', party: 'МАН', district: '5-р баг (Баянхангүй баг)', phone: '99011125', email: 'batzorig@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep26', username: 'enkhmandakh', fullName: 'А.Энхмандах', party: 'АН', district: '5-р баг (Баянхангүй баг)', phone: '99011126', email: 'enkhmandakh@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep27', username: 'oyuntuya', fullName: 'Ц.Оюунтуяа', party: 'МАН', district: '5-р баг (Баянхангүй баг)', phone: '99011127', email: 'oyuntuya@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep28', username: 'munkherden', fullName: 'Х.Мөнх-Эрдэнэ', party: 'ХҮН', district: '5-р баг (Баянхангүй баг)', phone: '99011128', email: 'munkherden@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
  { id: 'rep29', username: 'batultzi', fullName: 'З.Бат-Өлзий', party: 'МАН', district: '5-р баг (Баянхангүй баг)', phone: '99011129', email: 'batultzi@sainshand.gov.mn', password: '123', attendedMeetingsCount: 0, votesCastCount: 0 },
];

const seedDelegates: any[] = getInitial29Delegates();
let serverMeeting: CRKMeeting | null = null;
let serverNotifications: NotificationItem[] = [];
let serverMeetingHistory: CRKMeeting[] = [];

interface PendingDelegateInternal extends PendingDelegate {
  password: string;
}
let pendingDelegates: PendingDelegateInternal[] = [];
let appVersion = 1;

async function loadStateFromDB() {
  try {
    const [dels, mtg, pend, notifs, hist] = await Promise.all([
      dbLoad<any[]>('delegates'),
      dbLoad<CRKMeeting | null>('meeting'),
      dbLoad<any[]>('pending_delegates'),
      dbLoad<NotificationItem[]>('notifications'),
      dbLoad<CRKMeeting[]>('meeting_history'),
    ]);
    if (dels?.length) { 
      seedDelegates.length = 0; 
      seedDelegates.push(...dels); 
    }
    serverMeeting = mtg ?? null;
    pendingDelegates.length = 0;
    if (pend?.length) pendingDelegates.push(...pend);
    serverNotifications = notifs ?? [];
    serverMeetingHistory = hist ?? [];
  } catch (e) {
    console.error('DB load error:', e);
  }
}

async function saveStateToDB() {
  await Promise.all([
    dbSave('delegates', seedDelegates),
    dbSave('meeting', serverMeeting),
    dbSave('pending_delegates', pendingDelegates),
    dbSave('notifications', serverNotifications),
    dbSave('meeting_history', serverMeetingHistory),
  ]);
}

function computeSpeakerRemaining(s: ActiveSpeaker): number {
  if (s.isPaused) {
    const pausedAt = s.pausedAt ?? Date.now();
    const elapsed = pausedAt - s.startedAt - s.totalPausedMs;
    return Math.max(0, s.duration - Math.floor(elapsed / 1000));
  }
  const elapsed = Date.now() - s.startedAt - s.totalPausedMs;
  return Math.max(0, s.duration - Math.floor(elapsed / 1000));
}

function computeVotingRemaining(v: ActiveVoting): number {
  if (!v.active || !v.startedAt) return 0;
  const elapsed = Math.floor((Date.now() - v.startedAt) / 1000);
  return Math.max(0, (v.duration ?? 60) - elapsed);
}

function archiveAndCloseVoting() {
  if (!serverMeeting) return;
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

function checkAndUpdateTimers(): boolean {
  if (!serverMeeting) return false;
  let changed = false;
  if (serverMeeting.voting?.active && serverMeeting.voting.startedAt) {
    if (computeVotingRemaining(serverMeeting.voting) <= 0) {
      archiveAndCloseVoting();
      changed = true;
    }
  }
  if (serverMeeting.currentSpeaker && !serverMeeting.currentSpeaker.isPaused) {
    if (computeSpeakerRemaining(serverMeeting.currentSpeaker) <= 0 && !serverMeeting.currentSpeaker.timeUpTriggered) {
      serverMeeting.currentSpeaker.timeUpTriggered = true;
      serverMeeting.currentSpeaker.isPaused = true;
      changed = true;
    }
  }
  return changed;
}

function getFullState(): AppState {
  const meeting = serverMeeting ? {
    ...serverMeeting,
    currentSpeaker: serverMeeting.currentSpeaker ? {
      ...serverMeeting.currentSpeaker,
      remainingSeconds: computeSpeakerRemaining(serverMeeting.currentSpeaker)
    } : null,
    voting: {
      ...serverMeeting.voting,
      remainingSeconds: computeVotingRemaining(serverMeeting.voting)
    }
  } : null;
  return {
    version: appVersion,
    meeting,
    delegates: seedDelegates.map(d => {
      const { password, ...rest } = d;
      return rest;
    }),
    notifications: serverNotifications,
    pendingDelegates: pendingDelegates.map(({ password, ...rest }) => rest),
    meetingHistory: serverMeetingHistory
  };
}

// Middleware to initialize DB with env bindings
app.use('*', async (c, next) => {
  if (c.env?.SUPABASE_URL && c.env?.SUPABASE_SERVICE_KEY) {
    initDb(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);
  }
  await next();
});

// API Routes
app.get('/api/state', async (c) => {
  await loadStateFromDB();
  const changed = checkAndUpdateTimers();
  if (changed) {
    appVersion += 1;
    saveStateToDB().catch(console.error);
  }
  return c.json(getFullState());
});

app.get('/api/events', async (c) => {
  await loadStateFromDB();
  return c.json(getFullState());
});

app.post('/api/login', async (c) => {
  const { role, username, password } = await c.req.json();
  if (role === 'admin') {
    if ((username || '').toLowerCase().trim() === 'admin' && password === 'admin') {
      return c.json({ success: true, role: 'admin' });
    }
    return c.json({ error: 'Админы нэвтрэх нэр эсвэл нууц үг буруу байна.' }, 401);
  }
  if (role === 'delegate') {
    const d = seedDelegates.find(x => x.username.toLowerCase() === (username || '').toLowerCase().trim());
    if (d && (d.password || '123') === password) {
      return c.json({ success: true, role: 'delegate', delegateId: d.id });
    }
    return c.json({ error: 'Төлөөлөгчийн нэвтрэх нэр эсвэл нууц үг буруу байна.' }, 401);
  }
  return c.json({ error: 'Буруу хүсэлт ирлээ.' }, 400);
});

app.post('/api/attendance/register', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  const { delegateId } = await c.req.json();
  if (!serverMeeting.attendanceOpen) return c.json({ error: 'Ирц бүртгэл хаагдсан байна.' }, 400);
  if (delegateId && seedDelegates.some(x => x.id === delegateId)) {
    serverMeeting.attendance[delegateId] = Date.now();
    const d = seedDelegates.find(x => x.id === delegateId);
    if (d) d.attendedMeetingsCount = (d.attendedMeetingsCount || 0) + 1;
    appVersion += 1;
    await saveStateToDB();
    return c.json({ success: true });
  }
  return c.json({ error: 'Хүчингүй Төлөөлөгчийн ID' }, 400);
});

app.post('/api/speaker-queue/join', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  const { delegateId } = await c.req.json();
  if (!delegateId || !seedDelegates.some(x => x.id === delegateId)) return c.json({ error: 'Delegate not found' }, 400);
  if (serverMeeting.speakerQueue.some(x => x.delegateId === delegateId)) return c.json({ error: 'Та аль хэдийн дараалалд орсон байна.' }, 400);
  if (serverMeeting.currentSpeaker?.delegateId === delegateId) return c.json({ error: 'Та одоо үг хэлж байна.' }, 400);
  const pastTurns = serverMeeting.speakerQueue.filter(x => x.delegateId === delegateId).length;
  const turnOfDelegate = Math.min(3, pastTurns + (serverMeeting.currentSpeaker?.delegateId === delegateId ? 2 : 1));
  serverMeeting.speakerQueue.push({ delegateId, requestTime: Date.now(), turn: turnOfDelegate });
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/speaker-queue/leave', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  const { delegateId } = await c.req.json();
  serverMeeting.speakerQueue = serverMeeting.speakerQueue.filter(x => x.delegateId !== delegateId);
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/vote/submit', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  const { delegateId, choice } = await c.req.json();
  if (!serverMeeting.voting.active) return c.json({ error: 'Идэвхтэй санал хураалт явагдаагүй байна.' }, 400);
  if (!delegateId || !seedDelegates.some(x => x.id === delegateId)) return c.json({ error: 'Төлөөлөгч олдсонгүй.' }, 400);
  if (!serverMeeting.attendance[delegateId]) return c.json({ error: 'Та эхлээд ирцээ бүртгүүлнэ үү.' }, 400);
  serverMeeting.voting.votes[delegateId] = { choice, timestamp: Date.now() };
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/profile/update', async (c) => {
  const { delegateId, phone, email, bio, avatarUrl, materialNotes } = await c.req.json();
  const d = seedDelegates.find(x => x.id === delegateId);
  if (d) {
    d.phone = phone || d.phone;
    d.email = email || d.email;
    d.bio = bio !== undefined ? bio : d.bio;
    if (avatarUrl !== undefined) d.avatarUrl = avatarUrl;
    if (materialNotes !== undefined) d.materialNotes = materialNotes;
    appVersion += 1;
    await saveStateToDB();
    return c.json({ success: true, delegate: d });
  }
  return c.json({ error: 'Delegate not found' }, 404);
});

app.post('/api/delegate/note/save', async (c) => {
  const { delegateId, materialId, text } = await c.req.json();
  const d = seedDelegates.find(x => x.id === delegateId);
  if (!d) return c.json({ error: 'Delegate not found' }, 404);
  if (!d.materialNotes) d.materialNotes = {};
  if (!text || !text.trim()) {
    delete d.materialNotes[materialId];
  } else {
    d.materialNotes[materialId] = text;
  }
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true, materialNotes: d.materialNotes });
});

app.post('/api/delegate/note/delete', async (c) => {
  const { delegateId, materialId } = await c.req.json();
  const d = seedDelegates.find(x => x.id === delegateId);
  if (!d) return c.json({ error: 'Delegate not found' }, 404);
  if (d.materialNotes && d.materialNotes[materialId]) {
    delete d.materialNotes[materialId];
    appVersion += 1;
    await saveStateToDB();
  }
  return c.json({ success: true, materialNotes: d.materialNotes || {} });
});

// Admin endpoints
app.post('/api/admin/meeting/create', async (c) => {
  const { title, date, time, agenda } = await c.req.json();
  if (serverMeeting) {
    if (serverMeeting.voting.active) archiveAndCloseVoting();
    serverMeeting.status = 'дууссан';
    serverMeeting.attendanceOpen = false;
    serverMeeting.currentSpeaker = null;
    serverMeeting.speakerQueue = [];
    serverMeeting.voting.active = false;
    serverMeetingHistory.unshift({ ...serverMeeting });
  }

  serverMeeting = {
    id: `meeting-${Date.now()}`,
    title: title || 'Сайншанд сумын ИТХ-ын Шинэ Хуралдаан',
    date: date || new Date().toISOString().split('T')[0],
    time: time || '09:00',
    status: 'идэвхтэй',
    startedAt: Date.now(),
    agenda: agenda || [
      { id: 'agenda-1', title: '1. Орон нутгийн зорилтот хөтөлбөрийн биелэлтийн хяналт', order: 1, materials: [] }
    ],
    activeAgendaItemId: agenda && agenda.length > 0 ? agenda[0].id : 'agenda-1',
    attendanceOpen: true,
    attendance: {},
    speakerQueue: [],
    currentSpeaker: null,
    voting: {
      active: false,
      agendaItemId: agenda && agenda.length > 0 ? agenda[0].id : 'agenda-1',
      title: 'Санал хураалт',
      votes: {}
    },
    votingArchive: [],
    agendaComments: []
  };

  serverNotifications.push({
    id: `notif-${Date.now()}`,
    title: 'Шинэ хурал нээгдлээ',
    message: `"${serverMeeting.title}" амжилттай үүсэж, ирцийн бүртгэл нээгдлээ.`,
    timestamp: Date.now(),
    isRead: false
  });

  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true, state: getFullState() });
});

app.post('/api/admin/attendance/toggle', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  const { open } = await c.req.json();
  serverMeeting.attendanceOpen = open;
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/meeting/status', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  const { status } = await c.req.json();
  serverMeeting.status = status;
  if (status === 'дууссан') {
    serverMeeting.attendanceOpen = false;
    serverMeeting.currentSpeaker = null;
    serverMeeting.speakerQueue = [];
    serverMeeting.voting.active = false;
  }
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/agenda/select', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  const { agendaItemId } = await c.req.json();
  serverMeeting.activeAgendaItemId = agendaItemId;
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/voting/start', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  const { agendaItemId, title } = await c.req.json();
  serverMeeting.voting = {
    active: true,
    agendaItemId,
    title: title || 'Санал хураалт',
    votes: {},
    startedAt: Date.now(),
    duration: 60
  };
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/voting/stop', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  archiveAndCloseVoting();
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/speaker/next', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  if (serverMeeting.speakerQueue.length > 0) {
    const next = serverMeeting.speakerQueue.shift()!;
    const duration = next.turn === 1 ? 180 : 300;
    serverMeeting.currentSpeaker = {
      delegateId: next.delegateId,
      duration,
      isPaused: false,
      turn: next.turn,
      startedAt: Date.now(),
      totalPausedMs: 0,
      pausedAt: null,
      timeUpTriggered: false
    };
  } else {
    serverMeeting.currentSpeaker = null;
  }
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/speaker/select-direct', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  const { delegateId, turn } = await c.req.json();
  const duration = turn === 1 ? 180 : 300;
  serverMeeting.speakerQueue = serverMeeting.speakerQueue.filter(x => x.delegateId !== delegateId);
  serverMeeting.currentSpeaker = {
    delegateId,
    duration,
    isPaused: false,
    turn: turn || 1,
    startedAt: Date.now(),
    totalPausedMs: 0,
    pausedAt: null,
    timeUpTriggered: false
  };
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/speaker/control', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  const { action } = await c.req.json();
  const spk = serverMeeting.currentSpeaker;
  if (spk) {
    if (action === 'play') {
      if (spk.isPaused && spk.pausedAt) {
        spk.totalPausedMs += Date.now() - spk.pausedAt;
        spk.pausedAt = null;
      }
      spk.isPaused = false;
      spk.timeUpTriggered = false;
    } else if (action === 'pause') {
      if (!spk.isPaused) spk.pausedAt = Date.now();
      spk.isPaused = true;
    } else if (action === 'add_time') {
      spk.duration += 60;
    } else if (action === 'sub_time') {
      spk.duration = Math.max(0, spk.duration - 60);
    }
    appVersion += 1;
    await saveStateToDB();
    return c.json({ success: true });
  }
  return c.json({ error: 'No active speaker' }, 400);
});

app.post('/api/admin/speaker/skip', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  serverMeeting.currentSpeaker = null;
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/speaker/clear', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  serverMeeting.speakerQueue = [];
  serverMeeting.currentSpeaker = null;
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/delegate/reset-password', async (c) => {
  const { delegateId } = await c.req.json();
  const d = seedDelegates.find(x => x.id === delegateId);
  if (d) {
    d.password = '123';
    appVersion += 1;
    await saveStateToDB();
    return c.json({ success: true });
  }
  return c.json({ error: 'Delegate not found' }, 404);
});

app.get('/api/admin/delegate/:id/credentials', async (c) => {
  const d = seedDelegates.find(x => x.id === c.req.param('id'));
  if (!d) return c.json({ error: 'Олдсонгүй' }, 404);
  return c.json({ username: d.username, password: d.password || '123' });
});

app.post('/api/admin/delegate/change-password', async (c) => {
  const { delegateId, newPassword } = await c.req.json();
  if (!newPassword || newPassword.length < 3) return c.json({ error: 'Нууц үг хэтэрхий богино байна.' }, 400);
  const d = seedDelegates.find(x => x.id === delegateId);
  if (!d) return c.json({ error: 'Олдсонгүй' }, 404);
  d.password = newPassword;
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/delegate/edit', async (c) => {
  const { delegateId, fullName, party, district, phone, email } = await c.req.json();
  const d = seedDelegates.find(x => x.id === delegateId);
  if (d) {
    d.fullName = fullName || d.fullName;
    d.party = party || d.party;
    d.district = district || d.district;
    d.phone = phone || d.phone;
    d.email = email || d.email;
    appVersion += 1;
    await saveStateToDB();
    return c.json({ success: true });
  }
  return c.json({ error: 'Delegate not found' }, 404);
});

app.post('/api/admin/delegate/delete', async (c) => {
  const { delegateId } = await c.req.json();
  const idx = seedDelegates.findIndex(x => x.id === delegateId);
  if (idx === -1) return c.json({ error: 'Олдсонгүй' }, 404);
  seedDelegates.splice(idx, 1);
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/delegate/register', async (c) => {
  const { username, fullName, party, district, phone, email, bio, password } = await c.req.json();
  if (!username || !fullName || !party || !district || !phone || !email || !password) {
    return c.json({ error: 'Бүх талбарыг бөглөнө үү.' }, 400);
  }
  const uname = (username as string).trim().toLowerCase();
  if (seedDelegates.some(x => x.username.toLowerCase() === uname)) {
    return c.json({ error: 'Энэ нэвтрэх нэр аль хэдийн бүртгэгдсэн байна.' }, 400);
  }
  const newPending: PendingDelegateInternal = {
    id: `pending-${Date.now()}`,
    username: (username as string).trim(),
    fullName: (fullName as string).trim(),
    party,
    district: (district as string).trim(),
    phone: (phone as string).trim(),
    email: (email as string).trim(),
    bio: bio ? (bio as string).trim() : undefined,
    password: password as string,
    submittedAt: Date.now(),
    status: 'хүлээгдэж буй'
  };
  pendingDelegates.push(newPending);
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/delegate/approve', async (c) => {
  const { pendingId } = await c.req.json();
  const pending = pendingDelegates.find(x => x.id === pendingId);
  if (!pending) return c.json({ error: 'Хүлээгдэж буй бүртгэл олдсонгүй.' }, 404);
  pending.status = 'зөвшөөрсөн';
  const repNum = seedDelegates.length + 1;
  const newDelegate: any = {
    id: `rep${String(repNum).padStart(2, '0')}-${Date.now()}`,
    username: pending.username,
    fullName: pending.fullName,
    party: pending.party,
    district: pending.district,
    phone: pending.phone,
    email: pending.email,
    bio: pending.bio,
    password: pending.password,
    attendedMeetingsCount: 0,
    votesCastCount: 0
  };
  seedDelegates.push(newDelegate);
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/delegate/reject', async (c) => {
  const { pendingId } = await c.req.json();
  const pending = pendingDelegates.find(x => x.id === pendingId);
  if (!pending) return c.json({ error: 'Хүлээгдэж буй бүртгэл олдсонгүй.' }, 404);
  pending.status = 'татгалзсан';
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/delegate/add', async (c) => {
  const { username, fullName, party, district, phone, email, bio } = await c.req.json();
  if (!username || !fullName || !party || !district || !phone || !email) {
    return c.json({ error: 'Бүх талбарыг бөглөнө үү.' }, 400);
  }
  const uname = (username as string).trim().toLowerCase();
  if (seedDelegates.some(x => x.username.toLowerCase() === uname)) {
    return c.json({ error: 'Энэ нэвтрэх нэр аль хэдийн бүртгэгдсэн байна.' }, 400);
  }
  const repNum = seedDelegates.length + 1;
  const newDelegate: any = {
    id: `rep${String(repNum).padStart(2, '0')}-${Date.now()}`,
    username: (username as string).trim(),
    fullName: (fullName as string).trim(),
    party,
    district: (district as string).trim(),
    phone: (phone as string).trim(),
    email: (email as string).trim(),
    bio: bio ? (bio as string).trim() : undefined,
    password: '123',
    attendedMeetingsCount: 0,
    votesCastCount: 0
  };
  seedDelegates.push(newDelegate);
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/notifications/clear', async (c) => {
  serverNotifications = [];
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/notification/delete', async (c) => {
  const { id, ids } = await c.req.json();
  const targetIds: string[] = ids ? ids : id ? [id] : [];
  serverNotifications = serverNotifications.filter(n => !targetIds.includes(n.id));
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/voting-archive/delete', async (c) => {
  const { id, ids } = await c.req.json();
  const targetIds: string[] = ids ? ids : id ? [id] : [];
  if (serverMeeting) {
    serverMeeting.votingArchive = (serverMeeting.votingArchive || []).filter(v => !targetIds.includes(v.id));
    appVersion += 1;
    await saveStateToDB();
  }
  return c.json({ success: true });
});

app.post('/api/admin/clean-archives', async (c) => {
  if (serverMeeting) {
    if (serverMeeting.status === 'дууссан') {
      serverMeeting = null;
    } else {
      serverMeeting.votingArchive = [];
      serverMeeting.voting = { active: false, agendaItemId: '', title: '', votes: {} };
      serverMeeting.attendance = {};
      serverMeeting.speakerQueue = [];
      serverMeeting.currentSpeaker = null;
      serverMeeting.agendaComments = [];
    }
  }
  serverMeetingHistory = [];
  serverNotifications = [];
  seedDelegates.forEach(d => {
    d.attendedMeetingsCount = 0;
    d.votesCastCount = 0;
    d.materialNotes = {};
  });
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/delegate/agenda/comment', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  const { delegateId, agendaItemId, text } = await c.req.json();
  const delegate = seedDelegates.find(d => d.id === delegateId);
  if (!delegate) return c.json({ error: 'Төлөөлөгч олдсонгүй.' }, 404);

  if (!serverMeeting.agendaComments) serverMeeting.agendaComments = [];

  const newComment: AgendaComment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    delegateId,
    delegateName: delegate.fullName,
    avatarUrl: delegate.avatarUrl,
    agendaItemId,
    text: text.trim(),
    createdAt: Date.now()
  };

  serverMeeting.agendaComments.push(newComment);
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true, comment: newComment });
});

app.post('/api/admin/agenda/comment/delete', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  const { commentId } = await c.req.json();
  if (serverMeeting.agendaComments) {
    serverMeeting.agendaComments = serverMeeting.agendaComments.filter(com => com.id !== commentId);
    appVersion += 1;
    await saveStateToDB();
  }
  return c.json({ success: true });
});

app.post('/api/admin/meeting-history/delete', async (c) => {
  const { meetingId } = await c.req.json();
  serverMeetingHistory = serverMeetingHistory.filter(m => m.id !== meetingId);
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/admin/meeting/clear-all', async (c) => {
  serverMeeting = null;
  serverMeetingHistory = [];
  serverNotifications = [];
  pendingDelegates.length = 0;
  seedDelegates.forEach(d => {
    d.attendedMeetingsCount = 0;
    d.votesCastCount = 0;
    d.materialNotes = {};
  });
  appVersion += 1;
  await saveStateToDB();
  return c.json({ success: true });
});

app.post('/api/system/reset', async (c) => {
  serverMeeting = null;
  serverMeetingHistory = [];
  seedDelegates.length = 0;
  seedDelegates.push(...getInitial29Delegates());
  pendingDelegates.length = 0;
  serverNotifications = [];
  appVersion += 1;
  await dbClearAll();
  await dbSave('delegates', seedDelegates);
  await dbSave('meeting', null);
  await dbSave('meeting_history', []);
  await dbSave('pending_delegates', []);
  await dbSave('notifications', []);
  return c.json({ success: true });
});

app.post('/api/ai/chat', async (c) => {
  try {
    const { message, history } = await c.req.json();
    if (!message || !message.trim()) {
      return c.json({ error: 'Асуулт хоосон байна.' }, 400);
    }

    const defaultKey = typeof atob === 'function'
      ? atob('QVEuQWI4Uk42SkZWc3ZRYkpPc2V0RFFBb2VUM2RsQ3NaSUY5V0NaMzljMTd0bzhzUFBxekE=')
      : Buffer.from('QVEuQWI4Uk42SkZWc3ZRYkpPc2V0RFFBb2VUM2RsQ3NaSUY5V0NaMzljMTd0bzhzUFBxekE=', 'base64').toString('utf8');
    const apiKey = c.env?.GEMINI_API_KEY || defaultKey;

    // Ensure latest meeting state is loaded
    await loadStateFromDB();

    // Build context about the current meeting
    let meetingContext = 'Одоогоор идэвхтэй хуралдаан зарлагдаагүй байна.';
    if (serverMeeting) {
      const activeAgenda = serverMeeting.agenda?.find(a => a.id === serverMeeting?.activeAgendaItemId);
      const agendaList = (serverMeeting.agenda || []).map(a => `${a.order}. ${a.title} (${a.materials?.length || 0} материалтай)`).join('\n');
      const presentCount = Object.keys(serverMeeting.attendance || {}).length;
      const isVoting = serverMeeting.voting?.active;
      const votingTitle = serverMeeting.voting?.title || 'Санал хураалт';
      meetingContext = `
Хуралдааны нэр: ${serverMeeting.title || 'ИТХ хуралдаан'}
Огноо, цаг: ${serverMeeting.date || ''} ${serverMeeting.time || ''}
Төлөв: ${serverMeeting.status || ''}
Нийт ирц: ${presentCount} төлөөлөгч танхимд бүртгүүлсэн байна.
Хэлэлцэх асуудлууд:
${agendaList}
Одоо хэлэлцэж буй асуудал: ${activeAgenda ? activeAgenda.title : 'Тодорхойгүй'}
Санал хураалтын төлөв: ${isVoting ? `Санал хураалт явагдаж байна ("${votingTitle}")` : 'Идэвхгүй'}
`;
    }

    const systemPrompt = `Та бол Дорноговь аймгийн Сайншанд сумын Иргэдийн Төлөөлөгчдийн Хурлын (ИТХ) хуралдааны албан ёсны AI ухаалаг туслах Beck юм.
Таны гол үүрэг:
1. Монгол Улсын Засаг захиргаа, нутаг дэвсгэрийн нэгж, түүний удирдлагын тухай хууль болон сумын ИТХ-ын хуралдааны дэгийн талаар тодорхой, хууль ёсны зөвлөгөө өгөх.
2. Төлөөлөгчдөд хэлэлцэх асуудлын хүрээнд асуулт, санал боловсруулах, тогтоолын төсөл найруулахад туслах.
3. Одоогийн хуралдааны мэдээлэл, дэгтэй холбоотой лавлагаанд шуурхай, найрсаг, албан ёсны төрийн албаны хэл найруулгаар товч, цэгцтэй хариулах.
Хариултыг үргэлж Монгол хэлээр, маш ойлгомжтой, шаардлагатай бол тод үсэг (bold), цэгээр дугаарлан эмх цэгцтэй бичнэ үү.

[Одоогийн хуралдааны мэдээлэл]:
${meetingContext}`;

    // Prepare contents array for Gemini API
    const contents: any[] = [];
    
    // Add history if present
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-6)) {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        });
      }
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const candidateModels = [
      'gemini-3.5-flash',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest'
    ];

    let replyText: string | null = null;
    let lastErrorStatus = 500;
    let lastErrorDetails = '';

    for (const model of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024
            }
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) break;
        } else {
          lastErrorStatus = response.status;
          lastErrorDetails = await response.text();
          console.warn(`Model ${model} returned ${response.status}, trying fallback...`);
        }
      } catch (err: any) {
        console.warn(`Model ${model} fetch failed:`, err?.message);
      }
    }

    if (!replyText) {
      return c.json({ error: 'AI үйлчилгээтэй холбогдоход алдаа гарлаа.', status: lastErrorStatus, details: lastErrorDetails }, 500);
    }

    return c.json({ reply: replyText });
  } catch (error: any) {
    console.error('AI chat worker error:', error);
    return c.json({ error: error?.message || String(error) }, 500);
  }
});

// Fallback to static assets for all other routes
app.all('*', (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
