import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { CameraView } from 'expo-camera';
import { useAudioRecorder, RecordingPresets } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { useCaptureMediaPermissions } from '../../hooks/useCaptureMediaPermissions';
import { useCaptureDestinationStore } from '../../store/captureDestinationStore';
import { MY_SPACE_GROUP_ID } from '../../types';
import { CaptureButton } from './CaptureButton';
import { AlbumPicker } from './AlbumPicker';
import { colors, spacing, typography } from '../../theme';

type FlashMode = 'off' | 'on' | 'auto';
type Facing = 'front' | 'back';

const FLASH_ICONS: Record<FlashMode, React.ComponentProps<typeof Ionicons>['name']> = {
  auto: 'flash-outline',
  on: 'flash',
  off: 'flash-off-outline',
};

const FLASH_CYCLE: FlashMode[] = ['auto', 'on', 'off'];

const ZOOM_SENSITIVITY = 0.4;

// Pixels of vertical drag needed to travel the full zoom range while recording.
const ZOOM_DRAG_DISTANCE = 220;

function clampZoom(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export function CaptureScreen() {
  const { granted, cameraPermission, requestAll } = useCaptureMediaPermissions();
  const { destinationId } = useCaptureDestinationStore();

  const [facing, setFacing] = useState<Facing>('back');
  const [flash, setFlash] = useState<FlashMode>('auto');
  const [voiceMode, setVoiceMode] = useState(false);
  const [cameraMode, setCameraMode] = useState<'picture' | 'video'>('picture');
  const [albumPickerVisible, setAlbumPickerVisible] = useState(false);
  const [lastCaptureUri, setLastCaptureUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [zoom, setZoom] = useState(0);

  const cameraRef = useRef<CameraView>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const shutterOpacity = useRef(new Animated.Value(0)).current;
  const chromeOpacity = useRef(new Animated.Value(1)).current;
  const zoomBase = useRef(0);
  const zoomLive = useRef(0);

  function applyZoom(next: number) {
    const clamped = clampZoom(next);
    zoomLive.current = clamped;
    setZoom(clamped);
  }

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((e) => applyZoom(zoomBase.current + (e.scale - 1) * ZOOM_SENSITIVITY))
        .onEnd(() => {
          zoomBase.current = zoomLive.current;
        }),
    [],
  );

  function handleZoomDrag(dy: number) {
    applyZoom(zoomBase.current - dy / ZOOM_DRAG_DISTANCE);
  }

  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted && cameraPermission.canAskAgain) {
      requestAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraPermission]);

  function cycleFlash() {
    setFlash((f) => FLASH_CYCLE[(FLASH_CYCLE.indexOf(f) + 1) % FLASH_CYCLE.length] ?? 'auto');
  }

  async function handleTakePhoto() {
    Animated.sequence([
      Animated.timing(shutterOpacity, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shutterOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start();

    const photo = await cameraRef.current?.takePictureAsync();
    if (photo) setLastCaptureUri(photo.uri);
  }

  async function handleStartRecording() {
    setCameraMode('video');
    setIsRecording(true);
    Animated.timing(chromeOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();

    setTimeout(async () => {
      const video = await cameraRef.current?.recordAsync();
      if (video) setLastCaptureUri(video.uri);
    }, 150);
  }

  function handleStopRecording() {
    cameraRef.current?.stopRecording();
    setCameraMode('picture');
    setIsRecording(false);
    zoomBase.current = zoomLive.current;
    Animated.timing(chromeOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }

  async function handleVoicePressIn() {
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  }

  async function handleVoicePressOut() {
    await audioRecorder.stop();
    if (audioRecorder.uri) setLastCaptureUri(audioRecorder.uri);
  }

  const albumLabel = destinationId === MY_SPACE_GROUP_ID ? 'My Space' : destinationId;

  if (!granted) {
    return (
      <View style={styles.permissionScreen}>
        <Text style={styles.permissionMessage}>
          Athar needs camera and microphone access to capture memories.
        </Text>
        <Pressable onPress={requestAll} style={styles.grantButton}>
          <Text style={styles.grantText}>Grant access</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {voiceMode ? (
        <View style={styles.voiceBackground}>
          <Pressable
            style={styles.voiceMicButton}
            onPressIn={handleVoicePressIn}
            onPressOut={handleVoicePressOut}
          >
            <Ionicons name="mic" size={52} color={colors.surface} />
          </Pressable>
          <Text style={styles.voiceHint}>Hold to record</Text>
        </View>
      ) : (
        <GestureDetector gesture={pinchGesture}>
          <View style={StyleSheet.absoluteFill}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              flash={flash}
              mode={cameraMode}
              zoom={zoom}
            />
          </View>
        </GestureDetector>
      )}

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.shutter, { opacity: shutterOpacity }]}
      />

      <SafeAreaView style={styles.topBar} edges={['top']}>
        <Pressable onPress={cycleFlash} style={styles.iconButton} hitSlop={10}>
          <Ionicons name={FLASH_ICONS[flash]} size={30} color={colors.surface} />
        </Pressable>
        <Pressable
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          style={styles.iconButton}
          hitSlop={10}
        >
          <Ionicons name="camera-reverse-outline" size={32} color={colors.surface} />
        </Pressable>
      </SafeAreaView>

      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        <Animated.View
          style={{ opacity: chromeOpacity }}
          pointerEvents={isRecording ? 'none' : 'auto'}
        >
          <Pressable style={styles.albumButton} onPress={() => setAlbumPickerVisible(true)}>
            <Ionicons name="albums-outline" size={16} color={colors.surface} />
            <Text style={styles.albumLabel}>{albumLabel}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.surface} />
          </Pressable>
        </Animated.View>

        <View style={styles.captureRow}>
          <Animated.View
            style={{ opacity: chromeOpacity }}
            pointerEvents={isRecording ? 'none' : 'auto'}
          >
            <Pressable
              onPress={() => setVoiceMode((v) => !v)}
              style={styles.iconButton}
              hitSlop={10}
            >
              <Ionicons
                name={voiceMode ? 'mic' : 'mic-outline'}
                size={34}
                color={voiceMode ? colors.primary : colors.surface}
              />
            </Pressable>
          </Animated.View>

          <CaptureButton
            onTakePhoto={handleTakePhoto}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onZoomDrag={handleZoomDrag}
          />

          <Animated.View
            style={{ opacity: chromeOpacity }}
            pointerEvents={isRecording ? 'none' : 'auto'}
          >
            <Pressable style={styles.thumbnailButton}>
              {lastCaptureUri ? (
                <Image source={{ uri: lastCaptureUri }} style={styles.thumbnail} />
              ) : (
                <View style={styles.thumbnailPlaceholder} />
              )}
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>

      <AlbumPicker visible={albumPickerVisible} onClose={() => setAlbumPickerVisible(false)} />
    </View>
  );
}

const THUMBNAIL_SIZE = 58;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.textPrimary,
  },
  permissionScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  permissionMessage: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  grantButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  grantText: {
    ...typography.label,
    color: colors.textOnAccent,
  },
  voiceBackground: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  voiceMicButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  shutter: {
    backgroundColor: colors.surface,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  albumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: 20,
  },
  albumLabel: {
    ...typography.caption,
    color: colors.surface,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  iconButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailButton: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
  },
  thumbnailPlaceholder: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});
