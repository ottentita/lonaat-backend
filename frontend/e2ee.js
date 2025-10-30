/**
 * Client-Side End-to-End Encryption for Bank Details
 * Uses AES-256-GCM encryption before sending sensitive data to backend
 */

/**
 * Generate a random encryption key from password
 * @param {string} password - Password or passphrase
 * @param {Uint8Array} salt - Salt for key derivation
 * @returns {Promise<CryptoKey>} - Derived encryption key
 */
async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt bank details using AES-256-GCM
 * @param {Object} bankDetails - Object containing bank_name, account_name, account_number
 * @returns {Promise<Object>} - Object with encrypted_data, iv, salt (all base64 encoded)
 */
async function encryptBankDetails(bankDetails) {
    try {
        // Generate random password for this encryption
        const password = window.crypto.getRandomValues(new Uint8Array(32));
        const passwordStr = Array.from(password).map(b => b.toString(16).padStart(2, '0')).join('');

        // Generate random salt and IV
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        // Derive encryption key
        const key = await deriveKey(passwordStr, salt);

        // Convert bank details to JSON string
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(bankDetails));

        // Encrypt data
        const encryptedData = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            data
        );

        // Convert to base64 for transmission
        const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
        const ivBase64 = btoa(String.fromCharCode(...iv));
        const saltBase64 = btoa(String.fromCharCode(...salt));

        return {
            encrypted_data: encryptedBase64,
            iv: ivBase64,
            salt: saltBase64
        };
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt bank details');
    }
}

/**
 * Decrypt bank details (for testing - backend handles actual decryption)
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {string} ivBase64 - Base64 encoded IV
 * @param {string} saltBase64 - Base64 encoded salt
 * @param {string} password - Password used for encryption
 * @returns {Promise<Object>} - Decrypted bank details object
 */
async function decryptBankDetails(encryptedData, ivBase64, saltBase64, password) {
    try {
        // Convert from base64
        const encrypted = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
        const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
        const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));

        // Derive key
        const key = await deriveKey(password, salt);

        // Decrypt
        const decryptedData = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encrypted
        );

        // Convert back to object
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(decryptedData);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt bank details');
    }
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        encryptBankDetails,
        decryptBankDetails
    };
}
