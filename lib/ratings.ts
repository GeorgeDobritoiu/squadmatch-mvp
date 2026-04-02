/**
 * SquadPlay — Player Rating & Team Balancing
 *
 * Rating formula (0.0 – 10.0):
 *   Base score    → skill level (Low=3.0, Medium=5.5, High=8.0)
 *   MOTM bonus    → +0.4 per win, capped at +1.5
 *   Attendance    → ≥80%: +0.5 | ≥60%: +0.25 | <60%: 0
 *   Win-rate      → only counted after 3+ games; (wins/total) × 0.5
 *
 * Team balancing uses a "snake draft":
 *   Players sorted by rating desc → [P1, P2, P3, P4, P5, P6, ...]
 *   Round 1: A←P1, B←P2
 *   Round 2: B←P3, A←P4   ← direction flips each round
 *   Round 3: A←P5, B←P6
 *   This minimises the difference in total team rating.
 */

// ── Base scores ───────────────────────────────────────────────────────────────

export const SKILL_BASE: Record<string, number> = {
  Low:    3.0,
  Medium: 5.5,
  High:   8.0,
};

// ── Core formula ──────────────────────────────────────────────────────────────

export interface RatingInput {
  skillLevel:    string;
  motmWins:      number;
  attendanceRate: number; // 0-100
  wins:          number;
  totalGames:    number;  // games with a result (wins+draws+losses)
}

export function computeRating(p: RatingInput): number {
  const base         = SKILL_BASE[p.skillLevel] ?? 3.0;
  const motmBonus    = Math.min(p.motmWins * 0.4, 1.5);
  const attendBonus  = p.attendanceRate >= 80 ? 0.5
                     : p.attendanceRate >= 60 ? 0.25
                     : 0;
  const winBonus     = p.totalGames >= 3
                     ? (p.wins / p.totalGames) * 0.5
                     : 0;

  const raw = base + motmBonus + attendBonus + winBonus;
  return Math.min(Math.round(raw * 10) / 10, 10);
}

// ── Display helpers ───────────────────────────────────────────────────────────

export function getRatingColor(score: number): string {
  if (score >= 8)   return '#16A34A'; // green  — Elite
  if (score >= 6.5) return '#2563EB'; // blue   — Good
  if (score >= 4.5) return '#D97706'; // amber  — Average
  return '#6B7280';                   // grey   — Developing
}

export function getRatingLabel(score: number): string {
  if (score >= 8)   return 'Elite';
  if (score >= 6.5) return 'Good';
  if (score >= 4.5) return 'Average';
  return 'Developing';
}

// ── Snake draft ───────────────────────────────────────────────────────────────

/**
 * Given a list of items already sorted by strength (best first),
 * distribute them into two teams so the total strengths are as equal
 * as possible.
 *
 * Pattern (index → team):
 *   0→A  1→B  2→B  3→A  4→A  5→B  6→B  7→A  …
 */
export function snakeDraft<T>(sorted: T[]): { teamA: T[]; teamB: T[] } {
  const teamA: T[] = [];
  const teamB: T[] = [];

  sorted.forEach((item, i) => {
    const round      = Math.floor(i / 2);   // 0,0,1,1,2,2,...
    const posInRound = i % 2;               // 0,1,0,1,0,1,...
    // even round → A gets the first pick; odd round → B gets first pick
    const isTeamA    = round % 2 === 0
      ? posInRound === 0
      : posInRound === 1;

    if (isTeamA) teamA.push(item);
    else         teamB.push(item);
  });

  return { teamA, teamB };
}

// ── Balance summary ───────────────────────────────────────────────────────────

export interface TeamBalance {
  teamATotal:  number;
  teamBTotal:  number;
  difference:  number;    // |A − B|, lower is better
  isBalanced:  boolean;   // difference ≤ 1.5
}

export function evaluateBalance(
  teamA: number[],
  teamB: number[],
): TeamBalance {
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const aTotal = Math.round(sum(teamA) * 10) / 10;
  const bTotal = Math.round(sum(teamB) * 10) / 10;
  const diff   = Math.round(Math.abs(aTotal - bTotal) * 10) / 10;
  return {
    teamATotal: aTotal,
    teamBTotal: bTotal,
    difference: diff,
    isBalanced: diff <= 1.5,
  };
}
