export const calmGrowthResetsPerStage = 5;
export const calmGrowthMaxStage = 4;

export const calmGrowthStageLabels = [
  'Seed',
  'Sprout',
  'Small plant',
  'Leafy plant',
  'Full plant',
] as const;

export const calmGrowthMessages = [
  'You did it!',
  'Even small actions make a difference.',
  'Small steps count.',
  'Your calm grew a little.',
  'That reset helped.',
];

export const growingPlantTypes = [
  'fern',
  'pothos',
  'peace-lily',
  'rubber-plant',
  'calathea',
  'monstera',
  'sunflower',
  'daisy',
  'tulip',
  'lavender',
  'cactus',
  'aloe',
  'bonsai',
  'pine',
  'mini-tree',
] as const;

export type GrowingPlantType = typeof growingPlantTypes[number];

export const growingPlantTypeLabels: Record<GrowingPlantType, string> = {
  fern: 'Fern',
  pothos: 'Pothos',
  'peace-lily': 'Peace lily',
  'rubber-plant': 'Rubber plant',
  calathea: 'Calathea',
  monstera: 'Monstera',
  sunflower: 'Sunflower',
  daisy: 'Daisy',
  tulip: 'Tulip',
  lavender: 'Lavender',
  cactus: 'Cactus',
  aloe: 'Aloe',
  bonsai: 'Bonsai',
  pine: 'Pine tree',
  'mini-tree': 'Mini tree',
};

export interface GrowingPlant {
  id: string;
  stage: number;
  progress: number;
  type: GrowingPlantType;
  completed: boolean;
}

export interface CalmGrowthState {
  growth_stage: number;
  calm_progress: number;
  calm_growth_total: number;
  current_plant: GrowingPlant;
  completed_plants: GrowingPlant[];
}

export interface CalmGrowthAdvance {
  previous: CalmGrowthState;
  next: CalmGrowthState;
  didFillMeter: boolean;
  didAdvanceStage: boolean;
  completedPlant: GrowingPlant | null;
  message: string;
}

export function createPlant(type?: GrowingPlantType, seed = 0): GrowingPlant {
  const selectedType = type ?? randomPlantType();

  return {
    id: `plant-${selectedType}-${seed}-${Math.random().toString(36).slice(2, 8)}`,
    stage: 0,
    progress: 0,
    type: selectedType,
    completed: false,
  };
}

export function randomPlantType(previousType?: GrowingPlantType) {
  const options = previousType && growingPlantTypes.length > 1
    ? growingPlantTypes.filter((type) => type !== previousType)
    : [...growingPlantTypes];
  return options[Math.floor(Math.random() * options.length)];
}

export const idleCalmGrowthState: CalmGrowthState = {
  growth_stage: 0,
  calm_progress: 0,
  calm_growth_total: 0,
  current_plant: {
    id: 'plant-fern-0',
    stage: 0,
    progress: 0,
    type: 'fern',
    completed: false,
  },
  completed_plants: [],
};

export type CalmGrowthSource = {
  growth_stage?: number | null;
  calm_progress?: number | null;
  calm_growth_total?: number | null;
  current_plant?: GrowingPlant | null;
  completed_plants?: GrowingPlant[] | null;
} | null | undefined;

function clampInteger(value: unknown, min: number, max: number) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) return min;
  return Math.min(max, Math.max(min, Math.floor(numberValue)));
}

function normalizePlantType(value: unknown, fallbackSeed: number): GrowingPlantType {
  return growingPlantTypes.includes(value as GrowingPlantType)
    ? value as GrowingPlantType
    : growingPlantTypes[fallbackSeed % growingPlantTypes.length];
}

function normalizePlant(source: Partial<GrowingPlant> | null | undefined, fallbackSeed: number, completed = false): GrowingPlant {
  return {
    id: typeof source?.id === 'string' && source.id ? source.id : `plant-${fallbackSeed}`,
    stage: clampInteger(source?.stage, 0, calmGrowthMaxStage),
    progress: clampInteger(source?.progress, 0, calmGrowthResetsPerStage - 1),
    type: normalizePlantType(source?.type, fallbackSeed),
    completed: Boolean(source?.completed ?? completed),
  };
}

function buildCompletedPlant(index: number): GrowingPlant {
  return {
    id: `completed-plant-${index + 1}`,
    stage: calmGrowthMaxStage,
    progress: 0,
    type: growingPlantTypes[index % growingPlantTypes.length],
    completed: true,
  };
}

export function calmGrowthFromTotal(totalJobs: number): CalmGrowthState {
  const total = clampInteger(totalJobs, 0, Number.MAX_SAFE_INTEGER);
  const completedPlantCount = Math.floor(total / (calmGrowthResetsPerStage * calmGrowthMaxStage));
  const currentPlantTotal = total % (calmGrowthResetsPerStage * calmGrowthMaxStage);
  const currentStage = Math.floor(currentPlantTotal / calmGrowthResetsPerStage);
  const currentProgress = currentPlantTotal % calmGrowthResetsPerStage;
  const currentPlant = createPlant(growingPlantTypes[completedPlantCount % growingPlantTypes.length], completedPlantCount);
  currentPlant.stage = currentStage;
  currentPlant.progress = currentProgress;

  return {
    calm_growth_total: total,
    growth_stage: currentStage,
    calm_progress: total % calmGrowthResetsPerStage,
    current_plant: currentPlant,
    completed_plants: Array.from({ length: completedPlantCount }, (_, index) => buildCompletedPlant(index)),
  };
}

export function normalizeCalmGrowth(source: CalmGrowthSource): CalmGrowthState {
  const rawStage = clampInteger(source?.growth_stage, 0, calmGrowthMaxStage);
  const rawProgress = clampInteger(source?.calm_progress, 0, calmGrowthResetsPerStage - 1);
  const rawTotal = clampInteger(source?.calm_growth_total, 0, Number.MAX_SAFE_INTEGER);

  if (rawTotal > 0) {
    const fromTotal = calmGrowthFromTotal(rawTotal);
    const currentPlant = source?.current_plant
      ? normalizePlant(source.current_plant, fromTotal.completed_plants.length)
      : fromTotal.current_plant;
    const completedPlants = Array.isArray(source?.completed_plants) && source.completed_plants.length > 0
      ? source.completed_plants.map((plant, index) => normalizePlant(plant, index, true))
      : fromTotal.completed_plants;

    return {
      ...fromTotal,
      current_plant: currentPlant.completed ? fromTotal.current_plant : currentPlant,
      completed_plants: completedPlants,
    };
  }

  if (rawStage > 0 || rawProgress > 0) {
    return calmGrowthFromTotal(rawStage * calmGrowthResetsPerStage + rawProgress);
  }

  return idleCalmGrowthState;
}

export function advanceCalmGrowth(current: CalmGrowthSource): CalmGrowthAdvance {
  const previous = normalizeCalmGrowth(current);
  const nextTotal = previous.calm_growth_total + 1;
  const nextPlant = { ...previous.current_plant, progress: previous.current_plant.progress + 1 };
  let completedPlant: GrowingPlant | null = null;
  let didAdvanceStage = false;
  let didFillMeter = false;
  let completedPlants = previous.completed_plants;

  if (nextPlant.progress >= calmGrowthResetsPerStage) {
    didFillMeter = true;
    didAdvanceStage = true;
    nextPlant.progress = 0;

    if (nextPlant.stage >= calmGrowthMaxStage - 1) {
      completedPlant = {
        ...nextPlant,
        id: `${nextPlant.id}-complete-${nextTotal}`,
        stage: calmGrowthMaxStage,
        completed: true,
      };
      completedPlants = [...previous.completed_plants, completedPlant];
      Object.assign(nextPlant, createPlant(randomPlantType(completedPlant.type), nextTotal));
    } else {
      nextPlant.stage += 1;
    }
  }

  const next: CalmGrowthState = {
    growth_stage: nextPlant.stage,
    calm_progress: nextTotal % calmGrowthResetsPerStage,
    calm_growth_total: nextTotal,
    current_plant: nextPlant,
    completed_plants: completedPlants,
  };
  const message = completedPlant
    ? 'A plant joined your Growing Space.'
    : didAdvanceStage
      ? 'Your plant grew.'
    : calmGrowthMessages[next.calm_growth_total % calmGrowthMessages.length];

  return {
    previous,
    next,
    didFillMeter,
    didAdvanceStage,
    completedPlant,
    message,
  };
}

export function calmGrowthProgressPercent(state: CalmGrowthSource) {
  const normalized = normalizeCalmGrowth(state);
  return (normalized.calm_progress / calmGrowthResetsPerStage) * 100;
}

export function calmGrowthJobsToNextGlow(state: CalmGrowthSource) {
  const normalized = normalizeCalmGrowth(state);
  return normalized.calm_progress === 0
    ? calmGrowthResetsPerStage
    : calmGrowthResetsPerStage - normalized.calm_progress;
}
