import React, { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Modal, View, Text,  StyleSheet, Pressable, ActivityIndicator, Alert, Dimensions, FlatList } from 'react-native';
import { useRef } from "react";
import { Ionicons } from '@expo/vector-icons';
import { Memory, MemoryGroup } from '../types/memory';
import { MY_SPACE_GROUP_ID } from '../types';
import { colors, spacing, typography } from '../theme';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../services/firebase';
import { moveMemoryToGroup } from '../services/memories';
import { AlbumPicker } from '../screens/capture/AlbumPicker';


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

const screenWidth = Dimensions.get('window').width;

interface ImageViewerModalProps {
  memories: Memory[];
  initialMemoryId: string | null;
  onClose: () => void;
  showDetails?: boolean;
  getUploaderName?: (uid: string) => string;
  /** Shows a "Move to <space>" control instead of editing tools. Used from the Timeline. */
  showMoveControl?: boolean;
  groups?: MemoryGroup[];
}

export function ImageViewerModal({
  memories,
  initialMemoryId,
  onClose,
  showDetails = false,
  getUploaderName,
  showMoveControl = false,
  groups = [],
}: ImageViewerModalProps) {
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

  async function handleRemove() {
    Alert.alert('Remove Memory', 'Do you want to remove this memory from the group or delete it entirely?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove from Group', onPress: async () => {
          setRemoving(true);
          try {
            await updateDoc(doc(firestore, 'memories', memory.id), { memoryGroupId: 'my-space' });
            if (memories.length <= 1) onClose();
            else setCurrentIndex(Math.max(0, currentIndex - 1));
          } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to remove from group');
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

  const uploadDate = new Date(memory.createdAt).toLocaleDateString();
  const takenDate = memory.takenAt ? new Date(memory.takenAt).toLocaleDateString() : 'Unknown';
  const uploaderName = getUploaderName ? getUploaderName(memory.uploadedBy) : memory.uploadedBy;
  const currentGroupLabel =
    memory.memoryGroupId === MY_SPACE_GROUP_ID
      ? 'My Space'
      : groups.find((g) => g.id === memory.memoryGroupId)?.title ?? 'Shared';

  return (
    <>
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {showDetails && (
            <Pressable onPress={handleRemove} style={styles.iconButton} disabled={removing}>
              {removing ? <ActivityIndicator color="#fff" /> : <Ionicons name="trash" size={24} color="#ff4444" />}
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

        {showDetails && (
          <View style={styles.detailsPanel}>
            <Text style={styles.detailText}>Uploaded by: {uploaderName}</Text>
            <Text style={styles.detailText}>Uploaded on: {uploadDate}</Text>
            <Text style={styles.detailText}>Taken on: {takenDate}</Text>
          </View>
        )}

        {showMoveControl && (
          <View style={styles.moveBar}>
            <Pressable
              style={styles.moveButton}
              onPress={() => setMovePickerVisible(true)}
              disabled={moving}
            >
              {moving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="albums-outline" size={18} color="#fff" />
                  <Text style={styles.moveButtonText} numberOfLines={1}>
                    Move to {currentGroupLabel}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#fff" />
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </Modal>

    {showMoveControl && (
      <AlbumPicker
        visible={movePickerVisible}
        onClose={() => setMovePickerVisible(false)}
        selectedId={memory.memoryGroupId}
        onSelect={(groupId) => handleMoveTo(groupId)}
        title="Move to"
      />
    )}
    </>
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
  detailsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  detailText: {
    ...typography.body,
    color: '#fff',
    marginBottom: spacing.xs,
  },
  moveBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  moveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 24,
    maxWidth: '80%',
  },
  moveButtonText: {
    ...typography.body,
    color: '#fff',
    flexShrink: 1,
  },
});
