import type { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootTabNavigator, type RootTabParamList } from './RootTabNavigator';
import { MediaPreviewScreen } from '../screens/preview/MediaPreviewScreen';

export interface EditMemoryParam {
  memoryId: string;
  uri: string;
  kind: 'photo' | 'video';
  groupId: string;
}

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList> | undefined;
  MediaPreview: { itemId: string; editMemory?: EditMemoryParam };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={RootTabNavigator} />
      <Stack.Screen
        name="MediaPreview"
        component={MediaPreviewScreen}
        options={{ presentation: 'fullScreenModal', animation: 'fade' }}
      />
    </Stack.Navigator>
  );
}
