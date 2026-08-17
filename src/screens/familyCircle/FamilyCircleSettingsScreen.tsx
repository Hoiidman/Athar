import type { User } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { TextInput } from '../../components/TextInput';
import { useFamilyCircleOverview } from '../../hooks/useFamilyCircleOverview';
import {
  MAX_CIRCLE_NAME_LENGTH,
  renameFamilyCircle,
  type FamilyCircleSummary,
} from '../../services/familyCircles';
import { cardCornerRadius, cardShadow, colors, spacing, typography } from '../../theme';

interface FamilyCircleSettingsScreenProps {
  circleId: string | null;
  user: User;
}

interface RenameSectionProps {
  circle: FamilyCircleSummary;
  onRenamed: () => void;
}

function RenameSection({ circle, onRenamed }: RenameSectionProps) {
  const [name, setName] = useState(circle.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const trimmed = name.trim();
  const changed = trimmed.length > 0 && trimmed !== circle.name;

  async function save() {
    setError(undefined);
    setSaving(true);
    try {
      await renameFamilyCircle(circle.id, trimmed);
      onRenamed();
    } catch {
      setError('Could not save the name. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TextInput
        label="Circle name"
        value={name}
        onChangeText={setName}
        maxLength={MAX_CIRCLE_NAME_LENGTH}
        error={error}
        autoCapitalize="words"
      />
      <Button label="Save name" onPress={save} disabled={!changed} loading={saving} />
    </>
  );
}

export function FamilyCircleSettingsScreen({ circleId, user }: FamilyCircleSettingsScreenProps) {
  const { state, reload } = useFamilyCircleOverview(circleId);

  if (state.status === 'loading') {
    return (
      <View style={[styles.screen, styles.centred]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (state.status !== 'ready') {
    return (
      <View style={[styles.screen, styles.centred]}>
        <EmptyState
          icon="cloud-offline-outline"
          tone="error"
          title="Can't reach your circle"
          message="Check your connection and try again."
        >
          <Button label="Try again" variant="secondary" onPress={reload} />
        </EmptyState>
      </View>
    );
  }

  const { circle } = state;
  const isOwner = circle.ownerId === user.uid;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Name</Text>
        {isOwner ? (
          <RenameSection circle={circle} onRenamed={reload} />
        ) : (
          <View style={styles.card}>
            <Text style={styles.name}>{circle.name}</Text>
            <Text style={styles.hint}>Only the family owner can change the name.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centred: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  content: {
    padding: spacing.sm,
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    ...typography.eyebrow,
    color: colors.textSecondary,
  },
  card: {
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: cardCornerRadius,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...cardShadow,
  },
  name: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
