import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { cardCornerRadius, cardShadow, colors, spacing, typography } from '../theme';

type EmptyStateProps = {
  title: string;
  message: string;
  tone?: 'neutral' | 'error';
  children?: ReactNode;
} & (
  | { icon: keyof typeof Ionicons.glyphMap; visual?: never }
  | { visual: ReactNode; icon?: never }
);

export function EmptyState({
  icon,
  visual,
  title,
  message,
  tone = 'neutral',
  children,
}: EmptyStateProps) {
  // The accent belongs to the button below; a glyph in the same clay would
  // compete with it from 200px away.
  const accent = tone === 'error' ? colors.error : colors.sageIcon;

  return (
    <View style={styles.card}>
      {visual ?? (icon ? <Ionicons name={icon} size={36} color={accent} /> : null)}
      <Text style={styles.title} accessibilityRole={tone === 'error' ? 'alert' : 'header'}>
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: cardCornerRadius,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    ...cardShadow,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
