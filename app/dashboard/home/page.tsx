'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, Sparkles, CheckCircle2, Flame, RefreshCw, ShieldCheck, Shuffle, Volume2, VolumeX } from 'lucide-react';
import { format, parseISO, startOfWeek, subDays } from 'date-fns';
import { supabase } from '../../../lib/supabaseClient';
import { defaultTask, energyLabels, energyTasks, sampleDifferentTaskFromList, sampleTaskFromList, type EnergyLevel } from '../../../lib/resetData';
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

interface CustomTask {
  id: string;
  user_id: string;
  task_text: string;
  energy_level: EnergyLevel;
  created_at: string;
}

type RewardStage = 'idle' | 'anticipation' | 'impact' | 'celebration' | 'settle';

interface RewardState {
  stage: RewardStage;
  previousStreak: number;
  nextStreak: number;
  message: string;
  variant: number;
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

const motivationalQuotes = [
  'Small steps still count.',
  'One job is progress.',
  'Start tiny, finish lighter.',
  'Your pace is allowed.',
  'A reset can be simple.',
  'Momentum begins with one thing.',
  'Done gently is still done.',
  'Choose the next kind step.',
];

const rewardMessages = [
  'Nice. That counts.',
  'You showed up.',
  'That was enough.',
  'Small win logged.',
];

const idleRewardState: RewardState = {
  stage: 'idle',
  previousStreak: 0,
  nextStreak: 0,
  message: rewardMessages[0],
  variant: 0,
};

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [logs, setLogs] = useState<ResetLog[]>([]);
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel>('low');
  const [taskText, setTaskText] = useState<string>(() => defaultTask('low'));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('Pick your energy level and settle into a tiny reset.');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [taskCommitted, setTaskCommitted] = useState(false);
  const [reward, setReward] = useState<RewardState>(idleRewardState);
  const [isPressingDone, setIsPressingDone] = useState(false);
  const [rewardSoundEnabled, setRewardSoundEnabled] = useState(false);
  const [quote, setQuote] = useState('Small steps still count.');
  const rewardTimers = useRef<number[]>([]);
  const rewardFinishedCallback = useRef<(() => void) | null>(null);

  const todayKey = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    setUserId(getOrCreateBrowserUserId());
    const quoteIndex = Math.floor(Math.random() * motivationalQuotes.length);
    setQuote(motivationalQuotes[quoteIndex]);
    setRewardSoundEnabled(window.localStorage.getItem('reset_loop_reward_sound') === 'true');
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

      const [{ data: resetItems, error: logsError }, { data: taskItems, error: tasksError }] = await Promise.all([
        client
          .from('reset_logs')
          .select('*')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false })
          .limit(200),
        client
          .from('custom_tasks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      setLogs((resetItems ?? []) as ResetLog[]);
      setCustomTasks((taskItems ?? []) as CustomTask[]);
      if (logsError || tasksError) setMessage('Unable to load reset data. Check the Supabase schema and connection.');
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

  useEffect(() => () => clearRewardTimers(), []);

  const datesWithLogs = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((item) => set.add(format(parseISO(item.completed_at), 'yyyy-MM-dd')));
    return set;
  }, [logs]);

  const completedToday = datesWithLogs.has(todayKey);
  const completedJobsToday = useMemo(
    () => logs.filter((log) => !log.used_freeze && format(parseISO(log.completed_at), 'yyyy-MM-dd') === todayKey).length,
    [logs, todayKey],
  );

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
  const rewardActive = reward.stage !== 'idle';
  const rewardVisible = reward.stage === 'impact' || reward.stage === 'celebration' || reward.stage === 'settle';
  const displayedStreak = rewardActive && reward.stage !== 'anticipation'
    ? reward.stage === 'impact' || reward.stage === 'celebration' || reward.stage === 'settle'
      ? reward.nextStreak
      : reward.previousStreak
    : streak;

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

  const customSuggestions = useMemo(
    () => {
      const customTasksForEnergy = customTasks
        .filter((item) => item.energy_level === selectedEnergy)
        .map((item) => item.task_text);
      return customTasks.length > 0 ? customTasksForEnergy : energyTasks[selectedEnergy];
    },
    [customTasks, selectedEnergy],
  );
  const hasSuggestedTask = customSuggestions.length > 0;

  function makeTask(level: EnergyLevel) {
    const customTasksForEnergy = customTasks
      .filter((item) => item.energy_level === level)
      .map((item) => item.task_text);
    const availableTasks = customTasks.length > 0 ? customTasksForEnergy : energyTasks[level];
    if (availableTasks.length === 0) {
      setTaskText('');
      setTaskCommitted(false);
      setMessage(`Move or add a ${energyLabels[level].toLowerCase()} energy job in Settings.`);
      return;
    }
    const nextTask = sampleTaskFromList(availableTasks, level);
    setTaskText(nextTask);
    setTaskCommitted(false);
  }

  function pickEnergy(level: EnergyLevel) {
    setSelectedEnergy(level);
    makeTask(level);
  }

  function shuffleTask() {
    if (!hasSuggestedTask) {
      setMessage(`No ${energyLabels[selectedEnergy].toLowerCase()} energy jobs yet. Move or add one in Settings.`);
      return;
    }
    const nextTask = sampleDifferentTaskFromList(customSuggestions, selectedEnergy, taskText);
    setTaskText(nextTask);
    setTaskCommitted(false);
    setMessage('Shuffled. Pick the job that fits right now.');
  }

  function clearRewardTimers() {
    rewardTimers.current.forEach((timer) => window.clearTimeout(timer));
    rewardTimers.current = [];
  }

  function scheduleRewardStep(callback: () => void, delay: number) {
    const timer = window.setTimeout(callback, delay);
    rewardTimers.current.push(timer);
  }

  function triggerHaptic(pattern: number | number[] = 18) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  function playRewardTone() {
    if (!rewardSoundEnabled) return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
    gain.connect(context.destination);

    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.075);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.075);
      oscillator.stop(context.currentTime + 0.28 + index * 0.075);
    });

    window.setTimeout(() => context.close(), 700);
  }

  function finishRewardSequence() {
    clearRewardTimers();
    setIsPressingDone(false);
    setReward(idleRewardState);
    const callback = rewardFinishedCallback.current;
    rewardFinishedCallback.current = null;
    callback?.();
  }

  function startRewardSequence(previousStreak: number, nextStreak: number, onFinished?: () => void) {
    clearRewardTimers();
    rewardFinishedCallback.current = onFinished ?? null;
    const nextMessage = rewardMessages[Math.floor(Math.random() * rewardMessages.length)];
    const variant = Math.floor(Math.random() * 4);

    setReward({ stage: 'anticipation', previousStreak, nextStreak, message: nextMessage, variant });
    setIsPressingDone(true);
    triggerHaptic(18);

    scheduleRewardStep(() => {
      setIsPressingDone(false);
      setReward((currentReward) => ({ ...currentReward, stage: 'impact' }));
      triggerHaptic([12, 24, 18]);
    }, 240);

    scheduleRewardStep(() => {
      setReward((currentReward) => ({ ...currentReward, stage: 'celebration' }));
      playRewardTone();
    }, 980);

    scheduleRewardStep(() => {
      setReward((currentReward) => ({ ...currentReward, stage: 'settle' }));
    }, 2900);

    scheduleRewardStep(() => {
      finishRewardSequence();
    }, 3450);
  }

  function skipReward() {
    finishRewardSequence();
  }

  function toggleRewardSound() {
    const nextValue = !rewardSoundEnabled;
    setRewardSoundEnabled(nextValue);
    window.localStorage.setItem('reset_loop_reward_sound', String(nextValue));
    setMessage(nextValue ? 'Reward sound on.' : 'Reward sound off.');
  }

  function acceptTask() {
    if (!taskText) {
      setMessage(`No ${energyLabels[selectedEnergy].toLowerCase()} energy job selected. Add or move one in Settings.`);
      return;
    }

    setTaskCommitted(true);
    triggerHaptic(10);
    setMessage('You picked it. Come back here when it is done.');
  }

  function handlePrimaryTaskAction() {
    if (!taskCommitted) {
      acceptTask();
      return;
    }

    setIsPressingDone(true);
    triggerHaptic(12);
    window.setTimeout(() => setIsPressingDone(false), 280);
    saveReset(false);
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
    if (!userId || loading || !supabase) return;
    if (usedFreeze && completedToday) return;
    if (!usedFreeze && !taskText) {
      setMessage(`No ${energyLabels[selectedEnergy].toLowerCase()} energy job selected. Add or move one in Settings.`);
      return;
    }
    const previousStreak = streak;
    const nextStreak = !usedFreeze && !completedToday ? streak + 1 : streak;
    const client = supabase;
    setLoading(true);
    setMessage(usedFreeze ? 'Saving your pause day...' : 'Saving your reset...');
    const profileReady = await ensureProfile(client);
    if (!profileReady) {
      setIsPressingDone(false);
      setLoading(false);
      return;
    }

    const entryText = usedFreeze ? 'Use a reset freeze for today' : taskText || sampleTaskFromList(customSuggestions, selectedEnergy);
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
          : completedJobsToday > 0
            ? 'Another job logged. Good momentum, still gentle.'
            : 'Reset complete. Your streak just grew - nice work.',
      );
      if (savedReset) {
        setLogs((currentLogs) => [savedReset as ResetLog, ...currentLogs]);
      }
      if (!usedFreeze) {
        setTaskCommitted(false);
        startRewardSequence(previousStreak, nextStreak, () => setShowCheckIn(true));
      } else {
        setShowCheckIn(false);
      }
      const { data: resetItems } = await client
        .from('reset_logs')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(200);
      setLogs((resetItems ?? []) as ResetLog[]);
      if (!usedFreeze) {
        setTaskText(hasSuggestedTask ? sampleTaskFromList(customSuggestions, selectedEnergy) : '');
      }
    } else {
      setMessage(error.message || 'Unable to save your reset. Please check the Supabase connection and try again.');
      setIsPressingDone(false);
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
      {rewardVisible && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-white/20" onClick={skipReward} role="presentation">
          {reward.stage === 'celebration' && Array.from({ length: 22 }).map((_, index) => (
            <span
              key={index}
              className={`confetti-piece confetti-piece-${reward.variant}`}
              style={{
                left: `${12 + ((index * 4) % 76)}%`,
                animationDelay: `${(index % 7) * 0.045}s`,
                backgroundColor: ['#5b8dff', '#34d399', '#7dd3fc', '#facc15', '#f472b6'][index % 5],
              }}
            />
          ))}
          <div className={`reward-card reward-${reward.stage}`}>
            <div className="reward-logo">
              <RefreshCw className="h-9 w-9" />
            </div>
            <p className="reward-eyebrow">Streak impact</p>
            <div className="reward-streak-row">
              <span className="reward-streak-old">{reward.previousStreak}</span>
              <span className="reward-streak-number">{reward.nextStreak}</span>
              <Flame className="reward-flame h-8 w-8" />
            </div>
            <p className="reward-message">{reward.message}</p>
          </div>
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

        <div className="mt-5 rounded-[28px] border border-primary/30 bg-primary p-5 text-white shadow-lg shadow-primary/25">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">Today&apos;s nudge</p>
          <p className="mt-2 text-3xl font-semibold leading-tight text-white">{quote}</p>
        </div>

        <div className={`mt-5 space-y-3 rounded-3xl bg-slate-50 p-4 transition ${rewardActive ? 'streak-pop ring-2 ring-positive/40' : ''}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Streak</p>
              <p className={`mt-1 text-2xl font-semibold text-slate-900 ${rewardActive ? 'streak-number-roll' : ''}`}>
                {displayedStreak} day{displayedStreak === 1 ? '' : 's'}
              </p>
              <p className="mt-1 text-xs text-slate-500">{completedJobsToday} job{completedJobsToday === 1 ? '' : 's'} today</p>
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
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{taskText || 'Pick your energy to get a task'}</h2>
            </div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-primarySoft text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {taskCommitted
              ? 'Chosen. Mark it done when the job is actually finished.'
              : completedJobsToday > 0
                ? 'Your streak is safe. Log another job only if it still feels useful.'
                : 'This tiny task is designed to feel easy and satisfying right now.'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={shuffleTask}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-3xl border border-slate-300 bg-slate-50 px-5 py-4 text-base font-semibold text-slate-700 transition hover:border-primary hover:bg-primarySoft disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Shuffle className="h-5 w-5" />
            Shuffle job
          </button>
          <button
            type="button"
            onClick={handlePrimaryTaskAction}
            disabled={loading || !hasSuggestedTask || !taskText}
            className={`inline-flex w-full items-center justify-center rounded-3xl px-5 py-4 text-base font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:bg-slate-300 ${
              taskCommitted
                ? 'bg-positive shadow-positive/20 hover:bg-emerald-600'
                : 'bg-primary shadow-primary/20 hover:bg-blue-600'
            } ${isPressingDone ? 'done-anticipation' : ''}`}
          >
            {loading ? 'Saving...' : taskCommitted ? 'Done' : completedJobsToday > 0 ? "I'll do another" : "I'll do this"}
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
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="font-medium text-slate-800">{message}</p>
            <button
              type="button"
              onClick={toggleRewardSound}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition hover:text-slate-900"
              aria-label={rewardSoundEnabled ? 'Turn reward sound off' : 'Turn reward sound on'}
            >
              {rewardSoundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </section>

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
