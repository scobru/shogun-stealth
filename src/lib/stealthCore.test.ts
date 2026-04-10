import test from 'node:test';
import assert from 'node:assert';
import {
  deriveStealthKeysFromGun,
  generateStealthAddress,
  checkStealthAddress
} from './stealthCore.ts';

test('deriveStealthKeysFromGun - deterministic derivation', async () => {
  const seaEpriv = 'test-sea-epriv-123';
  const keys1 = await deriveStealthKeysFromGun(seaEpriv);
  const keys2 = await deriveStealthKeysFromGun(seaEpriv);

  assert.deepStrictEqual(keys1, keys2, 'Derivation should be deterministic');
});

test('deriveStealthKeysFromGun - different inputs produce different keys', async () => {
  const keys1 = await deriveStealthKeysFromGun('input-1-entropy-16');
  const keys2 = await deriveStealthKeysFromGun('input-2-entropy-16');

  assert.notDeepStrictEqual(keys1, keys2, 'Different inputs should produce different keys');
});

test('deriveStealthKeysFromGun - correct output format', async () => {
  const seaEpriv = 'test-key-format-16';
  const keys = await deriveStealthKeysFromGun(seaEpriv);

  // Neural identity
  assert.ok(keys.neuralPriv.startsWith('0x'), 'neuralPriv should start with 0x');
  assert.strictEqual(keys.neuralPriv.length, 66, 'neuralPriv should be 66 characters long (0x + 64 hex chars)');

  // Spending keys
  assert.ok(keys.spending.priv.startsWith('0x'), 'spending private key should start with 0x');
  assert.ok(keys.spending.pub.startsWith('0x'), 'spending public key should start with 0x');
  assert.strictEqual(keys.spending.priv.length, 66, 'spending private key should be 66 characters long');
  assert.strictEqual(keys.spending.pub.length, 68, 'spending public key should be 68 characters long (0x + 33 bytes)');

  // Viewing keys
  assert.ok(keys.viewing.priv.startsWith('0x'), 'viewing private key should start with 0x');
  assert.ok(keys.viewing.pub.startsWith('0x'), 'viewing public key should start with 0x');
  assert.strictEqual(keys.viewing.priv.length, 66, 'viewing private key should be 66 characters long');
  assert.strictEqual(keys.viewing.pub.length, 68, 'viewing public key should be 68 characters long (0x + 33 bytes)');
});

test('deriveStealthKeysFromGun - known test vector', async () => {
  const seaEpriv = 'test-vector-entropy-16';
  const keys = await deriveStealthKeysFromGun(seaEpriv);

  // Expected values from HKDF-SHA256 (SEA Wallet v1) via shogun-core
  assert.strictEqual(keys.neuralPriv, '0x63503ac648c58861d3243b218e36f789ff3a12ddc1e77fc9589f29569b27cf59');
  assert.strictEqual(keys.spending.priv, '0xc0a48b8da855c424539aacdc92f5e1bd5fdb781b9f9f28ef36ea968d9ba74c07');
  assert.strictEqual(keys.viewing.priv, '0x91bb1298c021daf3631dd23ab5f4b36497bdc06b9b174984dd0ee7266d51dd47');
});

test('deriveStealthKeysFromGun - throws for invalid types', async () => {
  const invalidInputs = [null, undefined, 123, {}, [], true];

  for (const input of invalidInputs) {
    try {
      await deriveStealthKeysFromGun(input as any);
      assert.fail(`Should have thrown for input type: ${typeof input}`);
    } catch (e: any) {
      assert.match(e.message, /seaEpriv must be a string/, `Wrong error message for ${typeof input}`);
    }
  }
});

test('deriveStealthKeysFromGun - throws for empty string or whitespace', async () => {
  const emptyInputs = ['', ' ', '\t\n'];

  for (const input of emptyInputs) {
    try {
      await deriveStealthKeysFromGun(input);
      assert.fail(`Should have thrown for empty input: "${input}"`);
    } catch (e: any) {
      assert.match(e.message, /seaEpriv cannot be empty/, `Wrong error message for empty input: "${input}"`);
    }
  }
});

// --- checkStealthAddress tests ---

test('checkStealthAddress - happy path (match)', async () => {
  const keys = await deriveStealthKeysFromGun('test-match-entropy-16');
  const { stealthAddress, ephemeralPubKey, viewTag } = generateStealthAddress(
    keys.spending.pub,
    keys.viewing.pub
  );

  const isMine = checkStealthAddress(
    ephemeralPubKey,
    keys.viewing.priv,
    keys.spending.priv,
    stealthAddress,
    viewTag
  );

  assert.ok(isMine, 'Should match own stealth address');
});

test('checkStealthAddress - no match (wrong recipient)', async () => {
  const keysA = await deriveStealthKeysFromGun('recipient-A-entropy-16');
  const keysB = await deriveStealthKeysFromGun('recipient-B-entropy-16');

  // Sender generates for A
  const { stealthAddress, ephemeralPubKey, viewTag } = generateStealthAddress(
    keysA.spending.pub,
    keysA.viewing.pub
  );

  // B scans
  const isMine = checkStealthAddress(
    ephemeralPubKey,
    keysB.viewing.priv,
    keysB.spending.priv,
    stealthAddress,
    viewTag
  );

  assert.strictEqual(isMine, null, 'Should return null for non-owned address');
});

test('checkStealthAddress - error handling: invalid length key', async () => {
  const keys = await deriveStealthKeysFromGun('test-error-entropy-16');
  const invalidLengthKey = '0x1234'; // Too short

  const isMine = checkStealthAddress(
    invalidLengthKey,
    keys.viewing.priv,
    keys.spending.priv,
    '0x0000000000000000000000000000000000000000'
  );

  assert.strictEqual(isMine, null, 'Should return null for invalid length key');
});
