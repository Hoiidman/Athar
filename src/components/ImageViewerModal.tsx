import React, { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Dimensions, FlatList, Share } from 'react-native';
import { useRef } from "react";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Memory, MemoryGroup } from '../types/memory';
import { MY_SPACE_GROUP_ID } from '../types';
import { colors, spacing, typography } from '../theme';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../services/firebase';
import { moveMemoryToGroup } from '../services/memories';
import { AlbumPicker } from '../screens/capture/AlbumPicker';
import type { RootStackParamList } from '../navigation/RootStackNavigator';


function VideoItem({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, player => {
    player.loop = true;
    player.play();
  });

  return (
    <VideoView
      style={styles.image}
      player={player}
      nativeControls={true}
    />
  );
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function VoiceItem({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  return (
    <View style={styles.voicePlayer}>
      <Pressable
        style={styles.voicePlayButton}
        onPress={() => (status.playing ? player.pause() : player.play())}
      >
        <Ionicons name={status.playing ? 'pause' : 'play'} size={36} color="#fff" />
      </Pressable>
      <Text style={styles.voiceDuration}>
        {formatDuration(status.currentTime)} / {formatDuration(status.duration)}
      </Text>
    </View>
  );
}

const screenWidth = Dimensions.get('window').width;

interface ImageViewerModalProps {
  memories: Memory[];
  initialMemoryId: string | null;
  onClose: () => void;
  groups?: MemoryGroup[];
}

export function ImageViewerModal({
  memories,
  initialMemoryId,
  onClose,
  groups = [],
}: ImageViewerModalProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [removing, setRemoving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [movePickerVisible, setMovePickerVisible] = useState(false);
  const [moving, setMoving] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (initialMemoryId && memories.length > 0) {
      const index = memories.findIndex(m => m.id === initialMemoryId);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    } else {
      setCurrentIndex(-1);
    }
  }, [initialMemoryId, memories]);

  if (currentIndex === -1 || !memories[currentIndex]) return null;

  const memory = memories[currentIndex];

  function handleRemove() {
    Alert.alert('Remove Memory', 'Do you want to remove this memory from the album or delete it entirely?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove from Album', onPress: async () => {
          setRemoving(true);
          try {
            await updateDoc(doc(firestore, 'memories', memory.id), { memoryGroupId: 'my-space' });
            if (memories.length <= 1) onClose();
            else setCurrentIndex(Math.max(0, currentIndex - 1));
          } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to remove from album');
          } finally {
            setRemoving(false);
          }
      }},
      { text: 'Delete Memory', style: 'destructive', onPress: async () => {
          setRemoving(true);
          try {
            await deleteDoc(doc(firestore, 'memories', memory.id));
            if (memories.length <= 1) onClose();
            else setCurrentIndex(Math.max(0, currentIndex - 1));
          } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to delete memory');
          } finally {
            setRemoving(false);
          }
      }}
    ]);
  }

  async function handleShare() {
    try {
      await Share.share({ url: memory.storageUrl, message: 'From Athar' });
    } catch {
      Alert.alert('Could not share', 'Something went wrong sharing this memory.');
    }
  }

  function handleEdit() {
    // avoids stacking a second native modal underneath the editor
    onClose();
    navigation.navigate('MediaPreview', {
      itemId: memory.id,
      editMemory: {
        memoryId: memory.id,
        uri: memory.storageUrl,
        kind: memory.type === 'video' ? 'video' : 'photo',
        groupId: memory.memoryGroupId,
      },
    });
  }

  async function handleMoveTo(groupId: string) {
    setMoving(true);
    try {
      await moveMemoryToGroup(memory.id, groupId);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to move memory');
    } finally {
      setMoving(false);
    }
  }

  const currentGroupLabel =
    memory.memoryGroupId === MY_SPACE_GROUP_ID
      ? 'My Space'
      : groups.find((g) => g.id === memory.memoryGroupId)?.title ?? 'Shared';
  const editable = memory.type !== 'voice';

  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {editable && (
            <Pressable onPress={handleEdit} style={styles.iconButton}>
              <Ionicons name="create-outline" size={26} color="#fff" />
            </Pressable>
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={memories}
          keyExtractor={item => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={currentIndex}
          getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
            if (index !== currentIndex) setCurrentIndex(index);
          }}
          renderItem={({ item }) => (
            <View style={{ width: screenWidth, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
              {item.type === 'video' ? (
                <VideoItem uri={item.storageUrl} />
              ) : item.type === 'voice' ? (
                <VoiceItem uri={item.storageUrl} />
              ) : (
                <Image
                  source={{ uri: item.storageUrl }}
                  style={styles.image}
                  contentFit="contain"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              )}
            </View>
          )}
        />

        <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Pressable style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color="#fff" />
            <Text style={styles.actionLabel}>Share</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => setMovePickerVisible(true)}
            disabled={moving}
          >
            {moving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="albums-outline" size={22} color="#fff" />
                <Text style={styles.actionLabel} numberOfLines={1}>
                  {currentGroupLabel}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable style={styles.actionButton} onPress={handleRemove} disabled={removing}>
            {removing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={22} color="#ff4444" />
                <Text style={[styles.actionLabel, styles.actionLabelDanger]}>Delete</Text>
              </>
            )}
          </Pressable>
        </View>

        {movePickerVisible && (
          <AlbumPicker
            visible={movePickerVisible}
            onClose={() => setMovePickerVisible(false)}
            selectedId={memory.memoryGroupId}
            onSelect={(groupId) => handleMoveTo(groupId)}
            title="Move to"
            inline
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: spacing.md,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  iconButton: {
    padding: spacing.xs,
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 24,
  },
  navLeft: {
    left: spacing.sm,
  },
  navRight: {
    right: spacing.sm,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
    maxWidth: '33%',
  },
  actionLabel: {
    ...typography.caption,
    color: '#fff',
  },
  actionLabelDanger: {
    color: '#ff4444',
  },
  voicePlayer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  voicePlayButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceDuration: {
    ...typography.body,
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
});
