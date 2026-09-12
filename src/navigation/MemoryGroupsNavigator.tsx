import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { User } from 'firebase/auth';
import { CreateMemoryGroupScreen } from '../screens/memoryGroups/CreateMemoryGroupScreen';
import { MemoryGroupDetailScreen } from '../screens/memoryGroups/MemoryGroupDetailScreen';
import { MemoryGroupsScreen } from '../screens/memoryGroups/MemoryGroupsScreen';
import type { MemoryGroup } from '../types/memory';

export type MemoryGroupsStackParamList = {
  MemoryGroupsHome: undefined;
  CreateMemoryGroup: { circleId: string; initialGroup?: MemoryGroup };
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
        options={({ route }) => ({ headerShown: true, title: route.params?.initialGroup ? 'Edit Album' : 'New Album' })}
      >
        {({ navigation, route }) => (
          <CreateMemoryGroupScreen
            user={user}
            circleId={route.params.circleId}
            initialGroup={route.params.initialGroup}
            onCancel={() => navigation.goBack()}
            onContinue={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="MemoryGroupDetail" options={{ headerShown: true, title: 'Album' }}>
        {({ navigation, route }) => (
          <MemoryGroupDetailScreen 
            groupId={route.params.groupId} 
            circleId={route.params.circleId} 
            navigation={navigation}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
