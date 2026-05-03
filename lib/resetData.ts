export type EnergyLevel = 'low' | 'medium' | 'high';

export const energyLabels: Record<EnergyLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const energyTasks: Record<EnergyLevel, string[]> = {
  low: [
    'Put away 3 things',
    'Clear one tiny surface',
    'Take dishes to the kitchen',
  ],
  medium: [
    'Clear one basket',
    'Sort one chair',
    'Wipe one counter',
  ],
  high: [
    'Reset one zone',
    '10-minute tidy',
    'Start a laundry load',
  ],
};

export function sampleTask(level: EnergyLevel) {
  const options = energyTasks[level];
  const index = Math.floor(Math.random() * options.length);
  return options[index];
}

export function sampleFromTasks(level: EnergyLevel, extraTasks: string[]) {
  const options = [...energyTasks[level], ...extraTasks];
  const index = Math.floor(Math.random() * options.length);
  return options[index];
}

export function sampleDifferentTask(level: EnergyLevel, extraTasks: string[], currentTask: string) {
  const options = Array.from(new Set([...energyTasks[level], ...extraTasks]));
  const nextOptions = options.length > 1 ? options.filter((task) => task !== currentTask) : options;
  const index = Math.floor(Math.random() * nextOptions.length);
  return nextOptions[index];
}

export function defaultTask(level: EnergyLevel) {
  return energyTasks[level][0];
}

export const moodOptions = ['Bad', 'Okay', 'Good'] as const;
export const energyOptions = ['Low', 'Medium', 'High'] as const;
export const painOptions = ['None', 'Mild', 'Bad'] as const;
