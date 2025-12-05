/**
 * Character Sharing Module
 * ========================
 * Handles public and user-to-user character sharing.
 * Generates share links, tracks views, and manages permissions.
 */

import type { Character } from '$types';

/** Share visibility options. */
export type ShareVisibility = 'private' | 'link' | 'public';

/** Share permission level. */
export type SharePermission = 'view' | 'copy' | 'edit';

/** Public share configuration. */
export interface PublicShare {
	readonly id: string;
	readonly characterId: string;
	readonly ownerId: string;
	readonly visibility: ShareVisibility;
	readonly shareCode: string;
	readonly createdAt: string;
	readonly expiresAt: string | null;
	readonly viewCount: number;
	readonly copyCount: number;
	readonly lastViewedAt: string | null;
	readonly enabled: boolean;
}

/** User-to-user share invitation. */
export interface ShareInvitation {
	readonly id: string;
	readonly characterId: string;
	readonly fromUserId: string;
	readonly toUserId: string;
	readonly permission: SharePermission;
	readonly status: 'pending' | 'accepted' | 'declined' | 'revoked';
	readonly createdAt: string;
	readonly respondedAt: string | null;
	readonly message: string;
}

/** Shared character access record. */
export interface SharedCharacterAccess {
	readonly characterId: string;
	readonly userId: string;
	readonly permission: SharePermission;
	readonly sharedAt: string;
	readonly sharedBy: string;
}

/** Share statistics. */
export interface ShareStats {
	readonly totalViews: number;
	readonly uniqueViews: number;
	readonly copies: number;
	readonly activeShares: number;
	readonly viewsByDay: { date: string; count: number }[];
}

/** Share link data for display. */
export interface ShareLinkData {
	readonly shareCode: string;
	readonly fullUrl: string;
	readonly qrDataUrl: string | null;
	readonly expiresAt: string | null;
}

/**
 * Generate a unique share code.
 * Uses crypto.randomUUID and takes first segment + random suffix.
 */
export function generateShareCode(): string {
	const uuid = crypto.randomUUID();
	const base = uuid.split('-')[0];
	const suffix = Math.random().toString(36).substring(2, 6);
	return `${base}${suffix}`.toLowerCase();
}

/**
 * Create a share URL from a share code.
 */
export function createShareUrl(shareCode: string, baseUrl?: string): string {
	const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://chummer.app');
	return `${base}/share/${shareCode}`;
}

/**
 * Parse a share URL to extract the share code.
 */
export function parseShareUrl(url: string): string | null {
	const match = url.match(/\/share\/([a-z0-9]+)$/i);
	return match ? match[1].toLowerCase() : null;
}

/**
 * Create a new public share for a character.
 */
export function createPublicShare(
	characterId: string,
	ownerId: string,
	options: {
		visibility?: ShareVisibility;
		expiresInDays?: number | null;
	} = {}
): PublicShare {
	const now = new Date().toISOString();
	const expiresAt = options.expiresInDays
		? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
		: null;

	return {
		id: crypto.randomUUID(),
		characterId,
		ownerId,
		visibility: options.visibility || 'link',
		shareCode: generateShareCode(),
		createdAt: now,
		expiresAt,
		viewCount: 0,
		copyCount: 0,
		lastViewedAt: null,
		enabled: true
	};
}

/**
 * Record a view on a public share.
 */
export function recordView(share: PublicShare): PublicShare {
	return {
		...share,
		viewCount: share.viewCount + 1,
		lastViewedAt: new Date().toISOString()
	};
}

/**
 * Record a copy on a public share.
 */
export function recordCopy(share: PublicShare): PublicShare {
	return {
		...share,
		copyCount: share.copyCount + 1
	};
}

/**
 * Check if a share is valid (not expired and enabled).
 */
export function isShareValid(share: PublicShare): boolean {
	if (!share.enabled) return false;
	if (share.expiresAt && new Date(share.expiresAt) < new Date()) return false;
	return true;
}

/**
 * Toggle share enabled state.
 */
export function toggleShareEnabled(share: PublicShare): PublicShare {
	return {
		...share,
		enabled: !share.enabled
	};
}

/**
 * Update share visibility.
 */
export function updateShareVisibility(share: PublicShare, visibility: ShareVisibility): PublicShare {
	return {
		...share,
		visibility
	};
}

/**
 * Regenerate share code (invalidates old links).
 */
export function regenerateShareCode(share: PublicShare): PublicShare {
	return {
		...share,
		shareCode: generateShareCode(),
		viewCount: 0,
		copyCount: 0,
		lastViewedAt: null
	};
}

/**
 * Create a user-to-user share invitation.
 */
export function createShareInvitation(
	characterId: string,
	fromUserId: string,
	toUserId: string,
	permission: SharePermission,
	message: string = ''
): ShareInvitation {
	return {
		id: crypto.randomUUID(),
		characterId,
		fromUserId,
		toUserId,
		permission,
		status: 'pending',
		createdAt: new Date().toISOString(),
		respondedAt: null,
		message
	};
}

/**
 * Accept a share invitation.
 */
export function acceptInvitation(invitation: ShareInvitation): ShareInvitation {
	return {
		...invitation,
		status: 'accepted',
		respondedAt: new Date().toISOString()
	};
}

/**
 * Decline a share invitation.
 */
export function declineInvitation(invitation: ShareInvitation): ShareInvitation {
	return {
		...invitation,
		status: 'declined',
		respondedAt: new Date().toISOString()
	};
}

/**
 * Revoke a share invitation.
 */
export function revokeInvitation(invitation: ShareInvitation): ShareInvitation {
	return {
		...invitation,
		status: 'revoked',
		respondedAt: new Date().toISOString()
	};
}

/**
 * Create an access record from an accepted invitation.
 */
export function createAccessFromInvitation(invitation: ShareInvitation): SharedCharacterAccess | null {
	if (invitation.status !== 'accepted') return null;

	return {
		characterId: invitation.characterId,
		userId: invitation.toUserId,
		permission: invitation.permission,
		sharedAt: invitation.respondedAt || new Date().toISOString(),
		sharedBy: invitation.fromUserId
	};
}

/**
 * Check if a user can perform an action based on permission.
 */
export function canPerformAction(
	permission: SharePermission | undefined,
	action: 'view' | 'copy' | 'edit'
): boolean {
	if (!permission) return false;

	switch (action) {
		case 'view':
			return true; // All permissions allow viewing
		case 'copy':
			return permission === 'copy' || permission === 'edit';
		case 'edit':
			return permission === 'edit';
		default:
			return false;
	}
}

/**
 * Get permission level as number for comparison.
 */
export function getPermissionLevel(permission: SharePermission): number {
	switch (permission) {
		case 'view': return 1;
		case 'copy': return 2;
		case 'edit': return 3;
		default: return 0;
	}
}

/**
 * Format view count for display.
 */
export function formatViewCount(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1000000) return `${Math.floor(count / 1000)}k`;
	return `${(count / 1000000).toFixed(1)}M`;
}

/**
 * Format relative time for last viewed.
 */
export function formatLastViewed(dateStr: string | null): string {
	if (!dateStr) return 'Never';

	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSecs < 60) return 'Just now';
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

	return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Prepare character for sharing (strip sensitive data).
 */
export function prepareCharacterForSharing(character: Character): Character {
	// For now, we share the full character
	// In the future, we might want to strip certain fields
	return {
		...character,
		// Clear any user-specific metadata if needed
	};
}

/**
 * Copy character for a user (creates a new character with new IDs).
 */
export function copyCharacterForUser(character: Character, newUserId: string): Character {
	const now = new Date().toISOString();
	const newId = crypto.randomUUID();

	return {
		...character,
		id: newId,
		userId: newUserId,
		identity: {
			...character.identity,
			name: `${character.identity.name} (Copy)`
		},
		createdAt: now,
		updatedAt: now
	};
}

/** Storage key for shares. */
const SHARES_STORAGE_KEY = 'chummer-shares';
const INVITATIONS_STORAGE_KEY = 'chummer-invitations';
const ACCESS_STORAGE_KEY = 'chummer-shared-access';

/**
 * Load public shares from localStorage.
 */
export function loadPublicShares(): PublicShare[] {
	try {
		const stored = localStorage.getItem(SHARES_STORAGE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

/**
 * Save public shares to localStorage.
 */
export function savePublicShares(shares: PublicShare[]): void {
	try {
		localStorage.setItem(SHARES_STORAGE_KEY, JSON.stringify(shares));
	} catch (e) {
		console.error('Failed to save shares:', e);
	}
}

/**
 * Load invitations from localStorage.
 */
export function loadInvitations(): ShareInvitation[] {
	try {
		const stored = localStorage.getItem(INVITATIONS_STORAGE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

/**
 * Save invitations to localStorage.
 */
export function saveInvitations(invitations: ShareInvitation[]): void {
	try {
		localStorage.setItem(INVITATIONS_STORAGE_KEY, JSON.stringify(invitations));
	} catch (e) {
		console.error('Failed to save invitations:', e);
	}
}

/**
 * Load shared access records from localStorage.
 */
export function loadSharedAccess(): SharedCharacterAccess[] {
	try {
		const stored = localStorage.getItem(ACCESS_STORAGE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

/**
 * Save shared access records to localStorage.
 */
export function saveSharedAccess(access: SharedCharacterAccess[]): void {
	try {
		localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(access));
	} catch (e) {
		console.error('Failed to save shared access:', e);
	}
}

/**
 * Get shares for a specific character.
 */
export function getSharesForCharacter(characterId: string): PublicShare[] {
	return loadPublicShares().filter(s => s.characterId === characterId);
}

/**
 * Get share by code.
 */
export function getShareByCode(shareCode: string): PublicShare | null {
	const shares = loadPublicShares();
	return shares.find(s => s.shareCode === shareCode) || null;
}
