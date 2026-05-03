export const browserUserStorageKey = 'reset_loop_user_id';
export const browserUsersStorageKey = 'reset_loop_users';

export interface BrowserUser {
  id: string;
  name: string;
}

function readBrowserUsers() {
  try {
    const rawUsers = window.localStorage.getItem(browserUsersStorageKey);
    if (!rawUsers) return [];
    const parsedUsers = JSON.parse(rawUsers);
    if (!Array.isArray(parsedUsers)) return [];

    return parsedUsers
      .filter((user): user is BrowserUser => (
        typeof user?.id === 'string' &&
        typeof user?.name === 'string' &&
        user.id.length > 0 &&
        user.name.trim().length > 0
      ));
  } catch {
    return [];
  }
}

function writeBrowserUsers(users: BrowserUser[]) {
  window.localStorage.setItem(browserUsersStorageKey, JSON.stringify(users));
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

  const nextUsers = [{ id: activeUserId, name: 'Friend' }, ...users];
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
    writeBrowserUsers([{ id: existing, name: 'Friend' }]);
  }
  return existing;
}

export function getCurrentBrowserUser() {
  const activeUserId = getOrCreateBrowserUserId();
  return getBrowserUsers().find((user) => user.id === activeUserId) ?? { id: activeUserId, name: 'Friend' };
}

export function createBrowserUser(name: string) {
  const trimmedName = name.trim() || 'Friend';
  const users = readBrowserUsers();
  const newUser = { id: crypto.randomUUID(), name: trimmedName };
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
