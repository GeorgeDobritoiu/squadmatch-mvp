import { blink } from './blink';

// ── Players ──────────────────────────────────────────────────────────────────

export async function getPlayers() {
  const result = await blink.db.players.list({ orderBy: { name: 'asc' } });
  return result ?? [];
}

export async function getCurrentUser() {
  const players = await blink.db.players.list({ where: { isCurrentUser: 1 } });
  return players?.[0] ?? null;
}

export async function loginAsPlayer(playerId: string) {
  // Clear previous current user
  const existing = await blink.db.players.list({ where: { isCurrentUser: 1 } });
  for (const p of existing ?? []) {
    await blink.db.players.update(p.id, { isCurrentUser: 0 });
  }
  return blink.db.players.update(playerId, { isCurrentUser: 1 });
}

export interface CreatePlayerInput {
  name: string;
  position: string;
  skillLevel: string;
}

export async function createPlayer(input: CreatePlayerInput) {
  // Clear any previous "current user" flag first
  const existing = await blink.db.players.list({ where: { isCurrentUser: 1 } });
  for (const p of existing ?? []) {
    await blink.db.players.update(p.id, { isCurrentUser: 0 });
  }
  const id = `p_${Date.now()}`;
  return blink.db.players.create({
    id,
    name: input.name.trim(),
    position: input.position,
    skillLevel: input.skillLevel,
    role: 'player',
    isCurrentUser: 1,
  });
}

// ── Group ────────────────────────────────────────────────────────────────────

export async function getGroup() {
  const groups = await blink.db.groupsTable.list({ limit: 1 });
  return groups?.[0] ?? null;
}

export interface CreateGroupInput {
  name: string;
  sport: string;
  format?: string;
  frequency?: string;
  location?: string;
  description?: string;
  memberIds?: string[];
}

export async function createGroup(input: CreateGroupInput) {
  const id = `grp_${Date.now()}`;
  // Build a rich description that includes sport/format metadata
  const meta = [
    input.sport,
    input.format,
    input.frequency,
  ].filter(Boolean).join(' · ');

  const group = await blink.db.groupsTable.create({
    id,
    name: input.name,
    location: input.location ?? '',
    description: input.description
      ? `${input.description}\n\n${meta}`
      : meta,
  });

  // If memberIds provided, we don't need to do anything special since
  // they're already in the players table — the group shares all players.
  // In a multi-team future you'd create a join table; for now this is MVP.
  return group;
}

// ── Matches ──────────────────────────────────────────────────────────────────

export async function getMatches() {
  const result = await blink.db.matches.list({ orderBy: { date: 'desc' } });
  return result ?? [];
}

export async function getNextMatch() {
  const matches = await blink.db.matches.list({
    where: { status: 'open' },
    orderBy: { date: 'asc' },
    limit: 1,
  });
  if (matches?.length) return matches[0];
  const full = await blink.db.matches.list({
    where: { status: 'full' },
    orderBy: { date: 'asc' },
    limit: 1,
  });
  return full?.[0] ?? null;
}

export async function getMatchById(id: string) {
  return blink.db.matches.get(id);
}

// ── Attendance ───────────────────────────────────────────────────────────────

export async function getAttendance(matchId: string) {
  return blink.db.attendance.list({ where: { matchId } });
}

export async function upsertAttendance(matchId: string, playerId: string, status: string) {
  const existing = await blink.db.attendance.list({ where: { matchId, playerId } });
  if (existing?.length) {
    return blink.db.attendance.update(existing[0].id, { status });
  }
  return blink.db.attendance.create({
    id: `att_${Date.now()}`,
    matchId,
    playerId,
    status,
  });
}

// ── Guests ───────────────────────────────────────────────────────────────────

export async function getGuests(matchId: string) {
  return blink.db.guests.list({ where: { matchId } });
}

export async function addGuest(guest: {
  matchId: string;
  sponsorId: string;
  name: string;
  type: string;
  skillLevel: string;
  requiresSponsorPresence: boolean;
}) {
  return blink.db.guests.create({
    id: `guest_${Date.now()}`,
    matchId: guest.matchId,
    sponsorId: guest.sponsorId,
    name: guest.name,
    type: guest.type,
    skillLevel: guest.skillLevel,
    requiresSponsorPresence: guest.requiresSponsorPresence ? 1 : 0,
  });
}

// ── Payments ─────────────────────────────────────────────────────────────────

export async function getPayments(matchId: string) {
  return blink.db.payments.list({ where: { matchId } });
}

export async function getAllPayments() {
  return blink.db.payments.list({ orderBy: { createdAt: 'desc' } });
}

export async function markPayment(paymentId: string, status: string, method?: string) {
  return blink.db.payments.update(paymentId, { status, ...(method ? { method } : {}) });
}

// ── MOTM Votes ───────────────────────────────────────────────────────────────

export async function getPlayerById(id: string) {
  return blink.db.players.get(id);
}

// ── Per-Player Stats ──────────────────────────────────────────────────────────

export async function getPlayerStats(playerId: string) {
  // All attendance records for this player
  const allAttendance = await blink.db.attendance.list({ where: { playerId } });
  const attended = (allAttendance ?? []).filter((a) => a.status === 'yes');

  // Match IDs where they played
  const playedMatchIds = attended.map((a) => a.matchId);

  // All past matches to figure out attendance rate
  const allMatches = await blink.db.matches.list({ orderBy: { date: 'desc' } });
  const closedMatches = (allMatches ?? []).filter((m) => m.status === 'closed');
  const matchesPlayed = closedMatches.filter((m) => playedMatchIds.includes(m.id));

  // MOTM wins — matches where they received the most votes
  const allVotes = await blink.db.motmVotes.list({});
  let motmWins = 0;
  for (const match of closedMatches) {
    const matchVotes = (allVotes ?? []).filter((v) => v.matchId === match.id);
    const voteCount: Record<string, number> = {};
    matchVotes.forEach((v) => {
      voteCount[v.nomineeId] = (voteCount[v.nomineeId] ?? 0) + 1;
    });
    const maxVotes = Math.max(0, ...Object.values(voteCount));
    if (maxVotes > 0 && voteCount[playerId] === maxVotes) motmWins++;
  }

  // Attendance rate (% of closed matches they attended)
  const attendanceRate =
    closedMatches.length > 0
      ? Math.round((matchesPlayed.length / closedMatches.length) * 100)
      : 0;

  // Team record (W/D/L) in played matches
  let wins = 0, draws = 0, losses = 0;
  for (const match of matchesPlayed) {
    if (match.scoreA === null || match.scoreB === null) continue;
    const attRec = attended.find((a) => a.matchId === match.id);
    const team = attRec?.team;
    if (!team) continue;
    const myScore = team === 'A' ? match.scoreA : match.scoreB;
    const oppScore = team === 'A' ? match.scoreB : match.scoreA;
    if (myScore > oppScore) wins++;
    else if (myScore === oppScore) draws++;
    else losses++;
  }

  return {
    matchesPlayed: matchesPlayed.length,
    motmWins,
    attendanceRate,
    wins,
    draws,
    losses,
    recentMatches: matchesPlayed.slice(0, 5).map((m) => {
      const attRec = attended.find((a) => a.matchId === m.id);
      return { ...m, myTeam: attRec?.team ?? null };
    }),
  };
}

export async function getMotmVotes(matchId: string) {
  return blink.db.motmVotes.list({ where: { matchId } });
}

export async function castMotmVote(matchId: string, voterId: string, nomineeId: string) {
  const existing = await blink.db.motmVotes.list({ where: { matchId, voterId } });
  if (existing?.length) {
    return blink.db.motmVotes.update(existing[0].id, { nomineeId });
  }
  return blink.db.motmVotes.create({
    id: `vote_${Date.now()}`,
    matchId,
    voterId,
    nomineeId,
  });
}

// ── Team Generation ──────────────────────────────────────────────────────────

export async function generateTeams(matchId: string) {
  const attendance = await blink.db.attendance.list({ where: { matchId, status: 'yes' } });
  const guests = await blink.db.guests.list({ where: { matchId } });

  const playerIds = attendance?.map((a) => a.playerId) ?? [];
  const half = Math.ceil(playerIds.length / 2);

  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  const teamA = shuffled.slice(0, half);
  const teamB = shuffled.slice(half);

  for (const id of teamA) {
    const rec = attendance!.find((a) => a.playerId === id);
    if (rec) await blink.db.attendance.update(rec.id, { team: 'A' });
  }
  for (const id of teamB) {
    const rec = attendance!.find((a) => a.playerId === id);
    if (rec) await blink.db.attendance.update(rec.id, { team: 'B' });
  }

  // Distribute guests evenly
  const guestList = guests ?? [];
  for (let i = 0; i < guestList.length; i++) {
    const team = i % 2 === 0 ? 'A' : 'B';
    await blink.db.guests.update(guestList[i].id, { team });
  }
}

// ── Match Scheduling ─────────────────────────────────────────────────────────

export interface CreateMatchInput {
  groupId: string;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM
  location: string;
  costPerPlayer: number;
  notes?: string;
  pitchName?: string;
}

export async function createMatch(input: CreateMatchInput) {
  const id = `m_${Date.now()}`;
  return blink.db.matches.create({
    id,
    groupId: input.groupId,
    date: input.date,
    time: input.time,
    location: input.location,
    costPerPlayer: input.costPerPlayer,
    status: 'open',
    teamsLocked: 0,
  });
}

export async function lockTeams(matchId: string) {
  return blink.db.matches.update(matchId, { teamsLocked: 1 });
}

export async function submitScore(matchId: string, scoreA: number, scoreB: number) {
  return blink.db.matches.update(matchId, {
    scoreA,
    scoreB,
    status: 'closed',
  });
}
