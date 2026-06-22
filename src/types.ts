/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Delegate {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  party: 'МАН' | 'АН' | 'ХҮН' | 'Бяраа' | 'Бие даагч';
  district: string; // Тойрог (e.g. "1-р баг", "2-р баг")
  phone: string;
  email: string;
  bio?: string;
  password?: string;
  attendedMeetingsCount: number;
  votesCastCount: number;
}

export interface AgendaMaterial {
  id: string;
  title: string;
  fileType: 'pdf' | 'docx' | 'xlsx';
  fileSize: string;
  contentSummary: string; // Real or simulated read-only content text
}

export interface AgendaItem {
  id: string;
  title: string;
  order: number;
  materials: AgendaMaterial[];
  discussionSummary?: string;
}

export interface SpeakerRequest {
  delegateId: string;
  requestTime: number; // timestamp
  turn: number; // 1, 2, or 3
}

export interface ActiveSpeaker {
  delegateId: string;
  remainingSeconds: number;
  duration: number; // total allocated (180 or 300)
  isPaused: boolean;
  turn: number;
  timeUpTriggered?: boolean;
}

export interface VoteRecord {
  choice: 'Зөвшөөрсөн' | 'Татгалзсан';
  timestamp: number;
}

export interface ActiveVoting {
  active: boolean;
  agendaItemId: string;
  title: string;
  votes: Record<string, VoteRecord>; // delegateId -> VoteRecord
  remainingSeconds?: number;
  duration?: number;
}

export interface VotingArchiveItem {
  id: string;
  agendaItemId: string;
  title: string;
  completedAt: number;
  votes: Record<string, VoteRecord>;
  totalPresent: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
}

export interface CRKMeeting {
  id: string;
  title: string;
  date: string; // format: "YYYY-MM-DD"
  time: string; // format: "HH:MM"
  status: 'товлогдсон' | 'идэвхтэй' | 'дууссан';
  agenda: AgendaItem[];
  activeAgendaItemId: string | null;
  attendanceOpen: boolean;
  attendance: Record<string, number>; // delegateId -> timestamp of check-in
  speakerQueue: SpeakerRequest[];
  currentSpeaker: ActiveSpeaker | null;
  voting: ActiveVoting;
  votingArchive: VotingArchiveItem[];
}

export interface AppState {
  version: number;
  meeting: CRKMeeting | null;
  delegates: Delegate[];
  notifications: NotificationItem[];
}
