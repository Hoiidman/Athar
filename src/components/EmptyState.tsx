import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { cardCornerRadius, cardShadow, colors, spacing, typography } from '../theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  tone?: 'neutral' | 'error';
  children?: ReactNode;
}

export function EmptyState({ icon, title, message, tone = 'neutral', children }: EmptyStateProps) {
  const accent = tone === 'error' ? colors.error : colors.primary;

  return (
    <View style={styles.card}>
      <Ionicons name={icon} size={36} color={accent} />
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
