import express, { Request, Response } from 'express';
import { AppState, CRKMeeting, Delegate, NotificationItem, VotingArchiveItem, PendingDelegate, ActiveSpeaker, ActiveVoting } from '../src/types.js';
import { dbLoad, dbSave } from '../src/db.js';

const app = express();
app.use(express.json({ limit: '8mb' }));

const seedDelegates: any[] = [];

interface PendingDelegateInternal extends PendingDelegate {
  password: string;
}

let pendingDelegates: PendingDelegateInternal[] = [];

let serverMeeting: CRKMeeting | null = null;

let serverNotifications: NotificationItem[] = [];

let appVersion = 1;

async function loadStateFromDB() {
  try {
    const [dels, mtg, pend, notifs] = await Promise.all([
      dbLoad<any[]>('delegates'),
      dbLoad<CRKMeeting | null>('meeting'),
      dbLoad<any[]>('pending_delegates'),
      dbLoad<NotificationItem[]>('notifications'),
    ]);
    if (dels?.length) { seedDelegates.length = 0; seedDelegates.push(...dels); }
    if (mtg !== null) serverMeeting = mtg;
    if (pend?.length) { pendingDelegates.length = 0; pendingDelegates.push(...pend); }
    if (notifs !== null) serverNotifications = notifs ?? [];
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
  ]);
}

// Ensure DB state is loaded once per cold start
let _initPromise: Promise<void> | null = null;
app.use((_req, _res, next) => {
  if (!_initPromise) _initPromise = loadStateFromDB();
  _initPromise.then(next).catch(next);
});

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
    delegates: seedDelegates.map(({ password, ...rest }: any) => rest),
    notifications: serverNotifications,
    pendingDelegates: pendingDelegates.map(({ password, ...rest }) => rest)
  };
}

let sseClients: Response[] = [];

function broadcastState(persist = true) {
  appVersion += 1;
  const dataString = `data: ${JSON.stringify(getFullState())}\n\n`;
  sseClients.forEach(client => {
    try { client.write(dataString); } catch {}
  });
  if (persist) saveStateToDB().catch(console.error);
}

setInterval(() => {
  const changed = checkAndUpdateTimers();
  if (changed) broadcastState(true);
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

app.get('/api/state', (_req: Request, res: Response) => {
  const changed = checkAndUpdateTimers();
  if (changed) {
    appVersion += 1;
    saveStateToDB().catch(console.error);
  }
  res.json(getFullState());
});

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
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
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
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
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
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { delegateId } = req.body;
  serverMeeting.speakerQueue = serverMeeting.speakerQueue.filter(x => x.delegateId !== delegateId);
  broadcastState();
  res.json({ success: true });
});

app.post('/api/vote/submit', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
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
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  serverMeeting.attendanceOpen = req.body.open;
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/meeting/status', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { status } = req.body;
  serverMeeting.status = status;
  if (status === 'дууссан') { serverMeeting.attendanceOpen = false; serverMeeting.currentSpeaker = null; serverMeeting.speakerQueue = []; serverMeeting.voting.active = false; }
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/agenda/select', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  serverMeeting.activeAgendaItemId = req.body.agendaItemId;
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/voting/start', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { agendaItemId, title } = req.body;
  serverMeeting.voting = { active: true, agendaItemId, title: title || 'Санал хураалт эхэллээ', votes: {}, startedAt: Date.now(), duration: 60 };
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/voting/stop', (_req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  archiveAndCloseVoting();
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/speaker/next', (_req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  if (serverMeeting.speakerQueue.length > 0) {
    const next = serverMeeting.speakerQueue.shift()!;
    const duration = next.turn === 1 ? 180 : 300;
    serverMeeting.currentSpeaker = { delegateId: next.delegateId, duration, isPaused: false, turn: next.turn, startedAt: Date.now(), totalPausedMs: 0, pausedAt: null, timeUpTriggered: false };
  } else { serverMeeting.currentSpeaker = null; }
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/speaker/select-direct', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { delegateId, turn } = req.body;
  const duration = turn === 1 ? 180 : 300;
  serverMeeting.speakerQueue = serverMeeting.speakerQueue.filter(x => x.delegateId !== delegateId);
  serverMeeting.currentSpeaker = { delegateId, duration, isPaused: false, turn: turn || 1, startedAt: Date.now(), totalPausedMs: 0, pausedAt: null, timeUpTriggered: false };
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/speaker/control', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { action } = req.body;
  const spk = serverMeeting.currentSpeaker;
  if (spk) {
    if (action === 'play') {
      if (spk.isPaused && spk.pausedAt) { spk.totalPausedMs += Date.now() - spk.pausedAt; spk.pausedAt = null; }
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
    broadcastState();
    return res.json({ success: true });
  }
  res.status(400).json({ error: 'No active speaker' });
});

app.post('/api/admin/speaker/skip', (_req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  serverMeeting.currentSpeaker = null; broadcastState(); res.json({ success: true });
});
app.post('/api/admin/speaker/clear', (_req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  serverMeeting.speakerQueue = []; serverMeeting.currentSpeaker = null; broadcastState(); res.json({ success: true });
});

app.post('/api/admin/delegate/reset-password', (req: Request, res: Response) => {
  const d = seedDelegates.find(x => x.id === req.body.delegateId);
  if (d) { (d as any).password = '123'; broadcastState(); return res.json({ success: true }); }
  res.status(404).json({ error: 'Delegate not found' });
});

app.get('/api/admin/delegate/:id/credentials', (req: Request, res: Response) => {
  const d = seedDelegates.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'Олдсонгүй' });
  return res.json({ username: (d as any).username, password: (d as any).password || '123' });
});

app.post('/api/admin/delegate/change-password', (req: Request, res: Response) => {
  const { delegateId, newPassword } = req.body;
  if (!newPassword || newPassword.length < 3) return res.status(400).json({ error: 'Нууц үг хэтэрхий богино байна.' });
  const d = seedDelegates.find(x => x.id === delegateId);
  if (!d) return res.status(404).json({ error: 'Олдсонгүй' });
  (d as any).password = newPassword;
  broadcastState();
  return res.json({ success: true });
});

app.post('/api/admin/delegate/edit', (req: Request, res: Response) => {
  const { delegateId, fullName, party, district, phone, email } = req.body;
  const d = seedDelegates.find(x => x.id === delegateId);
  if (d) { d.fullName = fullName || d.fullName; d.party = party || d.party; d.district = district || d.district; d.phone = phone || d.phone; d.email = email || d.email; broadcastState(); return res.json({ success: true }); }
  res.status(404).json({ error: 'Delegate not found' });
});

app.post('/api/admin/delegate/delete', (req: Request, res: Response) => {
  const { delegateId } = req.body;
  const idx = seedDelegates.findIndex(x => x.id === delegateId);
  if (idx === -1) return res.status(404).json({ error: 'Олдсонгүй' });
  seedDelegates.splice(idx, 1);
  broadcastState();
  return res.json({ success: true });
});

app.post('/api/admin/meeting/create', (req: Request, res: Response) => {
  const { title, date, time, agenda } = req.body;
  if (serverMeeting) {
    if (serverMeeting.voting.active) archiveAndCloseVoting();
    serverMeeting.status = 'дууссан';
    serverMeeting.attendanceOpen = false;
    serverMeeting.currentSpeaker = null;
    serverMeeting.speakerQueue = [];
    serverMeeting.voting.active = false;
  }
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
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
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

// Delegate self-registration
app.post('/api/delegate/register', (req: Request, res: Response) => {
  const { username, fullName, party, district, phone, email, bio, password } = req.body;
  if (!username || !fullName || !party || !district || !phone || !email || !password)
    return res.status(400).json({ error: 'Бүх талбарыг бөглөнө үү.' });
  const uname = (username as string).trim().toLowerCase();
  if (seedDelegates.some(x => x.username.toLowerCase() === uname))
    return res.status(400).json({ error: 'Энэ нэвтрэх нэр аль хэдийн бүртгэгдсэн байна.' });
  if (pendingDelegates.some(x => x.username.toLowerCase() === uname && x.status === 'хүлээгдэж буй'))
    return res.status(400).json({ error: 'Энэ нэвтрэх нэрээр хүлээгдэж буй хүсэлт байна.' });
  const validParties = ['МАН', 'АН', 'ХҮН', 'Бяраа', 'Бие даагч'];
  if (!validParties.includes(party))
    return res.status(400).json({ error: 'Намын сонголт буруу байна.' });
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
  broadcastState();
  res.json({ success: true });
});

// Admin: approve pending delegate
app.post('/api/admin/delegate/approve', (req: Request, res: Response) => {
  const { pendingId } = req.body;
  const pending = pendingDelegates.find(x => x.id === pendingId);
  if (!pending) return res.status(404).json({ error: 'Хүлээгдэж буй бүртгэл олдсонгүй.' });
  pending.status = 'зөвшөөрсөн';
  const repNum = seedDelegates.length + 1;
  const newDelegate: Delegate = {
    id: `rep${String(repNum).padStart(2, '0')}-${Date.now()}`,
    username: pending.username,
    fullName: pending.fullName,
    party: pending.party,
    district: pending.district,
    phone: pending.phone,
    email: pending.email,
    bio: pending.bio,
    attendedMeetingsCount: 0,
    votesCastCount: 0
  };
  (newDelegate as any).password = pending.password;
  seedDelegates.push(newDelegate);
  serverNotifications.push({
    id: `notif-${Date.now()}`,
    title: 'Шинэ төлөөлөгч бүртгэгдлээ',
    message: `"${pending.fullName}" нэртэй төлөөлөгч зөвшөөрөгдөж системд нэмэгдлээ.`,
    timestamp: Date.now(),
    isRead: false
  });
  broadcastState();
  res.json({ success: true });
});

// Admin: reject pending delegate
app.post('/api/admin/delegate/reject', (req: Request, res: Response) => {
  const { pendingId } = req.body;
  const pending = pendingDelegates.find(x => x.id === pendingId);
  if (!pending) return res.status(404).json({ error: 'Хүлээгдэж буй бүртгэл олдсонгүй.' });
  pending.status = 'татгалзсан';
  broadcastState();
  res.json({ success: true });
});

// Admin: directly add a new delegate
app.post('/api/admin/delegate/add', (req: Request, res: Response) => {
  const { username, fullName, party, district, phone, email, bio } = req.body;
  if (!username || !fullName || !party || !district || !phone || !email)
    return res.status(400).json({ error: 'Бүх талбарыг бөглөнө үү.' });
  const uname = (username as string).trim().toLowerCase();
  if (seedDelegates.some(x => x.username.toLowerCase() === uname))
    return res.status(400).json({ error: 'Энэ нэвтрэх нэр аль хэдийн бүртгэгдсэн байна.' });
  const repNum = seedDelegates.length + 1;
  const newDelegate: Delegate = {
    id: `rep${String(repNum).padStart(2, '0')}-${Date.now()}`,
    username: (username as string).trim(),
    fullName: (fullName as string).trim(),
    party,
    district: (district as string).trim(),
    phone: (phone as string).trim(),
    email: (email as string).trim(),
    bio: bio ? (bio as string).trim() : undefined,
    attendedMeetingsCount: 0,
    votesCastCount: 0
  };
  (newDelegate as any).password = '123';
  seedDelegates.push(newDelegate);
  serverNotifications.push({
    id: `notif-${Date.now()}`,
    title: 'Шинэ төлөөлөгч нэмэгдлээ',
    message: `"${newDelegate.fullName}" нэртэй шинэ төлөөлөгч системд нэмэгдлээ. Анхны нууц үг: 123`,
    timestamp: Date.now(),
    isRead: false
  });
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/notifications/clear', async (_req: Request, res: Response) => {
  serverNotifications = [];
  await dbSave('notifications', serverNotifications);
  broadcastState();
  res.json({ success: true });
});

app.post('/api/system/reset', (_req: Request, res: Response) => {
  serverMeeting = null;
  seedDelegates.length = 0;
  pendingDelegates.length = 0;
  serverNotifications = [];
  appVersion += 1;
  broadcastState();
  res.json({ success: true });
});

export default app;
