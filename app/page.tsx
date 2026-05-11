'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, UserPlus, Users } from 'lucide-react';
import { browserUserStorageKey, createBrowserUser, getBrowserUsers, getStoredBrowserUsers, setActiveBrowserUser, type BrowserUser } from '../lib/browserUser';

export default function OpeningPage() {
  const router = useRouter();
  const [users, setUsers] = useState<BrowserUser[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const hasExistingUserId = Boolean(window.localStorage.getItem(browserUserStorageKey));
    setUsers(hasExistingUserId ? getBrowserUsers() : getStoredBrowserUsers());
  }, []);

  function login(userId: string) {
    const selectedUser = setActiveBrowserUser(userId);
    if (!selectedUser) {
      setStatus('Unable to find that account. Create a new account to continue.');
      setUsers(getStoredBrowserUsers());
      return;
    }

    router.push('/dashboard/home');
  }

  function createAccount() {
    const trimmedName = newUserName.trim();
    if (!trimmedName) {
      setStatus('Add a name to create an account.');
      return;
    }

    createBrowserUser(trimmedName);
    router.push('/dashboard/home');
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-center gap-6">
      <section className="hero-panel rounded-[40px] border border-white/30 p-6 text-white sm:p-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <Image
            src="/logos/portrait%20logo.png"
            alt="Reset Loop"
            width={260}
            height={206}
            priority
            className="h-auto w-48 sm:w-60"
          />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">Reset Loop</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">Sign in to your reset space</h1>
          </div>
        </div>
        <p className="mt-5 text-center text-base leading-7 text-white/80">Choose an account on this device or create one for a separate streak, tasks list, check-ins, and progress.</p>
      </section>

      <section className="app-card rounded-[34px] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Log in</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Existing accounts</h2>
          </div>
          <div className="rounded-3xl bg-primarySoft p-3 text-primary">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {users.length === 0 ? (
          <p className="rounded-3xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">No accounts on this device yet. Create one below to get started.</p>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => login(user.id)}
                className="flex w-full items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-800 transition hover:border-primary/70 hover:bg-primarySoft hover:text-primary"
              >
                <span className="flex items-center gap-2 font-semibold">
                  {user.name}
                  {user.role === 'admin' && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800">Admin</span>
                  )}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="app-card rounded-[34px] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Create account</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Start fresh</h2>
          </div>
          <div className="rounded-3xl bg-emerald-100 p-3 text-emerald-700">
            <UserPlus className="h-5 w-5" />
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newUserName}
            onChange={(event) => setNewUserName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') createAccount();
            }}
            placeholder="Account name"
            className="min-w-0 flex-1 rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          <button
            type="button"
            onClick={createAccount}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-primary text-white shadow-lg shadow-primary/20 transition hover:bg-blue-600"
            aria-label="Create account"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        {status && <p className="mt-3 text-sm font-medium text-slate-600">{status}</p>}
      </section>
    </div>
  );
}
