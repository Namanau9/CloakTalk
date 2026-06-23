/**
 * CloakTalk E2E Encryption Utilities
 * 
 * Uses Web Crypto API:
 * - ECDH (P-256) for key exchange
 * - HKDF-SHA256 for key derivation
 * - AES-GCM (256-bit) for message encryption
 * - PBKDF2 for PIN-based key derivation
 */

// Generate an ECDH key pair
export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );

  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return {
    publicKey: publicKeyJwk,
    privateKey: privateKeyJwk,
  };
}

// Import a JWK-formatted private key
async function importPrivateKey(jwk) {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey', 'deriveBits']
  );
}

// Import a JWK-formatted public key
async function importPublicKey(jwk) {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

// Derive a shared secret using ECDH
async function deriveSharedSecret(privateKeyJwk, publicKeyJwk) {
  const privateKey = await importPrivateKey(privateKeyJwk);
  const publicKey = await importPublicKey(publicKeyJwk);

  const sharedBits = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    256
  );

  return sharedBits;
}

// Derive an AES-GCM key from shared secret using HKDF
async function deriveEncryptionKey(sharedBits, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    sharedBits,
    'HKDF',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: new TextEncoder().encode('CloakTalk-E2E-v1'),
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt a message for a specific recipient
export async function encryptMessage(plaintext, privateKeyJwk, recipientPublicKeyJwk) {
  try {
    const sharedBits = await deriveSharedSecret(privateKeyJwk, recipientPublicKeyJwk);

    // Generate random salt for HKDF
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptionKey = await deriveEncryptionKey(sharedBits, salt);

    const encoded = new TextEncoder().encode(plaintext);
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      encryptionKey,
      encoded
    );

    // Combine salt + encrypted data (salt needed for decryption)
    const combined = new Uint8Array(salt.length + encrypted.byteLength);
    combined.set(salt);
    combined.set(new Uint8Array(encrypted), salt.length);

    return {
      ciphertext: arrayBufferToBase64(combined),
      iv: arrayBufferToBase64(iv),
    };
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('Failed to encrypt message');
  }
}

// Decrypt a message from a specific sender
export async function decryptMessage(ciphertextB64, ivB64, privateKeyJwk, senderPublicKeyJwk) {
  try {
    const sharedBits = await deriveSharedSecret(privateKeyJwk, senderPublicKeyJwk);

    const combined = base64ToArrayBuffer(ciphertextB64);
    const iv = base64ToArrayBuffer(ivB64);

    // Extract salt from the beginning
    const salt = combined.slice(0, 32);
    const encryptedData = combined.slice(32);

    const encryptionKey = await deriveEncryptionKey(sharedBits, salt);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      encryptionKey,
      encryptedData
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Failed to decrypt message');
  }
}

// Encrypt private key with PIN using PBKDF2 + AES-GCM
export async function encryptPrivateKey(privateKeyJwk, pin) {
  try {
    const encoder = new TextEncoder();
    const pinBytes = encoder.encode(pin);

    // Generate random salt for PBKDF2
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Derive key from PIN
    const keyMaterial = await crypto.subtle.importKey('raw', pinBytes, 'PBKDF2', false, [
      'deriveKey',
    ]);

    const encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const privateKeyJson = JSON.stringify(privateKeyJwk);
    const encoded = encoder.encode(privateKeyJson);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      encryptionKey,
      encoded
    );

    // Store salt + iv + ciphertext
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return arrayBufferToBase64(combined);
  } catch (err) {
    console.error('Private key encryption failed:', err);
    throw new Error('Failed to encrypt private key');
  }
}

// Decrypt private key with PIN
export async function decryptPrivateKey(encryptedDataB64, pin) {
  try {
    const combined = base64ToArrayBuffer(encryptedDataB64);

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encryptedData = combined.slice(28);

    const encoder = new TextEncoder();
    const pinBytes = encoder.encode(pin);

    const keyMaterial = await crypto.subtle.importKey('raw', pinBytes, 'PBKDF2', false, [
      'deriveKey',
    ]);

    const decryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      decryptionKey,
      encryptedData
    );

    const privateKeyJson = new TextDecoder().decode(decrypted);
    return JSON.parse(privateKeyJson);
  } catch (err) {
    console.error('Private key decryption failed:', err);
    throw new Error('Wrong PIN');
  }
}

// Generate a random session ID
export function generateSessionId() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Utility: ArrayBuffer to Base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Utility: Base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Check if crypto is available
export function isCryptoAvailable() {
  return typeof crypto !== 'undefined' && crypto.subtle !== undefined;
}

// Check if the user has a keypair stored
export function hasStoredKeys() {
  const encryptedKey = localStorage.getItem('cloaktalk_encrypted_private_key');
  const publicKey = localStorage.getItem('cloaktalk_public_key');
  return !!(encryptedKey && publicKey);
}

// Store encrypted private key and public key
export function storeKeys(encryptedPrivateKey, publicKeyJwk) {
  localStorage.setItem('cloaktalk_encrypted_private_key', encryptedPrivateKey);
  localStorage.setItem('cloaktalk_public_key', JSON.stringify(publicKeyJwk));
}

// Check if PIN is set
export function isPinSet() {
  return !!localStorage.getItem('cloaktalk_encrypted_private_key');
}

// Get stored public key
export function getStoredPublicKey() {
  const key = localStorage.getItem('cloaktalk_public_key');
  return key ? JSON.parse(key) : null;
}

// Clear all stored keys (logout)
export function clearKeys() {
  localStorage.removeItem('cloaktalk_encrypted_private_key');
  localStorage.removeItem('cloaktalk_public_key');
}
