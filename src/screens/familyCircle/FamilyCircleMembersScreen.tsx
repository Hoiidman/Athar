import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { useFamilyCircleOverview } from '../../hooks/useFamilyCircleOverview';
import { cardCornerRadius, cardShadow, colors, spacing, typography } from '../../theme';
import type { FamilyCircleMember } from '../../types/familyCircle';

function joinedLabel(joinedAt: number) {
  return `Joined ${new Date(joinedAt).toLocaleDateString()}`;
}

function MemberRow({ member, onPress }: { member: FamilyCircleMember; onPress: () => void }) {
  const joined = joinedLabel(member.joinedAt);
  const role = member.role === 'owner' ? 'Owner' : undefined;
  const meta = [member.relationship, joined].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[member.displayName, role, member.relationship, joined]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar name={member.displayName} />
      <View style={styles.details}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{member.displayName}</Text>
          {role ? <Text style={styles.badge}>{role}</Text> : null}
        </View>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.uiIcon} />
    </Pressable>
  );
}

interface FamilyCircleMembersScreenProps {
  circleId: string | null;
  onOpenMember: (userId: string) => void;
  onInvite: () => void;
}

export function FamilyCircleMembersScreen({
  circleId,
  onOpenMember,
  onInvite,
}: FamilyCircleMembersScreenProps) {
  const { state, reload } = useFamilyCircleOverview(circleId);

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
        <Button label="Try again" variant="secondary" onPress={reload} />
      </View>
    );
  }

  if (state.status === 'missing') {
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
      renderItem={({ item }) => (
        <MemberRow member={item} onPress={() => onOpenMember(item.userId)} />
      )}
      ListHeaderComponent={
        <Text style={styles.heading}>
          {state.members.length === 1 ? '1 member' : `${state.members.length} members`}
        </Text>
      }
      ListFooterComponent={
        <View style={styles.footer}>
          <Button label="Invite family member" variant="secondary" onPress={onInvite} />
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
  heading: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  footer: {
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: cardCornerRadius,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...cardShadow,
  },
  pressed: {
    opacity: 0.7,
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
