import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { User } from 'firebase/auth';
import { CreateMemoryGroupScreen } from '../screens/memoryGroups/CreateMemoryGroupScreen';
import { MemoryGroupDetailScreen } from '../screens/memoryGroups/MemoryGroupDetailScreen';
import { MemoryGroupsScreen } from '../screens/memoryGroups/MemoryGroupsScreen';

export type MemoryGroupsStackParamList = {
  MemoryGroupsHome: undefined;
  CreateMemoryGroup: { circleId: string };
  MemoryGroupDetail: { groupId: string; circleId: string };
};

const Stack = createNativeStackNavigator<MemoryGroupsStackParamList>();

export function MemoryGroupsNavigator({ user }: { user: User }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="MemoryGroupsHome">
        {({ navigation }) => (
          <MemoryGroupsScreen
            user={user}
            onCreateNew={(circleId) => navigation.navigate('CreateMemoryGroup', { circleId })}
            onOpenGroup={(groupId, circleId) => navigation.navigate('MemoryGroupDetail', { groupId, circleId })}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="CreateMemoryGroup"
        options={{ headerShown: true, title: 'New Memory Group' }}
      >
        {({ navigation, route }) => (
          <CreateMemoryGroupScreen
            user={user}
            circleId={route.params.circleId}
            onCancel={() => navigation.goBack()}
            onContinue={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="MemoryGroupDetail" options={{ headerShown: true, title: 'Memory Group' }}>
        {({ route }) => (
          <MemoryGroupDetailScreen 
            groupId={route.params.groupId} 
            circleId={route.params.circleId} 
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
