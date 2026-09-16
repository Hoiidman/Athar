import type { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootTabNavigator, type RootTabParamList } from './RootTabNavigator';
import { MediaPreviewScreen } from '../screens/preview/MediaPreviewScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { AccessibilitySettingsScreen } from '../screens/settings/AccessibilitySettingsScreen';

export interface EditMemoryParam {
  memoryId: string;
  uri: string;
  kind: 'photo' | 'video';
  groupId: string;
}

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList> | undefined;
  MediaPreview: { itemId: string; editMemory?: EditMemoryParam };
  Search: undefined;
  AccessibilitySettings: undefined;
};

// Named so deeply nested screens can reach this stack's modals via
// `navigation.getParent('RootStack')` without climbing every navigator in between.
export const ROOT_STACK_ID = 'RootStack';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStackNavigator() {
  return (
    <Stack.Navigator id={ROOT_STACK_ID} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={RootTabNavigator} />
      <Stack.Screen
        name="MediaPreview"
        component={MediaPreviewScreen}
        options={{ presentation: 'fullScreenModal', animation: 'fade' }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="AccessibilitySettings"
        component={AccessibilitySettingsScreen}
        options={{ headerShown: true, title: 'Accessibility', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
