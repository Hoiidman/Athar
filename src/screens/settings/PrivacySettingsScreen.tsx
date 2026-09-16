import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { useAiPhotoAccess } from '../../hooks/useAiPhotoAccess';
import { useAppTheme, type AppTheme } from '../../hooks/useAppTheme';
import { setAiPhotoAccessEnabled } from '../../services/users';
import { cardCornerRadius, cardShadow, spacing } from '../../theme';

export function PrivacySettingsScreen({ uid }: { uid: string }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { state, reload } = useAiPhotoAccess(uid);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function toggle(enabled: boolean) {
    setError(undefined);
    setSaving(true);
    try {
      await setAiPhotoAccessEnabled(uid, enabled);
    } catch {
      setError('Could not save the change. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        tone="error"
        title="Can't reach your settings"
        message="Check your connection and try again."
      >
        <Button label="Try again" variant="secondary" onPress={reload} />
      </EmptyState>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.header}>
        Athar can look at the photos you upload to describe them. Those descriptions are what smart
        search matches against and what auto-sort uses to place photos in albums.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Smart features</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.title}>Let AI read my photos</Text>
              <Text style={styles.description}>
                Turn this off and your new photos are never sent to AI. They will not show up in
                smart search, and auto-sort will leave them in My Space for you to file yourself.
              </Text>
            </View>
            <Switch
              value={state.enabled}
              onValueChange={toggle}
              disabled={saving}
              accessibilityLabel="Let AI read my photos"
              trackColor={{ true: theme.colors.primary }}
            />
          </View>
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
        </View>
        <Text style={styles.footnote}>
          Photos already described keep their descriptions. Everything else — your albums, captions,
          and who you share with — works the same either way.
        </Text>
      </View>
    </ScrollView>
  );
}

function createStyles({ colors, typography }: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loading: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    content: {
      padding: spacing.sm,
      gap: spacing.md,
    },
    header: {
      ...typography.body,
      color: colors.textSecondary,
    },
    section: {
      gap: spacing.xs,
    },
    sectionLabel: {
      ...typography.eyebrow,
      color: colors.textSecondary,
    },
    card: {
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: cardCornerRadius,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      ...cardShadow,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    switchText: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    description: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    footnote: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    error: {
      ...typography.caption,
      color: colors.error,
    },
  });
}
