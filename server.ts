/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { AppState, CRKMeeting, Delegate, NotificationItem, ActiveSpeaker, SpeakerRequest, VotingArchiveItem, PendingDelegate } from './src/types.js';
import { dbLoad, dbSave, dbClearAll, getSupabaseClient } from './src/db.js';

const isCjs = typeof __filename !== 'undefined' && typeof __dirname !== 'undefined';
const _filename = isCjs ? __filename : (import.meta && import.meta.url ? fileURLToPath(import.meta.url) : '');
const _dirname = isCjs ? __dirname : path.dirname(_filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// PDF file uploads — Supabase Storage (works on Vercel serverless)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Preseeded list of 29 delegates of Sainshand Soum
const seedDelegates: any[] = [];

let serverMeeting: CRKMeeting | null = null;

let serverNotifications: NotificationItem[] = [];

interface PendingDelegateInternal extends PendingDelegate {
  password: string;
}

let pendingDelegates: PendingDelegateInternal[] = [];

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
    if (notifs?.length) serverNotifications = notifs;
    console.log(`DB: ${seedDelegates.length} delegates, meeting: ${serverMeeting?.id ?? 'none'}`);
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

// Server state accessor helper
function getFullState(): AppState {
  return {
    version: appVersion,
    meeting: serverMeeting,
    delegates: seedDelegates.map(d => {
      const { password, ...rest } = d;
      return rest;
    }),
    notifications: serverNotifications,
    pendingDelegates: pendingDelegates.map(({ password, ...rest }) => rest)
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

// Server side tick interval for current speaker's time and voting countdown
setInterval(() => {
  if (!serverMeeting) return;
  let stateChanged = false;
  let persist = false;

  // Speaker timer decrement
  if (serverMeeting.currentSpeaker && !serverMeeting.currentSpeaker.isPaused) {
    if (serverMeeting.currentSpeaker.remainingSeconds > 0) {
      serverMeeting.currentSpeaker.remainingSeconds -= 1;
      stateChanged = true;
    } else if (!serverMeeting.currentSpeaker.timeUpTriggered) {
      serverMeeting.currentSpeaker.timeUpTriggered = true;
      serverMeeting.currentSpeaker.isPaused = true;
      stateChanged = true;
      persist = true;
    }
  }

  // Voting countdown timer decrement (60 seconds)
  if (serverMeeting.voting && serverMeeting.voting.active) {
    if (serverMeeting.voting.remainingSeconds === undefined) {
      serverMeeting.voting.remainingSeconds = 60;
      serverMeeting.voting.duration = 60;
    }
    if (serverMeeting.voting.remainingSeconds > 0) {
      serverMeeting.voting.remainingSeconds -= 1;
      stateChanged = true;
    } else {
      archiveAndCloseVoting();
      stateChanged = true;
      persist = true;
    }
  }

  if (stateChanged) broadcastState(persist);
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

// GET state endpoint (for non-SSE fallback or checks)
app.get('/api/state', (req: Request, res: Response) => {
  res.json(getFullState());
});

// Create/reset meeting state (Admin tool)
app.post('/api/admin/meeting/create', (req: Request, res: Response) => {
  const { title, date, time, agenda } = req.body;
  
  serverMeeting = {
    id: `meeting-${Date.now()}`,
    title: title || 'Сайншанд сумын ИТХ-ын Шинэ Хуралдаан',
    date: date || new Date().toISOString().split('T')[0],
    time: time || '09:00',
    status: 'идэвхтэй',
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
    votingArchive: []
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
    remainingSeconds: 60,
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
app.post('/api/profile/update', (req: Request, res: Response) => {
  const { delegateId, phone, email, bio } = req.body;
  const d = seedDelegates.find(x => x.id === delegateId);
  if (d) {
    d.phone = phone || d.phone;
    d.email = email || d.email;
    d.bio = bio || d.bio;
    broadcastState();
    res.json({ success: true, delegate: d });
  } else {
    res.status(404).json({ error: 'Delegate not found' });
  }
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
    
    // Turn dictates duration: 1st -> 3 min (180s), 2nd/3rd -> 5 min (300s)
    const duration = nextItem.turn === 1 ? 180 : 300;
    
    serverMeeting.currentSpeaker = {
      delegateId: nextItem.delegateId,
      remainingSeconds: duration,
      duration,
      isPaused: false,
      turn: nextItem.turn
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
    remainingSeconds: duration,
    duration,
    isPaused: false,
    turn: turn || 1
  };
  broadcastState();
  res.json({ success: true });
});

// Play/Pause timer (Admin Tool)
app.post('/api/admin/speaker/control', (req: Request, res: Response) => {
  if (!serverMeeting) return res.status(400).json({ error: 'Идэвхтэй хурал байхгүй байна.' });
  const { action } = req.body; // 'play' | 'pause' | 'add_time' | 'sub_time'

  if (serverMeeting.currentSpeaker) {
    if (action === 'play') {
      serverMeeting.currentSpeaker.isPaused = false;
    } else if (action === 'pause') {
      serverMeeting.currentSpeaker.isPaused = true;
    } else if (action === 'add_time') {
      serverMeeting.currentSpeaker.remainingSeconds = Math.min(
        serverMeeting.currentSpeaker.duration + 300,
        serverMeeting.currentSpeaker.remainingSeconds + 60
      );
    } else if (action === 'sub_time') {
      serverMeeting.currentSpeaker.remainingSeconds = Math.max(
        0,
        serverMeeting.currentSpeaker.remainingSeconds - 60
      );
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

// PDF file upload endpoint — Supabase Storage
app.post('/api/admin/material/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Файл байхгүй байна.' });
  const supabase = getSupabaseClient();
  if (!supabase) return res.status(500).json({ error: 'Supabase тохиргоо хийгдээгүй байна.' });

  const safeName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;

  // Bucket байхгүй бол үүсгэнэ
  await supabase.storage.createBucket('materials', { public: true }).catch(() => {});

  const { error } = await supabase.storage
    .from('materials')
    .upload(safeName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

  if (error) {
    console.error('Storage upload error:', error);
    return res.status(500).json({ error: `Файл хадгалахад алдаа: ${error.message}` });
  }

  const { data: { publicUrl } } = supabase.storage.from('materials').getPublicUrl(safeName);
  res.json({ success: true, fileUrl: publicUrl, originalName: req.file.originalname, size: req.file.size });
});

// Reset entire system back to clean empty state (Admin Tool)
app.post('/api/system/reset', async (req: Request, res: Response) => {
  serverMeeting = null;
  seedDelegates.length = 0;
  pendingDelegates.length = 0;
  serverNotifications = [];
  appVersion += 1;
  await dbClearAll();
  broadcastState(false);
  res.json({ success: true });
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
