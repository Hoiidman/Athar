import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { PlaceholderScreen } from '../../components/PlaceholderScreen';
import { SignOutButton } from '../../components/SignOutButton';
import { FamilyCircleMembersScreen } from '../familyCircle/FamilyCircleMembersScreen';

export type FamilyPulseStackParamList = {
  FamilyPulseHome: undefined;
  FamilyCircleMembers: undefined;
};

const Stack = createNativeStackNavigator<FamilyPulseStackParamList>();

export function FamilyPulseScreen({ uid }: { uid: string }) {
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
            <SignOutButton />
          </PlaceholderScreen>
        )}
      </Stack.Screen>
      <Stack.Screen name="FamilyCircleMembers" options={{ headerShown: true, title: 'Members' }}>
        {() => <FamilyCircleMembersScreen uid={uid} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
