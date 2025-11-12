import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/config';

type AuthSnapshot = {
  token: string | null;
  refreshToken: string | null;
  userId: string | null;
  userData: any | null;
  tokenIssuedAt: number | null;
};

type AuthEvent = 'authUpdate' | 'authClear';

type AuthListener = (event: AuthEvent, payload?: Partial<AuthSnapshot>) => void;

const listeners = new Set<AuthListener>();

const notify = (event: AuthEvent, payload?: Partial<AuthSnapshot>) => {
  listeners.forEach(listener => {
    try {
      listener(event, payload);
    } catch (error) {
      if (__DEV__) {
        console.warn('AuthStorage listener error:', error);
      }
    }
  });
};

const storageKeys = [
  STORAGE_KEYS.AUTH_TOKEN,
  STORAGE_KEYS.REFRESH_TOKEN,
  STORAGE_KEYS.USER_ID,
  STORAGE_KEYS.USER_DATA,
  STORAGE_KEYS.TOKEN_ISSUED_AT,
] as const;

const parseUserData = (raw: string | null): any | null => {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const authStorage = {
  subscribe(listener: AuthListener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async getSnapshot(): Promise<AuthSnapshot> {
    const entries = await AsyncStorage.multiGet(storageKeys as unknown as readonly string[]);
    const map = Object.fromEntries(entries);
    return {
      token: map[STORAGE_KEYS.AUTH_TOKEN] ?? null,
      refreshToken: map[STORAGE_KEYS.REFRESH_TOKEN] ?? null,
      userId: map[STORAGE_KEYS.USER_ID] ?? null,
      userData: parseUserData(map[STORAGE_KEYS.USER_DATA] ?? null),
      tokenIssuedAt: map[STORAGE_KEYS.TOKEN_ISSUED_AT]
        ? Number(map[STORAGE_KEYS.TOKEN_ISSUED_AT])
        : null,
    };
  },

  async setAuthData({
    token,
    refreshToken,
    userId,
    userData,
    tokenIssuedAt,
  }: Partial<AuthSnapshot>): Promise<void> {
    const operations: Array<[string, string]> = [];

    if (token !== undefined && token !== null) {
      operations.push([STORAGE_KEYS.AUTH_TOKEN, token]);
    }
    if (refreshToken !== undefined && refreshToken !== null) {
      operations.push([STORAGE_KEYS.REFRESH_TOKEN, refreshToken]);
    }
    if (userId !== undefined && userId !== null) {
      operations.push([STORAGE_KEYS.USER_ID, userId]);
    }
    if (userData !== undefined && userData !== null) {
      operations.push([STORAGE_KEYS.USER_DATA, JSON.stringify(userData)]);
    }
    if (tokenIssuedAt !== undefined && tokenIssuedAt !== null) {
      operations.push([STORAGE_KEYS.TOKEN_ISSUED_AT, String(tokenIssuedAt)]);
    }

    if (operations.length) {
      await AsyncStorage.multiSet(operations);
      notify('authUpdate', { token, refreshToken, userId, userData, tokenIssuedAt });
    }
  },

  async clearAuthData(options: { clearOnboarding?: boolean } = {}) {
    const keysToRemove = new Set<string>([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.TOKEN_ISSUED_AT,
    ]);

    if (options.clearOnboarding) {
      keysToRemove.add(STORAGE_KEYS.ONBOARDING_COMPLETED);
    }

    await AsyncStorage.multiRemove(Array.from(keysToRemove));
    notify('authClear');
  },

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  async setToken(token: string) {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    notify('authUpdate', { token });
  },

  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async getTokenIssuedAt(): Promise<number | null> {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_ISSUED_AT);
    return value ? Number(value) : null;
  },

  async setTokenIssuedAt(timestamp: number) {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_ISSUED_AT, String(timestamp));
    notify('authUpdate', { tokenIssuedAt: timestamp });
  },
};

export type AuthStorage = typeof authStorage;

