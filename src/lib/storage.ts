import { Platform } from 'react-native';

class MemoryStorage {
  private data: Record<string, string> = {};

  getString(key: string): string | undefined {
    return this.data[key];
  }

  set(key: string, value: string): void {
    this.data[key] = value;
  }

  delete(key: string): void {
    delete this.data[key];
  }

  clearAll(): void {
    this.data = {};
  }
}

let storageInstance: {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
  clearAll: () => void;
};

try {
  if (Platform.OS !== 'web') {
    const { MMKV } = require('react-native-mmkv');
    storageInstance = new MMKV({ id: 'gomzansi-offline-store' });
  } else {
    storageInstance = new MemoryStorage();
  }
} catch {
  storageInstance = new MemoryStorage();
}

export const appStorage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const raw = storageInstance.getString(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  },

  set: (key: string, value: any): void => {
    try {
      storageInstance.set(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage set error:', e);
    }
  },

  remove: (key: string): void => {
    try {
      storageInstance.delete(key);
    } catch (e) {
      console.warn('Storage remove error:', e);
    }
  },

  clear: (): void => {
    try {
      storageInstance.clearAll();
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
  },
};
