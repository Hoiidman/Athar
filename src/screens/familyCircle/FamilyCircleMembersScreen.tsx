import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { InviteCodeCard } from '../../components/InviteCodeCard';
import {
  getFamilyCircle,
  listFamilyCircleMembers,
  type FamilyCircleSummary,
} from '../../services/familyCircles';
import { getFamilyCircleId } from '../../services/users';
import { colors, spacing, typography } from '../../theme';
import type { FamilyCircleMember } from '../../types/familyCircle';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'no-circle' }
  | { status: 'ready'; circle: FamilyCircleSummary | null; members: FamilyCircleMember[] };

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
      <Avatar name={member.displayName} />
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

        const [circle, members] = await Promise.all([
          getFamilyCircle(circleId),
          listFamilyCircleMembers(circleId),
        ]);
        if (!cancelled) setState({ status: 'ready', circle, members });
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
        <View style={styles.header}>
          {state.circle ? (
            <>
              <Text style={styles.circleName}>{state.circle.name}</Text>
              <Text style={styles.shareHint}>
                Share this code with your family so they can join.
              </Text>
              <InviteCodeCard code={state.circle.inviteCode} />
            </>
          ) : null}
          <Text style={styles.heading}>
            {state.members.length === 1 ? '1 member' : `${state.members.length} members`}
          </Text>
        </View>
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
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  circleName: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  shareHint: {
    ...typography.body,
    color: colors.textSecondary,
  },
  heading: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
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
