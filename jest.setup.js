require('react-native-gesture-handler/jestSetup');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// Environment variables are read at module scope in src/services/firebase.ts,
// so they need values before any test imports it.
process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test.firebasestorage.app';
process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '000000000000';
process.env.EXPO_PUBLIC_FIREBASE_APP_ID = '1:000000000000:web:testappid';
process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS = 'false';
