/**
 * Plan feature gating utilities.
 * FREE  — basic matches, random teams, send/mark payments
 * PRO   — + balanced teams, ratings, MOTM, payment reminders, history/stats
 * SQUAD+— + everything PRO + larger groups
 */

export type Plan = 'free' | 'pro' | 'squad_plus';

const PLAN_RANK: Record<Plan, number> = {
  free:       0,
  pro:        1,
  squad_plus: 2,
};

export function planAtLeast(current: Plan | undefined, required: Plan): boolean {
  return PLAN_RANK[current ?? 'free'] >= PLAN_RANK[required];
}

// Feature flags
export const FEATURES = {
  balancedTeams:      (plan?: Plan) => planAtLeast(plan, 'pro'),
  playerRatings:      (plan?: Plan) => planAtLeast(plan, 'pro'),
  motmVoting:         (plan?: Plan) => planAtLeast(plan, 'pro'),
  paymentReminders:   (plan?: Plan) => planAtLeast(plan, 'pro'),
  matchHistory:       (plan?: Plan) => planAtLeast(plan, 'pro'),
  matchStats:         (plan?: Plan) => planAtLeast(plan, 'pro'),
} as const;
