'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabaseClient';
import { getOrCreateBrowserUserId } from '../../lib/browserUser';
import { CheckCircle2, TrendingUp, CalendarDays, HeartPulse, Trash2 } from 'lucide-react';

interface ResetLog {
  id: string;
  task_text: string;
  completed_at: string;
  used_freeze: boolean;
  energy_level: string;
}

interface CheckIn {
  id: string;
  mood: 'Bad' | 'Okay' | 'Good';
  energy: 'Low' | 'Medium' | 'High';
  pain: 'None' | 'Mild' | 'Bad';
  created_at: string;
}

const scoreMaps = {
  mood: { Bad: 1, Okay: 2, Good: 3 },
  energy: { Low: 1, Medium: 2, High: 3 },
  pain: { None: 3, Mild: 2, Bad: 1 },
} as const;

const scoreLabels = ['Low', 'Medium', 'High'];

export default function ProgressPage() {
  const [logs, setLogs] = useState<ResetLog[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setUserId(getOrCreateBrowserUserId());
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    if (!userId) return;
    const client = supabase;
    async function load() {
      setLoading(true);
      const [{ data: resetData, error: resetError }, { data: checkInData, error: checkInError }] = await Promise.all([
        client
          .from('reset_logs')
          .select('*')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
          .limit(30),
        client
          .from('check_ins')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30),
      ]);
      setLogs((resetData ?? []) as ResetLog[]);
      setCheckIns((checkInData ?? []) as CheckIn[]);
      setStatus(resetError || checkInError ? 'Unable to load your progress data. Check the Supabase schema and connection.' : '');
      setLoading(false);
    }
    load();
  }, [userId]);

  const completedCount = useMemo(
    () => logs.filter((log) => !log.used_freeze).length,
    [logs],
  );

  const freezeCount = useMemo(
    () => logs.filter((log) => log.used_freeze).length,
    [logs],
  );

  const recentDays = useMemo(
    () => logs.slice(0, 7),
    [logs],
  );

  const chartData = useMemo(
    () => checkIns.slice(0, 14).reverse(),
    [checkIns],
  );

  const checkInSummary = useMemo(() => {
    if (checkIns.length === 0) return null;
    const latest = checkIns[0];
    const averageMood = checkIns.reduce((sum, item) => sum + scoreMaps.mood[item.mood], 0) / checkIns.length;
    const averageEnergy = checkIns.reduce((sum, item) => sum + scoreMaps.energy[item.energy], 0) / checkIns.length;
    const averagePain = checkIns.reduce((sum, item) => sum + scoreMaps.pain[item.pain], 0) / checkIns.length;

    return {
      latest,
      moodLabel: scoreLabels[Math.round(averageMood) - 1],
      energyLabel: scoreLabels[Math.round(averageEnergy) - 1],
      painLabel: scoreLabels[Math.round(averagePain) - 1],
    };
  }, [checkIns]);

  function buildPolyline(values: number[]) {
    if (values.length === 1) {
      const y = 88 - ((values[0] - 1) / 2) * 68;
      return `16,${y} 284,${y}`;
    }

    return values
      .map((value, index) => {
        const x = 16 + (index / Math.max(values.length - 1, 1)) * 268;
        const y = 88 - ((value - 1) / 2) * 68;
        return `${x},${y}`;
      })
      .join(' ');
  }

  const moodPoints = buildPolyline(chartData.map((item) => scoreMaps.mood[item.mood]));
  const energyPoints = buildPolyline(chartData.map((item) => scoreMaps.energy[item.energy]));
  const painPoints = buildPolyline(chartData.map((item) => scoreMaps.pain[item.pain]));

  async function deleteResetLog(logId: string) {
    if (!supabase) return;
    const client = supabase;
    const { error } = await client.from('reset_logs').delete().eq('id', logId);
    if (error) {
      setStatus(error.message || 'Unable to delete that reset. Please try again.');
      return;
    }

    setLogs((currentLogs) => currentLogs.filter((log) => log.id !== logId));
    setStatus('Reset deleted.');
  }

  if (!supabase) {
    return (
      <div className="space-y-6 pb-10">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card">
          <h1 className="text-3xl font-semibold text-slate-950">Missing Supabase settings</h1>
          <p className="mt-3 text-sm text-slate-600">Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` to enable progress tracking.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Progress</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Your reset story</h1>
          </div>
          <div className="rounded-3xl bg-primarySoft px-4 py-3 text-primary">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">A calm view of your completed resets, protected streak choices, and recent momentum.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="rounded-3xl bg-primarySoft p-3 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Resets</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{completedCount}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600">Completed tiny resets that count towards feeling calmer and more in control.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="rounded-3xl bg-primarySoft p-3 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Pauses</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{freezeCount}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600">Days where you protected your streak with a mindful pause instead of forcing more.</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Check-ins</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Mood, energy, pain</h2>
          </div>
          <div className="rounded-3xl bg-primarySoft p-3 text-primary">
            <HeartPulse className="h-5 w-5" />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading your check-ins...</p>
        ) : status ? (
          <p className="text-sm text-slate-600">{status}</p>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-slate-600">Save a check-in after a reset and your pattern will appear here.</p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-3xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Mood</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{checkInSummary?.moodLabel}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Energy</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{checkInSummary?.energyLabel}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pain</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{checkInSummary?.painLabel}</p>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-50 p-4">
              <div className="mb-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-5 rounded-full bg-primary" />Mood</span>
                <span className="inline-flex items-center gap-2"><span className="h-2 w-5 rounded-full bg-positive" />Energy</span>
                <span className="inline-flex items-center gap-2"><span className="h-2 w-5 rounded-full bg-sky-400" />Pain ease</span>
              </div>
              <svg viewBox="0 0 300 108" role="img" aria-label="Check-in trend graph" className="h-44 w-full overflow-visible">
                <line x1="16" y1="20" x2="284" y2="20" stroke="#e2e8f0" strokeWidth="1" />
                <line x1="16" y1="54" x2="284" y2="54" stroke="#e2e8f0" strokeWidth="1" />
                <line x1="16" y1="88" x2="284" y2="88" stroke="#e2e8f0" strokeWidth="1" />
                <text x="0" y="24" className="fill-slate-400 text-[8px]">High</text>
                <text x="0" y="58" className="fill-slate-400 text-[8px]">Mid</text>
                <text x="0" y="92" className="fill-slate-400 text-[8px]">Low</text>
                <polyline points={moodPoints} fill="none" stroke="#5b8dff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points={energyPoints} fill="none" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points={painPoints} fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{format(parseISO(chartData[0].created_at), 'MMM d')}</span>
                <span>{format(parseISO(chartData[chartData.length - 1].created_at), 'MMM d')}</span>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Latest check-in</p>
              <p className="mt-2 text-sm text-slate-600">
                {checkInSummary?.latest.mood} mood, {checkInSummary?.latest.energy.toLowerCase()} energy, {checkInSummary?.latest.pain.toLowerCase()} pain
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Recent resets</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Last 7 entries</h2>
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Loading your reset history...</p>
        ) : status ? (
          <p className="text-sm text-slate-600">{status}</p>
        ) : recentDays.length === 0 ? (
          <p className="text-sm text-slate-600">Complete your first tiny reset and it will appear here.</p>
        ) : (
          <div className="space-y-3">
            {recentDays.map((log) => (
              <div key={log.id} className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{log.task_text}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{log.used_freeze ? 'Pause' : log.energy_level}</span>
                    <button
                      type="button"
                      onClick={() => deleteResetLog(log.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition hover:text-slate-900"
                      aria-label={`Delete ${log.task_text}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600">{format(parseISO(log.completed_at), 'MMM d, yyyy - h:mm a')}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
