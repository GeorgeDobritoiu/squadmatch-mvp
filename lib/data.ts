import { supabase } from './supabase';
import { computeRating, snakeDraft } from './ratings';

// ── Players ──────────────────────────────────────────────────────────────────

export async function getPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getPlayerById(id: string) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Player record exists — return it
  if (data) return data;

  // No player record yet — auto-create one from auth metadata
  const name = user.user_metadata?.name
    || user.user_metadata?.full_name
    || user.email?.split('@')[0]
    || 'Player';

  const { data: created } = await supabase.from('players').insert({
    id:          `p_${Date.now()}`,
    user_id:     user.id,
    name,
    position:    'Any',
    skill_level: 'intermediate',
    role:        'player',
  }).select().single();

  return created ?? null;
}

export interface CreatePlayerInput {
  name:       string;
  position:   string;
  skillLevel: string;
}

export async function createPlayer(input: CreatePlayerInput) {
  const { data: { user } } = await supabase.auth.getUser();
  const id = `p_${Date.now()}`;
  const { data, error } = await supabase.from('players').insert({
    id,
    user_id:    user?.id ?? null,
    name:       input.name.trim(),
    position:   input.position,
    skill_level: input.skillLevel,
    role:       'player',
  }).select().single();
  if (error) throw error;
  return data;
}

// ── Group ────────────────────────────────────────────────────────────────────

export async function getGroup(groupId?: string) {
  // If specific groupId requested, fetch it directly
  if (groupId) {
    const { data } = await supabase.from('groups').select('*').eq('id', groupId).maybeSingle();
    return data ?? null;
  }
  // Otherwise find the first group the current user belongs to
  const currentPlayer = await getCurrentUser();
  if (currentPlayer) {
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('player_id', currentPlayer.id)
      .limit(1);
    const gid = memberships?.[0]?.group_id;
    if (gid) {
      const { data } = await supabase.from('groups').select('*').eq('id', gid).maybeSingle();
      if (data) return data;
    }
  }
  // Fallback: first group in DB
  const { data } = await supabase.from('groups').select('*').limit(1).maybeSingle();
  return data ?? null;
}

export async function getUserGroups(playerId: string) {
  // Two separate queries to avoid FK join issues
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, role')
    .eq('player_id', playerId);
  if (!memberships?.length) return [];

  const groupIds = memberships.map((m) => m.group_id);
  const { data: groups } = await supabase
    .from('groups')
    .select('*')
    .in('id', groupIds);

  return (groups ?? []).map((g) => ({
    ...g,
    myRole: memberships.find((m) => m.group_id === g.id)?.role ?? 'player',
  }));
}

export interface CreateGroupInput {
  name:        string;
  sport:       string;
  format?:     string;
  frequency?:  string;
  location?:   string;
  description?: string;
  memberIds?:  string[];
}

export async function createGroup(input: CreateGroupInput) {
  const id = `grp_${Date.now()}`;
  const meta = [input.sport, input.format, input.frequency]
    .filter(Boolean)
    .join(' · ');

  // Get current user's player record
  const currentPlayer = await getCurrentUser();
  if (!currentPlayer) throw new Error('Not logged in');

  const { data, error } = await supabase.from('groups').insert({
    id,
    name:        input.name,
    location:    input.location ?? '',
    description: input.description ? `${input.description}\n\n${meta}` : meta,
  }).select().single();
  if (error) throw error;

  // Add creator as owner in group_members
  await supabase.from('group_members').insert({
    id:        `mem_${Date.now()}`,
    group_id:  id,
    player_id: currentPlayer.id,
    role:      'owner',
    joined_at: new Date().toISOString(),
  });

  // Also update the player's role to admin if they aren't already
  if (currentPlayer.role === 'player') {
    await supabase.from('players').update({ role: 'admin' }).eq('id', currentPlayer.id);
  }

  return data;
}

// ── Matches ──────────────────────────────────────────────────────────────────

export async function getMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getNextMatch() {
  const { data: open } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'open')
    .order('date', { ascending: true })
    .limit(1);
  if (open?.length) return open[0];

  const { data: full } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'full')
    .order('date', { ascending: true })
    .limit(1);
  return full?.[0] ?? null;
}

export async function getMatchById(id: string) {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// ── Attendance ───────────────────────────────────────────────────────────────

export async function getAttendance(matchId: string) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('match_id', matchId);
  if (error) throw error;
  return data ?? [];
}

export async function upsertAttendance(matchId: string, playerId: string, status: string) {
  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('match_id', matchId)
    .eq('player_id', playerId)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('attendance')
      .update({ status })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.from('attendance').insert({
    id:        `att_${Date.now()}`,
    match_id:  matchId,
    player_id: playerId,
    status,
  }).select().single();
  if (error) throw error;
  return data;
}

// ── Guests ───────────────────────────────────────────────────────────────────

export async function getGuests(matchId: string) {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('match_id', matchId);
  if (error) throw error;
  return data ?? [];
}

export async function addGuest(guest: {
  matchId:                 string;
  sponsorId:               string;
  name:                    string;
  type:                    string;
  skillLevel:              string;
  requiresSponsorPresence: boolean;
}) {
  const { data, error } = await supabase.from('guests').insert({
    id:                       `guest_${Date.now()}`,
    match_id:                 guest.matchId,
    sponsor_id:               guest.sponsorId,
    name:                     guest.name,
    type:                     guest.type,
    skill_level:              guest.skillLevel,
    requires_sponsor_presence: guest.requiresSponsorPresence,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function removeGuest(guestId: string) {
  const { error } = await supabase.from('guests').delete().eq('id', guestId);
  if (error) throw error;
}

// ── Payments ─────────────────────────────────────────────────────────────────

export async function getPayments(matchId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('match_id', matchId);
  if (error) throw error;
  return data ?? [];
}

export async function getAllPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function markPayment(paymentId: string, status: string, method?: string) {
  const { data, error } = await supabase
    .from('payments')
    .update({ status, ...(method ? { method } : {}) })
    .eq('id', paymentId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── MOTM Votes ───────────────────────────────────────────────────────────────

export async function getMotmVotes(matchId: string) {
  const { data, error } = await supabase
    .from('motm_votes')
    .select('*')
    .eq('match_id', matchId);
  if (error) throw error;
  return data ?? [];
}

export async function castMotmVote(
  matchId:   string,
  voterId:   string,
  nomineeId: string,
  team:      'A' | 'B',
) {
  const { data: existing } = await supabase
    .from('motm_votes')
    .select('id')
    .eq('match_id', matchId)
    .eq('voter_id', voterId)
    .eq('team', team)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('motm_votes')
      .update({ nominee_id: nomineeId })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.from('motm_votes').insert({
    id:          `vote_${team}_${Date.now()}`,
    match_id:    matchId,
    voter_id:    voterId,
    nominee_id:  nomineeId,
    team,
  }).select().single();
  if (error) throw error;
  return data;
}

// ── Per-Player Stats ──────────────────────────────────────────────────────────

export async function getPlayerStats(playerId: string) {
  const { data: allAttendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('player_id', playerId);
  const attended = (allAttendance ?? []).filter((a) => a.status === 'yes');
  const playedMatchIds = attended.map((a) => a.match_id);

  const { data: allMatches } = await supabase
    .from('matches')
    .select('*')
    .order('date', { ascending: false });
  const closedMatches = (allMatches ?? []).filter((m) => m.status === 'closed');
  const matchesPlayed = closedMatches.filter((m) => playedMatchIds.includes(m.id));

  const { data: allVotes } = await supabase.from('motm_votes').select('*');
  let motmWins = 0;
  for (const match of closedMatches) {
    const matchVotes = (allVotes ?? []).filter((v) => v.match_id === match.id);
    for (const cat of ['A', 'B'] as const) {
      const catVotes = matchVotes.filter((v) => v.team === cat);
      if (catVotes.length === 0) continue;
      const tally: Record<string, number> = {};
      catVotes.forEach((v) => { tally[v.nominee_id] = (tally[v.nominee_id] ?? 0) + 1; });
      const max = Math.max(0, ...Object.values(tally));
      if (max > 0 && tally[playerId] === max) motmWins++;
    }
  }

  const attendanceRate =
    closedMatches.length > 0
      ? Math.round((matchesPlayed.length / closedMatches.length) * 100)
      : 0;

  let wins = 0, draws = 0, losses = 0;
  for (const match of matchesPlayed) {
    if (match.score_a === null || match.score_b === null) continue;
    const attRec = attended.find((a) => a.match_id === match.id);
    const team = attRec?.team;
    if (!team) continue;
    const myScore  = team === 'A' ? match.score_a : match.score_b;
    const oppScore = team === 'A' ? match.score_b : match.score_a;
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
      const attRec = attended.find((a) => a.match_id === m.id);
      return { ...m, myTeam: attRec?.team ?? null };
    }),
  };
}

// ── Batch player ratings (4 queries for all players) ─────────────────────────

export async function getAllPlayerRatings(): Promise<Record<string, number>> {
  const [
    { data: players },
    { data: allAttendance },
    { data: allMatches },
    { data: allVotes },
  ] = await Promise.all([
    supabase.from('players').select('*'),
    supabase.from('attendance').select('*'),
    supabase.from('matches').select('*').eq('status', 'closed'),
    supabase.from('motm_votes').select('*'),
  ]);

  const ratings: Record<string, number> = {};

  for (const player of players ?? []) {
    const attended = (allAttendance ?? []).filter(
      (a) => a.player_id === player.id && a.status === 'yes',
    );
    const playedMatchIds = attended.map((a) => a.match_id);
    const matchesPlayed  = (allMatches ?? []).filter((m) =>
      playedMatchIds.includes(m.id),
    );

    let motmWins = 0;
    for (const match of allMatches ?? []) {
      const matchVotes = (allVotes ?? []).filter((v) => v.match_id === match.id);
      for (const cat of ['A', 'B'] as const) {
        const catVotes = matchVotes.filter((v) => v.team === cat);
        if (catVotes.length === 0) continue;
        const tally: Record<string, number> = {};
        catVotes.forEach((v) => { tally[v.nominee_id] = (tally[v.nominee_id] ?? 0) + 1; });
        const max = Math.max(0, ...Object.values(tally));
        if (max > 0 && tally[player.id] === max) motmWins++;
      }
    }

    let wins = 0, totalGames = 0;
    for (const match of matchesPlayed) {
      if (match.score_a === null || match.score_b === null) continue;
      const rec  = attended.find((a) => a.match_id === match.id);
      const team = rec?.team;
      if (!team) continue;
      totalGames++;
      const mine = team === 'A' ? match.score_a : match.score_b;
      const opp  = team === 'A' ? match.score_b : match.score_a;
      if (mine > opp) wins++;
    }

    const attendanceRate = (allMatches ?? []).length > 0
      ? Math.round((matchesPlayed.length / (allMatches ?? []).length) * 100)
      : 0;

    ratings[player.id] = computeRating({
      skillLevel:    player.skill_level,
      motmWins,
      attendanceRate,
      wins,
      totalGames,
    });
  }

  return ratings;
}

// ── Team Generation (snake-draft by rating) ───────────────────────────────────

export async function generateTeams(matchId: string) {
  const [
    { data: attendance },
    { data: guests },
    ratings,
  ] = await Promise.all([
    supabase.from('attendance').select('*').eq('match_id', matchId).eq('status', 'yes'),
    supabase.from('guests').select('*').eq('match_id', matchId),
    getAllPlayerRatings(),
  ]);

  const playerIds = (attendance ?? []).map((a) => a.player_id);
  const sorted    = [...playerIds].sort((a, b) => (ratings[b] ?? 3) - (ratings[a] ?? 3));
  const { teamA, teamB } = snakeDraft(sorted);

  for (const id of teamA) {
    const rec = (attendance ?? []).find((a) => a.player_id === id);
    if (rec) await supabase.from('attendance').update({ team: 'A' }).eq('id', rec.id);
  }
  for (const id of teamB) {
    const rec = (attendance ?? []).find((a) => a.player_id === id);
    if (rec) await supabase.from('attendance').update({ team: 'B' }).eq('id', rec.id);
  }

  const guestList = guests ?? [];
  for (let i = 0; i < guestList.length; i++) {
    await supabase
      .from('guests')
      .update({ team: i % 2 === 0 ? 'A' : 'B' })
      .eq('id', guestList[i].id);
  }
}

// ── Match Scheduling ─────────────────────────────────────────────────────────

export interface CreateMatchInput {
  groupId:       string;
  date:          string;  // YYYY-MM-DD
  time:          string;  // HH:MM
  location:      string;
  costPerPlayer: number;
  notes?:        string;
  pitchName?:    string;
}

export async function createMatch(input: CreateMatchInput) {
  const { data, error } = await supabase.from('matches').insert({
    id:              `m_${Date.now()}`,
    group_id:        input.groupId,
    date:            input.date,
    time:            input.time,
    location:        input.location,
    cost_per_player: input.costPerPlayer,
    status:          'open',
    teams_locked:    false,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function lockTeams(matchId: string) {
  const { data, error } = await supabase
    .from('matches')
    .update({ teams_locked: true })
    .eq('id', matchId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function submitScore(matchId: string, scoreA: number, scoreB: number) {
  const { data, error } = await supabase
    .from('matches')
    .update({ score_a: scoreA, score_b: scoreB, status: 'closed' })
    .eq('id', matchId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Group Membership & Ownership ─────────────────────────────────────────────

export type GroupRole = 'owner' | 'admin' | 'player';

export interface GroupMember {
  memberId:    string;
  role:        GroupRole;
  joinedAt:    string;
  player_id:   string;
  id:          string;
  name:        string;
  position:    string;
  skill_level: string;
  user_id:     string | null;
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data: members, error } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId);
  if (error) throw error;
  if (!members?.length) return [];

  const playerIds = members.map((m) => m.player_id);
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .in('id', playerIds);

  return members.map((m) => {
    const player = (players ?? []).find((p) => p.id === m.player_id);
    return {
      memberId:    m.id,
      role:        (m.role ?? 'player') as GroupRole,
      joinedAt:    m.joined_at,
      player_id:   m.player_id,
      id:          player?.id          ?? m.player_id,
      name:        player?.name        ?? 'Unknown',
      position:    player?.position    ?? '',
      skill_level: player?.skill_level ?? 'intermediate',
      user_id:     player?.user_id     ?? null,
    };
  });
}

// Transfer ownership — calls the atomic Postgres function
export async function transferOwnership(
  groupId:             string,
  newOwnerPlayerId:    string,
  currentOwnerPlayerId: string,
) {
  const { data, error } = await supabase.rpc('transfer_group_ownership', {
    p_group_id:         groupId,
    p_new_owner_id:     newOwnerPlayerId,
    p_current_owner_id: currentOwnerPlayerId,
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error ?? 'Transfer failed');
  return data;
}

// Leave a group — removes the membership row only.
// Guard: owner cannot leave without transferring first.
export async function leaveGroup(groupId: string, playerId: string) {
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('player_id', playerId)
    .single();

  if (membership?.role === 'owner') {
    throw new Error('owner_must_transfer_first');
  }

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('player_id', playerId);
  if (error) throw error;
}

// Promote a player → admin (owner only)
export async function promoteToAdmin(groupId: string, playerId: string) {
  const { error } = await supabase
    .from('group_members')
    .update({ role: 'admin' })
    .eq('group_id', groupId)
    .eq('player_id', playerId)
    .eq('role', 'player');
  if (error) throw error;
}

// Demote an admin → player (owner only)
export async function demoteToPlayer(groupId: string, playerId: string) {
  const { error } = await supabase
    .from('group_members')
    .update({ role: 'player' })
    .eq('group_id', groupId)
    .eq('player_id', playerId)
    .eq('role', 'admin');
  if (error) throw error;
}

// New owner explicitly takes over billing responsibility
export async function takeBillingOwnership(groupId: string, playerId: string) {
  const { error } = await supabase
    .from('groups')
    .update({ billing_owner_id: playerId })
    .eq('id', groupId)
    .eq('owner_id', playerId);
  if (error) throw error;
}
