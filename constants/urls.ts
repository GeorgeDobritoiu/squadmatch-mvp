/**
 * Central URL constants for SquadPlay.
 * Change APP_BASE_URL here when the custom domain is ready.
 */
export const APP_BASE_URL = 'https://squadplay--squadplay.expo.app';

/**
 * Generates a shareable invite link for a group.
 * Format: https://squadplay--squadplay.expo.app/group-invite?groupId=ID&groupName=NAME
 */
export function buildInviteLink(groupId: string, groupName: string): string {
  return `${APP_BASE_URL}/group-invite?groupId=${groupId}&groupName=${encodeURIComponent(groupName)}`;
}
