/**
 * Sharing Module Tests
 * ====================
 * Tests for public and user-to-user character sharing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	generateShareCode,
	createShareUrl,
	parseShareUrl,
	createPublicShare,
	recordView,
	recordCopy,
	isShareValid,
	toggleShareEnabled,
	updateShareVisibility,
	regenerateShareCode,
	createShareInvitation,
	acceptInvitation,
	declineInvitation,
	revokeInvitation,
	createAccessFromInvitation,
	canPerformAction,
	getPermissionLevel,
	formatViewCount,
	formatLastViewed,
	copyCharacterForUser,
	type PublicShare,
	type ShareInvitation
} from '../sharing';
import { createEmptyCharacter } from '$types';

describe('Sharing Module', () => {
	describe('generateShareCode', () => {
		it('generates unique codes', () => {
			const codes = new Set<string>();
			for (let i = 0; i < 100; i++) {
				codes.add(generateShareCode());
			}
			expect(codes.size).toBe(100);
		});

		it('generates lowercase alphanumeric codes', () => {
			const code = generateShareCode();
			expect(code).toMatch(/^[a-z0-9]+$/);
		});

		it('generates codes of reasonable length', () => {
			const code = generateShareCode();
			expect(code.length).toBeGreaterThanOrEqual(10);
			expect(code.length).toBeLessThanOrEqual(16);
		});
	});

	describe('createShareUrl', () => {
		it('creates URL with share code', () => {
			const url = createShareUrl('abc123', 'https://example.com');
			expect(url).toBe('https://example.com/share/abc123');
		});

		it('uses default base URL when not provided', () => {
			const url = createShareUrl('abc123');
			expect(url).toContain('/share/abc123');
		});
	});

	describe('parseShareUrl', () => {
		it('extracts share code from valid URL', () => {
			const code = parseShareUrl('https://example.com/share/abc123xyz');
			expect(code).toBe('abc123xyz');
		});

		it('returns null for invalid URL', () => {
			expect(parseShareUrl('https://example.com/other/page')).toBeNull();
			expect(parseShareUrl('not a url')).toBeNull();
		});

		it('normalizes to lowercase', () => {
			const code = parseShareUrl('https://example.com/share/ABC123XYZ');
			expect(code).toBe('abc123xyz');
		});
	});

	describe('createPublicShare', () => {
		it('creates share with default options', () => {
			const share = createPublicShare('char-1', 'user-1');

			expect(share.characterId).toBe('char-1');
			expect(share.ownerId).toBe('user-1');
			expect(share.visibility).toBe('link');
			expect(share.shareCode).toBeTruthy();
			expect(share.viewCount).toBe(0);
			expect(share.copyCount).toBe(0);
			expect(share.enabled).toBe(true);
			expect(share.expiresAt).toBeNull();
		});

		it('creates share with custom visibility', () => {
			const share = createPublicShare('char-1', 'user-1', { visibility: 'public' });
			expect(share.visibility).toBe('public');
		});

		it('creates share with expiration', () => {
			const share = createPublicShare('char-1', 'user-1', { expiresInDays: 7 });
			expect(share.expiresAt).toBeTruthy();

			const expiresDate = new Date(share.expiresAt!);
			const expectedDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
			expect(Math.abs(expiresDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
		});
	});

	describe('recordView', () => {
		it('increments view count', () => {
			const share = createPublicShare('char-1', 'user-1');
			const updated = recordView(share);

			expect(updated.viewCount).toBe(1);
			expect(updated.lastViewedAt).toBeTruthy();
		});

		it('updates last viewed timestamp', () => {
			const share = createPublicShare('char-1', 'user-1');
			const updated = recordView(share);

			expect(updated.lastViewedAt).toBeTruthy();
			const lastViewed = new Date(updated.lastViewedAt!);
			expect(Date.now() - lastViewed.getTime()).toBeLessThan(1000);
		});
	});

	describe('recordCopy', () => {
		it('increments copy count', () => {
			const share = createPublicShare('char-1', 'user-1');
			const updated = recordCopy(share);

			expect(updated.copyCount).toBe(1);
		});
	});

	describe('isShareValid', () => {
		it('returns true for enabled share without expiration', () => {
			const share = createPublicShare('char-1', 'user-1');
			expect(isShareValid(share)).toBe(true);
		});

		it('returns false for disabled share', () => {
			const share = toggleShareEnabled(createPublicShare('char-1', 'user-1'));
			expect(isShareValid(share)).toBe(false);
		});

		it('returns false for expired share', () => {
			const share: PublicShare = {
				...createPublicShare('char-1', 'user-1'),
				expiresAt: new Date(Date.now() - 1000).toISOString()
			};
			expect(isShareValid(share)).toBe(false);
		});

		it('returns true for non-expired share', () => {
			const share = createPublicShare('char-1', 'user-1', { expiresInDays: 7 });
			expect(isShareValid(share)).toBe(true);
		});
	});

	describe('toggleShareEnabled', () => {
		it('toggles enabled state', () => {
			const share = createPublicShare('char-1', 'user-1');
			expect(share.enabled).toBe(true);

			const disabled = toggleShareEnabled(share);
			expect(disabled.enabled).toBe(false);

			const enabled = toggleShareEnabled(disabled);
			expect(enabled.enabled).toBe(true);
		});
	});

	describe('updateShareVisibility', () => {
		it('updates visibility', () => {
			const share = createPublicShare('char-1', 'user-1');
			const updated = updateShareVisibility(share, 'public');
			expect(updated.visibility).toBe('public');
		});
	});

	describe('regenerateShareCode', () => {
		it('generates new share code', () => {
			const share = createPublicShare('char-1', 'user-1');
			const oldCode = share.shareCode;

			const updated = regenerateShareCode(share);
			expect(updated.shareCode).not.toBe(oldCode);
		});

		it('resets view and copy counts', () => {
			let share = createPublicShare('char-1', 'user-1');
			share = recordView(share);
			share = recordCopy(share);

			const updated = regenerateShareCode(share);
			expect(updated.viewCount).toBe(0);
			expect(updated.copyCount).toBe(0);
			expect(updated.lastViewedAt).toBeNull();
		});
	});

	describe('Share Invitations', () => {
		it('creates invitation with correct fields', () => {
			const invitation = createShareInvitation('char-1', 'user-1', 'user-2', 'view', 'Check this out!');

			expect(invitation.characterId).toBe('char-1');
			expect(invitation.fromUserId).toBe('user-1');
			expect(invitation.toUserId).toBe('user-2');
			expect(invitation.permission).toBe('view');
			expect(invitation.status).toBe('pending');
			expect(invitation.message).toBe('Check this out!');
		});

		it('accepts invitation', () => {
			const invitation = createShareInvitation('char-1', 'user-1', 'user-2', 'view');
			const accepted = acceptInvitation(invitation);

			expect(accepted.status).toBe('accepted');
			expect(accepted.respondedAt).toBeTruthy();
		});

		it('declines invitation', () => {
			const invitation = createShareInvitation('char-1', 'user-1', 'user-2', 'view');
			const declined = declineInvitation(invitation);

			expect(declined.status).toBe('declined');
			expect(declined.respondedAt).toBeTruthy();
		});

		it('revokes invitation', () => {
			const invitation = createShareInvitation('char-1', 'user-1', 'user-2', 'view');
			const revoked = revokeInvitation(invitation);

			expect(revoked.status).toBe('revoked');
			expect(revoked.respondedAt).toBeTruthy();
		});
	});

	describe('createAccessFromInvitation', () => {
		it('creates access from accepted invitation', () => {
			const invitation = acceptInvitation(
				createShareInvitation('char-1', 'user-1', 'user-2', 'copy')
			);

			const access = createAccessFromInvitation(invitation);

			expect(access).toBeTruthy();
			expect(access!.characterId).toBe('char-1');
			expect(access!.userId).toBe('user-2');
			expect(access!.permission).toBe('copy');
			expect(access!.sharedBy).toBe('user-1');
		});

		it('returns null for pending invitation', () => {
			const invitation = createShareInvitation('char-1', 'user-1', 'user-2', 'view');
			expect(createAccessFromInvitation(invitation)).toBeNull();
		});

		it('returns null for declined invitation', () => {
			const invitation = declineInvitation(
				createShareInvitation('char-1', 'user-1', 'user-2', 'view')
			);
			expect(createAccessFromInvitation(invitation)).toBeNull();
		});
	});

	describe('canPerformAction', () => {
		it('view permission allows only viewing', () => {
			expect(canPerformAction('view', 'view')).toBe(true);
			expect(canPerformAction('view', 'copy')).toBe(false);
			expect(canPerformAction('view', 'edit')).toBe(false);
		});

		it('copy permission allows view and copy', () => {
			expect(canPerformAction('copy', 'view')).toBe(true);
			expect(canPerformAction('copy', 'copy')).toBe(true);
			expect(canPerformAction('copy', 'edit')).toBe(false);
		});

		it('edit permission allows all actions', () => {
			expect(canPerformAction('edit', 'view')).toBe(true);
			expect(canPerformAction('edit', 'copy')).toBe(true);
			expect(canPerformAction('edit', 'edit')).toBe(true);
		});

		it('undefined permission allows nothing', () => {
			expect(canPerformAction(undefined, 'view')).toBe(false);
		});
	});

	describe('getPermissionLevel', () => {
		it('returns correct levels', () => {
			expect(getPermissionLevel('view')).toBe(1);
			expect(getPermissionLevel('copy')).toBe(2);
			expect(getPermissionLevel('edit')).toBe(3);
		});
	});

	describe('formatViewCount', () => {
		it('formats small numbers', () => {
			expect(formatViewCount(0)).toBe('0');
			expect(formatViewCount(999)).toBe('999');
		});

		it('formats thousands', () => {
			expect(formatViewCount(1000)).toBe('1.0k');
			expect(formatViewCount(1500)).toBe('1.5k');
			expect(formatViewCount(9999)).toBe('10.0k');
		});

		it('formats large thousands', () => {
			expect(formatViewCount(10000)).toBe('10k');
			expect(formatViewCount(999999)).toBe('999k');
		});

		it('formats millions', () => {
			expect(formatViewCount(1000000)).toBe('1.0M');
			expect(formatViewCount(1500000)).toBe('1.5M');
		});
	});

	describe('formatLastViewed', () => {
		it('returns Never for null', () => {
			expect(formatLastViewed(null)).toBe('Never');
		});

		it('returns Just now for recent', () => {
			const now = new Date().toISOString();
			expect(formatLastViewed(now)).toBe('Just now');
		});

		it('formats minutes ago', () => {
			const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
			expect(formatLastViewed(fiveMinAgo)).toBe('5m ago');
		});

		it('formats hours ago', () => {
			const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
			expect(formatLastViewed(threeHoursAgo)).toBe('3h ago');
		});

		it('formats days ago', () => {
			const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
			expect(formatLastViewed(twoDaysAgo)).toBe('2d ago');
		});

		it('formats weeks ago', () => {
			const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
			expect(formatLastViewed(twoWeeksAgo)).toBe('2w ago');
		});
	});

	describe('copyCharacterForUser', () => {
		it('creates new character with new ID', () => {
			const original = createEmptyCharacter('char-1', 'user-1');
			const copy = copyCharacterForUser(original, 'user-2');

			expect(copy.id).not.toBe(original.id);
			expect(copy.userId).toBe('user-2');
		});

		it('appends (Copy) to name', () => {
			const original = {
				...createEmptyCharacter('char-1', 'user-1'),
				identity: {
					...createEmptyCharacter('char-1', 'user-1').identity,
					name: 'Test Character'
				}
			};
			const copy = copyCharacterForUser(original, 'user-2');

			expect(copy.identity.name).toBe('Test Character (Copy)');
		});

		it('sets new timestamps', () => {
			/* Create original with explicit old timestamp */
			const oldDate = '2020-01-01T00:00:00.000Z';
			const original = {
				...createEmptyCharacter('char-1', 'user-1'),
				createdAt: oldDate,
				updatedAt: oldDate
			};
			const copy = copyCharacterForUser(original, 'user-2');

			expect(copy.createdAt).not.toBe(oldDate);
			expect(copy.updatedAt).not.toBe(oldDate);
		});
	});
});
