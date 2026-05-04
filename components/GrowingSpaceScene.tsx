'use client';

import { motion } from 'framer-motion';
import { normalizeCalmGrowth, type CalmGrowthSource } from '../lib/calmGrowth';
import WatercolorPlant from './WatercolorPlant';

interface GrowingSpaceSceneProps {
  growth: CalmGrowthSource;
  celebrateKey?: number;
  showCurrent?: boolean;
  immersive?: boolean;
  className?: string;
}

export default function GrowingSpaceScene({ growth, celebrateKey = 0, showCurrent = true, immersive = false, className = '' }: GrowingSpaceSceneProps) {
  const normalizedGrowth = normalizeCalmGrowth(growth);
  const completedPlants = normalizedGrowth.completed_plants;
  const lastCompletedPlantId = completedPlants[completedPlants.length - 1]?.id;

  return (
    <div className={`calm-space-scene ${immersive ? 'calm-space-scene-immersive' : ''} ${className}`}>
      <div className="calm-space-wash calm-space-wash-one" />
      <div className="calm-space-wash calm-space-wash-two" />
      <div className="calm-space-window-frame" aria-hidden="true" />

      {showCurrent && (
        <motion.div
          className="calm-space-current"
          key={`${normalizedGrowth.current_plant.id}-${normalizedGrowth.current_plant.stage}`}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
        >
          <WatercolorPlant plant={normalizedGrowth.current_plant} />
        </motion.div>
      )}

      <div className="calm-space-shelf">
        {completedPlants.length === 0 ? (
          <p className="calm-space-empty">Completed plants will settle here.</p>
        ) : (
          completedPlants.slice(immersive ? -14 : -8).map((plant, index) => {
            const verticalOffset = [0, -7, 3, -4, 6, -2][index % 6];
            const scale = [0.78, 0.86, 0.73, 0.9, 0.8][index % 5];
            const isNewest = plant.id === lastCompletedPlantId && celebrateKey > 0;

            return (
              <motion.div
                key={plant.id}
                className="calm-space-collected"
                style={{ y: verticalOffset, scale }}
                initial={isNewest ? { opacity: 0, x: -24, y: 84, scale: 1.04 } : { opacity: 0, y: 28, scale: scale * 0.9 }}
                animate={isNewest
                  ? { opacity: 1, x: [0, 10, 0], y: [42, -14, verticalOffset], scale: [1.05, 0.9, scale, scale * 1.05, scale] }
                  : { opacity: 1, y: verticalOffset, scale }}
                transition={{ delay: isNewest ? 0.2 : index * 0.035, duration: isNewest ? 1.1 : 0.58, ease: [0.22, 1, 0.36, 1] }}
              >
                <WatercolorPlant plant={plant} shelf completionKey={isNewest ? celebrateKey : 0} />
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
