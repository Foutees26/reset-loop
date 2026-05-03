'use client';

import { useEffect, useMemo, useState } from 'react';
import { BellRing, Sparkles, CheckCircle2, ShieldCheck, PartyPopper } from 'lucide-react';
import { format, parseISO, startOfWeek, subDays } from 'date-fns';
import { supabase } from '../../../lib/supabaseClient';
import { defaultTask, energyLabels, sampleTask, type EnergyLevel } from '../../../lib/resetData';
import { getOrCreateBrowserUserId } from '../../../lib/browserUser';
import CheckInModal from '../../../components/CheckInModal';

interface Profile {
  id: string;
  display_name: string;
  reminder_time: string | null;
  created_at: string;
}

interface ResetLog {
  id: string;
  user_id: string;
  task_text: string;
  energy_level: EnergyLevel;
  completed_at: string;
  used_freeze: boolean;
}

const maxRemindersPerDay = 2;
const reminderMessages = [
  {
    title: 'Just do one thing',
    body: 'A tiny reset is enough for today.',
  },
  {
    title: 'Keep your streak alive',
    body: 'One small action keeps the loop going.',
  },
];

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [logs, setLogs] = useState<ResetLog[]>([]);
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel>('low');
  const [taskText, setTaskText] = useState<string>(() => defaultTask('low'));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('Pick your energy level and settle into a tiny reset.');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const todayKey = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    setUserId(getOrCreateBrowserUserId());
  }, []);

  useEffect(() => {
    if (!userId) return;
    async function loadProfile() {
      if (!supabase) {
        setLoading(false);
        setMessage('Missing Supabase settings. Add env vars to connect the app.');
        return;
      }
      const client = supabase;
      setLoading(true);
      const { data: existingProfile, error } = await client
        .from('users_profile')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && !existingProfile) {
        const { data: created, error: createError } = await createProfile(client, userId);
        if (created) setProfile(created);
        if (createError) setMessage('Unable to create your profile. Check the Supabase schema and connection.');
      } else if (existingProfile) {
        setProfile(existingProfile);
      }

      const { data: resetItems, error: logsError } = await client
        .from('reset_logs')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(200);

      setLogs((resetItems ?? []) as ResetLog[]);
      if (logsError) setMessage('Unable to load reset history. Check the Supabase schema and connection.');
      setLoading(false);
    }

    loadProfile();
  }, [userId]);

  useEffect(() => {
    if (!profile?.reminder_time) return;

    if ('Notification' in window && Notification.permission === 'default') {
      setShowNotificationPrompt(true);
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      const [hour, minute] = profile.reminder_time.split(':').map(Number);
      const now = new Date();
      const nextAlert = new Date(now);
      nextAlert.setHours(hour, minute, 0, 0);
      if (nextAlert <= now) nextAlert.setDate(now.getDate() + 1);
      const timeout = window.setTimeout(() => {
        const reminderDateKey = format(new Date(), 'yyyy-MM-dd');
        const reminderCountKey = `reset_loop_reminders_${reminderDateKey}`;
        const reminderCount = Number(window.localStorage.getItem(reminderCountKey) ?? '0');
        if (reminderCount >= maxRemindersPerDay) return;

        const nextMessage = reminderMessages[reminderCount % reminderMessages.length];
        window.localStorage.setItem(reminderCountKey, String(reminderCount + 1));
        new Notification(nextMessage.title, {
          body: nextMessage.body,
          silent: true,
        });
      }, nextAlert.getTime() - now.getTime());
      return () => window.clearTimeout(timeout);
    }
  }, [profile]);

  useEffect(() => {
    if (!celebrating) return;
    const timeout = window.setTimeout(() => setCelebrating(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [celebrating]);

  const datesWithLogs = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((item) => set.add(format(parseISO(item.completed_at), 'yyyy-MM-dd')));
    return set;
  }, [logs]);

  const completedToday = datesWithLogs.has(todayKey);

  const streak = useMemo(() => {
    let count = 0;
    let cursor = new Date();
    if (!completedToday) cursor = subDays(cursor, 1);
    while (datesWithLogs.has(format(cursor, 'yyyy-MM-dd'))) {
      count += 1;
      cursor = subDays(cursor, 1);
    }
    return count;
  }, [datesWithLogs, completedToday]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const freezeLogsThisWeek = logs.filter(
    (log) => log.used_freeze && parseISO(log.completed_at) >= weekStart,
  ).length;
  const freezesRemaining = Math.max(0, 2 - freezeLogsThisWeek);

  const totalResets = logs.filter((log) => !log.used_freeze).length;
  const resetsThisMonth = logs.filter((log) => {
    const date = parseISO(log.completed_at);
    return (
      !log.used_freeze &&
      date.getMonth() === new Date().getMonth() &&
      date.getFullYear() === new Date().getFullYear()
    );
  }).length;

  function makeTask(level: EnergyLevel) {
    const nextTask = sampleTask(level);
    setTaskText(nextTask);
  }

  function pickEnergy(level: EnergyLevel) {
    setSelectedEnergy(level);
    makeTask(level);
  }

  async function createProfile(client: NonNullable<typeof supabase>, id: string) {
    return client
      .from('users_profile')
      .upsert({ id, display_name: 'Friend', reminder_time: null }, { onConflict: 'id', ignoreDuplicates: true })
      .select()
      .single();
  }

  async function ensureProfile(client: NonNullable<typeof supabase>) {
    if (profile) return true;

    const { data: existingProfile } = await client
      .from('users_profile')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      setProfile(existingProfile as Profile);
      return true;
    }

    const { data: created, error } = await createProfile(client, userId);
    if (created) {
      setProfile(created as Profile);
      return true;
    }

    setMessage(error?.message ?? 'Unable to create your profile. Check the Supabase schema and connection.');
    return false;
  }

  async function saveReset(usedFreeze = false) {
    if (!userId || loading || completedToday || !supabase) return;
    const client = supabase;
    setLoading(true);
    setMessage(usedFreeze ? 'Saving your pause day...' : 'Saving your reset...');
    const profileReady = await ensureProfile(client);
    if (!profileReady) {
      setLoading(false);
      return;
    }

    const entryText = usedFreeze ? 'Use a reset freeze for today' : taskText || sampleTask(selectedEnergy);
    const { data: savedReset, error } = await client.from('reset_logs').insert({
      user_id: userId,
      task_text: entryText,
      energy_level: selectedEnergy,
      completed_at: new Date().toISOString(),
      used_freeze: usedFreeze,
    }).select()
      .single();
    if (!error) {
      setMessage(
        usedFreeze
          ? 'Nice choice. Your streak is protected while you rest today.'
          : 'Reset complete. Your streak just grew - nice work.',
      );
      if (savedReset) {
        setLogs((currentLogs) => [savedReset as ResetLog, ...currentLogs]);
      }
      if (!usedFreeze) {
        setCelebrating(true);
      }
      setShowCheckIn(!usedFreeze);
      const { data: resetItems } = await client
        .from('reset_logs')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(200);
      setLogs((resetItems ?? []) as ResetLog[]);
      if (!usedFreeze) {
        setTaskText(sampleTask(selectedEnergy));
      }
    } else {
      setMessage(error.message || 'Unable to save your reset. Please check the Supabase connection and try again.');
    }
    setLoading(false);
  }

  async function saveCheckIn(mood: string, energy: string, pain: string) {
    if (!userId || !supabase) return;
    const client = supabase;
    const { error } = await client.from('check_ins').insert({
      user_id: userId,
      mood,
      energy,
      pain,
      created_at: new Date().toISOString(),
    });
    setMessage(error ? 'Unable to save your check-in. Your reset was still recorded.' : 'Check-in saved. You can see your patterns in Progress.');
  }

  return (
    <div className="relative space-y-6 pb-10">
      {celebrating && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, index) => (
            <span
              key={index}
              className="confetti-piece"
              style={{
                left: `${8 + ((index * 5) % 86)}%`,
                animationDelay: `${(index % 6) * 0.08}s`,
                backgroundColor: ['#5b8dff', '#34d399', '#7dd3fc', '#facc15', '#f472b6'][index % 5],
              }}
            />
          ))}
        </div>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Reset Loop</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Your daily reset</h1>
          </div>
          <div className="rounded-3xl bg-primarySoft px-4 py-3 text-primary">
            <BellRing className="h-6 w-6" />
          </div>
        </div>

        <div className={`mt-5 space-y-3 rounded-3xl bg-slate-50 p-4 transition ${celebrating ? 'streak-pop ring-2 ring-positive/40' : ''}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Streak</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{streak} day{streak === 1 ? '' : 's'}</p>
            </div>
            <div className="rounded-3xl bg-white p-3 text-slate-800 shadow-sm">
              <p className="text-xs text-slate-500">Freezes left</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{freezesRemaining}</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">Your streak is held together by small resets or pause days. Stay gentle and consistent.</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Energy</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Choose how you feel</h2>
            </div>
            <span className="rounded-full bg-primarySoft px-3 py-1 text-sm text-primary">Tap only</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(['low', 'medium', 'high'] as EnergyLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => pickEnergy(level)}
                className={`rounded-3xl border px-3 py-4 text-center text-sm font-semibold transition ${
                  selectedEnergy === level
                    ? 'border-primary bg-primary text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-primary/80 hover:bg-primarySoft'
                }`}
              >
                {energyLabels[level]}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Today's reset</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{completedToday ? 'All done for today' : taskText || 'Pick your energy to get a task'}</h2>
            </div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-primarySoft text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{completedToday ? 'Your reset is marked complete. Keep the momentum going with a quick check-in or visit Progress.' : 'This tiny task is designed to feel easy and satisfying right now.'}</p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => saveReset(false)}
            disabled={completedToday || loading}
            className="inline-flex w-full items-center justify-center rounded-3xl bg-primary px-5 py-4 text-base font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? 'Saving...' : completedToday ? 'Today complete' : 'Done'}
          </button>
          <button
            type="button"
            onClick={() => saveReset(true)}
            disabled={completedToday || loading || freezesRemaining === 0}
            className="inline-flex w-full items-center justify-center rounded-3xl border border-slate-300 bg-slate-50 px-5 py-4 text-base font-semibold text-slate-700 transition hover:border-primary hover:bg-primarySoft disabled:cursor-not-allowed disabled:opacity-60"
          >
            Use freeze instead
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">What happens next</p>
          <p className="mt-2">A reset log saves your completion, protects your streak, and offers a calm check-in so you can land the day with encouragement.</p>
          <p className="mt-3 font-medium text-slate-800">{message}</p>
        </div>
      </section>

      {celebrating && (
        <section className="success-pop rounded-3xl border border-positive/30 bg-emerald-50 p-4 text-emerald-900 shadow-card">
          <div className="flex items-center gap-3">
            <div className="rounded-3xl bg-white p-3 text-positive">
              <PartyPopper className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Reset complete</p>
              <p className="mt-1 text-sm text-emerald-800">Your streak grew. Keep it gentle and call that a win.</p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="rounded-3xl bg-primarySoft p-3 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Completed</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{totalResets}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600">Total resets completed so far. Every small habit matters.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="rounded-3xl bg-primarySoft p-3 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">This month</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{resetsThisMonth}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600">Resets completed this month. Build a gentle habit without pressure.</p>
        </div>
      </section>

      {showNotificationPrompt && (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-card">
          <p className="font-semibold text-slate-900">Notifications</p>
          <p className="mt-2 text-slate-600">Allow browser reminders if you want a gentle nudge. The app keeps reminders to 1-2 per day.</p>
        </div>
      )}

      <CheckInModal
        open={showCheckIn}
        onClose={() => setShowCheckIn(false)}
        onSubmit={saveCheckIn}
      />
    </div>
  );
}
