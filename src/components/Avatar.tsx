import { StyleSheet, Text, View } from 'react-native';
import { colors, minTapTarget, typography } from '../theme';

interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = minTapTarget }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <View
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.initial, { fontSize: size * 0.45 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    ...typography.heading,
    color: colors.textOnAccent,
  },
});
