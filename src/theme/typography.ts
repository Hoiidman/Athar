import { TextStyle } from 'react-native';

type TypographyScale = Record<
  'display' | 'heading' | 'body' | 'caption' | 'label' | 'eyebrow',
  TextStyle
>;

// Base font sizes at scale 1 (the "Standard" text size setting). Everything
// else about a tier (weight, case, tracking) stays fixed as it scales up.
const baseSizes = {
  display: 30,
  heading: 21,
  body: 16,
  caption: 13,
  label: 14,
  eyebrow: 11,
} as const;

// Scales every tier's font size by the same factor, used by the text size
// accessibility setting. Rounded to whole pixels so React Native doesn't
// hand back sub-pixel line heights.
export function getTypography(scale: number): TypographyScale {
  return {
    display: { fontSize: Math.round(baseSizes.display * scale), fontWeight: '700' },
    heading: { fontSize: Math.round(baseSizes.heading * scale), fontWeight: '600' },
    body: { fontSize: Math.round(baseSizes.body * scale), fontWeight: '400' },
    caption: { fontSize: Math.round(baseSizes.caption * scale), fontWeight: '400' },
    label: { fontSize: Math.round(baseSizes.label * scale), fontWeight: '500' },
    // The third text tier. It separates itself from body copy by case, weight
    // and tracking rather than by a lighter colour, which cannot pass contrast here.
    eyebrow: {
      fontSize: Math.round(baseSizes.eyebrow * scale),
      fontWeight: '700',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
  };
}

export const typography = getTypography(1);
