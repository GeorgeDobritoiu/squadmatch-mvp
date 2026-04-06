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

// ── Image Uploads ─────────────────────────────────────────────────────────────

/** Upload a player avatar and persist the public URL to their players row. */
export async function uploadPlayerAvatar(playerId: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = (uri.split('?')[0].split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${playerId}.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

  const { error: updateErr } = await supabase
    .from('players')
    .update({ avatar_url: publicUrl })
    .eq('id', playerId);
  if (updateErr) throw updateErr;

  return publicUrl;
}

/** Upload a team logo and persist the public URL to the groups row. */
export async function uploadTeamLogo(groupId: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = (uri.split('?')[0].split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${groupId}.${ext}`;

  const { error } = await supabase.storage
    .from('team-logos')
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from('team-logos').getPublicUrl(path);

  const { error: updateErr } = await supabase
    .from('groups')
    .update({ logo_url: publicUrl })
    .eq('id', groupId);
  if (updateErr) throw updateErr;

  return publicUrl;
}

// ── Group ────────────────────────────────────────────────────────────────────

export async function getGroup(groupId?: string) {
  if (groupId) {
    const { data } = await supabase.from('groups').select('*').eq('id', groupId).maybeSingle();
    return data ?? null;
  }
  // Fallback: first group in DB (used only when no groupId provided)
  const { data } = await supabase.from('groups').select('*').limit(1).maybeSingle();
  return data ?? null;
}

export async function getUserGroups(playerId: string) {
  // Groups via group_members rows
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, role')
    .eq('player_id', playerId);

  const memberGroupIds = (memberships ?? []).map((m) => m.group_id);

  // Also fetch ALL groups that have NO group_members rows at all (legacy groups created before membership tracking)
  const { data: allGroups } = await supabase.from('groups').select('*');
  const { data: allMemberships } = await supabase.from('group_members').select('group_id');
  const groupsWithMembers = new Set((allMemberships ?? []).map((m) => m.group_id));
  // Only include the single oldest legacy group (groups with no members at all).
  // Taking just 1 prevents test/duplicate groups from flooding the switcher.
  const legacyGroups = (allGroups ?? [])
    .filter((g) => !groupsWithMembers.has(g.id))
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 1);

  // Fetch groups the user is explicitly a member of
  const memberGroups = memberGroupIds.length > 0
    ? (allGroups ?? []).filter((g) => memberGroupIds.includes(g.id))
    : [];

  // Merge: explicit memberships + legacy groups (deduplicated)
  const seen = new Set<string>();
  const result = [];
  for (const g of [...memberGroups, ...legacyGroups]) {
    if (!seen.has(g.id)) {
      seen.add(g.id);
      result.push({
        ...g,
        myRole: memberships?.find((m) => m.group_id === g.id)?.role ?? 'player',
      });
    }
  }
  return result;
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

/**
 * Finalise a match: record pitch cost + actual player count,
 * calculate cost per head, create/update payment rows for every
 * player who attended (status = 'yes') plus guests.
 */
export async function finaliseMatch(
  matchId:       string,
  pitchCost:     number,
  actualPlayers: number,
) {
  const costPerPlayer = parseFloat((pitchCost / actualPlayers).toFixed(2));

  // 1. Update match row
  const { error: matchErr } = await supabase
    .from('matches')
    .update({
      pitch_cost:      pitchCost,
      actual_players:  actualPlayers,
      cost_per_player: costPerPlayer,
      status:          'closed',
    })
    .eq('id', matchId);
  if (matchErr) throw matchErr;

  // 2. Fetch confirmed attendees
  const { data: attendees } = await supabase
    .from('attendance')
    .select('player_id')
    .eq('match_id', matchId)
    .eq('status', 'yes');

  // 3. Fetch guests
  const { data: guests } = await supabase
    .from('guests')
    .select('id, sponsor_id')
    .eq('match_id', matchId);

  // 4. Build payment rows for players
  const playerIds = (attendees ?? []).map((a) => a.player_id);
  for (const playerId of playerIds) {
    // Upsert: update if exists, insert if not
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('match_id', matchId)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('payments')
        .update({ amount: costPerPlayer, status: 'pending' })
        .eq('id', existing.id);
    } else {
      await supabase.from('payments').insert({
        id:         `pay_${Date.now()}_${playerId}`,
        match_id:   matchId,
        player_id:  playerId,
        amount:     costPerPlayer,
        status:     'pending',
      });
    }
  }

  // 5. Payment rows for guests (billed to sponsor)
  for (const guest of guests ?? []) {
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('match_id', matchId)
      .eq('player_id', guest.sponsor_id)
      .eq('guest_id', guest.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('payments').insert({
        id:         `pay_${Date.now()}_g${guest.id}`,
        match_id:   matchId,
        player_id:  guest.sponsor_id,
        guest_id:   guest.id,
        amount:     costPerPlayer,
        status:     'pending',
      });
    }
  }

  return { costPerPlayer };
}

/** Mark a payment reminder as sent for unpaid players. */
export async function markReminderSent(paymentId: string) {
  const { error } = await supabase
    .from('payments')
    .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
    .eq('id', paymentId);
  if (error) throw error;
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

// Join a group via invite link (adds current user as player if not already a member)
export async function joinGroup(groupId: string): Promise<'joined' | 'already_member'> {
  const currentPlayer = await getCurrentUser();
  if (!currentPlayer) throw new Error('Not logged in');

  // Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('player_id', currentPlayer.id)
    .maybeSingle();

  if (existing) return 'already_member';

  const { error } = await supabase.from('group_members').insert({
    id:        `mem_${Date.now()}`,
    group_id:  groupId,
    player_id: currentPlayer.id,
    role:      'player',
    joined_at: new Date().toISOString(),
  });
  if (error) throw error;
  return 'joined';
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

/** Remove a player from a group (admin/owner action). Cannot remove another owner. */
export async function kickMember(groupId: string, playerId: string) {
  const { data: membership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (membership?.role === 'owner') {
    throw new Error('Cannot remove the group owner.');
  }

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('player_id', playerId);
  if (error) throw error;
}

/**
 * Delete a group entirely.
 * Guard: only allowed when the only remaining member is the owner (no other players/admins).
 */
export async function deleteGroup(groupId: string) {
  const { data: members } = await supabase
    .from('group_members')
    .select('player_id, role')
    .eq('group_id', groupId);

  const nonOwners = (members ?? []).filter((m) => m.role !== 'owner');
  if (nonOwners.length > 0) {
    throw new Error('Remove all members before deleting the group.');
  }

  // Delete membership rows first
  await supabase.from('group_members').delete().eq('group_id', groupId);
  // Delete the group
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
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
