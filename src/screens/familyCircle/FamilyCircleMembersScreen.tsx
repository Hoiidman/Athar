import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { listFamilyCircleMembers } from '../../services/familyCircles';
import { getFamilyCircleId } from '../../services/users';
import { colors, minTapTarget, spacing, typography } from '../../theme';
import type { FamilyCircleMember } from '../../types/familyCircle';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'no-circle' }
  | { status: 'ready'; members: FamilyCircleMember[] };

function joinedLabel(joinedAt: number) {
  return `Joined ${new Date(joinedAt).toLocaleDateString()}`;
}

function MemberRow({ member }: { member: FamilyCircleMember }) {
  const joined = joinedLabel(member.joinedAt);
  const role = member.role === 'owner' ? 'Owner' : undefined;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={[member.displayName, role, joined].filter(Boolean).join(', ')}
    >
      <View style={styles.avatar}>
        <Text style={styles.initial}>{member.displayName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.details}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{member.displayName}</Text>
          {role ? <Text style={styles.badge}>{role}</Text> : null}
        </View>
        <Text style={styles.meta}>{joined}</Text>
      </View>
    </View>
  );
}

export function FamilyCircleMembersScreen({ uid }: { uid: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    void (async () => {
      try {
        const circleId = await getFamilyCircleId(uid);
        if (cancelled) return;

        if (!circleId) {
          setState({ status: 'no-circle' });
          return;
        }

        const members = await listFamilyCircleMembers(circleId);
        if (!cancelled) setState({ status: 'ready', members });
      } catch {
        if (!cancelled) setState({ status: 'error' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, attempt]);

  if (state.status === 'loading') {
    return (
      <View style={[styles.screen, styles.centred]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={[styles.screen, styles.centred]}>
        <Text style={styles.message} accessibilityRole="alert">
          Could not load your family circle. Check your connection and try again.
        </Text>
        <Button label="Try again" variant="secondary" onPress={() => setAttempt((n) => n + 1)} />
      </View>
    );
  }

  if (state.status === 'no-circle') {
    return (
      <View style={[styles.screen, styles.centred]}>
        <Text style={styles.message}>
          You are not in a family circle yet. Create one, or join with an invite code.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={state.members}
      keyExtractor={(member) => member.userId}
      renderItem={({ item }) => <MemberRow member={item} />}
      ListHeaderComponent={
        <Text style={styles.heading}>
          {state.members.length === 1 ? '1 member' : `${state.members.length} members`}
        </Text>
      }
    />
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
    gap: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  heading: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  avatar: {
    width: minTapTarget,
    height: minTapTarget,
    borderRadius: minTapTarget / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    ...typography.heading,
    color: colors.textOnAccent,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  badge: {
    ...typography.caption,
    color: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
