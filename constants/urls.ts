/**
 * Central URL constants for SquadPlay.
 * Change APP_BASE_URL here when the custom domain is ready.
 */
export const APP_BASE_URL = 'https://squadplay--squadplay.expo.app';

/**
 * Generates a shareable invite link for a group.
 * Recipients land on the join screen where they can sign up and join instantly.
 */
export function buildInviteLink(groupId: string, groupName: string): string {
  return `${APP_BASE_URL}/join/${groupId}`;
}
