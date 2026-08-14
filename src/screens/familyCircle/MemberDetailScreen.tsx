import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { useFamilyCircleOverview } from '../../hooks/useFamilyCircleOverview';
import { colors, spacing, typography } from '../../theme';

interface MemberDetailScreenProps {
  circleId: string | null;
  userId: string;
  currentUid: string;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function MemberDetailScreen({ circleId, userId, currentUid }: MemberDetailScreenProps) {
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

  const member = state.status === 'ready' ? state.members.find((m) => m.userId === userId) : null;

  if (!member) {
    return (
      <View style={[styles.screen, styles.centred]}>
        <EmptyState
          icon="person-remove-outline"
          title="No longer a member"
          message="This person is not in your family circle any more."
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.identity}>
        <Avatar name={member.displayName} size={80} />
        <Text style={styles.name}>{member.displayName}</Text>
        {userId === currentUid ? <Text style={styles.you}>This is you</Text> : null}
      </View>

      <View style={styles.card}>
        <Detail label="Role" value={member.role === 'owner' ? 'Family owner' : 'Member'} />
        <Detail label="Joined" value={new Date(member.joinedAt).toLocaleDateString()} />
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
  identity: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  name: {
    ...typography.display,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  you: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
  },
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
});
