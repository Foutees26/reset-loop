'use client';

import { useEffect, useState } from 'react';
import { Flower2, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getOrCreateBrowserUserId } from '../../lib/browserUser';
import GrowingSpaceScene from '../../components/GrowingSpaceScene';
import {
  calmGrowthJobsToNextGlow,
  calmGrowthStageLabels,
  growingPlantTypeLabels,
  idleCalmGrowthState,
  normalizeCalmGrowth,
  type CalmGrowthState,
} from '../../lib/calmGrowth';

interface Profile {
  id: string;
  growth_stage?: number | null;
  calm_progress?: number | null;
  calm_growth_total?: number | null;
  current_plant?: CalmGrowthState['current_plant'] | null;
  completed_plants?: CalmGrowthState['completed_plants'] | null;
}

export default function CalmSpacePage() {
  const [userId, setUserId] = useState('');
  const [growth, setGrowth] = useState<CalmGrowthState>(idleCalmGrowthState);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setUserId(getOrCreateBrowserUserId());
  }, []);

  useEffect(() => {
    if (!userId) return;
    if (!supabase) {
      setLoading(false);
      setStatus('Missing Supabase settings. Add your Supabase env vars to load Calm Space.');
      return;
    }

    const client = supabase;
    async function loadCalmSpace() {
      setLoading(true);
      const { data, error } = await client
        .from('users_profile')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setGrowth(normalizeCalmGrowth(data as Profile));
        setStatus('');
      } else if (error) {
        setStatus('Complete a reset first and your Calm Space will start growing here.');
      }
      setLoading(false);
    }

    loadCalmSpace();
  }, [userId]);

  const currentPlant = growth.current_plant;
  const currentStage = calmGrowthStageLabels[currentPlant.stage];
  const currentPlantLabel = growingPlantTypeLabels[currentPlant.type];
  const jobsToNext = calmGrowthJobsToNextGlow(growth);

  return (
    <div className="space-y-6 pb-10">
      <section className="calm-space-hero rounded-[36px] p-5 text-slate-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Calm Space</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">Your peaceful growing shelf</h1>
          </div>
          <div className="rounded-[24px] bg-white/70 p-3 text-emerald-700 shadow-sm">
            <Flower2 className="h-6 w-6" />
          </div>
        </div>
      </section>

      <section className="calm-space-page-panel rounded-[38px] p-4">
        <GrowingSpaceScene growth={growth} immersive />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="app-card rounded-[30px] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Current plant</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{currentPlantLabel}</p>
          <p className="mt-1 text-sm font-medium text-emerald-700">{currentStage}</p>
        </div>
        <div className="app-card rounded-[30px] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Collection</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{growth.completed_plants.length} plant{growth.completed_plants.length === 1 ? '' : 's'}</p>
          <p className="mt-1 text-sm text-slate-600">Settled on your shelf.</p>
        </div>
        <div className="app-card rounded-[30px] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Next growth</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{jobsToNext} job{jobsToNext === 1 ? '' : 's'}</p>
          <p className="mt-1 text-sm text-slate-600">No pressure. Just progress.</p>
        </div>
      </section>

      {(loading || status) && (
        <section className="app-card rounded-[30px] p-4 text-sm text-slate-600">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <p>{loading ? 'Loading your Calm Space...' : status}</p>
          </div>
        </section>
      )}
    </div>
  );
}
