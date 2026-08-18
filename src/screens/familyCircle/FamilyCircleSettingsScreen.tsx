import type { User } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { SignOutButton } from '../../components/SignOutButton';
import { TextInput } from '../../components/TextInput';
import { useFamilyCircleOverview } from '../../hooks/useFamilyCircleOverview';
import {
  MAX_CIRCLE_NAME_LENGTH,
  leaveFamilyCircle,
  renameFamilyCircle,
  type FamilyCircleSummary,
} from '../../services/familyCircles';
import { cardCornerRadius, cardShadow, colors, spacing, typography } from '../../theme';

interface FamilyCircleSettingsScreenProps {
  circleId: string | null;
  user: User;
  onLeft: () => void;
}

interface LeaveSectionProps {
  circle: FamilyCircleSummary;
  user: User;
  onLeft: () => void;
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

function LeaveSection({ circle, user, onLeft }: LeaveSectionProps) {
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string>();

  async function leave() {
    setError(undefined);
    setLeaving(true);
    try {
      await leaveFamilyCircle(user, circle.id);
      onLeft();
    } catch {
      setError('Could not leave the circle. Check your connection and try again.');
      setLeaving(false);
    }
  }

  function confirmLeave() {
    Alert.alert(
      `Leave ${circle.name}?`,
      'You will lose access to what your family shares there. You can join again if someone gives you the invite code.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: leave },
      ],
    );
  }

  return (
    <>
      <Text style={styles.hint}>
        Leaving takes you out of {circle.name}. Nothing you shared is deleted, but you will not be
        able to see it again unless you rejoin.
      </Text>
      <Button label="Leave circle" variant="destructive" onPress={confirmLeave} loading={leaving} />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </>
  );
}

function CircleSettings({ circleId, user, onLeft }: FamilyCircleSettingsScreenProps) {
  const { state, reload } = useFamilyCircleOverview(circleId);

  if (!circleId) return null;

  if (state.status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (state.status !== 'ready') {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        tone="error"
        title="Can't reach your circle"
        message="Check your connection and try again."
      >
        <Button label="Try again" variant="secondary" onPress={reload} />
      </EmptyState>
    );
  }

  const { circle } = state;
  const isOwner = circle.ownerId === user.uid;

  return (
    <>
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

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Leaving</Text>
        {isOwner ? (
          <Text style={styles.hint}>
            You started {circle.name}, so you cannot leave it. A circle with no owner is one nobody
            can invite to or rename.
          </Text>
        ) : (
          <LeaveSection circle={circle} user={user} onLeft={onLeft} />
        )}
      </View>
    </>
  );
}

export function FamilyCircleSettingsScreen(props: FamilyCircleSettingsScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <CircleSettings {...props} />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <SignOutButton />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  error: {
    ...typography.caption,
    color: colors.error,
  },
});
