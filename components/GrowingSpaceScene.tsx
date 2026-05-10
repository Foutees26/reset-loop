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

  function hashString(value: string) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function normalizeValue(value: number, min: number, max: number) {
    return min + (value / 0xffffffff) * (max - min);
  }

  function getPlantScale(plantType: string, plantId: string): number {
    const seed = hashString(`${plantType}-${plantId}`);
    switch (plantType) {
      // Large plants
      case 'bonsai':
      case 'rubber-plant':
      case 'monstera':
      case 'calathea':
        return normalizeValue(seed, 0.9, 1.0);

      // Medium plants
      case 'fern':
      case 'pothos':
      case 'peace-lily':
      case 'aloe':
      case 'cactus':
      case 'sunflower':
      case 'lavender':
        return normalizeValue(seed, 0.7, 0.85);

      // Small plants
      case 'daisy':
      case 'tulip':
      case 'gloxinia':
      case 'echeveria-succulent':
        return normalizeValue(seed, 0.55, 0.7);

      default:
        return normalizeValue(seed, 0.75, 0.85);
    }
  }

  function getPlantRotation(plantId: string, index: number) {
    const seed = hashString(`${plantId}-${index}-rotation`);
    return -4 + (seed % 9);
  }

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
          animate={{ opacity: 1, scale: getPlantScale(normalizedGrowth.current_plant.type, normalizedGrowth.current_plant.id), y: 0 }}
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
            const scale = getPlantScale(plant.type, plant.id);
            const rotation = getPlantRotation(plant.id, index);
            const isNewest = plant.id === lastCompletedPlantId && celebrateKey > 0;

            return (
              <motion.div
                key={plant.id}
                className="calm-space-collected"
                initial={isNewest
                  ? { opacity: 0, x: -24, y: 84, scale: 1.04, rotate: 0 }
                  : { opacity: 0, y: 28, scale: scale * 0.9, rotate: rotation }}
                animate={isNewest
                  ? { opacity: 1, x: [0, 10, 0], y: [42, -14, 0], scale: [1.05, 0.9, scale, scale * 1.05, scale], rotate: rotation }
                  : { opacity: 1, y: 0, scale, rotate: rotation }}
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
