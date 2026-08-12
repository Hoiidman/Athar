import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { PlaceholderScreen } from '../../components/PlaceholderScreen';
import { SignOutButton } from '../../components/SignOutButton';
import { useAuth } from '../../hooks/useAuth';
import { FamilyCircleMembersScreen } from '../familyCircle/FamilyCircleMembersScreen';

export type FamilyPulseStackParamList = {
  FamilyPulseHome: undefined;
  FamilyCircleMembers: undefined;
};

const Stack = createNativeStackNavigator<FamilyPulseStackParamList>();

export function FamilyPulseScreen() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FamilyPulseHome">
        {({ navigation }) => (
          <PlaceholderScreen title="Family Pulse">
            <Button
              label="View members"
              variant="secondary"
              onPress={() => navigation.navigate('FamilyCircleMembers')}
            />
            {/* TODO: move sign-out into a settings screen once one exists. */}
            <SignOutButton />
          </PlaceholderScreen>
        )}
      </Stack.Screen>
      <Stack.Screen name="FamilyCircleMembers" options={{ headerShown: true, title: 'Members' }}>
        {() => <FamilyCircleMembersScreen uid={user.uid} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
