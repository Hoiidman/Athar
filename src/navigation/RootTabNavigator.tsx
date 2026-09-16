import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { User } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAccessibilityStore } from '../store/accessibilityStore';
import { CaptureScreen } from '../screens/capture/CaptureScreen';
import { TimelineScreen } from '../screens/timeline/TimelineScreen';
import { MemoryGroupsNavigator } from './MemoryGroupsNavigator';
import { FamilyPulseScreen } from '../screens/familyPulse/FamilyPulseScreen';

export type RootTabParamList = {
  Capture: undefined;
  Timeline: undefined;
  MemoryGroups: undefined;
  FamilyPulse: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootTabNavigator() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  // Simplified navigation drops Albums from the tab bar entirely. Turning
  // the setting back off in Accessibility (reachable from Family) restores it.
  const simplifiedMode = useAccessibilityStore((state) => state.simplifiedMode);
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
      <Tab.Screen name="Timeline">{() => <TimelineScreen user={user} />}</Tab.Screen>
      {simplifiedMode ? null : (
        <Tab.Screen name="MemoryGroups" options={{ tabBarLabel: 'Albums' }}>
          {() => <MemoryGroupsNavigator user={user} />}
        </Tab.Screen>
      )}
      <Tab.Screen name="FamilyPulse" options={{ tabBarLabel: 'Family' }}>
        {() => <FamilyPulseScreen user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
