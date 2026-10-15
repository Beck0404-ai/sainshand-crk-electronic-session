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
  { id: 'rep01', username: 'Sainshandith1', fullName: 'Ц.Чанцал', party: 'МАН', district: '1-р тойрог (1-р баг)', phone: '88832368', email: 'cchaagii73@gmail.com', bio: 'Цогбадрах Чанцал | Регистр: ЕЮ73101101 | Сайншанд сумын ЕБ-ын 2 дугаар сургуулийн Бага ангийн багш', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep02', username: 'Sainshandith2', fullName: 'Г.Саруул-Од', party: 'МАН', district: '1-р тойрог (1-р баг)', phone: '86103344', email: 'saruulod22@gmail.com', bio: 'Ганцэцэг Саруул-Од | Регистр: ЕС92031410 | Сайншанд татах хэсэг Зааварлагч машинч', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep03', username: 'Sainshandith3', fullName: 'Б.Гүндцамба', party: 'МАН', district: '1-р тойрог (1-р баг)', phone: '96530606', email: 'bb.gg_12@yahoo.com', bio: 'Батсуурь Гүндцамба | Регистр: ЕЮ89111230 | Дорноговь Нэгдсэн эмнэлэг Гэмтлийн их эмч', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep04', username: 'Sainshandith4', fullName: 'С.Батбаяр', party: 'МАН', district: '1-р тойрог (1-р баг)', phone: '99031370', email: 'baytbayar@gmail.com', bio: 'Сандагдорж Батбаяр | Регистр: УЮ67012016 | Уртын-Уул ХХК Ерөнхий инженер', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep05', username: 'Sainshandith5', fullName: 'Э.Болдхангай', party: 'МАН', district: '2-р тойрог (2-р баг)', phone: '99105921', email: 'dabholboo@gmail.com', bio: 'Энхээ Болдхангай | Регистр: ЕС84011931 | ЭЙБОЛ ХХК Захирал', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep06', username: 'Sainshandith6', fullName: 'Д.Бат-Оюун', party: 'МАН', district: '2-р тойрог (2-р баг)', phone: '96660882', email: 'ok_oyun@yahoo.com', bio: 'Доржханд Бат-Оюун | Регистр: ЕЮ79081141 | Чандмань-Илч ОНӨХХК Хяналтын инженер, мэргэжлийн зөвлөлийн нарийн бичгийн дарга', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep07', username: 'Sainshandith7', fullName: 'Б.Гомбожав', party: 'МАН', district: '2-р тойрог (2-р баг)', phone: '88884155', email: 'gombojav07@gmail.com', bio: 'Баатархүү Гомбожав | Регистр: ЕЮ94071417 | Шонхор хурд ХХК Гүйцэтгэх захирал', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep08', username: 'Sainshandith8', fullName: 'Б.Баттайван', party: 'МАН', district: '2-р тойрог (2-р баг)', phone: '90097052', email: 'Battaivan89@gmail.com', bio: 'Батболд Баттайван | Регистр: ЕЗ88121512 | Сайншанд сумын ЕБ-ын 5 дугаар сургууль Хөгжмийн багш', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep09', username: 'Sainshandith9', fullName: 'Б.Бямбацэцэг', party: 'МАН', district: '3-р тойрог (3-р баг)', phone: '99048238', email: 'byambatsetseg1212@gmail.com', bio: 'Батцэнгэл Бямбацэцэг | Регистр: ЕЮ75030108 | Сайншанд сумын Хүүхдийн 12 цэцэрлэгт эрхлэгч', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep10', username: 'Sainshandith10', fullName: 'М.Энхзаяа', party: 'МАН', district: '3-р тойрог (3-р баг)', phone: '99411406', email: 'Zaya261611@gmail.com', bio: 'Мөнхөө Энхзаяа | Регистр: ЕС91011609 | Сайншанд сумын ЗДТГ 3 дугаар багийн Засаг дарга', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep11', username: 'Sainshandith11', fullName: 'Р.Энхбаяр', party: 'МАН', district: '3-р тойрог (3-р баг)', phone: '88884960', email: 'sky.eegii@gmail.com', bio: 'Рэнчимэг Энхбаяр | Регистр: ЕК85010278 | Сайншанд сумын Засаг даргын орлогч', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep12', username: 'Sainshandith12', fullName: 'Б.Сонинбаяр', party: 'МАН', district: '3-р тойрог (3-р баг)', phone: '95091441', email: 'Lham.soninbayar@gmail.com', bio: 'Баярсайхан Сонинбаяр | Регистр: ЕЭ88101478 | Дорноговь Нэгдсэн эмнэлэг бөөр шээсний замын мэс заслын их эмч', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep13', username: 'Sainshandith13', fullName: 'Ц.Анхзул', party: 'МАН', district: '4-р тойрог (4-р баг)', phone: '99046351', email: 'ankhaa585@gmail.com', bio: 'Цэвэгбаатар Анхзул | Регистр: МК80070205 | УБТЗ-ын Замын 4-р анги Хүний нөөцийн мэргэжилтэн', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep14', username: 'Sainshandith14', fullName: 'Т.Сумрагчаа', party: 'МАН', district: '4-р тойрог (4-р баг)', phone: '99159114', email: 'sumragchaa@gmail.com', bio: 'Туяа Сумрагчаа | Регистр: ЕС81033018 | Саран хөхөө театрын хөгжимчин', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep15', username: 'Sainshandith15', fullName: 'Д.Батбаатар', party: 'МАН', district: '4-р тойрог (4-р баг)', phone: '99061364', email: 'batbaatar.dts@gmail.com', bio: 'Дашцэрэн Батбаатар | Регистр: ЕС73011511 | Сайншанд татах хэсэг Зааварлагч машинч', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep16', username: 'Sainshandith16', fullName: 'Ч.Бадамлянхуа', party: 'МАН', district: '5-р тойрог (Зүүнбаян баг)', phone: '99665078', email: 'ch.badamlynkhya@yahoo.com', bio: 'Чинзориг Бадамлянхуа | Регистр: ЕЭ88020860 | Сайншанд сумын ЗДТГ 5 дугаар багийн Засаг дарга', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep17', username: 'Sainshandith17', fullName: 'Б.Болдбаяр', party: 'МАН', district: '5-р тойрог (Зүүнбаян баг)', phone: '88130981', email: 'boldbayar1326@gmail.com', bio: 'Буд Болдбаяр | Регистр: КЮ81102616 | Зүүнбаян Соёлын төв Орон нутаг судлах танхимын ажилтан', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep18', username: 'Sainshandith18', fullName: 'Б.Жаргалсайхан', party: 'МАН', district: '5-р тойрог (Зүүнбаян баг)', phone: '88028194', email: 'jagaa0816j@gmail.com', bio: 'Батмөнх Жаргалсайхан | Регистр: ЕТ76081617 | Зүүнбаян өртөө Галт тэрэгний найруулагч', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep19', username: 'Sainshandith19', fullName: 'Т.Төгөлдөр', party: 'МАН', district: '6-р тойрог (6-р баг)', phone: '99116506', email: 'mr.tuguldur@gmail.com', bio: 'Төрбат Төгөлдөр | Регистр: ХБ85040810 | ТОБЭМ ХХК Гүйцэтгэх захирал', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep20', username: 'Sainshandith20', fullName: 'Б.Даваасүрэн', party: 'МАН', district: '6-р тойрог (6-р баг)', phone: '96066566', email: 'Davaa9606@gmail.com', bio: 'Батсүх Даваасүрэн | Регистр: ЕЙ74040104 | Агатова ӨЭМТ Ахлах сувилагч', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep21', username: 'Sainshandith21', fullName: 'Э.Уранчимэг', party: 'МАН', district: '6-р тойрог (6-р баг)', phone: '99324448', email: 'Uranaauranaa0524@gmail.com', bio: 'Энэбиш Уранчимэг | Регистр: ЕЭ81050465 | Сайншанд сумын ЗДТГ 6 дугаар багийн Засаг дарга', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep22', username: 'Sainshandith22', fullName: 'Д.Идэрмөнх', party: 'АН', district: '6-р тойрог (6-р баг)', phone: '99011363', email: 'idermunkhdim@gmail.com', bio: 'Должинхорол Идэрмөнх | Регистр: ЕЭ88090371 | Дорноговь Нэгдсэн эмнэлэг Их эмч', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep23', username: 'Sainshandith23', fullName: 'Д.Батбаатар', party: 'МАН', district: '7-р тойрог (7-р баг)', phone: '96163606', email: 'dbatbaatar1972@gmail.com', bio: 'Дамбий Батбаатар | Регистр: ЕС72091512 | Илчит тэрэгний техникч, механикч', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep24', username: 'Sainshandith24', fullName: 'Г.Өглөөбаяр', party: 'МАН', district: '7-р тойрог (7-р баг)', phone: '86114780', email: 'gugluubayar0510@gmail.com', bio: 'Гончиг Өглөөбаяр | Регистр: ЕС77051014 | УБТЗ ЭХУХ 2-р ангийн Дарга', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep25', username: 'Sainshandith25', fullName: 'Д.Баярцэцэг', party: 'МАН', district: '7-р тойрог (7-р баг)', phone: '99136445', email: 'dashbaldanbayrtsetseg8@gmail.com', bio: 'Дашбалдан Баярцэцэг | Регистр: МЗ81121464 | УБТЗ Жинчин төв Ахлах тогооч', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep26', username: 'Sainshandith26', fullName: 'М.Буяндэлгэр', party: 'МАН', district: '8-р тойрог (8-р баг)', phone: '91116043', email: 'M.Buyka0224@gmail.com', bio: 'Мөнхдаваа Буяндэлгэр | Регистр: ЕЦ93022411 | Сайншанд сумын Иргэдийн Төлөөлөгчдийн Хурлын дарга', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep27', username: 'Sainshandith27', fullName: 'О.Сэржготов', party: 'МАН', district: '8-р тойрог (8-р баг)', phone: '96807474', email: 'ps.t.agaradiya@gmail.com', bio: 'Очирбат Сэржготов | Регистр: ЕЭ69030374 | Тогоруутай нуур ХХК Захирал', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep28', username: 'Sainshandith28', fullName: 'Э.Нандинцэцэг', party: 'МАН', district: '8-р тойрог (8-р баг)', phone: '90880011', email: 'nandinzaya1403@gmail.com', bio: 'Элбэг Нандинцэцэг | Регистр: ГЮ90021905 | Энержи Парагон ХХК Ерөнхий инженер', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
  { id: 'rep29', username: 'Sainshandith29', fullName: 'В.Цагаанбилэг', party: 'МАН', district: '8-р тойрог (8-р баг)', phone: '88283858', email: 'tsagaanbilegvalya@gmail.com', bio: 'Валя Цагаанбилэг | Регистр: ПЖ91081850 | Сайншанд сумын ЕБ-ын 1 дүгээр сургуулийн Биеийн тамирын багш', password: '1234', attendedMeetingsCount: 0, votesCastCount: 0, materialNotes: {} },
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
    if (d && (d.password || '1234') === password) {
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

// Update an agenda item or add materials (Admin Tool)
app.post('/api/admin/agenda/material/add', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  const { agendaItemId, material } = await c.req.json();
  const agendaItem = serverMeeting.agenda.find(ag => ag.id === agendaItemId);
  if (agendaItem) {
    if (!agendaItem.materials) agendaItem.materials = [];
    const newMaterial = {
      id: material.id || `mat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: material.title || 'Шинэ файл.pdf',
      fileType: material.fileType || 'pdf',
      fileSize: material.fileSize || '1.2 MB',
      contentSummary: material.contentSummary || 'Орон нутгийн танилцуулга материал сумын төлөөлөгчдөд танилцуулах.',
      fileUrl: material.fileUrl || undefined,
      accessLevel: material.accessLevel || 'Зөвхөн Төлөөлөгчдөд'
    };
    agendaItem.materials.push(newMaterial);
    
    serverNotifications.push({
      id: `notif-${Date.now()}`,
      title: 'Шинэ файл оруулав',
      message: `${agendaItem.title} хэлэлцэх асуудалд "${newMaterial.title}" нэртэй хуралдааны материал нэмэгдлээ.`,
      timestamp: Date.now(),
      isRead: false
    });
    
    appVersion += 1;
    await saveStateToDB();
    return c.json({ success: true, material: newMaterial });
  } else {
    return c.json({ error: 'Асуудал олдсонгүй' }, 404);
  }
});

// Delete a material from an agenda item (Admin Tool)
app.post('/api/admin/agenda/material/delete', async (c) => {
  if (!serverMeeting) return c.json({ error: 'Идэвхтэй хурал байхгүй байна.' }, 400);
  const { agendaItemId, materialId } = await c.req.json();
  const agendaItem = serverMeeting.agenda.find(ag => ag.id === agendaItemId);
  if (agendaItem && agendaItem.materials) {
    agendaItem.materials = agendaItem.materials.filter(m => m.id !== materialId);
    appVersion += 1;
    await saveStateToDB();
    return c.json({ success: true });
  } else {
    return c.json({ error: 'Материал эсвэл асуудал олдсонгүй' }, 404);
  }
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
    d.password = '1234';
    appVersion += 1;
    await saveStateToDB();
    return c.json({ success: true });
  }
  return c.json({ error: 'Delegate not found' }, 404);
});

app.get('/api/admin/delegate/:id/credentials', async (c) => {
  const d = seedDelegates.find(x => x.id === c.req.param('id'));
  if (!d) return c.json({ error: 'Олдсонгүй' }, 404);
  return c.json({ username: d.username, password: d.password || '1234' });
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
