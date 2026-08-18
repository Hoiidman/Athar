import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { User } from 'firebase/auth';
import { useState } from 'react';
import { useFamilyCircleMembership } from '../../hooks/useFamilyCircleMembership';
import { clearOwnFamilyCircleId } from '../../services/users';
import { UpgradeAccountScreen } from '../auth/UpgradeAccountScreen';
import { FamilyCircleMembersScreen } from '../familyCircle/FamilyCircleMembersScreen';
import { FamilyCircleOnboardingScreen } from '../familyCircle/FamilyCircleOnboardingScreen';
import { FamilyCircleSettingsScreen } from '../familyCircle/FamilyCircleSettingsScreen';
import { InviteScreen } from '../familyCircle/InviteScreen';
import { MemberDetailScreen } from '../familyCircle/MemberDetailScreen';
import { FamilyCircleHubScreen } from './FamilyCircleHubScreen';

export type FamilyPulseStackParamList = {
  FamilyPulseHome: undefined;
  FamilyCircleMembers: undefined;
  FamilyCircleMember: { userId: string };
  FamilyCircleInvite: undefined;
  FamilyCircleSettings: undefined;
  FamilyCircleSetup: undefined;
  UpgradeAccount: undefined;
};

const Stack = createNativeStackNavigator<FamilyPulseStackParamList>();

export function FamilyPulseScreen({ user }: { user: User }) {
  const { state, retry, adoptCircle } = useFamilyCircleMembership(user);

  // linkWithCredential keeps the same uid, so onAuthStateChanged does not
  // reliably fire and `user.isAnonymous` can stay true in React's eyes.
  const [upgraded, setUpgraded] = useState(false);
  const [memberRevision, setMemberRevision] = useState(0);
  const isGuest = user.isAnonymous && !upgraded;
  const circleId = state.status === 'ready' ? state.circleId : null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="FamilyPulseHome">
        {({ navigation }) => (
          <FamilyCircleHubScreen
            user={user}
            isGuest={isGuest}
            state={state}
            onRetryMembership={retry}
            onOpenMembers={() => navigation.navigate('FamilyCircleMembers')}
            onOpenInvite={() => navigation.navigate('FamilyCircleInvite')}
            onOpenSettings={() => navigation.navigate('FamilyCircleSettings')}
            onCircleLost={() => {
              void clearOwnFamilyCircleId(user.uid).catch(() => undefined);
              adoptCircle(null);
            }}
            onSetUpCircle={() => navigation.navigate('FamilyCircleSetup')}
            onUpgradeAccount={() => navigation.navigate('UpgradeAccount')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="FamilyCircleMembers"
        options={{ headerShown: true, title: 'Your circle' }}
      >
        {({ navigation }) => (
          <FamilyCircleMembersScreen
            key={memberRevision}
            circleId={circleId}
            onOpenMember={(userId) => navigation.navigate('FamilyCircleMember', { userId })}
            onInvite={() => navigation.navigate('FamilyCircleInvite')}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="FamilyCircleMember" options={{ headerShown: true, title: 'Member' }}>
        {({ route, navigation }) => (
          <MemberDetailScreen
            circleId={circleId}
            userId={route.params.userId}
            currentUid={user.uid}
            onRemoved={() => {
              setMemberRevision((revision) => revision + 1);
              navigation.goBack();
            }}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="FamilyCircleInvite" options={{ headerShown: true, title: 'Invite' }}>
        {() => <InviteScreen circleId={circleId} user={user} />}
      </Stack.Screen>
      <Stack.Screen name="FamilyCircleSettings" options={{ headerShown: true, title: 'Settings' }}>
        {({ navigation }) => (
          <FamilyCircleSettingsScreen
            circleId={circleId}
            user={user}
            onLeft={() => {
              adoptCircle(null);
              navigation.popToTop();
            }}
          />
        )}
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
