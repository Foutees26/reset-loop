'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getOrCreateBrowserUserId } from '../../lib/browserUser';
import { Bell, CheckCircle2 } from 'lucide-react';

interface Profile {
  id: string;
  display_name: string;
  reminder_time: string | null;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [reminderTime, setReminderTime] = useState('20:00');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setUserId(getOrCreateBrowserUserId());
  }, []);

  useEffect(() => {
    if (!userId || !supabase) return;
    const client = supabase;
    async function loadProfile() {
      const { data, error } = await client.from('users_profile').select('*').eq('id', userId).single();
      if (data) {
        setProfile(data as Profile);
        setReminderTime(data.reminder_time ?? '20:00');
        setStatus('');
      } else if (error) {
        const { data: created, error: createError } = await client
          .from('users_profile')
          .insert({ id: userId, display_name: 'Friend', reminder_time: null })
          .select()
          .single();
        if (created) {
          setProfile(created as Profile);
          setStatus('');
        } else if (createError) {
          setStatus('Unable to load your profile. Check the Supabase schema and connection.');
        }
      }
    }
    loadProfile();
  }, [userId]);

  async function saveReminder() {
    if (!userId || !supabase) return;
    const client = supabase;
    setStatus('Saving...');
    const { error } = await client
      .from('users_profile')
      .update({ reminder_time: reminderTime })
      .eq('id', userId);
    if (!error) {
      setStatus('Reminder saved. You will get a gentle nudge, never more than 2 in a day.');
      setProfile((prev) => (prev ? { ...prev, reminder_time: reminderTime } : prev));
    } else {
      setStatus('Unable to save reminder. Please try again.');
    }
  }

  async function requestNotifications() {
    if (!('Notification' in window)) {
      setStatus('Notifications are not supported in this browser.');
      return;
    }
    const permission = await Notification.requestPermission();
    setStatus(permission === 'granted' ? 'Notifications enabled.' : 'Notifications blocked.');
  }

  if (!supabase) {
    return (
      <div className="space-y-6 pb-10">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card">
          <h1 className="text-3xl font-semibold text-slate-950">Missing Supabase settings</h1>
          <p className="mt-3 text-sm text-slate-600">Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` to enable reminders and profile storage.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Settings</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Reset Rhythm</h1>
          </div>
          <div className="rounded-3xl bg-primarySoft px-4 py-3 text-primary">
            <Bell className="h-6 w-6" />
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">A simple reminder time keeps the app gentle: just one thing, 1-2 nudges max per day.</p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Daily reminder time</label>
            <p className="mb-3 text-sm text-slate-600">Reminder copy stays encouraging: "Just do one thing" and "Keep your streak alive."</p>
            <input
              type="time"
              className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              value={reminderTime}
              onChange={(event) => setReminderTime(event.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={saveReminder}
            className="w-full rounded-3xl bg-primary px-5 py-4 text-base font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-blue-600"
          >
            Save reminder
          </button>
          <button
            type="button"
            onClick={requestNotifications}
            className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-5 py-4 text-base font-semibold text-slate-700 transition hover:border-primary hover:bg-primarySoft"
          >
            Enable browser notifications
          </button>
          {status && <p className="text-sm text-slate-600">{status}</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-start gap-4">
          <div className="rounded-3xl bg-primarySoft p-3 text-primary">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Your profile</p>
            <p className="mt-2 text-sm text-slate-600">We store a lightweight profile for your reminders and streak data.</p>
            <p className="mt-3 text-sm text-slate-600">User ID: {profile?.id ?? 'Loading...'}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
