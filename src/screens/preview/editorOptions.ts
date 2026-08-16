import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

export type ToolId = 'text' | 'filters' | 'sounds' | 'stickers' | 'draw';

export const TOOLS: { id: ToolId; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'text', label: 'Text', icon: 'text' },
  { id: 'filters', label: 'Filters', icon: 'color-filter-outline' },
  { id: 'sounds', label: 'Sounds', icon: 'musical-notes-outline' },
  { id: 'stickers', label: 'Stickers', icon: 'happy-outline' },
  { id: 'draw', label: 'Draw', icon: 'brush-outline' },
];

export const FILTERS = [
  { id: 'none', label: 'None', color: 'transparent', opacity: 0 },
  { id: 'warm', label: 'Warm', color: '#FF8A3D', opacity: 0.22 },
  { id: 'cool', label: 'Cool', color: '#3D7BFF', opacity: 0.22 },
  { id: 'fade', label: 'Fade', color: '#FFFFFF', opacity: 0.18 },
  { id: 'night', label: 'Night', color: '#0B1B3A', opacity: 0.35 },
] as const;

export type FilterId = (typeof FILTERS)[number]['id'];

export const INK_COLORS = [
  colors.surface,
  '#1A1A1A',
  colors.primary,
  colors.error,
  colors.warning,
  colors.success,
];

export const STICKERS = [
  '❤️', '😂', '🥹', '🔥', '✨', '🎉',
  '👏', '🙌', '😍', '🤍', '⭐', '🌸',
  '🍰', '☀️', '🌙', '📷', '🎈', '🏡',
]; // random stuff lmao, TBA
