import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootTabNavigator } from './src/navigation/RootTabNavigator';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { useAuth } from './src/hooks/useAuth';
import { useEnsureUserDocument } from './src/hooks/useEnsureUserDocument';
import { colors } from './src/theme';

export default function App() {
  const { user, initializing } = useAuth();
  useEnsureUserDocument(user);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          {initializing ? (
            <View style={styles.splash}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : user ? (
            <RootTabNavigator />
          ) : (
            <AuthNavigator />
          )}
        </NavigationContainer>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
