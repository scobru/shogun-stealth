
import { describe, it, expect } from 'vitest';
import { isValidEthAmount, isValidEthAddress, isValidRecipient, sanitizeAlias } from './validation';

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
});
