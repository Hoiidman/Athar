import type { ViewStyle } from 'react-native';
import { colors } from './colors';

// One depth model for the whole app: a card lifts off the canvas with a warm
// shadow instead of a hairline border. The shadow is tinted with the ink brown
// rather than black so it reads as light in a warm room.
export const cardShadow = {
  shadowColor: '#3A2E24',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.16,
  shadowRadius: 14,
  elevation: 3,
} satisfies ViewStyle;

// Reserved for the single filled accent control on a screen. Tinted with the
// accent itself, so it glows under the button rather than smudging it.
export const accentShadow = {
  shadowColor: colors.primary,
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 4,
} satisfies ViewStyle;
