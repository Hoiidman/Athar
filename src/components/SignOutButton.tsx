import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { signOut } from '../services/auth';
import { colors, spacing, typography } from '../theme';
import { Button } from './Button';

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function handlePress() {
    setError(undefined);
    setPending(true);
    try {
      await signOut();
    } catch {
      setError('Could not sign out. Please try again.');
      setPending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Button label="Sign out" variant="quiet" onPress={handlePress} loading={pending} />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
});
