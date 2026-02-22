
import { describe, it, expect } from 'vitest';
import { isValidEthAmount, isValidEthAddress, isValidRecipient, sanitizeAlias, isValidStealthAnnouncement } from './validation';

describe('Validation Utils', () => {
  describe('isValidEthAmount', () => {
    it('should return true for valid positive amounts', () => {
      expect(isValidEthAmount('0.01')).toBe(true);
      expect(isValidEthAmount('100')).toBe(true);
      expect(isValidEthAmount('0.000000000000000001')).toBe(true);
    });

    it('should return false for invalid or non-positive amounts', () => {
      expect(isValidEthAmount('0')).toBe(false);
      expect(isValidEthAmount('-1')).toBe(false);
      expect(isValidEthAmount('abc')).toBe(false);
      expect(isValidEthAmount('')).toBe(false);
    });
  });

  describe('isValidEthAddress', () => {
    it('should validate correct ETH addresses', () => {
      expect(isValidEthAddress('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')).toBe(true);
    });

    it('should reject invalid ETH addresses', () => {
      expect(isValidEthAddress('0x71C7656EC7ab88b098defB751B7401B5f6d8976G')).toBe(false);
      expect(isValidEthAddress('not-an-address')).toBe(false);
    });
  });

  describe('isValidRecipient', () => {
    it('should accept valid ETH addresses', () => {
      expect(isValidRecipient('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')).toBe(true);
    });

    it('should accept strings longer than 3 chars (aliases/keys)', () => {
      expect(isValidRecipient('user')).toBe(true);
      expect(isValidRecipient('neuro.shogun')).toBe(true);
      expect(isValidRecipient('someLongKey12345')).toBe(true);
    });

    it('should reject short strings', () => {
      expect(isValidRecipient('abc')).toBe(false);
      expect(isValidRecipient('')).toBe(false);
    });
  });

  describe('sanitizeAlias', () => {
    it('should allow alphanumeric and specific special chars', () => {
      expect(sanitizeAlias('user123')).toBe('user123');
      expect(sanitizeAlias('valid.alias-123')).toBe('valid.alias-123');
    });

    it('should remove unsafe characters', () => {
      expect(sanitizeAlias('user<script>')).toBe('userscript');
      expect(sanitizeAlias('user!@#$%')).toBe('user');
    });

    it('should truncate long aliases', () => {
      const longAlias = 'a'.repeat(40);
      expect(sanitizeAlias(longAlias).length).toBe(32);
    });
  });

  describe('isValidStealthAnnouncement', () => {
    const validAnnouncement = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      ephemeralPubKey: '0x028d7500dd4c126d2d652928cb08d571dc4052f6f3630689b0d1e2e921316531d0',
      stealthAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      viewTag: '0x1234',
      timestamp: 1678886400000
    };

    it('should return true for valid announcement', () => {
      expect(isValidStealthAnnouncement(validAnnouncement)).toBe(true);
    });

    it('should return true for valid announcement with metadata', () => {
      expect(isValidStealthAnnouncement({ ...validAnnouncement, metadata: 'some-encrypted-data' })).toBe(true);
    });

    it('should return false for missing fields', () => {
      const { id, ...missingId } = validAnnouncement;
      expect(isValidStealthAnnouncement(missingId)).toBe(false);

      const { ephemeralPubKey, ...missingKey } = validAnnouncement;
      expect(isValidStealthAnnouncement(missingKey)).toBe(false);
    });

    it('should return false for invalid types', () => {
      expect(isValidStealthAnnouncement({ ...validAnnouncement, id: 123 })).toBe(false);
      expect(isValidStealthAnnouncement({ ...validAnnouncement, timestamp: 'now' })).toBe(false);
    });

    it('should return false for invalid hex strings', () => {
      expect(isValidStealthAnnouncement({ ...validAnnouncement, ephemeralPubKey: 'not-hex' })).toBe(false);
      expect(isValidStealthAnnouncement({ ...validAnnouncement, viewTag: 'not-hex' })).toBe(false);
    });

    it('should return false for invalid eth address', () => {
      expect(isValidStealthAnnouncement({ ...validAnnouncement, stealthAddress: '0xInvalid' })).toBe(false);
    });

    it('should return false for non-object', () => {
        expect(isValidStealthAnnouncement(null)).toBe(false);
        expect(isValidStealthAnnouncement(undefined)).toBe(false);
        expect(isValidStealthAnnouncement("string")).toBe(false);
    });
  });
});
