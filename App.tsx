import { StatusBar } from 'expo-status-bar';
import type { User } from 'firebase/auth';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootTabNavigator } from './src/navigation/RootTabNavigator';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { Button } from './src/components/Button';
import { FamilyCircleOnboardingScreen } from './src/screens/familyCircle/FamilyCircleOnboardingScreen';
import { InviteLinkScreen } from './src/screens/familyCircle/InviteLinkScreen';
import { useAuth } from './src/hooks/useAuth';
import { useEnsureUserDocument } from './src/hooks/useEnsureUserDocument';
import { useFamilyCircleMembership } from './src/hooks/useFamilyCircleMembership';
import { useInviteLinkFlow } from './src/hooks/useInviteLinkFlow';
import { usePendingInviteCode } from './src/hooks/usePendingInviteCode';
import { colors, spacing, typography } from './src/theme';

function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function RetryNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={[styles.splash, styles.centred]}>
      <Text style={styles.message} accessibilityRole="alert">
        {message}
      </Text>
      <Button label="Try again" variant="secondary" onPress={onRetry} />
    </View>
  );
}

interface SignedInRoutesProps {
  user: User;
  inviteCode: string | null;
  onInviteUsed: () => void;
}

function SignedInRoutes({ user, inviteCode, onInviteUsed }: SignedInRoutesProps) {
  const userDocument = useEnsureUserDocument(user);
  const { state, retry, adoptCircle } = useFamilyCircleMembership(user);

  if (userDocument.failed) {
    return (
      <RetryNotice
        message="Could not finish setting up your account. Check your connection and try again."
        onRetry={userDocument.retry}
      />
    );
  }

  if (state.status === 'loading') return <Splash />;

  if (state.status === 'error') {
    return (
      <RetryNotice
        message="Could not check your family circle. Check your connection and try again."
        onRetry={retry}
      />
    );
  }

  if (state.circleId) {
    return <RootTabNavigator user={user} />;
  }

  return (
    <FamilyCircleOnboardingScreen
      user={user}
      initialInviteCode={inviteCode}
      onCircleReady={(circleId) => {
        onInviteUsed();
        adoptCircle(circleId);
      }}
    />
  );
}

export default function App() {
  const { user, initializing } = useAuth();
  const invite = usePendingInviteCode();
  const link = useInviteLinkFlow(initializing ? null : invite.code, !!user, invite.clear);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          {initializing ? (
            <Splash />
          ) : link.code ? (
            <InviteLinkScreen
              code={link.code}
              onJoined={link.complete}
              onUseAccount={link.dismiss}
              onSkip={link.complete}
            />
          ) : user ? (
            <SignedInRoutes user={user} inviteCode={invite.code} onInviteUsed={invite.clear} />
          ) : (
            <AuthNavigator />
          )}
        </NavigationContainer>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centred: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
