import type { Nutrients, Pace, BudgetDescription, Slot } from '../../shared/standing.ts';
import type { Targets, ActivityLevel, Goal, Sex } from '../../shared/targets.ts';

export type { Nutrients, Slot, Pace, BudgetDescription, Targets, ActivityLevel, Goal, Sex };

export interface EntryItem extends Nutrients {
  id: string;
  foodId: string | null;
  label: string;
  qty: number;
  unit: string;
  estimated: boolean;
  confidence: 'measured' | 'high' | 'medium' | 'low';
  edited: boolean;
}

export interface Entry {
  id: string;
  date: string;
  eatenAt: string;
  slot: Slot;
  note: string | null;
  source: 'manual' | 'repeat' | 'text' | 'photo';
  photoKey: string | null;
  items: EntryItem[];
  totals: Nutrients;
  estimated: boolean;
}

export interface EffectiveTargets extends Nutrients {
  waterMl: number;
}

export interface TargetPayload {
  calculated: Targets | null;
  effective: EffectiveTargets;
  overrides: Record<string, number | null>;
  basedOnWeightKg: number | null;
}

export interface Profile {
  displayName: string | null;
  sex: Sex;
  birthDate: string | null;
  heightCm: number | null;
  activity: ActivityLevel;
  goal: Goal;
  ratePctPerWeek: number;
  proteinGPerKg: number | null;
  timezone: string;
  useActiveEnergy: boolean;
  onboarded: boolean;
}

export interface Day {
  date: string;
  isToday: boolean;
  timezone: string;
  localHour: number;
  targets: TargetPayload;
  consumed: Nutrients;
  remaining: { kcal: number; protein: number; carbs: number; fat: number };
  pace: Pace;
  budget: BudgetDescription;
  entries: Entry[];
  water: { ml: number; targetMl: number };
  streak: { current: number; graceUsed: boolean };
}

export interface Me {
  user: { id: string; email: string };
  profile: Profile;
  targets: TargetPayload;
  today: string;
}

export interface Repeat {
  key: string;
  entryId: string;
  slot: Slot;
  labels: string;
  kcal: number;
  protein: number;
  count: number;
  lastAt: string;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    credentials: 'same-origin',
    headers: init.body ? { 'content-type': 'application/json' } : undefined,
    ...init,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? 'Something went wrong.');
  }
  return data as T;
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const api = {
  needsSetup: () => request<{ needsSetup: boolean }>('auth/needs-setup'),
  register: (email: string, password: string, signupCode?: string) =>
    post<{ ok: true }>('auth/register', {
      email, password, signupCode,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  login: (email: string, password: string) => post<{ ok: true }>('auth/login', { email, password }),
  logout: () => post<{ ok: true }>('auth/logout', {}),

  me: () => request<Me>('me'),
  saveProfile: (patch: Partial<Profile> & { weightKg?: number }) =>
    request<{ profile: Profile; targets: TargetPayload }>('profile', {
      method: 'PUT', body: JSON.stringify(patch),
    }),
  saveTargets: (patch: Record<string, number | null>) =>
    request<{ targets: TargetPayload }>('targets', { method: 'PUT', body: JSON.stringify(patch) }),

  day: (date?: string) => request<Day>(`day${date ? `?date=${date}` : ''}`),
  repeats: () => request<{ repeats: Repeat[] }>('repeats'),
  repeatItems: (entryId: string) =>
    request<{ slot: Slot; note: string | null; items: EntryItem[] }>(`repeats/${entryId}`),

  logEntry: (entry: {
    clientId: string;
    slot: Slot;
    note?: string;
    source?: string;
    eatenAt?: string;
    items: Array<Partial<Nutrients> & { label: string; qty?: number; unit?: string; foodId?: string; estimated?: boolean; confidence?: string }>;
  }) => post<{ id: string; date: string; duplicate?: boolean }>('entries', entry),

  editItem: (entryId: string, itemId: string, patch: Partial<Nutrients> & { label?: string; qty?: number }) =>
    request<{ ok: true }>(`entries/${entryId}`, { method: 'PATCH', body: JSON.stringify({ itemId, ...patch }) }),
  deleteEntry: (entryId: string) => request<{ ok: true }>(`entries/${entryId}`, { method: 'DELETE' }),

  addWater: (ml: number, clientId: string) => post<{ ml: number }>('water', { ml, clientId }),
  addWeight: (weightKg: number, date?: string) => post<{ ok: true }>('weights', { weightKg, date }),
};
