import React, { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Modal, View, Text,  StyleSheet, Pressable, ActivityIndicator, Alert, Dimensions, FlatList } from 'react-native';
import { useRef } from "react";
import { Ionicons } from '@expo/vector-icons';
import { Memory } from '../types/memory';
import { colors, spacing, typography } from '../theme';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../services/firebase';


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
}

export function ImageViewerModal({ memories, initialMemoryId, onClose, showDetails = false, getUploaderName }: ImageViewerModalProps) {
  const [removing, setRemoving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
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





  const uploadDate = new Date(memory.createdAt).toLocaleDateString();
  const takenDate = memory.takenAt ? new Date(memory.takenAt).toLocaleDateString() : 'Unknown';
  const uploaderName = getUploaderName ? getUploaderName(memory.uploadedBy) : memory.uploadedBy;

  return (
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
  }
});
