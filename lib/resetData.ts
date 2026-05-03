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
    'Empty one small bin',
    'Hang up one item',
    'Put shoes by the door',
    'Recycle one piece of rubbish',
    'Wipe one small spill',
    'Fold one blanket',
    'Straighten one cushion',
    'Put one item in the laundry basket',
    'Water one plant',
    'Close one cupboard',
    'Make the bed quickly',
    'Put chargers in one place',
    'Clear one plate',
    'Put papers into one pile',
    'Wipe one handle',
    'Return one item to its room',
    'Shake out one small rug',
  ],
  medium: [
    'Clear one basket',
    'Sort one chair',
    'Wipe one counter',
    'Put away clean dishes',
    'Collect cups from one room',
    'Sort one laundry pile',
    'Clear the bedside table',
    'Take out one rubbish bag',
    'Reset the sofa',
    'Sweep one small area',
    'Unload one bag',
    'Put laundry in the hamper',
    'Wipe the microwave door',
    'Clear one dining table corner',
    'Sort the recycling',
    'Pair socks for 5 minutes',
    'Clean one mirror',
    'Tidy the entryway',
    'Put groceries away',
    'Reset one shelf',
  ],
  high: [
    'Reset one zone',
    '10-minute tidy',
    'Start a laundry load',
    'Vacuum one room',
    'Mop one floor area',
    'Clean the bathroom sink',
    'Change the bed sheets',
    'Tidy the kitchen counters',
    'Declutter one drawer',
    'Deep clean the toilet',
    'Clean the shower screen',
    'Organise one cupboard',
    'Vacuum the stairs',
    'Clean one fridge shelf',
    'Wash one kitchen floor area',
    'Dust one room',
    'Sort one donation bag',
    'Clean the oven hob',
    'Tackle one paper pile',
    'Batch reset one room',
  ],
};

export const expandedDefaultTaskStartIndex = 9;

export function expandedDefaultTasks() {
  return (Object.entries(energyTasks) as [EnergyLevel, string[]][])
    .flatMap(([energyLevel, tasks]) => tasks.slice(expandedDefaultTaskStartIndex).map((taskText) => ({
      energyLevel,
      taskText,
    })));
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

export function sampleTaskFromList(tasks: string[], fallbackLevel: EnergyLevel) {
  const options = tasks.length > 0 ? tasks : energyTasks[fallbackLevel];
  const index = Math.floor(Math.random() * options.length);
  return options[index];
}

export function sampleDifferentTaskFromList(tasks: string[], fallbackLevel: EnergyLevel, currentTask: string) {
  const options = Array.from(new Set(tasks.length > 0 ? tasks : energyTasks[fallbackLevel]));
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
