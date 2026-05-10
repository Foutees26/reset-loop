'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { growingPlantTypeLabels, type GrowingPlant, type GrowingPlantType } from '../lib/calmGrowth';

type PlantFamily = 'leafy' | 'flower' | 'cactus' | 'tree';

interface WatercolorPlantProps {
  plant: GrowingPlant;
  shelf?: boolean;
  completionKey?: number;
  className?: string;
}

const growTransition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] } as const;

export default function WatercolorPlant({ plant, shelf = false, completionKey = 0, className = '' }: WatercolorPlantProps) {
  const family = plantFamily(plant.type);
  const palette = plantPalette(plant.type);
  const plantId = plant.id.replace(/[^a-zA-Z0-9]/g, '');
  const label = growingPlantTypeLabels[plant.type];
  const preparedPlantName = getPreparedPlantName(plant.type);
  const preparedPlantPath = preparedPlantName
    ? `/prepared plants/${encodeURIComponent(`${preparedPlantName} ${plant.stage + 1}.png`)}`
    : null;

  if (preparedPlantPath) {
    return (
      <motion.img
        src={preparedPlantPath}
        role="img"
        alt={`${label}, ${plant.completed ? 'completed' : 'growing'}`}
        className={`watercolor-plant ${shelf ? 'watercolor-plant-shelf' : ''} ${className}`}
        initial={false}
        animate={completionKey > 0 && plant.completed ? { scale: [1, 1.08, 0.94, 1], y: [34, -14, 0] } : { scale: 1, y: 0 }}
        transition={{ delay: completionKey > 0 ? 0.2 : 0, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }

  return (
    <motion.svg
      viewBox="0 0 150 170"
      role="img"
      aria-label={`${label}, ${plant.completed ? 'completed' : 'growing'}`}
      className={`watercolor-plant ${shelf ? 'watercolor-plant-shelf' : ''} ${className}`}
      initial={false}
      animate={completionKey > 0 && plant.completed ? { scale: [1, 1.08, 0.94, 1], y: [34, -14, 0] } : { scale: 1, y: 0 }}
      transition={{ delay: completionKey > 0 ? 0.2 : 0, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <defs>
        <radialGradient id={`leaf-${plantId}`} cx="35%" cy="25%" r="75%">
          <stop offset="0%" stopColor={palette.leafLight} stopOpacity="0.92" />
          <stop offset="58%" stopColor={palette.leaf} stopOpacity="0.88" />
          <stop offset="100%" stopColor={palette.leafDark} stopOpacity="0.76" />
        </radialGradient>
        <linearGradient id={`stem-${plantId}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={palette.stemLight} />
          <stop offset="100%" stopColor={palette.stem} />
        </linearGradient>
        <radialGradient id={`bloom-${plantId}`} cx="45%" cy="35%" r="70%">
          <stop offset="0%" stopColor={palette.bloomLight} />
          <stop offset="58%" stopColor={palette.bloom} />
          <stop offset="100%" stopColor={palette.bloomDark} />
        </radialGradient>
        <filter id={`soft-${plantId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur" />
          <feOffset dy="4" result="offsetBlur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.18" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse cx="75" cy="146" rx="44" ry="12" fill="#a96f48" opacity="0.18" />
      <motion.path
        d="M33 136 C47 122 103 122 117 136 C110 153 40 153 33 136Z"
        fill="#c99a6b"
        opacity="0.78"
        filter={`url(#soft-${plantId})`}
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 0.78, scale: 1 }}
        transition={growTransition}
      />

      {plant.stage === 0 && (
        <motion.path
          d="M69 125 C59 112 67 100 79 103 C91 109 88 124 75 130Z"
          fill="#a66a3f"
          opacity="0.82"
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 0.82, scale: 1, y: 0 }}
          transition={growTransition}
        />
      )}

      {plant.stage >= 1 && family === 'cactus' && <CactusPlant plant={plant} plantId={plantId} />}
      {plant.stage >= 1 && family === 'tree' && <TreePlant plant={plant} plantId={plantId} type={plant.type} />}
      {plant.stage >= 1 && family === 'flower' && <FlowerPlant plant={plant} plantId={plantId} type={plant.type} />}
      {plant.stage >= 1 && family === 'leafy' && <LeafyPlant plant={plant} plantId={plantId} type={plant.type} />}

      {plant.completed && (
        <motion.ellipse
          cx="75"
          cy="88"
          rx="52"
          ry="58"
          fill={palette.glow}
          opacity="0"
          animate={{ opacity: [0, 0.18, 0] }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </motion.svg>
  );
}

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ...growTransition, delay }}
      style={{ transformOrigin: '75px 138px' }}
    >
      {children}
    </motion.g>
  );
}

function LeafyPlant({ plant, plantId, type }: { plant: GrowingPlant; plantId: string; type: GrowingPlantType }) {
  const isMonstera = type === 'monstera';
  return (
    <>
      <Reveal>
        <path d="M74 136 C72 108 73 88 76 62" stroke={`url(#stem-${plantId})`} strokeWidth="7" strokeLinecap="round" fill="none" />
      </Reveal>
      {plant.stage >= 1 && (
        <Reveal delay={0.04}>
          <path d="M75 110 C47 102 39 78 62 76 C77 77 78 96 75 110Z" fill={`url(#leaf-${plantId})`} opacity="0.9" />
          <path d="M78 106 C104 94 112 72 91 71 C77 74 75 92 78 106Z" fill={`url(#leaf-${plantId})`} opacity="0.82" />
        </Reveal>
      )}
      {plant.stage >= 2 && (
        <Reveal delay={0.08}>
          <path d="M75 90 C43 78 38 50 65 50 C83 54 82 75 75 90Z" fill={`url(#leaf-${plantId})`} opacity="0.88" />
          <path d="M79 84 C112 71 116 44 91 45 C75 50 73 72 79 84Z" fill={`url(#leaf-${plantId})`} opacity="0.82" />
        </Reveal>
      )}
      {plant.stage >= 3 && (
        <Reveal delay={0.12}>
          <path d={isMonstera ? 'M75 70 C35 50 43 18 75 28 C104 17 116 49 75 70Z' : 'M75 69 C45 51 48 23 73 30 C99 24 107 50 75 69Z'} fill={`url(#leaf-${plantId})`} opacity="0.88" />
          <path d="M75 74 C67 60 69 44 75 31" stroke="#f0fdf4" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        </Reveal>
      )}
      {plant.stage >= 4 && type === 'peace-lily' && (
        <Reveal delay={0.16}>
          <path d="M78 42 C92 21 111 28 103 52 C96 71 78 65 78 42Z" fill="#fffdf2" opacity="0.92" />
          <path d="M87 48 C91 42 96 41 98 48" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
        </Reveal>
      )}
    </>
  );
}

function FlowerPlant({ plant, plantId, type }: { plant: GrowingPlant; plantId: string; type: GrowingPlantType }) {
  return (
    <>
      <Reveal>
        <path d="M75 136 C74 106 74 80 76 49" stroke={`url(#stem-${plantId})`} strokeWidth="6" strokeLinecap="round" fill="none" />
      </Reveal>
      {plant.stage >= 1 && (
        <Reveal delay={0.04}>
          <path d="M73 110 C48 102 50 80 70 84 C83 88 82 101 73 110Z" fill={`url(#leaf-${plantId})`} opacity="0.8" />
          <path d="M78 105 C102 94 101 74 83 80 C72 85 71 98 78 105Z" fill={`url(#leaf-${plantId})`} opacity="0.74" />
        </Reveal>
      )}
      {plant.stage >= 2 && type === 'lavender' && (
        <Reveal delay={0.08}>
          {[0, 1, 2, 3].map((item) => (
            <ellipse key={item} cx={68 + item * 5} cy={62 - item * 8} rx="7" ry="10" fill={`url(#bloom-${plantId})`} opacity="0.86" transform={`rotate(${item % 2 ? 18 : -18} ${68 + item * 5} ${62 - item * 8})`} />
          ))}
        </Reveal>
      )}
      {plant.stage >= 3 && type !== 'lavender' && (
        <Reveal delay={0.1}>
          {type === 'tulip' ? (
            <path d="M57 47 C59 25 72 24 75 42 C80 24 94 27 93 48 C92 69 58 70 57 47Z" fill={`url(#bloom-${plantId})`} opacity="0.9" />
          ) : (
            <>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => {
                const angle = item * 45;
                return <ellipse key={item} cx="75" cy="47" rx={type === 'sunflower' ? 9 : 8} ry={type === 'sunflower' ? 22 : 17} fill={`url(#bloom-${plantId})`} opacity="0.86" transform={`rotate(${angle} 75 47) translate(0 -11)`} />;
              })}
              <circle cx="75" cy="47" r={type === 'sunflower' ? 13 : 9} fill={type === 'sunflower' ? '#8b5e34' : '#facc15'} opacity="0.9" />
            </>
          )}
        </Reveal>
      )}
      {plant.stage >= 4 && (
        <Reveal delay={0.14}>
          <circle cx="75" cy="47" r="34" fill={`url(#bloom-${plantId})`} opacity="0.16" />
        </Reveal>
      )}
    </>
  );
}

function CactusPlant({ plant, plantId }: { plant: GrowingPlant; plantId: string }) {
  const isAloe = plant.type === 'aloe';
  if (isAloe) {
    return (
      <>
        {[0, 1, 2, 3, 4].slice(0, Math.max(2, plant.stage + 1)).map((item) => (
          <Reveal key={item} delay={item * 0.03}>
            <path d="M75 136 C62 96 66 69 75 48 C84 69 88 96 75 136Z" fill={`url(#leaf-${plantId})`} opacity="0.82" transform={`rotate(${(item - 2) * 24} 75 136)`} />
          </Reveal>
        ))}
      </>
    );
  }

  return (
    <>
      <Reveal>
        <path d="M59 136 C58 91 56 49 75 42 C94 49 92 91 91 136Z" fill={`url(#leaf-${plantId})`} opacity="0.88" />
      </Reveal>
      {plant.stage >= 2 && (
        <Reveal delay={0.08}>
          <path d="M60 97 C39 96 41 67 54 68 C66 69 61 87 60 97Z" fill={`url(#leaf-${plantId})`} opacity="0.82" />
          <path d="M91 89 C112 87 110 58 97 60 C85 62 90 80 91 89Z" fill={`url(#leaf-${plantId})`} opacity="0.82" />
        </Reveal>
      )}
      {plant.stage >= 4 && (
        <Reveal delay={0.12}>
          <circle cx="75" cy="40" r="12" fill={`url(#bloom-${plantId})`} opacity="0.9" />
        </Reveal>
      )}
    </>
  );
}

function TreePlant({ plant, plantId, type }: { plant: GrowingPlant; plantId: string; type: GrowingPlantType }) {
  const isPine = type === 'pine';
  return (
    <>
      <Reveal>
        <path d="M74 136 C73 104 73 76 76 48" stroke={`url(#stem-${plantId})`} strokeWidth={type === 'bonsai' ? 10 : 12} strokeLinecap="round" fill="none" />
      </Reveal>
      {plant.stage >= 1 && (
        <Reveal delay={0.04}>
          {isPine ? <path d="M75 46 L42 96 H108Z" fill={`url(#leaf-${plantId})`} opacity="0.82" /> : <ellipse cx="75" cy="81" rx="38" ry="29" fill={`url(#leaf-${plantId})`} opacity="0.82" />}
        </Reveal>
      )}
      {plant.stage >= 2 && (
        <Reveal delay={0.08}>
          {isPine ? <path d="M75 27 L48 78 H102Z" fill={`url(#leaf-${plantId})`} opacity="0.84" /> : <ellipse cx="57" cy="63" rx="28" ry="23" fill={`url(#leaf-${plantId})`} opacity="0.76" />}
          {!isPine && <ellipse cx="94" cy="61" rx="28" ry="23" fill={`url(#leaf-${plantId})`} opacity="0.78" />}
        </Reveal>
      )}
      {plant.stage >= 3 && (
        <Reveal delay={0.12}>
          {isPine ? <path d="M75 10 L55 51 H95Z" fill={`url(#leaf-${plantId})`} opacity="0.9" /> : <ellipse cx="75" cy="42" rx="34" ry="25" fill={`url(#leaf-${plantId})`} opacity="0.86" />}
        </Reveal>
      )}
      {plant.stage >= 4 && !isPine && (
        <Reveal delay={0.16}>
          <circle cx="92" cy="50" r="7" fill={`url(#bloom-${plantId})`} opacity="0.82" />
          <circle cx="55" cy="66" r="6" fill={`url(#bloom-${plantId})`} opacity="0.7" />
        </Reveal>
      )}
    </>
  );
}

function getPreparedPlantName(type: GrowingPlantType): string | null {
  switch (type) {
    case 'fern':
      return 'fern';
    case 'pothos':
      return 'pothos';
    case 'peace-lily':
      return 'peace lily';
    case 'rubber-plant':
      return 'Rubber Plant';
    case 'calathea':
      return 'Calathea';
    case 'monstera':
      return 'Monstera';
    case 'sunflower':
      return 'sunflower';
    case 'daisy':
      return 'daisy';
    case 'tulip':
      return 'Tulip';
    case 'lavender':
      return 'lavender';
      case 'cactus':
      return 'cactus';
    case 'aloe':
      return 'aloe';
    case 'bonsai':
      return 'Crabapple Bonsai';
    case 'gloxinia':
      return 'Gloxinia';
    case 'echeveria-succulent':
      return 'Echeveria Succulent';
    case 'pine':
      return 'pine';
    case 'mini-tree':
      return 'mini-tree';
    default:
      return null;
  }
}

function plantFamily(type: GrowingPlantType): PlantFamily {
  if (type === 'cactus' || type === 'aloe' || type === 'echeveria-succulent') return 'cactus';
  if (type === 'bonsai' || type === 'pine' || type === 'mini-tree') return 'tree';
  if (type === 'sunflower' || type === 'daisy' || type === 'tulip' || type === 'lavender' || type === 'gloxinia') return 'flower';
  return 'leafy';
}

function plantPalette(type: GrowingPlantType) {
  if (type === 'sunflower') {
    return palette('#fef3c7', '#fbbf24', '#d97706', '#86efac', '#16a34a', '#fef9c3', '#facc15', '#b45309', '#facc15');
  }
  if (type === 'daisy') {
    return palette('#f0fdf4', '#22c55e', '#15803d', '#bbf7d0', '#22c55e', '#ffffff', '#f8fafc', '#facc15', '#fef3c7');
  }
  if (type === 'tulip') {
    return palette('#dcfce7', '#22c55e', '#15803d', '#bbf7d0', '#22c55e', '#fecdd3', '#fb7185', '#be123c', '#fb7185');
  }
  if (type === 'lavender') {
    return palette('#ecfdf5', '#22c55e', '#15803d', '#bbf7d0', '#16a34a', '#ddd6fe', '#a78bfa', '#7c3aed', '#a78bfa');
  }
  if (type === 'cactus' || type === 'aloe') {
    return palette('#ccfbf1', '#14b8a6', '#0f766e', '#99f6e4', '#0f766e', '#fbcfe8', '#f472b6', '#be185d', '#14b8a6');
  }
  if (type === 'bonsai' || type === 'pine' || type === 'mini-tree') {
    return palette('#dcfce7', '#22c55e', '#166534', '#d6a66f', '#92400e', '#fde68a', '#f59e0b', '#b45309', '#22c55e');
  }
  if (type === 'calathea' || type === 'monstera') {
    return palette('#d1fae5', '#14b8a6', '#047857', '#86efac', '#059669', '#fbcfe8', '#f472b6', '#be185d', '#14b8a6');
  }
  return palette('#dcfce7', '#34d399', '#047857', '#bbf7d0', '#059669', '#fef3c7', '#fbbf24', '#d97706', '#34d399');
}

function palette(leafLight: string, leaf: string, leafDark: string, stemLight: string, stem: string, bloomLight: string, bloom: string, bloomDark: string, glow: string) {
  return { leafLight, leaf, leafDark, stemLight, stem, bloomLight, bloom, bloomDark, glow };
}
