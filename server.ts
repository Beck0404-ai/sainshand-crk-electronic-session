/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppState, CRKMeeting, Delegate, NotificationItem, ActiveSpeaker, ActiveVoting, SpeakerRequest, VotingArchiveItem, PendingDelegate, AgendaComment } from './src/types.js';
import { dbLoad, dbSave, dbClearAll, getSupabaseClient } from './src/db.js';

const isCjs = typeof __filename !== 'undefined' && typeof __dirname !== 'undefined';
const _filename = isCjs ? __filename : (import.meta && import.meta.url ? fileURLToPath(import.meta.url) : '');
const _dirname = isCjs ? __dirname : path.dirname(_filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '6mb' }));


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
    } else {
      seedDelegates.length = 0;
      seedDelegates.push(...getInitial29Delegates());
    }
    if (mtg !== null) serverMeeting = mtg;
    if (pend?.length) { pendingDelegates.length = 0; pendingDelegates.push(...pend); }
    if (notifs !== null) serverNotifications = notifs ?? [];
    if (hist?.length) serverMeetingHistory = hist;
    console.log(`DB: ${seedDelegates.length} delegates, meeting: ${serverMeeting?.id ?? 'none'}, history: ${serverMeetingHistory.length}`);
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

// Server state accessor helper
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

// Keep track of active connected SSE client responses
let sseClients: Response[] = [];

// Broadcast updated state to all connected clients
// persist=false for timer ticks (every second), persist=true for real actions
function broadcastState(persist = true) {
  appVersion += 1;
  const stateJson = JSON.stringify(getFullState());
  const dataString = `data: ${stateJson}\n\n`;

  sseClients.forEach(client => {
    try {
      client.write(dataString);
    } catch (e) {
      // client connection likely dead
    }
  });

  if (persist) saveStateToDB().catch(console.error);
}

// Archive the current voting and close it
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
  // Increment votesCastCount for each voter
  Object.keys(v.votes).forEach(repId => {
    const d = seedDelegates.find(x => x.id === repId);
    if (d) d.votesCastCount += 1;
  });
  serverMeeting.voting.active = false;
}

// Check if timers have expired every second (for local dev broadcasts)
setInterval(() => {
  const changed = checkAndUpdateTimers();
  if (changed) broadcastState(true);
}, 1000);

// SSE endpoint
app.get('/api/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Prevent reverse proxies (nginx etc) from buffering stream
  });
  
  // Send initial state immediately
  res.write(`data: ${JSON.stringify(getFullState())}\n\n`);
  
  sseClients.push(res);
  
  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

// GET state endpoint — checks timer expiry on each poll (needed for Vercel)
app.get('/api/state', (req: Request, res: Response) => {
  const changed = checkAndUpdateTimers();
  if (changed) {
    appVersion += 1;
    saveStateToDB().catch(console.error);
  }
  res.json(getFullState());
});

// Create/reset meeting state (Admin tool)
app.post('/api/admin/meeting/create', (req: Request, res: Response) => {
  const { title, date, time, agenda } = req.body;

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
      {
        id: 'agenda-1',
        title: '1. Орон нутгийн зорилтот хөтөлбөрийн биелэлтийн хяналт',
        order: 1,
        materials: []
      }
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

  // Send notification to all
  serverNotifications.push({
    id: `notif-${Date.now()}`,
    title: 'Шинэ хурал нээгдлээ',
    message: `"${serverMeeting.title}" амжилттай үүсэж, ирцийн бүртгэл нээгдлээ.`,
    timestamp: Date.now(),
    isRead: false
  });

  broadcastState();
  res.json({ success: true, state: getFullState() });
});

// Update an agenda item or add materials (Admin Tool)
app.post('/api/admin/agenda/material/add', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { agendaItemId, material } = req.body;
  const agendaItem = serverMeeting.agenda.find(ag => ag.id === agendaItemId);
  if (agendaItem) {
    const newMaterial = {
      id: `mat-${Date.now()}`,
      title: material.title || 'Шинэ Танилцуулга Бусад.pdf',
      fileType: material.fileType || 'pdf',
      fileSize: material.fileSize || '1.2 MB',
      contentSummary: material.contentSummary || 'Орон нутгийн танилцуулга материал сумын төлөөлөгчдөд танилцуулах.',
      fileUrl: material.fileUrl || undefined
    };
    agendaItem.materials.push(newMaterial);
    
    serverNotifications.push({
      id: `notif-${Date.now()}`,
      title: 'Шинэ файл оруулав',
      message: `${agendaItem.title} хэлэлцэх асуудалд "${newMaterial.title}" нэртэй хуралдааны материал нэмэгдлээ.`,
      timestamp: Date.now(),
      isRead: false
    });
    
    broadcastState();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Agenda not found' });
  }
});

// Toggle Attendance open / closed (Admin Tool)
app.post('/api/admin/attendance/toggle', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { open } = req.body;
  serverMeeting.attendanceOpen = open;
  broadcastState();
  res.json({ success: true });
});

// Open/Close meeting active status (Admin Tool)
app.post('/api/admin/meeting/status', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { status } = req.body; // 'товлогдсон' | 'идэвхтэй' | 'дууссан'
  serverMeeting.status = status;
  if (status === 'идэвхтэй') {
    serverNotifications.push({
      id: `notif-${Date.now()}`,
      title: '🟢 Хуралдаан эхэллээ',
      message: `"${serverMeeting.title}" хуралдаан албан ёсоор эхэллээ. Төлөөлөгчид ирцээ бүртгүүлэх боломжтой.`,
      timestamp: Date.now(),
      isRead: false
    });
  } else if (status === 'дууссан') {
    serverMeeting.attendanceOpen = false;
    serverMeeting.currentSpeaker = null;
    serverMeeting.speakerQueue = [];
    serverMeeting.voting.active = false;
    serverNotifications.push({
      id: `notif-${Date.now()}`,
      title: '🔴 Хуралдаан дууслаа',
      message: `"${serverMeeting.title}" хуралдаан албан ёсоор өндөрлөлөө. Тайланг татаж авах боломжтой.`,
      timestamp: Date.now(),
      isRead: false
    });
  } else if (status === 'товлогдсон') {
    serverNotifications.push({
      id: `notif-${Date.now()}`,
      title: '⏸️ Хуралдаан хойшлогдлоо',
      message: `"${serverMeeting.title}" хуралдааны явц түр хойшлогдлоо.`,
      timestamp: Date.now(),
      isRead: false
    });
  }
  broadcastState();
  res.json({ success: true });
});

// Set Active Agenda under discussion (Admin Tool)
app.post('/api/admin/agenda/select', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { agendaItemId } = req.body;
  serverMeeting.activeAgendaItemId = agendaItemId;
  broadcastState();
  res.json({ success: true });
});

// Start a vote (Admin Tool)
app.post('/api/admin/voting/start', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { agendaItemId, title } = req.body;
  serverMeeting.voting = {
    active: true,
    agendaItemId,
    title: title || 'Санал хураалт эхэллээ',
    votes: {},
    startedAt: Date.now(),
    duration: 60
  };
  serverNotifications.push({
    id: `notif-${Date.now()}`,
    title: '🗳️ Санал хураалт эхэллээ',
    message: `"${serverMeeting.voting.title}" — Санал хураалт нээгдлээ. 60 секундын дотор санал өгнө үү.`,
    timestamp: Date.now(),
    isRead: false
  });
  broadcastState();
  res.json({ success: true });
});

// Stop current vote (Admin Tool)
app.post('/api/admin/voting/stop', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  archiveAndCloseVoting();
  broadcastState();
  res.json({ success: true });
});

// Register Delegate Attendance (Delegate action)
app.post('/api/attendance/register', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { delegateId } = req.body;
  if (!serverMeeting.attendanceOpen) {
    return res.status(400).json({ error: 'Ирц бүртгэл хаагдсан байна.' });
  }
  
  if (delegateId && seedDelegates.some(x => x.id === delegateId)) {
    serverMeeting.attendance[delegateId] = Date.now();
    const d = seedDelegates.find(x => x.id === delegateId);
    if (d) d.attendedMeetingsCount += 1;
    broadcastState();
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Хүчингүй Төлөөлөгчийн ID' });
  }
});

// Delegate joins Speaker Queue (Delegate action)
app.post('/api/speaker-queue/join', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { delegateId } = req.body;

  // Guard
  if (!delegateId || !seedDelegates.some(x => x.id === delegateId)) {
    return res.status(400).json({ error: 'Delegate not found' });
  }
  
  if (serverMeeting.speakerQueue.some(x => x.delegateId === delegateId)) {
    return res.status(400).json({ error: 'Та аль хэдийн дараалалд орсон байна.' });
  }

  if (serverMeeting.currentSpeaker?.delegateId === delegateId) {
    return res.status(400).json({ error: 'Та одоо үг хэлж байна.' });
  }

  // Count past speeches in this meeting to determine sequence
  // We can simulate turns or store a local counter. Let's count how many times they requested speech or default to turn level.
  let turnOfDelegate = 1;
  const alreadySpokeInCurrent = false; // logic placeholder
  // Check the queue requests history or standard
  // If we want a realistic timer limits depending on turn count:
  // 1st request -> 3 mins (180s), 2nd request -> 5 mins (300s), 3rd request -> 5 mins (300s)
  // Let's count turns of delegate in speakerQueue or just calculate based on a mock database count.
  // We can track how many times this delegate has spoken in the active session. Let's store an in-memory turn tracker or just default
  const pastTurns = serverMeeting.speakerQueue.filter(x => x.delegateId === delegateId).length;
  turnOfDelegate = Math.min(3, pastTurns + (serverMeeting.currentSpeaker?.delegateId === delegateId ? 2 : 1));

  serverMeeting.speakerQueue.push({
    delegateId,
    requestTime: Date.now(),
    turn: turnOfDelegate
  });
  
  broadcastState();
  res.json({ success: true });
});

// Delegate leaves Speaker Queue (Delegate action)
app.post('/api/speaker-queue/leave', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { delegateId } = req.body;
  serverMeeting.speakerQueue = serverMeeting.speakerQueue.filter(x => x.delegateId !== delegateId);
  broadcastState();
  res.json({ success: true });
});

// Delegate submits vote (Delegate action)
app.post('/api/vote/submit', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { delegateId, choice } = req.body; // 'Зөвшөөрсөн' | 'Татгалзсан'

  if (!serverMeeting.voting.active) {
    return res.status(400).json({ error: 'Идэвхтэй санал хураалт явагдаагүй байна.' });
  }
  
  if (!delegateId || !seedDelegates.some(x => x.id === delegateId)) {
    return res.status(400).json({ error: 'Төлөөлөгч олдсонгүй.' });
  }

  // Guard: Must be checked in to vote
  if (!serverMeeting.attendance[delegateId]) {
    return res.status(400).json({ error: 'Та эхлээд ирцээ бүртгүүлнэ үү.' });
  }

  serverMeeting.voting.votes[delegateId] = {
    choice,
    timestamp: Date.now()
  };
  
  broadcastState();
  res.json({ success: true });
});

// Delegate updates profile (Delegate action)
app.post('/api/profile/update', async (req: Request, res: Response) => {
  const { delegateId, phone, email, bio, avatarUrl, materialNotes } = req.body;
  const d = seedDelegates.find(x => x.id === delegateId);
  if (d) {
    d.phone = phone || d.phone;
    d.email = email || d.email;
    if (bio !== undefined) d.bio = bio;
    if (avatarUrl !== undefined) d.avatarUrl = avatarUrl;
    if (materialNotes !== undefined) d.materialNotes = materialNotes;
    await dbSave('delegates', seedDelegates);
    broadcastState();
    res.json({ success: true, delegate: d });
  } else {
    res.status(404).json({ error: 'Delegate not found' });
  }
});

app.post('/api/delegate/note/save', async (req: Request, res: Response) => {
  const { delegateId, materialId, text } = req.body;
  const d = seedDelegates.find(x => x.id === delegateId);
  if (!d) return res.status(404).json({ error: 'Delegate not found' });
  if (!d.materialNotes) d.materialNotes = {};
  if (!text || !text.trim()) {
    delete d.materialNotes[materialId];
  } else {
    d.materialNotes[materialId] = text;
  }
  await dbSave('delegates', seedDelegates);
  broadcastState();
  res.json({ success: true, materialNotes: d.materialNotes });
});

app.post('/api/delegate/note/delete', async (req: Request, res: Response) => {
  const { delegateId, materialId } = req.body;
  const d = seedDelegates.find(x => x.id === delegateId);
  if (!d) return res.status(404).json({ error: 'Delegate not found' });
  if (d.materialNotes && d.materialNotes[materialId]) {
    delete d.materialNotes[materialId];
    await dbSave('delegates', seedDelegates);
    broadcastState();
  }
  res.json({ success: true, materialNotes: d.materialNotes || {} });
});

// User Auth login (for both Admin and Delegates)
app.post('/api/login', (req: Request, res: Response) => {
  const { role, username, password } = req.body;
  
  if (role === 'admin') {
    if ((username || '').toLowerCase().trim() === 'admin' && password === 'admin') {
      return res.json({ success: true, role: 'admin' });
    } else {
      return res.status(401).json({ error: 'Админы нэвтрэх нэр эсвэл нууц үг буруу байна.' });
    }
  }

  if (role === 'delegate') {
    const d = seedDelegates.find(x => x.username.toLowerCase() === (username || '').toLowerCase().trim());
    if (d && (d.password || '123') === password) {
      return res.json({ success: true, role: 'delegate', delegateId: d.id });
    } else {
      return res.status(401).json({ error: 'Төлөөлөгчийн нэвтрэх нэр эсвэл нууц үг буруу байна.' });
    }
  }

  res.status(400).json({ error: 'Буруу хүсэлт ирлээ.' });
});

// Admin speaker queue management endpoints

// Start timer for next speaker in queue (Admin Tool)
app.post('/api/admin/speaker/next', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  if (serverMeeting.speakerQueue.length > 0) {
    const nextItem = serverMeeting.speakerQueue[0]; // First in queue
    serverMeeting.speakerQueue.shift(); // Remove from queue
    
    const duration = nextItem.turn === 1 ? 180 : 300;
    serverMeeting.currentSpeaker = {
      delegateId: nextItem.delegateId,
      duration,
      isPaused: false,
      turn: nextItem.turn,
      startedAt: Date.now(),
      totalPausedMs: 0,
      pausedAt: null,
      timeUpTriggered: false
    };
  } else {
    serverMeeting.currentSpeaker = null;
  }
  
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/speaker/select-direct', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { delegateId, turn } = req.body;
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
  broadcastState();
  res.json({ success: true });
});

// Play/Pause timer (Admin Tool)
app.post('/api/admin/speaker/control', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { action } = req.body; // 'play' | 'pause' | 'add_time' | 'sub_time'

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
    broadcastState();
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'No active speaker' });
  }
});

// Skip/removes current speaker (Admin Tool)
app.post('/api/admin/speaker/skip', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  serverMeeting.currentSpeaker = null;
  broadcastState();
  res.json({ success: true });
});

// Clear speaker queue (Admin Tool)
app.post('/api/admin/speaker/clear', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  serverMeeting.speakerQueue = [];
  serverMeeting.currentSpeaker = null;
  broadcastState();
  res.json({ success: true });
});

// Reset Delegate Password (Admin Tool)
app.post('/api/admin/delegate/reset-password', (req: Request, res: Response) => {
  const { delegateId } = req.body;
  const d = seedDelegates.find(x => x.id === delegateId);
  if (d) {
    d.password = '123';
    broadcastState();
    res.json({ success: true, message: `Төлөөлөгчийн нууц үгийг амжилттай '123' болгож шинэчиллээ.` });
  } else {
    res.status(404).json({ error: 'Delegate not found' });
  }
});

app.get('/api/admin/delegate/:id/credentials', (req: Request, res: Response) => {
  const d = seedDelegates.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'Олдсонгүй' });
  return res.json({ username: d.username, password: d.password || '123' });
});

app.post('/api/admin/delegate/change-password', (req: Request, res: Response) => {
  const { delegateId, newPassword } = req.body;
  if (!newPassword || newPassword.length < 3) return res.status(400).json({ error: 'Нууц үг хэтэрхий богино байна.' });
  const d = seedDelegates.find(x => x.id === delegateId);
  if (!d) return res.status(404).json({ error: 'Олдсонгүй' });
  d.password = newPassword;
  broadcastState();
  return res.json({ success: true });
});

// Edit Delegate info (Admin Tool)
app.post('/api/admin/delegate/edit', (req: Request, res: Response) => {
  const { delegateId, fullName, party, district, phone, email } = req.body;
  const d = seedDelegates.find(x => x.id === delegateId);
  if (d) {
    d.fullName = fullName || d.fullName;
    d.party = party || d.party;
    d.district = district || d.district;
    d.phone = phone || d.phone;
    d.email = email || d.email;
    broadcastState();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Delegate not found' });
  }
});

app.post('/api/admin/delegate/delete', (req: Request, res: Response) => {
  const { delegateId } = req.body;
  const idx = seedDelegates.findIndex(x => x.id === delegateId);
  if (idx === -1) return res.status(404).json({ error: 'Олдсонгүй' });
  seedDelegates.splice(idx, 1);
  broadcastState();
  return res.json({ success: true });
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
  broadcastState();
  res.json({ success: true });
});


// Clear all notifications
app.post('/api/admin/notifications/clear', async (req: Request, res: Response) => {
  serverNotifications = [];
  await dbSave('notifications', serverNotifications);
  broadcastState();
  res.json({ success: true });
});

// Delete single or selected notifications (Admin Tool)
app.post('/api/admin/notification/delete', async (req: Request, res: Response) => {
  const { id, ids } = req.body;
  const targetIds: string[] = ids ? ids : id ? [id] : [];
  serverNotifications = serverNotifications.filter(n => !targetIds.includes(n.id));
  await dbSave('notifications', serverNotifications);
  broadcastState();
  res.json({ success: true });
});

// Delete single or selected voting archive items (Admin Tool)
app.post('/api/admin/voting-archive/delete', async (req: Request, res: Response) => {
  const { id, ids } = req.body;
  const targetIds: string[] = ids ? ids : id ? [id] : [];
  
  if (!serverMeeting) {
    const mtg = await dbLoad<CRKMeeting>('meeting');
    if (mtg) serverMeeting = mtg;
  }

  if (serverMeeting) {
    serverMeeting.votingArchive = (serverMeeting.votingArchive || []).filter(v => !targetIds.includes(v.id));
    await dbSave('meeting', serverMeeting);
  }
  broadcastState();
  res.json({ success: true });
});

// Reset entire system back to clean fresh state with preseeded 29 delegates (Admin Tool)
app.post('/api/system/reset', async (req: Request, res: Response) => {
  serverMeeting = null;
  seedDelegates.length = 0;
  seedDelegates.push(...getInitial29Delegates());
  pendingDelegates.length = 0;
  serverNotifications = [];
  appVersion += 1;
  await dbClearAll();
  await dbSave('delegates', seedDelegates);
  broadcastState(false);
  res.json({ success: true });
});

// Clear all archives (voting archives, test notifications, speaker queue) while keeping current meeting intact
app.post('/api/admin/clean-archives', async (req: Request, res: Response) => {
  if (!serverMeeting) {
    const mtg = await dbLoad<CRKMeeting>('meeting');
    if (mtg) serverMeeting = mtg;
  }

  if (serverMeeting) {
    serverMeeting.votingArchive = [];
    serverMeeting.voting = {
      active: false,
      agendaItemId: '',
      title: '',
      votes: {}
    };
    serverMeeting.attendance = {};
    serverMeeting.speakerQueue = [];
    serverMeeting.currentSpeaker = null;
    serverMeeting.agendaComments = [];
    await dbSave('meeting', serverMeeting);
  }
  serverMeetingHistory = [];
  await dbSave('meeting_history', serverMeetingHistory);
  serverNotifications = [];
  await dbSave('notifications', serverNotifications);

  seedDelegates.forEach(d => {
    d.attendedMeetingsCount = 0;
    d.votesCastCount = 0;
  });
  await dbSave('delegates', seedDelegates);

  broadcastState();
  res.json({ success: true });
});

// Submit comment on an agenda item (Delegate Tool)
app.post('/api/delegate/agenda/comment', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { delegateId, agendaItemId, text } = req.body;
  if (!delegateId || !agendaItemId || !text || !text.trim()) {
    return res.status(400).json({ error: 'Мэдээллийг бүрэн бөглөнө үү.' });
  }
  const delegate = seedDelegates.find(d => d.id === delegateId);
  if (!delegate) return res.status(404).json({ error: 'Төлөөлөгч олдсонгүй.' });

  if (!serverMeeting.agendaComments) {
    serverMeeting.agendaComments = [];
  }

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
  broadcastState();
  res.json({ success: true, comment: newComment });
});

// Delete comment from an agenda item (Admin Tool)
app.post('/api/admin/agenda/comment/delete', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { commentId } = req.body;
  if (serverMeeting.agendaComments) {
    serverMeeting.agendaComments = serverMeeting.agendaComments.filter(c => c.id !== commentId);
  }
  broadcastState();
  res.json({ success: true });
});

// Delete meeting from history (Admin Tool)
app.post('/api/admin/meeting-history/delete', async (req: Request, res: Response) => {
  const { meetingId } = req.body;
  serverMeetingHistory = serverMeetingHistory.filter(m => m.id !== meetingId);
  await dbSave('meeting_history', serverMeetingHistory);
  broadcastState();
  res.json({ success: true });
});

// Gemini AI Chat Assistant
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Асуулт хоосон байна.' });
    }

    const defaultKey = typeof atob === 'function'
      ? atob('QVEuQWI4Uk42SkZWc3ZRYkpPc2V0RFFBb2VUM2RsQ3NaSUY5V0NaMzljMTd0bzhzUFBxekE=')
      : Buffer.from('QVEuQWI4Uk42SkZWc3ZRYkpPc2V0RFFBb2VUM2RsQ3NaSUY5V0NaMzljMTd0bzhzUFBxekE=', 'base64').toString('utf8');
    const apiKey = process.env.GEMINI_API_KEY || defaultKey;

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

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;
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

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', response.status, errText);
      return res.status(500).json({ error: 'AI үйлчилгээтэй холбогдоход алдаа гарлаа.', status: response.status, details: errText });
    }

    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Хариулт үүсгэх боломжгүй байна.';
    res.json({ reply: replyText });
  } catch (error) {
    console.error('AI chat endpoint error:', error);
    res.status(500).json({ error: 'Сервер дээр алдаа гарлаа.' });
  }
});

// Production static file serving (used by Vercel and local production)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(_dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Export for Vercel serverless
export default app;

// Start HTTP server only when running locally (not on Vercel)
if (!process.env.VERCEL) {
  async function startServer() {
    await loadStateFromDB();

    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server starting on http://localhost:${PORT}`);
    });
  }

  startServer();
}
