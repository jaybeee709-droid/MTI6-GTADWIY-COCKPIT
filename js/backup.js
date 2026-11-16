/* MTI6-GTADWIY-COCKPIT — Encrypted local backup system
 * Uses the browser's native Web Crypto API: PBKDF2 key derivation + AES-GCM.
 * Everything happens on-device. Nothing is ever uploaded anywhere.
 */
(function (global) {
  "use strict";

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function bufToB64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function b64ToBuf(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  async function deriveKey(passphrase, saltBytes) {
    const baseKey = await crypto.subtle.importKey(
      "raw",
      enc.encode(passphrase),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: saltBytes, iterations: 210000, hash: "SHA-256" },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  const Backup = {
    /**
     * Produces an encrypted backup file payload (a JSON envelope) as a string,
     * ready to be saved with Blob + <a download>.
     */
    async createEncryptedExport(passphrase) {
      if (!passphrase || passphrase.length < 4) {
        throw new Error("Choose a passphrase of at least 4 characters to protect your backup.");
      }
      const data = await CockpitDB.exportAll();
      const plaintext = enc.encode(JSON.stringify(data));

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(passphrase, salt);
      const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

      const envelope = {
        app: "MTI6-GTADWIY-COCKPIT",
        format: "cockpit-encrypted-backup",
        version: 1,
        algo: "AES-GCM-256/PBKDF2-SHA256-210000",
        salt: bufToB64(salt),
        iv: bufToB64(iv),
        ciphertext: bufToB64(cipherBuf),
        createdAt: new Date().toISOString()
      };
      return JSON.stringify(envelope, null, 2);
    },

    async decryptImport(fileText, passphrase) {
      let envelope;
      try {
        envelope = JSON.parse(fileText);
      } catch (e) {
        throw new Error("That file isn't a valid backup (not readable JSON).");
      }
      if (envelope.format !== "cockpit-encrypted-backup") {
        throw new Error("That file isn't a MTI6-GTADWIY-COCKPIT backup.");
      }
      const salt = new Uint8Array(b64ToBuf(envelope.salt));
      const iv = new Uint8Array(b64ToBuf(envelope.iv));
      const key = await deriveKey(passphrase, salt);
      let plainBuf;
      try {
        plainBuf = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          key,
          b64ToBuf(envelope.ciphertext)
        );
      } catch (e) {
        throw new Error("Wrong passphrase, or the backup file is corrupted.");
      }
      const json = dec.decode(plainBuf);
      return JSON.parse(json);
    },

    downloadTextFile(filename, text) {
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  };

  global.CockpitBackup = Backup;
})(window);
