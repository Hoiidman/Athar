import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CaptureScreen } from '../screens/capture/CaptureScreen';
import { TimelineScreen } from '../screens/timeline/TimelineScreen';
import { MemoryGroupsScreen } from '../screens/memoryGroups/MemoryGroupsScreen';
import { FamilyPulseScreen } from '../screens/familyPulse/FamilyPulseScreen';

export type RootTabParamList = {
  Capture: undefined;
  Timeline: undefined;
  MemoryGroups: undefined;
  FamilyPulse: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootTabNavigator() {
  return (
    <Tab.Navigator initialRouteName="Capture" screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Capture" component={CaptureScreen} />
      <Tab.Screen name="Timeline" component={TimelineScreen} />
      <Tab.Screen name="MemoryGroups" component={MemoryGroupsScreen} />
      <Tab.Screen name="FamilyPulse" component={FamilyPulseScreen} />
    </Tab.Navigator>
  );
}
