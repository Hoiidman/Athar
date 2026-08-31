import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface UploadProgressScreenProps {
  current: number;
  total: number;
}

export function UploadProgressScreen({ current, total }: UploadProgressScreenProps) {
  const percent = Math.round((current / total) * 100);

  return (
    <View style={styles.screen}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.title}>Uploading Memories...</Text>
      <Text style={styles.subtitle}>
        {current} of {total} photos uploaded ({percent}%)
      </Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: colors.sunken,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});
