'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Leaf } from 'lucide-react';
import {
  calmGrowthJobsToNextGlow,
  calmGrowthProgressPercent,
  calmGrowthResetsPerStage,
  calmGrowthStageLabels,
  growingPlantTypeLabels,
  normalizeCalmGrowth,
  type CalmGrowthSource,
} from '../lib/calmGrowth';
import GrowingSpaceScene from './GrowingSpaceScene';
import WatercolorPlant from './WatercolorPlant';

interface CalmGrowthCardProps {
  growth: CalmGrowthSource;
  celebrateKey?: number;
  className?: string;
  compact?: boolean;
  showCollection?: boolean;
}

export default function CalmGrowthCard({ growth, celebrateKey = 0, className = '', compact = false, showCollection = true }: CalmGrowthCardProps) {
  const normalizedGrowth = normalizeCalmGrowth(growth);
  const currentPlant = normalizedGrowth.current_plant;
  const stage = currentPlant.stage;
  const progressPercent = calmGrowthProgressPercent(normalizedGrowth);
  const jobsToGlow = calmGrowthJobsToNextGlow(normalizedGrowth);
  const stageLabel = calmGrowthStageLabels[stage];
  const plantLabel = growingPlantTypeLabels[currentPlant.type];
  const helperText = `${jobsToGlow} completed task${jobsToGlow === 1 ? '' : 's'} until the next little change.`;

  return (
    <section className={`calm-growth-card rounded-[34px] p-5 ${compact ? 'calm-growth-card-compact' : ''} ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Your Space</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">{stageLabel}</h2>
          <p className="mt-1 text-sm font-semibold text-emerald-800/80">{plantLabel}</p>
        </div>
        <div className="calm-growth-icon" aria-hidden="true">
          <Leaf className="h-5 w-5" />
        </div>
      </div>

      {showCollection && (
        <GrowingSpaceScene growth={normalizedGrowth} celebrateKey={celebrateKey} showCurrent={false} className="mt-5" />
      )}

      <div className={`${showCollection ? 'mt-5' : 'mt-4'} grid items-center gap-5 sm:grid-cols-[150px_1fr]`}>
        <div className="calm-plant-wrap" aria-hidden="true">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentPlant.id}-${currentPlant.stage}`}
              className="growing-current-plant"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <WatercolorPlant plant={currentPlant} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Progress</p>
              <p className="mt-1 text-sm text-slate-600">{helperText}</p>
            </div>
            <p className="shrink-0 text-sm font-bold text-emerald-700">
              {normalizedGrowth.calm_progress}/{calmGrowthResetsPerStage}
            </p>
          </div>

          <div className="calm-meter-track mt-4">
            <AnimatePresence>
              {celebrateKey > 0 && normalizedGrowth.calm_progress === 0 && (
                <motion.span
                  key={celebrateKey}
                  className="calm-meter-pulse"
                  initial={{ opacity: 0, width: '0%' }}
                  animate={{ opacity: [0, 1, 0], width: ['0%', '100%', '100%'] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
            </AnimatePresence>
            <motion.span
              className="calm-meter-fill"
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          <p className="mt-3 text-sm text-slate-600">
            Small tasks add up here. Enjoy the space you are building.
          </p>
        </div>
      </div>
    </section>
  );
}
