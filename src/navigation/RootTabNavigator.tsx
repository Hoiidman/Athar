import { useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { CaptureScreen } from '../screens/capture/CaptureScreen';
import { TimelineScreen } from '../screens/timeline/TimelineScreen';
import { MemoryGroupsNavigator } from './MemoryGroupsNavigator';
import { FamilyPulseScreen } from '../screens/familyPulse/FamilyPulseScreen';
import { colors } from '../theme';

export type RootTabParamList = {
  Capture: undefined;
  Timeline: undefined;
  MemoryGroups: undefined;
  FamilyPulse: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootTabNavigator() {
  const { user } = useAuth();
  // Tab.Screen's `children` identity is the screen's component type — an
  // inline arrow function here would be a new type on every render, forcing
  // React Navigation to unmount and remount the tab (losing scroll position,
  // re-subscribing Firestore listeners) any time RootTabNavigator re-renders
  // for an unrelated reason, e.g. the root stack refocusing "Tabs" after a
  // MediaPreview save. Keeping the same function reference across renders
  // (as long as `user` doesn't change) keeps the tab's mounted instance.
  const renderTimeline = useCallback(() => (user ? <TimelineScreen user={user} /> : null), [user]);
  const renderMemoryGroups = useCallback(() => (user ? <MemoryGroupsNavigator user={user} /> : null), [user]);
  const renderFamilyPulse = useCallback(() => (user ? <FamilyPulseScreen user={user} /> : null), [user]);

  if (!user) return null;
  return (
    <Tab.Navigator
      initialRouteName="Capture"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<keyof RootTabParamList, [string, string]> = {
            Capture: ['camera', 'camera-outline'],
            Timeline: ['time', 'time-outline'],
            MemoryGroups: ['albums', 'albums-outline'],
            FamilyPulse: ['people', 'people-outline'],
          };
          const [active, inactive] = icons[route.name];
          return <Ionicons name={(focused ? active : inactive) as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Capture" component={CaptureScreen} />
      <Tab.Screen name="Timeline">{renderTimeline}</Tab.Screen>
      <Tab.Screen name="MemoryGroups" options={{ tabBarLabel: 'Albums' }}>
        {renderMemoryGroups}
      </Tab.Screen>
      <Tab.Screen name="FamilyPulse" options={{ tabBarLabel: 'Family' }}>
        {renderFamilyPulse}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
