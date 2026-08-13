import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { User } from 'firebase/auth';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { PlaceholderScreen } from '../../components/PlaceholderScreen';
import { SignOutButton } from '../../components/SignOutButton';
import { useFamilyCircleMembership } from '../../hooks/useFamilyCircleMembership';
import { FamilyCircleMembersScreen } from '../familyCircle/FamilyCircleMembersScreen';
import { FamilyCircleOnboardingScreen } from '../familyCircle/FamilyCircleOnboardingScreen';
import { colors, spacing, typography } from '../../theme';

export type FamilyPulseStackParamList = {
  FamilyPulseHome: undefined;
  FamilyCircleMembers: undefined;
  FamilyCircleSetup: undefined;
};

const Stack = createNativeStackNavigator<FamilyPulseStackParamList>();

interface CircleActionProps {
  state: ReturnType<typeof useFamilyCircleMembership>['state'];
  onRetry: () => void;
  onViewMembers: () => void;
  onSetUpCircle: () => void;
}

function CircleAction({ state, onRetry, onViewMembers, onSetUpCircle }: CircleActionProps) {
  if (state.status === 'loading') return <ActivityIndicator color={colors.primary} />;

  if (state.status === 'error') {
    return (
      <View style={styles.block}>
        <Text style={styles.message} accessibilityRole="alert">
          Could not check your family circle.
        </Text>
        <Button label="Try again" variant="secondary" onPress={onRetry} />
      </View>
    );
  }

  if (state.circleId) {
    return <Button label="Your circle" variant="secondary" onPress={onViewMembers} />;
  }

  return <Button label="Create or join a circle" onPress={onSetUpCircle} />;
}

export function FamilyPulseScreen({ user }: { user: User }) {
  const { state, retry, adoptCircle } = useFamilyCircleMembership(user);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FamilyPulseHome">
        {({ navigation }) => (
          <PlaceholderScreen title="Family Pulse">
            <CircleAction
              state={state}
              onRetry={retry}
              onViewMembers={() => navigation.navigate('FamilyCircleMembers')}
              onSetUpCircle={() => navigation.navigate('FamilyCircleSetup')}
            />
            <SignOutButton />
          </PlaceholderScreen>
        )}
      </Stack.Screen>
      <Stack.Screen name="FamilyCircleMembers" options={{ headerShown: true, title: 'Your circle' }}>
        {() => <FamilyCircleMembersScreen uid={user.uid} />}
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
  block: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.xs,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
