import { useEffect } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { useCaptureMediaPermissions } from '../../hooks/useCaptureMediaPermissions';
import { colors, spacing, typography } from '../../theme';

export function CaptureScreen() {
  const { granted, cameraPermission, requestAll } = useCaptureMediaPermissions();

  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted && cameraPermission.canAskAgain) {
      requestAll();
    }
    // Only re-run when the permission status itself changes, not on every
    // render (requestAll is re-created each render by the permissions hook).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraPermission]);

  if (!granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          Athar needs camera and microphone access to capture memories.
        </Text>
        <Button title="Grant access" onPress={requestAll} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
