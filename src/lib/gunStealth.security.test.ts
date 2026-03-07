import { describe, it, expect, vi } from 'vitest';
import { publishStealthKeys, publishAnnouncement } from './gunStealth';
import { StealthKeys, StealthAnnouncement } from './stealthCore';

// Mock Gun
const mockGun = () => {
    const chain = {
        get: vi.fn().mockReturnThis(),
        put: vi.fn().mockImplementation((data, cb) => {
            if (cb) cb({ err: null });
            return chain;
        }),
        map: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        once: vi.fn().mockReturnThis(),
        off: vi.fn(),
    };
    return chain as any;
};

describe('GunStealth Security Tests', () => {
    describe('publishStealthKeys', () => {
        const validKeys: StealthKeys = {
            spending: { pub: '0x028d7500dd4c126d2d652928cb08d571dc4052f6f3630689b0d1e2e921316531d0', priv: '0x...' },
            viewing: { pub: '0x038d7500dd4c126d2d652928cb08d571dc4052f6f3630689b0d1e2e921316531d0', priv: '0x...' },
            neuralPriv: '0x...'
        };

        it('should reject invalid alias (XSS vector)', async () => {
            const gun = mockGun();
            const maliciousAlias = '<script>alert(1)</script>';

            await expect(publishStealthKeys(gun, 'pubkey', validKeys, maliciousAlias))
                .rejects.toThrow('Invalid stealth registry entry');
        });

        it('should reject invalid spending public key', async () => {
            const gun = mockGun();
            const invalidKeys = {
                ...validKeys,
                spending: { ...validKeys.spending, pub: '0xbadkey' }
            };

            await expect(publishStealthKeys(gun, 'pubkey', invalidKeys, 'valid.alias'))
                .rejects.toThrow('Invalid stealth registry entry');
        });
    });

    describe('publishAnnouncement', () => {
        const validAnnouncement: Omit<StealthAnnouncement, "id" | "timestamp"> = {
            ephemeralPubKey: '0x028d7500dd4c126d2d652928cb08d571dc4052f6f3630689b0d1e2e921316531d0',
            stealthAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
            viewTag: '0x1234',
            metadata: 'some metadata'
        };

        it('should reject invalid ephemeral public key', async () => {
            const gun = mockGun();
            const invalidAnnouncement = {
                ...validAnnouncement,
                ephemeralPubKey: '0xbadkey'
            };

            await expect(publishAnnouncement(gun, invalidAnnouncement))
                .rejects.toThrow('Invalid stealth announcement');
        });

        it('should reject oversized metadata (DoS vector)', async () => {
            const gun = mockGun();
            const hugeMetadata = 'a'.repeat(5000); // > 4096
            const invalidAnnouncement = {
                ...validAnnouncement,
                metadata: hugeMetadata
            };

            await expect(publishAnnouncement(gun, invalidAnnouncement))
                .rejects.toThrow('Invalid stealth announcement');
        });
    });
});
