import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootStackNavigator';
import { useCaptureMediaPermissions } from '../../hooks/useCaptureMediaPermissions';
import { useCaptureDestinationStore } from '../../store/captureDestinationStore';
import { useCaptureSessionStore, type CaptureItem } from '../../store/captureSessionStore';
import { useAuth } from '../../hooks/useAuth';
import { useFamilyCircleMembership } from '../../hooks/useFamilyCircleMembership';
import { uploadBatchedMemories } from '../../services/memories';
import { CaptureButton } from './CaptureButton';
import { AlbumPicker } from './AlbumPicker';
import { VoiceRecorder } from './VoiceRecorder';
import { colors, spacing, typography } from '../../theme';

type FlashMode = 'off' | 'on' | 'auto';
type Facing = 'front' | 'back';

const FLASH_ICONS: Record<FlashMode, React.ComponentProps<typeof Ionicons>['name']> = {
  auto: 'flash-outline',
  on: 'flash',
  off: 'flash-off-outline',
};

const FLASH_CYCLE: FlashMode[] = ['auto', 'on', 'off'];

const ZOOM_SENSITIVITY = 0.18;

// Pixels of vertical drag needed to travel the full zoom range while recording.
const ZOOM_DRAG_DISTANCE = 220;

function clampZoom(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export function CaptureScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { granted, cameraPermission, requestAll } = useCaptureMediaPermissions();
  const { destinationId, destinationLabel, setDestination } = useCaptureDestinationStore();
  const items = useCaptureSessionStore((state) => state.items);
  const addItem = useCaptureSessionStore((state) => state.addItem);
  const markSaved = useCaptureSessionStore((state) => state.markSaved);
  const { user } = useAuth();
  const { state: membership } = useFamilyCircleMembership(user);

  function autoSave(item: CaptureItem, durationSeconds?: number) {
    if (!user || membership.status !== 'ready' || !membership.circleId) return;
    const type = item.kind === 'video' ? 'video' : item.kind === 'audio' ? 'voice' : 'photo';
    uploadBatchedMemories(
      user,
      membership.circleId,
      [{
        uri: item.uri,
        groupId: destinationId,
        takenAtMs: item.createdAt,
        type,
        durationSeconds,
      }],
      () => {},
    )
      .then((result) => {
        const id = result.ids[0];
        if (id) markSaved(item.id, id);
      })
      .catch((e) => console.error('Auto-save failed', e));
  }

  const [facing, setFacing] = useState<Facing>('back');
  const [flash, setFlash] = useState<FlashMode>('auto');
  const [voiceMode, setVoiceMode] = useState(false);
  const [cameraMode, setCameraMode] = useState<'picture' | 'video'>('picture');
  const [albumPickerVisible, setAlbumPickerVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [zoom, setZoom] = useState(0);

  const cameraRef = useRef<CameraView>(null);
  const shutterOpacity = useRef(new Animated.Value(0)).current;
  const chromeOpacity = useRef(new Animated.Value(1)).current;
  const zoomBase = useRef(0);
  const zoomLive = useRef(0);

  const media = items.filter((item) => item.kind !== 'audio');
  const lastMedia = media[media.length - 1];

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

    const photo = await cameraRef.current?.takePictureAsync({ quality: 1 });
    if (photo) autoSave(addItem(photo.uri, 'photo'));
  }

  async function handleStartRecording() {
    setCameraMode('video');
    setIsRecording(true);
    Animated.timing(chromeOpacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();

    // The camera needs a beat to switch modes before it will accept a
    // recording, and it has to stay in video mode until the file comes back.
    await new Promise((resolve) => setTimeout(resolve, 150));
    const video = await cameraRef.current?.recordAsync();
    if (video) autoSave(addItem(video.uri, 'video'));
    setCameraMode('picture');
  }

  function handleStopRecording() {
    cameraRef.current?.stopRecording();
    setIsRecording(false);
    zoomBase.current = zoomLive.current;
    Animated.timing(chromeOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }

  function openPreview() {
    if (lastMedia) navigation.navigate('MediaPreview', { itemId: lastMedia.id });
  }

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
        <VoiceRecorder
          onRecorded={(uri, durationMillis) =>
            autoSave(addItem(uri, 'audio'), Math.round(durationMillis / 1000))
          }
        />
      ) : (
        <>
        <GestureDetector gesture={pinchGesture}>
          <View style={StyleSheet.absoluteFill}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              flash={flash}
              mode={cameraMode}
              zoom={zoom}
              mirror={facing === 'front'}
              videoQuality="1080p"
              videoStabilizationMode="auto"
            />
          </View>
        </GestureDetector>

        </>
      )}

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.shutter, { opacity: shutterOpacity }]}
      />

      {!voiceMode && (
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
      )}

      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        <Animated.View
          style={{ opacity: chromeOpacity }}
          pointerEvents={isRecording ? 'none' : 'auto'}
        >
          <Pressable style={styles.albumButton} onPress={() => setAlbumPickerVisible(true)}>
            <Ionicons name="albums-outline" size={16} color={colors.surface} />
            <Text style={styles.albumLabel}>{destinationLabel}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.surface} />
          </Pressable>
        </Animated.View>

        <View style={[styles.captureRow, voiceMode && styles.captureRowVoice]}>
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
                name={voiceMode ? 'camera-outline' : 'mic-outline'}
                size={34}
                color={colors.surface}
              />
            </Pressable>
          </Animated.View>

          {!voiceMode && (
            <CaptureButton
              onTakePhoto={handleTakePhoto}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onZoomDrag={handleZoomDrag}
            />
          )}

          {!voiceMode && (
            <Animated.View
              style={{ opacity: chromeOpacity }}
              pointerEvents={isRecording ? 'none' : 'auto'}
            >
              <Pressable style={styles.thumbnailButton} onPress={openPreview}>
                {lastMedia?.kind === 'photo' && (
                  <Image source={{ uri: lastMedia.uri }} style={styles.thumbnail} />
                )}
                {lastMedia?.kind === 'video' && (
                  <View style={[styles.thumbnail, styles.thumbnailVideo]}>
                    <Ionicons name="play" size={20} color={colors.surface} />
                  </View>
                )}
                {!lastMedia && <View style={styles.thumbnailPlaceholder} />}
              </Pressable>
            </Animated.View>
          )}
        </View>
      </SafeAreaView>

      <AlbumPicker
        visible={albumPickerVisible}
        onClose={() => setAlbumPickerVisible(false)}
        selectedId={destinationId}
        onSelect={setDestination}
      />
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
  captureRowVoice: {
    justifyContent: 'center',
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
  thumbnailVideo: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholder: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});
