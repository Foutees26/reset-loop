'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { createBrowserUser, getBrowserUsers, getCurrentBrowserUser, getOrCreateBrowserUserId, setActiveBrowserUser, type BrowserUser } from '../../lib/browserUser';
import { Bell, CheckCircle2, GripVertical, Pencil, Plus, Save, Trash2, UserPlus, Users, X } from 'lucide-react';
import { energyLabels, energyTasks, expandedDefaultTasks, type EnergyLevel } from '../../lib/resetData';
import { hasNativeLocalNotifications, requestReminderPermission, scheduleDailyReminder } from '../../lib/notifications';

interface Profile {
  id: string;
  display_name: string;
  reminder_time: string | null;
  jobs_seeded?: boolean;
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
  const [browserUsers, setBrowserUsers] = useState<BrowserUser[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [reminderTime, setReminderTime] = useState('20:00');
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskEnergy, setNewTaskEnergy] = useState<EnergyLevel>('low');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [editingTaskEnergy, setEditingTaskEnergy] = useState<EnergyLevel>('low');
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const normalizedNewTask = newTaskText.trim().toLowerCase();
  const normalizedEditingTask = editingTaskText.trim().toLowerCase();
  const allKnownTaskNames = useMemo(
    () => new Set([
      ...customTasks.map((task) => task.task_text),
    ].map((task) => task.trim().toLowerCase())),
    [customTasks],
  );
  const editableKnownTaskNames = useMemo(
    () => new Set([
      ...customTasks
        .filter((task) => task.id !== editingTaskId)
        .map((task) => task.task_text),
    ].map((task) => task.trim().toLowerCase())),
    [customTasks, editingTaskId],
  );
  const isDuplicateTask = Boolean(normalizedNewTask && allKnownTaskNames.has(normalizedNewTask));
  const isDuplicateEditingTask = Boolean(normalizedEditingTask && editableKnownTaskNames.has(normalizedEditingTask));
  const activeBrowserUser = browserUsers.find((user) => user.id === userId) ?? null;

  useEffect(() => {
    setUserId(getOrCreateBrowserUserId());
    setBrowserUsers(getBrowserUsers());
  }, []);

  useEffect(() => {
    if (!userId || !supabase) return;
    const client = supabase;
    async function loadProfile() {
      const browserUserName = getCurrentBrowserUser().name;
      setProfile(null);
      setCustomTasks([]);
      const { data, error } = await client.from('users_profile').select('*').eq('id', userId).single();
      if (data) {
        const loadedProfile = data as Profile;
        if (loadedProfile.display_name !== browserUserName) {
          await client.from('users_profile').update({ display_name: browserUserName }).eq('id', userId);
          setProfile({ ...loadedProfile, display_name: browserUserName });
        } else {
          setProfile(loadedProfile);
        }
        setReminderTime(data.reminder_time ?? '20:00');
        setStatus('');
      } else if (error) {
        const { data: created, error: createError } = await client
          .from('users_profile')
          .insert({ id: userId, display_name: browserUserName, reminder_time: null, jobs_seeded: false })
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
      const loadedTasks = (tasks ?? []) as CustomTask[];
      const loadedProfile = (data ?? profile) as Profile | null;
      const shouldSeedDefaultJobs = loadedTasks.length === 0 || loadedProfile?.jobs_seeded === false;

      if (shouldSeedDefaultJobs) {
        const seededTasks = await seedDefaultJobs(client, loadedTasks);
        setCustomTasks(seededTasks);
      } else {
        const expandedTasks = await seedExpandedDefaultJobs(client, loadedTasks);
        setCustomTasks(expandedTasks);
      }
      if (tasksError) setStatus('Unable to load your job list. Check the Supabase schema and connection.');
    }
    loadProfile();
  }, [userId]);

  async function seedDefaultJobs(client: NonNullable<typeof supabase>, currentTasks: CustomTask[]) {
    const knownTaskNames = new Set(currentTasks.map((task) => task.task_text.trim().toLowerCase()));
    const tasksToSeed = (Object.entries(energyTasks) as [EnergyLevel, string[]][])
      .flatMap(([energyLevel, tasks]) => tasks.map((taskText) => ({
        user_id: userId,
        task_text: taskText,
        energy_level: energyLevel,
      })))
      .filter((task) => !knownTaskNames.has(task.task_text.trim().toLowerCase()));

    let nextTasks = currentTasks;
    if (tasksToSeed.length > 0) {
      const { data, error } = await client.from('custom_tasks').insert(tasksToSeed).select();
      if (error) {
        setStatus(error.message || 'Unable to seed your editable job list.');
        return currentTasks;
      }
      nextTasks = [...((data ?? []) as CustomTask[]), ...currentTasks];
    }

    await client.from('users_profile').update({ jobs_seeded: true }).eq('id', userId);
    setProfile((prev) => (prev ? { ...prev, jobs_seeded: true } : prev));
    window.localStorage.setItem(`reset_loop_expanded_default_jobs_${userId}`, 'true');
    return nextTasks;
  }

  async function seedExpandedDefaultJobs(client: NonNullable<typeof supabase>, currentTasks: CustomTask[]) {
    if (currentTasks.length === 0) return currentTasks;

    const storageKey = `reset_loop_expanded_default_jobs_${userId}`;
    if (window.localStorage.getItem(storageKey) === 'true') return currentTasks;

    const knownTaskNames = new Set(currentTasks.map((task) => task.task_text.trim().toLowerCase()));
    const tasksToSeed = expandedDefaultTasks()
      .filter((task) => !knownTaskNames.has(task.taskText.trim().toLowerCase()))
      .map((task) => ({
        user_id: userId,
        task_text: task.taskText,
        energy_level: task.energyLevel,
      }));

    if (tasksToSeed.length === 0) {
      window.localStorage.setItem(storageKey, 'true');
      return currentTasks;
    }

    const { data, error } = await client.from('custom_tasks').insert(tasksToSeed).select();
    if (error) {
      setStatus(error.message || 'Unable to add the expanded default jobs.');
      return currentTasks;
    }

    window.localStorage.setItem(storageKey, 'true');
    setStatus('Expanded job list added. Each energy level now has 20 default jobs.');
    return [...((data ?? []) as CustomTask[]), ...currentTasks];
  }

  async function ensureProfile(client: NonNullable<typeof supabase>) {
    if (profile) return true;

    const { data: existingProfile } = await client.from('users_profile').select('*').eq('id', userId).single();
    if (existingProfile) {
      setProfile(existingProfile as Profile);
      return true;
    }

    const { data: created, error } = await client
      .from('users_profile')
      .insert({ id: userId, display_name: activeBrowserUser?.name ?? 'Friend', reminder_time: null, jobs_seeded: false })
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
      const scheduleMode = await scheduleDailyReminder(reminderTime, userId);
      setStatus(
        scheduleMode === 'native'
          ? 'Reminder saved. Android app notification scheduled.'
          : 'Reminder saved. You will get a gentle nudge when browser notifications are allowed.',
      );
      setProfile((prev) => (prev ? { ...prev, reminder_time: reminderTime } : prev));
    } else {
      setStatus('Unable to save reminder. Please try again.');
    }
  }

  async function requestNotifications() {
    const permission = await requestReminderPermission();
    if (permission === 'native-granted') {
      setStatus('Android app notifications enabled.');
      return;
    }
    if (permission === 'browser-granted') {
      setStatus('Browser notifications enabled.');
      return;
    }
    setStatus(permission === 'unsupported' ? 'Notifications are not supported here.' : 'Notifications blocked.');
  }

  function switchUser(nextUserId: string) {
    const selectedUser = setActiveBrowserUser(nextUserId);
    if (!selectedUser) return;

    setUserId(selectedUser.id);
    setProfile(null);
    setCustomTasks([]);
    setEditingTaskId(null);
    setNewTaskText('');
    setStatus(`${selectedUser.name} is active now.`);
    setBrowserUsers(getBrowserUsers());
  }

  function addUser() {
    const trimmedName = newUserName.trim();
    if (!trimmedName) {
      setStatus('Add a name for the new user.');
      return;
    }

    const newUser = createBrowserUser(trimmedName);
    setBrowserUsers(getBrowserUsers());
    setUserId(newUser.id);
    setProfile(null);
    setCustomTasks([]);
    setEditingTaskId(null);
    setNewTaskText('');
    setNewUserName('');
    setStatus(`${newUser.name} was added and is active now.`);
  }

  async function addCustomTask() {
    const trimmedTask = newTaskText.trim();
    if (!trimmedTask || !userId || !supabase) return;
    if (isDuplicateTask) {
      setStatus('That job is already in the suggestion list.');
      return;
    }

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
    const taskToDelete = customTasks.find((task) => task.id === taskId);
    const confirmed = window.confirm(`Delete "${taskToDelete?.task_text ?? 'this job'}" from the suggestion list?`);
    if (!confirmed) return;

    const client = supabase;
    const { data, error } = await client
      .from('custom_tasks')
      .delete()
      .eq('id', taskId)
      .select('id');
    if (error) {
      setStatus(error.message || 'Unable to remove job. Please try again.');
      return;
    }

    if (!data || data.length === 0) {
      setStatus('Unable to remove job. Run the latest Supabase SQL so the job delete policy is active, then try again.');
      return;
    }

    setCustomTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    setStatus('Job removed from future suggestions.');
  }

  function startEditingTask(task: CustomTask) {
    setEditingTaskId(task.id);
    setEditingTaskText(task.task_text);
    setEditingTaskEnergy(task.energy_level);
    setStatus('');
  }

  function cancelEditingTask() {
    setEditingTaskId(null);
    setEditingTaskText('');
    setEditingTaskEnergy('low');
  }

  async function saveEditedTask() {
    const trimmedTask = editingTaskText.trim();
    if (!editingTaskId || !trimmedTask || !supabase) return;
    if (isDuplicateEditingTask) {
      setStatus('That job is already in the suggestion list.');
      return;
    }

    const client = supabase;
    const { data, error } = await client
      .from('custom_tasks')
      .update({ task_text: trimmedTask, energy_level: editingTaskEnergy })
      .eq('id', editingTaskId)
      .select()
      .single();

    if (error) {
      setStatus(error.message || 'Unable to update job. Please try again.');
      return;
    }

    if (data) {
      setCustomTasks((currentTasks) => currentTasks.map((task) => (
        task.id === editingTaskId ? data as CustomTask : task
      )));
    }
    cancelEditingTask();
    setStatus('Job updated.');
  }

  async function moveTaskToEnergy(taskId: string, energyLevel: EnergyLevel) {
    const task = customTasks.find((item) => item.id === taskId);
    if (!task || task.energy_level === energyLevel || !supabase) {
      setDraggingTaskId(null);
      return;
    }

    const client = supabase;
    const { data, error } = await client
      .from('custom_tasks')
      .update({ energy_level: energyLevel })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      setStatus(error.message || 'Unable to move job. Please try again.');
      setDraggingTaskId(null);
      return;
    }

    if (data) {
      setCustomTasks((currentTasks) => currentTasks.map((currentTask) => (
        currentTask.id === taskId ? data as CustomTask : currentTask
      )));
    }
    setDraggingTaskId(null);
    setStatus(`Moved job to ${energyLabels[energyLevel]} energy.`);
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Users</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Who is resetting?</h2>
          </div>
          <div className="rounded-3xl bg-primarySoft p-3 text-primary">
            <Users className="h-5 w-5" />
          </div>
        </div>
        <p className="text-sm leading-6 text-slate-600">Each user gets their own streak, jobs, check-ins, and progress on this device.</p>

        <div className="mt-4 space-y-2">
          {browserUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => switchUser(user.id)}
              className={`flex w-full items-center justify-between rounded-3xl border px-4 py-3 text-left transition ${
                user.id === userId
                  ? 'border-primary bg-primarySoft text-primary'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-primary/70 hover:bg-primarySoft'
              }`}
            >
              <span className="flex items-center gap-2 font-semibold">
                {user.name}
                {user.role === 'admin' && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800">Admin</span>
                )}
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">{user.id === userId ? 'Active' : 'Switch'}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={newUserName}
            onChange={(event) => setNewUserName(event.target.value)}
            placeholder="Add user name"
            className="min-w-0 flex-1 rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          <button
            type="button"
            onClick={addUser}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-primary text-white shadow-lg shadow-primary/20 transition hover:bg-blue-600"
            aria-label="Add user"
          >
            <UserPlus className="h-5 w-5" />
          </button>
        </div>
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
            {hasNativeLocalNotifications() ? 'Enable app notifications' : 'Enable browser notifications'}
          </button>
          {status && <p className="text-sm text-slate-600">{status}</p>}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-4">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Jobs</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Suggestion list</h2>
          <p className="mt-2 text-sm text-slate-600">Edit any job, delete jobs you do not want, or drag a job into the energy level that fits you.</p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={newTaskText}
            onChange={(event) => setNewTaskText(event.target.value)}
            placeholder="Add a job, e.g. Empty bathroom bin"
            className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          {isDuplicateTask && (
            <p className="rounded-3xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">That job is already listed.</p>
          )}
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
            disabled={!newTaskText.trim() || isDuplicateTask}
            className="inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-primary px-5 py-4 text-base font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Plus className="h-5 w-5" />
            Add job
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {(['low', 'medium', 'high'] as EnergyLevel[]).map((level) => {
            const customTasksForLevel = customTasks.filter((task) => task.energy_level === level);

            return (
              <div
                key={level}
                className={`rounded-3xl bg-slate-50 p-4 transition ${draggingTaskId ? 'ring-2 ring-primary/20' : ''}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (draggingTaskId) moveTaskToEnergy(draggingTaskId, level);
                }}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-950">{energyLabels[level]} energy</h3>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                    {customTasksForLevel.length} jobs
                  </span>
                </div>
                <div className="space-y-2">
                  {customTasksForLevel.length === 0 && (
                    <p className="rounded-3xl bg-white p-3 text-sm text-slate-600">Drop jobs here to use them as {energyLabels[level].toLowerCase()} energy suggestions.</p>
                  )}
                  {customTasksForLevel.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-3 rounded-3xl bg-white p-3"
                      draggable={editingTaskId !== task.id}
                      onDragStart={() => setDraggingTaskId(task.id)}
                      onDragEnd={() => setDraggingTaskId(null)}
                    >
                      {editingTaskId === task.id ? (
                        <div className="w-full space-y-3">
                          <input
                            type="text"
                            value={editingTaskText}
                            onChange={(event) => setEditingTaskText(event.target.value)}
                            className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                          />
                          {isDuplicateEditingTask && (
                            <p className="text-sm font-medium text-slate-600">That job is already listed.</p>
                          )}
                          <div className="grid grid-cols-3 gap-2">
                            {(['low', 'medium', 'high'] as EnergyLevel[]).map((editLevel) => (
                              <button
                                key={editLevel}
                                type="button"
                                onClick={() => setEditingTaskEnergy(editLevel)}
                                className={`rounded-3xl border px-3 py-2 text-sm font-semibold transition ${
                                  editingTaskEnergy === editLevel
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-primary/80 hover:bg-primarySoft'
                                }`}
                              >
                                {energyLabels[editLevel]}
                              </button>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={saveEditedTask}
                              disabled={!editingTaskText.trim() || isDuplicateEditingTask}
                              className="inline-flex items-center justify-center gap-2 rounded-3xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              <Save className="h-4 w-4" />
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingTask}
                              className="inline-flex items-center justify-center gap-2 rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:bg-primarySoft"
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{task.task_text}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">Editable job</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400" aria-hidden="true">
                              <GripVertical className="h-4 w-4" />
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditingTask(task)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition hover:text-slate-900"
                              aria-label={`Edit ${task.task_text}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCustomTask(task.id)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition hover:text-slate-900"
                              aria-label={`Remove ${task.task_text}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
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
