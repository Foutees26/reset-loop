export const browserUserStorageKey = 'reset_loop_user_id';

export function getOrCreateBrowserUserId() {
  let existing = window.localStorage.getItem(browserUserStorageKey);
  if (!existing) {
    existing = crypto.randomUUID();
    window.localStorage.setItem(browserUserStorageKey, existing);
  }
  return existing;
}
