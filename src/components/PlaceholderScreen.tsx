import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

export function PlaceholderScreen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  text: {
    ...typography.heading,
    color: colors.textPrimary,
  },
});
