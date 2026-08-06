import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';

export function useCaptureMediaPermissions() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  const granted = !!cameraPermission?.granted && !!microphonePermission?.granted;

  const requestAll = async () => {
    await requestCameraPermission();
    await requestMicrophonePermission();
  };

  return {
    granted,
    cameraPermission,
    microphonePermission,
    requestAll,
  };
}
