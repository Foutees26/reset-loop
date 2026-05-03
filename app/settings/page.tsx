'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getOrCreateBrowserUserId } from '../../lib/browserUser';
import { Bell, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { energyLabels, type EnergyLevel } from '../../lib/resetData';

interface Profile {
  id: string;
  display_name: string;
  reminder_time: string | null;
}

interface CustomTask {
  id: string;
  user_id: string;
  task_text: string;
  energy_level: EnergyLevel;
  created_at: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [reminderTime, setReminderTime] = useState('20:00');
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskEnergy, setNewTaskEnergy] = useState<EnergyLevel>('low');
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

      const { data: tasks, error: tasksError } = await client
        .from('custom_tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setCustomTasks((tasks ?? []) as CustomTask[]);
      if (tasksError) setStatus('Unable to load your job list. Check the Supabase schema and connection.');
    }
    loadProfile();
  }, [userId]);

  async function ensureProfile(client: NonNullable<typeof supabase>) {
    if (profile) return true;

    const { data: existingProfile } = await client.from('users_profile').select('*').eq('id', userId).single();
    if (existingProfile) {
      setProfile(existingProfile as Profile);
      return true;
    }

    const { data: created, error } = await client
      .from('users_profile')
      .insert({ id: userId, display_name: 'Friend', reminder_time: null })
      .select()
      .single();
    if (created) {
      setProfile(created as Profile);
      return true;
    }

    setStatus(error?.message ?? 'Unable to create your profile. Check the Supabase schema and connection.');
    return false;
  }

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

  async function addCustomTask() {
    const trimmedTask = newTaskText.trim();
    if (!trimmedTask || !userId || !supabase) return;

    const client = supabase;
    setStatus('Saving job...');
    const profileReady = await ensureProfile(client);
    if (!profileReady) return;

    const { data, error } = await client
      .from('custom_tasks')
      .insert({ user_id: userId, task_text: trimmedTask, energy_level: newTaskEnergy })
      .select()
      .single();

    if (error) {
      setStatus(error.message || 'Unable to save job. Please try again.');
      return;
    }

    if (data) setCustomTasks((currentTasks) => [data as CustomTask, ...currentTasks]);
    setNewTaskText('');
    setStatus('Job added. It can now appear in future suggestions.');
  }

  async function deleteCustomTask(taskId: string) {
    if (!supabase) return;
    const client = supabase;
    const { error } = await client.from('custom_tasks').delete().eq('id', taskId);
    if (error) {
      setStatus(error.message || 'Unable to remove job. Please try again.');
      return;
    }

    setCustomTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    setStatus('Job removed from future suggestions.');
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
        <div className="mb-4">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Jobs</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Suggestion list</h2>
          <p className="mt-2 text-sm text-slate-600">Add jobs you actually do. They will be mixed into future suggestions for the matching energy level.</p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={newTaskText}
            onChange={(event) => setNewTaskText(event.target.value)}
            placeholder="Add a job, e.g. Empty bathroom bin"
            className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as EnergyLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setNewTaskEnergy(level)}
                className={`rounded-3xl border px-3 py-3 text-sm font-semibold transition ${
                  newTaskEnergy === level
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-primary/80 hover:bg-primarySoft'
                }`}
              >
                {energyLabels[level]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={addCustomTask}
            disabled={!newTaskText.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-primary px-5 py-4 text-base font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Plus className="h-5 w-5" />
            Add job
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {customTasks.length === 0 ? (
            <p className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">Your custom jobs will appear here.</p>
          ) : (
            customTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 rounded-3xl bg-slate-50 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{task.task_text}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{energyLabels[task.energy_level]}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteCustomTask(task.id)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition hover:text-slate-900"
                  aria-label={`Remove ${task.task_text}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
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
