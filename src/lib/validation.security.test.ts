
import { describe, it, expect } from 'vitest';
import { isValidStealthAnnouncement, isValidStealthRegistryEntry } from './validation';

describe('Validation Security Tests', () => {
    const validAnnouncement = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ephemeralPubKey: '0x028d7500dd4c126d2d652928cb08d571dc4052f6f3630689b0d1e2e921316531d0', // 66 chars
        stealthAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        viewTag: '0x1234',
        timestamp: 1678886400000
    };

    describe('isValidStealthAnnouncement - Length Checks', () => {
        it('should reject ephemeralPubKey with invalid length', () => {
            // Too short (valid hex, but invalid length for public key)
            expect(isValidStealthAnnouncement({
                ...validAnnouncement,
                ephemeralPubKey: '0x1234567890'
            })).toBe(false);

            // Too long
            expect(isValidStealthAnnouncement({
                ...validAnnouncement,
                ephemeralPubKey: '0x' + 'a'.repeat(200)
            })).toBe(false);
        });

        it('should reject excessively long metadata', () => {
            const longMetadata = 'a'.repeat(5000); // 5KB > 4KB limit
            expect(isValidStealthAnnouncement({
                ...validAnnouncement,
                metadata: longMetadata
            })).toBe(false);
        });
    });

    describe('isValidStealthAnnouncement - Content Safety', () => {
        it('should accept safe metadata', () => {
            const safeMetadata = '0x1234567890abcdef'; // Valid Hex
            expect(isValidStealthAnnouncement({
                ...validAnnouncement,
                metadata: safeMetadata
            })).toBe(true);

            const safeText = 'This is a simple text message.';
            expect(isValidStealthAnnouncement({
                ...validAnnouncement,
                metadata: safeText
            })).toBe(true);

             const safePunctuation = 'Base64+Encoding/Is=Safe?';
             expect(isValidStealthAnnouncement({
                ...validAnnouncement,
                metadata: safePunctuation
            })).toBe(true);
        });

        it('should reject metadata with HTML injection vectors', () => {
            expect(isValidStealthAnnouncement({
                ...validAnnouncement,
                metadata: '<script>alert(1)</script>'
            })).toBe(false);

            expect(isValidStealthAnnouncement({
                ...validAnnouncement,
                metadata: 'User <bold>Name</bold>'
            })).toBe(false);

            expect(isValidStealthAnnouncement({
                ...validAnnouncement,
                metadata: '<img src=x onerror=alert(1)>'
            })).toBe(false);
        });

         it('should reject metadata with partial tags', () => {
            expect(isValidStealthAnnouncement({
                ...validAnnouncement,
                metadata: 'malicious < script'
            })).toBe(false);
             expect(isValidStealthAnnouncement({
                ...validAnnouncement,
                metadata: 'malicious > script'
            })).toBe(false);
        });
    });

    describe('isValidStealthRegistryEntry - Length Checks', () => {
        const validEntry = {
            spendingPubKey: '0x028d7500dd4c126d2d652928cb08d571dc4052f6f3630689b0d1e2e921316531d0',
            viewingPubKey: '0x038d7500dd4c126d2d652928cb08d571dc4052f6f3630689b0d1e2e921316531d0',
            pub: 'valid.gun.key.123',
            alias: 'valid.alias',
            updatedAt: 1678886400000
        };

        it('should reject spendingPubKey with invalid length', () => {
            expect(isValidStealthRegistryEntry({
                ...validEntry,
                spendingPubKey: '0x1234'
            })).toBe(false);
        });

        it('should reject viewingPubKey with invalid length', () => {
            expect(isValidStealthRegistryEntry({
                ...validEntry,
                viewingPubKey: '0x1234'
            })).toBe(false);
        });
    });
});
