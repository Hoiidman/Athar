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
import { useAuth } from './src/hooks/useAuth';
import { useCircleOnboardingSkip } from './src/hooks/useCircleOnboardingSkip';
import { useEnsureUserDocument } from './src/hooks/useEnsureUserDocument';
import { useFamilyCircleMembership } from './src/hooks/useFamilyCircleMembership';
import { colors, spacing, typography } from './src/theme';

function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function SignedInRoutes({ user }: { user: User }) {
  const { state, retry, adoptCircle } = useFamilyCircleMembership(user);
  const onboardingSkip = useCircleOnboardingSkip(user.uid);

  if (state.status === 'loading' || onboardingSkip.loading) return <Splash />;

  if (state.status === 'error') {
    return (
      <View style={[styles.splash, styles.centred]}>
        <Text style={styles.message} accessibilityRole="alert">
          Could not check your family circle. Check your connection and try again.
        </Text>
        <Button label="Try again" variant="secondary" onPress={retry} />
      </View>
    );
  }

  if (state.circleId || onboardingSkip.skipped) return <RootTabNavigator user={user} />;

  return (
    <FamilyCircleOnboardingScreen
      user={user}
      onCircleReady={adoptCircle}
      onSkip={onboardingSkip.skip}
    />
  );
}

export default function App() {
  const { user, initializing } = useAuth();
  useEnsureUserDocument(user);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          {initializing ? <Splash /> : user ? <SignedInRoutes user={user} /> : <AuthNavigator />}
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
