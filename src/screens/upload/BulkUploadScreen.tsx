import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import type { User } from 'firebase/auth';
import { matchGroupsByDate } from '../../utils/autoCategorization';
import { Button } from '../../components/Button';
import { Select } from '../../components/Select';
import { colors, spacing, typography, cardCornerRadius } from '../../theme';
import { useFamilyCircleMembership } from '../../hooks/useFamilyCircleMembership';
import { useMemoryGroups } from '../../hooks/useMemoryGroups';

interface BulkUploadScreenProps {
  user: User;
  onCancel: () => void;
  onUpload: (selectedPhotos: CategorizedPhoto[]) => void;
}

export interface CategorizedPhoto {
  uri: string;
  width: number;
  height: number;
  creationTimeMs: number | null;
  type: "photo" | "video";
  durationSeconds?: number;
  matchedGroupIds: string[];
  selectedGroupId: string;
}

export function BulkUploadScreen({ user, onCancel, onUpload }: BulkUploadScreenProps) {
  const { state: membership } = useFamilyCircleMembership(user);
  const circleId = membership.status === 'ready' ? membership.circleId : null;
  const groupsState = useMemoryGroups(circleId);

  const [photos, setPhotos] = useState<CategorizedPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  // Optional state for tracking which photo we are manually re-assigning
  const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null);

  const activeGroups = groupsState.status === 'ready' ? groupsState.groups : [];

  const groupOptions = [
    { label: 'My Space (Private)', value: 'my-space' },
    ...activeGroups.map((g) => ({ label: g.title, value: g.id })),
  ];

  function updatePhotoGroup(index: number, groupId: string) {
    const next = [...photos];
    const photo = next[index];
    if (photo) {
      photo.selectedGroupId = groupId;
      setPhotos(next);
    }
    setEditingPhotoIndex(null);
  }

  async function handleSelectPhotos() {
    setError(undefined);
    try {
      // We request MediaLibrary permissions for iOS date fallback.
      // If it fails (e.g. Android Expo Go restriction), we don't block the user, 
      // because Android successfully provides EXIF dates via the image picker anyway.
      const { status } = await MediaLibrary.requestPermissionsAsync();
      const canUseMediaLibrary = status === 'granted';

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 1,
        exif: true,
      });

      if (result.canceled || !result.assets) return;

      setLoading(true);

      const processedPhotos: CategorizedPhoto[] = [];

      for (const asset of result.assets) {
        let creationTimeMs: number | null = null;
        const isVideo = asset.type === "video";
        const durationSeconds = isVideo && asset.duration ? asset.duration / 1000 : undefined;

        // Try EXIF first (works well on Android with expo-image-picker if exif: true)
        if (asset.exif && asset.exif.DateTimeOriginal) {
          // EXIF dates look like "2026:07:04 12:00:00"
          const parts = asset.exif.DateTimeOriginal.split(/[: ]/);
          if (parts.length >= 6) {
            const date = new Date(
              parseInt(parts[0]),
              parseInt(parts[1]) - 1,
              parseInt(parts[2]),
              parseInt(parts[3]),
              parseInt(parts[4]),
              parseInt(parts[5]),
            );
            creationTimeMs = date.getTime();
          }
        }

        // Fallback to media library if assetId is present (iOS)
        if (!creationTimeMs && asset.assetId != null && canUseMediaLibrary) {
          const mediaAsset = await MediaLibrary.getAssetInfoAsync(asset.assetId);
          if (mediaAsset && mediaAsset.creationTime) {
            creationTimeMs = mediaAsset.creationTime;
          }
        }

        const matchedGroupIds = creationTimeMs
          ? matchGroupsByDate(activeGroups, creationTimeMs)
          : [];

        // If multiple matches, we temporarily pick the first one, but the user will need to resolve it.
        // If no matches, falls back to 'my-space'
        const selectedGroupId = matchedGroupIds[0] ?? 'my-space';

        processedPhotos.push({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          type: isVideo ? "video" : "photo",
          durationSeconds,
          creationTimeMs,
          matchedGroupIds,
          selectedGroupId,
        });
      }

      setPhotos(processedPhotos);
    } catch (e) {
      console.error(e);
      setError('An error occurred while selecting photos.');
    } finally {
      setLoading(false);
    }
  }

  function renderEmpty() {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Bulk Upload</Text>
        <Text style={styles.emptySubtitle}>
          Select multiple photos from your camera roll. We&apos;ll automatically sort them into the
          correct Memory Group based on when they were taken!
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={{ gap: 12, width: "100%" }}>
          <Button label="Select Photos" onPress={handleSelectPhotos} loading={loading} />
          <Button label="Cancel" variant="secondary" onPress={onCancel} disabled={loading} />
        </View>
      </View>
    );
  }

  function renderList() {
    // If the user has overlapping dates, we might want to prevent upload until resolved,
    // or just let them accept the defaults (first match).
    return (
      <View style={styles.listContainer}>
        <Text style={styles.title}>Review & Categorize</Text>
        <ScrollView style={styles.scroll}>
          {photos.map((photo, i) => {
            const groupName =
              groupOptions.find((g) => g.value === photo.selectedGroupId)?.label ??
              'My Space (Private)';
            const needsResolution = photo.matchedGroupIds.length > 1;

            return (
              <View key={i} style={styles.photoRow}>
                <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
                <View style={styles.photoInfo}>
                  <Text style={styles.photoDate}>
                    {photo.creationTimeMs
                      ? new Date(photo.creationTimeMs).toLocaleDateString()
                      : 'Unknown Date'}
                  </Text>

                  {needsResolution ? (
                    <Text style={styles.warningText}>Overlapping dates!</Text>
                  ) : null}

                  {editingPhotoIndex === i ? (
                    <View style={styles.selectWrapper}>
                      <Select
                        label="Assigned Group"
                        value={photo.selectedGroupId}
                        options={groupOptions}
                        onSelect={(val) => updatePhotoGroup(i, val)}
                      />
                    </View>
                  ) : (
                    <Text style={styles.assignedGroup} onPress={() => setEditingPhotoIndex(i)}>
                      Assigned to: <Text style={styles.bold}>{groupName}</Text> (Tap to change)
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
        <View style={styles.actions}>
          <Button label="Upload All" onPress={() => onUpload(photos)} />
          <Button label="Cancel" variant="secondary" onPress={onCancel} />
        </View>
      </View>
    );
  }

  return <View style={styles.screen}>{photos.length === 0 ? renderEmpty() : renderList()}</View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.display,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  listContainer: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  photoRow: {
    flexDirection: 'row',
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: cardCornerRadius,
    alignItems: 'center',
    gap: spacing.md,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: colors.sunken,
  },
  photoInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  photoDate: {
    ...typography.label,
    color: colors.textSecondary,
  },
  assignedGroup: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: spacing.xs / 2,
  },
  bold: {
    fontWeight: '600',
  },
  warningText: {
    ...typography.label,
    color: colors.warning,
    marginTop: 2,
  },
  actions: {
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  selectWrapper: {
    marginTop: spacing.xs,
  },
});
