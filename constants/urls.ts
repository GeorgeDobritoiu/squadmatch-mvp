/**
 * Central URL constants for SquadPlay.
 * Change APP_BASE_URL here when the custom domain is ready.
 */
export const APP_BASE_URL = 'https://squadplay--squadplay.expo.app';

/**
 * Generates a shareable invite link for a group.
 * Recipients land on /join/[groupId] — the sign-up + join flow for new members.
 * Format: https://squadplay--squadplay.expo.app/join/GROUP_ID
 */
export function buildInviteLink(groupId: string, groupName: string): string {
  return `${APP_BASE_URL}/join/${groupId}`;
}
