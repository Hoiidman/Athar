import type { User } from 'firebase/auth';
import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionRow } from '../../components/ActionRow';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { SignOutButton } from '../../components/SignOutButton';
import { useFamilyCircleOverview } from '../../hooks/useFamilyCircleOverview';
import type { useFamilyCircleMembership } from '../../hooks/useFamilyCircleMembership';
import { cardCornerRadius, colors, spacing, typography } from '../../theme';

type MembershipState = ReturnType<typeof useFamilyCircleMembership>['state'];

interface FamilyCircleHubScreenProps {
  user: User;
  isGuest: boolean;
  state: MembershipState;
  onRetryMembership: () => void;
  onOpenMembers: () => void;
  onSetUpCircle: () => void;
  onUpgradeAccount: () => void;
}

function memberCountLabel(count: number) {
  return count === 1 ? '1 member' : `${count} members`;
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function LoadingCard() {
  return (
    <View style={styles.loadingCard}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

function CircleSection({
  state,
  onRetryMembership,
  onOpenMembers,
  onSetUpCircle,
}: Pick<
  FamilyCircleHubScreenProps,
  'state' | 'onRetryMembership' | 'onOpenMembers' | 'onSetUpCircle'
>) {
  const circleId = state.status === 'ready' ? state.circleId : null;
  const { state: overview, reload } = useFamilyCircleOverview(circleId);

  if (state.status === 'loading') return <LoadingCard />;

  if (state.status === 'error') {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        tone="error"
        title="Can't reach your circle"
        message="Check your connection and try again."
      >
        <Button label="Try again" variant="secondary" onPress={onRetryMembership} />
      </EmptyState>
    );
  }

  if (!circleId) {
    return (
      <EmptyState
        icon="people-outline"
        title="No family circle yet"
        message="Start one and invite your family, or join with a code they shared with you."
      >
        <Button label="Create or join a circle" onPress={onSetUpCircle} />
      </EmptyState>
    );
  }

  if (overview.status === 'loading') return <LoadingCard />;

  if (overview.status === 'error' || overview.status === 'missing') {
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

  return (
    <>
      <View style={styles.identity}>
        <Avatar name={overview.circle.name} size={56} />
        <View style={styles.identityText}>
          <Text style={styles.circleName}>{overview.circle.name}</Text>
          <Text style={styles.circleMeta}>{memberCountLabel(overview.members.length)}</Text>
        </View>
      </View>
      <ActionRow
        icon="people"
        title="Members"
        subtitle="See who's in your circle"
        meta={memberCountLabel(overview.members.length)}
        onPress={onOpenMembers}
      />
    </>
  );
}

export function FamilyCircleHubScreen({
  isGuest,
  state,
  onRetryMembership,
  onOpenMembers,
  onSetUpCircle,
  onUpgradeAccount,
}: FamilyCircleHubScreenProps) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Family Pulse</Text>
          <Text style={styles.tagline}>Keep up with the people you share memories with.</Text>
        </View>

        <Section label="Your circle">
          <CircleSection
            state={state}
            onRetryMembership={onRetryMembership}
            onOpenMembers={onOpenMembers}
            onSetUpCircle={onSetUpCircle}
          />
        </Section>

        <Section label="Account">
          {isGuest ? (
            <ActionRow
              icon="person-add"
              title="Save your account"
              subtitle="Add an email so you never lose your memories"
              onPress={onUpgradeAccount}
            />
          ) : null}
          <SignOutButton />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.sm,
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  circleName: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  circleMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: cardCornerRadius,
    paddingVertical: spacing.lg,
  },
});
