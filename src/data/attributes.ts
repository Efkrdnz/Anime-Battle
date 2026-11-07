// Universal stats every character has. Order matches RawVariant.stats.
export const UNIVERSAL_STATS = [
  { id: 'strength', label: 'Strength', icon: '💪' },
  { id: 'speed', label: 'Speed', icon: '⚡' },
  { id: 'iq', label: 'Battle IQ', icon: '🧠' },
  { id: 'durability', label: 'Durability', icon: '🛡️' },
  { id: 'technique', label: 'Technique', icon: '🎯' },
  { id: 'stamina', label: 'Stamina', icon: '🔋' },
] as const;

export const UNIVERSAL_STAT_IDS: string[] = UNIVERSAL_STATS.map((s) => s.id);
