import test from 'node:test';
import assert from 'node:assert';
import {
  deriveStealthKeysFromGun,
  generateStealthAddress,
  checkStealthAddress
} from './stealthCore.ts';

test('deriveStealthKeysFromGun - deterministic derivation', () => {
  const seaEpriv = 'test-sea-epriv-123';
  const keys1 = deriveStealthKeysFromGun(seaEpriv);
  const keys2 = deriveStealthKeysFromGun(seaEpriv);

  assert.deepStrictEqual(keys1, keys2, 'Derivation should be deterministic');
});

test('deriveStealthKeysFromGun - different inputs produce different keys', () => {
  const keys1 = deriveStealthKeysFromGun('input-1');
  const keys2 = deriveStealthKeysFromGun('input-2');

  assert.notDeepStrictEqual(keys1, keys2, 'Different inputs should produce different keys');
});

test('deriveStealthKeysFromGun - correct output format', () => {
  const seaEpriv = 'test-key-format';
  const keys = deriveStealthKeysFromGun(seaEpriv);

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

test('deriveStealthKeysFromGun - known test vector', () => {
  const seaEpriv = 'test';
  const keys = deriveStealthKeysFromGun(seaEpriv);

  // Expected values derived from keccak256 of:
  // neural: "test"
  // viewing: "SHIP-03-VIEWINGtest"
  // spending: "SHIP-03-SPENDINGtest"
  assert.strictEqual(keys.neuralPriv, '0x36f028580bb02cc8272a9a020f4200e346e276ae664e45ee80745574e2f5ab80');
  assert.strictEqual(keys.spending.priv, '0x9d96b5898b9ab85263b7d51b2b69ad96e500df23b4df34240622e2aeb4941efa');
  assert.strictEqual(keys.viewing.priv, '0xa76cc59b56e70aa8d0bce531994197ce99e7741713bf1eeb06a9195e939afb59');
});

test('deriveStealthKeysFromGun - throws for invalid types', () => {
  const invalidInputs = [null, undefined, 123, {}, [], true];

  for (const input of invalidInputs) {
    assert.throws(
      () => deriveStealthKeysFromGun(input as any),
      { message: /seaEpriv must be a string/ },
      `Should throw for input type: ${typeof input}`
    );
  }
});

test('deriveStealthKeysFromGun - throws for empty string or whitespace', () => {
  const emptyInputs = ['', ' ', '\t\n'];

  for (const input of emptyInputs) {
    assert.throws(
      () => deriveStealthKeysFromGun(input),
      { message: /seaEpriv cannot be empty/ },
      `Should throw for empty or whitespace input: "${input}"`
    );
  }
});

// --- checkStealthAddress tests ---

test('checkStealthAddress - happy path (match)', () => {
  const keys = deriveStealthKeysFromGun('test-match');
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

  assert.strictEqual(isMine, true, 'Should match own stealth address');
});

test('checkStealthAddress - no match (wrong recipient)', () => {
  const keysA = deriveStealthKeysFromGun('recipient-A');
  const keysB = deriveStealthKeysFromGun('recipient-B');

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

  assert.strictEqual(isMine, false, 'Should not match another recipient\'s address');
});

test('checkStealthAddress - error handling: invalid length key', () => {
  const keys = deriveStealthKeysFromGun('test-error');
  const invalidLengthKey = '0x1234'; // Too short

  const isMine = checkStealthAddress(
    invalidLengthKey,
    keys.viewing.priv,
    keys.spending.priv,
    '0x0000000000000000000000000000000000000000'
  );

  assert.strictEqual(isMine, false, 'Should return false for invalid length key');
});

test('checkStealthAddress - error handling: invalid hex characters', () => {
  const keys = deriveStealthKeysFromGun('test-error');
  const invalidHexKey = '0x' + 'G'.repeat(64); // Non-hex G

  const isMine = checkStealthAddress(
    invalidHexKey,
    keys.viewing.priv,
    keys.spending.priv,
    '0x0000000000000000000000000000000000000000'
  );

  assert.strictEqual(isMine, false, 'Should return false for invalid hex key');
});

test('checkStealthAddress - error handling: invalid elliptic curve point', () => {
  const keys = deriveStealthKeysFromGun('test-error');
  // Valid length but likely invalid point (too many f's)
  const invalidPointKey = '0x02' + 'f'.repeat(64);

  const isMine = checkStealthAddress(
    invalidPointKey,
    keys.viewing.priv,
    keys.spending.priv,
    '0x0000000000000000000000000000000000000000'
  );

  assert.strictEqual(isMine, false, 'Should return false for invalid EC point');
});
