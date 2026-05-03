export const browserUserStorageKey = 'reset_loop_user_id';
export const browserUsersStorageKey = 'reset_loop_users';

export interface BrowserUser {
  id: string;
  name: string;
  role?: 'admin' | 'user';
}

function readBrowserUsers() {
  try {
    const rawUsers = window.localStorage.getItem(browserUsersStorageKey);
    if (!rawUsers) return [];
    const parsedUsers = JSON.parse(rawUsers);
    if (!Array.isArray(parsedUsers)) return [];

    const users: BrowserUser[] = parsedUsers
      .filter((user): user is BrowserUser => (
        typeof user?.id === 'string' &&
        typeof user?.name === 'string' &&
        user.id.length > 0 &&
        user.name.trim().length > 0
      ))
      .map((user) => ({
        id: user.id,
        name: user.name,
        role: user.role === 'admin' ? 'admin' as const : 'user' as const,
      }));

    const normalizedUsers = normalizeBrowserUsers(users);
    if (JSON.stringify(normalizedUsers) !== JSON.stringify(users)) {
      writeBrowserUsers(normalizedUsers);
    }
    return normalizedUsers;
  } catch {
    return [];
  }
}

function writeBrowserUsers(users: BrowserUser[]) {
  window.localStorage.setItem(browserUsersStorageKey, JSON.stringify(users));
}

function normalizeBrowserUsers(users: BrowserUser[]): BrowserUser[] {
  if (users.length === 0) return users;

  const adminIndex = users.findIndex((user) => user.role === 'admin');
  const defaultAccountIndex = users.findIndex((user) => user.name.trim().toLowerCase() === 'friend');
  const firstAccountIndex = adminIndex >= 0
    ? adminIndex
    : defaultAccountIndex >= 0
      ? defaultAccountIndex
      : users.length - 1;

  return users.map((user, index) => (
    index === firstAccountIndex
      ? { ...user, name: 'Aoife N', role: 'admin' as const }
      : { ...user, role: user.role === 'admin' ? 'user' as const : user.role ?? 'user' as const }
  ));
}

export function getStoredBrowserUsers() {
  return readBrowserUsers();
}

export function hasActiveBrowserUser() {
  const activeUserId = window.localStorage.getItem(browserUserStorageKey);
  if (!activeUserId) return false;

  return readBrowserUsers().some((user) => user.id === activeUserId);
}

export function getBrowserUsers() {
  const activeUserId = getOrCreateBrowserUserId();
  const users = readBrowserUsers();
  if (users.some((user) => user.id === activeUserId)) return users;

  const nextUser: BrowserUser = {
    id: activeUserId,
    name: users.length === 0 ? 'Aoife N' : 'Friend',
    role: users.length === 0 ? 'admin' : 'user',
  };
  const nextUsers = normalizeBrowserUsers([nextUser, ...users]);
  writeBrowserUsers(nextUsers);
  return nextUsers;
}

export function getOrCreateBrowserUserId() {
  let existing = window.localStorage.getItem(browserUserStorageKey);
  if (!existing) {
    existing = crypto.randomUUID();
    window.localStorage.setItem(browserUserStorageKey, existing);
  }
  if (readBrowserUsers().length === 0) {
    writeBrowserUsers([{ id: existing, name: 'Aoife N', role: 'admin' }]);
  }
  return existing;
}

export function getCurrentBrowserUser() {
  const activeUserId = getOrCreateBrowserUserId();
  return getBrowserUsers().find((user) => user.id === activeUserId) ?? { id: activeUserId, name: 'Aoife N', role: 'admin' };
}

export function createBrowserUser(name: string) {
  const trimmedName = name.trim() || 'Friend';
  const users = readBrowserUsers();
  const newUser = { id: crypto.randomUUID(), name: trimmedName, role: users.length === 0 ? 'admin' as const : 'user' as const };
  writeBrowserUsers([newUser, ...users]);
  window.localStorage.setItem(browserUserStorageKey, newUser.id);
  return newUser;
}

export function setActiveBrowserUser(id: string) {
  const users = readBrowserUsers();
  const selectedUser = users.find((user) => user.id === id);
  if (!selectedUser) return null;

  window.localStorage.setItem(browserUserStorageKey, selectedUser.id);
  return selectedUser;
}

export function logoutBrowserUser() {
  window.localStorage.removeItem(browserUserStorageKey);
}
