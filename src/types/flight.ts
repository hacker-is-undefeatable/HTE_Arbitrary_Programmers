export type CheckpointType = 'chapter' | 'topic' | 'stop';

export interface Checkpoint {
  id: string;
  name: string;
  type: CheckpointType;
  children?: Checkpoint[];
}

export const CITY_SIZES: Record<CheckpointType, { label: string; icon: string }> = {
  chapter: { label: 'Major', icon: '🛫' },
  topic: { label: 'Stop', icon: '📍' },
  stop: { label: 'Mini', icon: '•' },
};
