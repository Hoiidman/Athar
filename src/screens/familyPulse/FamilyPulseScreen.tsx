import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { User } from 'firebase/auth';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionRow } from '../../components/ActionRow';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { SignOutButton } from '../../components/SignOutButton';
import { useFamilyCircleMembership } from '../../hooks/useFamilyCircleMembership';
import { UpgradeAccountScreen } from '../auth/UpgradeAccountScreen';
import { FamilyCircleMembersScreen } from '../familyCircle/FamilyCircleMembersScreen';
import { FamilyCircleOnboardingScreen } from '../familyCircle/FamilyCircleOnboardingScreen';
import { cardCornerRadius, colors, spacing, typography } from '../../theme';

export type FamilyPulseStackParamList = {
  FamilyPulseHome: undefined;
  FamilyCircleMembers: undefined;
  FamilyCircleSetup: undefined;
  UpgradeAccount: undefined;
};

const Stack = createNativeStackNavigator<FamilyPulseStackParamList>();

interface CircleActionProps {
  state: ReturnType<typeof useFamilyCircleMembership>['state'];
  onRetry: () => void;
  onViewMembers: () => void;
  onSetUpCircle: () => void;
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function CircleAction({ state, onRetry, onViewMembers, onSetUpCircle }: CircleActionProps) {
  if (state.status === 'loading') {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        tone="error"
        title="Can't reach your circle"
        message="Check your connection and try again."
      >
        <Button label="Try again" variant="secondary" onPress={onRetry} />
      </EmptyState>
    );
  }

  if (state.circleId) {
    return (
      <ActionRow
        icon="people"
        title="Your circle"
        subtitle="See who's in it and share your invite code"
        onPress={onViewMembers}
      />
    );
  }

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

export function FamilyPulseScreen({ user }: { user: User }) {
  const { state, retry, adoptCircle } = useFamilyCircleMembership(user);

  // linkWithCredential keeps the same uid, so onAuthStateChanged does not
  // reliably fire and `user.isAnonymous` can stay true in React's eyes.
  const [upgraded, setUpgraded] = useState(false);
  const isGuest = user.isAnonymous && !upgraded;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FamilyPulseHome">
        {({ navigation }) => (
          <SafeAreaView style={styles.screen} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>Family Pulse</Text>
                <Text style={styles.tagline}>Keep up with the people you share memories with.</Text>
              </View>

              <Section label="Your circle">
                <CircleAction
                  state={state}
                  onRetry={retry}
                  onViewMembers={() => navigation.navigate('FamilyCircleMembers')}
                  onSetUpCircle={() => navigation.navigate('FamilyCircleSetup')}
                />
              </Section>

              <Section label="Account">
                {isGuest ? (
                  <ActionRow
                    icon="person-add"
                    title="Save your account"
                    subtitle="Add an email so you never lose your memories"
                    onPress={() => navigation.navigate('UpgradeAccount')}
                  />
                ) : null}
                <SignOutButton />
              </Section>
            </ScrollView>
          </SafeAreaView>
        )}
      </Stack.Screen>
      <Stack.Screen name="FamilyCircleMembers" options={{ headerShown: true, title: 'Your circle' }}>
        {() => <FamilyCircleMembersScreen uid={user.uid} />}
      </Stack.Screen>
      <Stack.Screen name="UpgradeAccount" options={{ headerShown: true, title: 'Your account' }}>
        {({ navigation }) => (
          <UpgradeAccountScreen
            user={user}
            onUpgraded={() => {
              setUpgraded(true);
              navigation.goBack();
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="FamilyCircleSetup"
        options={{ headerShown: true, title: 'Family circle' }}
      >
        {({ navigation }) => (
          <FamilyCircleOnboardingScreen
            user={user}
            onCircleReady={(circleId) => {
              adoptCircle(circleId);
              navigation.goBack();
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
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
  loadingCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: cardCornerRadius,
    paddingVertical: spacing.lg,
  },
});
