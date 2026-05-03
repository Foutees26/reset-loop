'use client';

import { useState } from 'react';
import { energyOptions, moodOptions, painOptions } from '../lib/resetData';

interface CheckInModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (mood: string, energy: string, pain: string) => Promise<void> | void;
}

export default function CheckInModal({ open, onClose, onSubmit }: CheckInModalProps) {
  const [mood, setMood] = useState('Okay');
  const [energy, setEnergy] = useState('Medium');
  const [pain, setPain] = useState('Mild');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 px-4 py-6 sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Optional check-in</p>
            <h2 className="text-xl font-semibold text-slate-900">How are you feeling?</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
            Close
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <p className="mb-3 text-sm text-slate-600">Mood</p>
            <div className="flex gap-2">
              {moodOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMood(option)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    mood === option ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm text-slate-600">Energy</p>
            <div className="flex gap-2">
              {energyOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setEnergy(option)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    energy === option ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm text-slate-600">Pain</p>
            <div className="flex gap-2">
              {painOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPain(option)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    pain === option ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onSubmit(mood, energy, pain);
              setSaving(false);
              onClose();
            }}
            className="w-full rounded-3xl bg-primary px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? 'Saving...' : 'Save check-in'}
          </button>
        </div>
      </div>
    </div>
  );
}
