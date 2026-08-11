import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../components/Button';
import { TextInput } from '../../components/TextInput';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { signIn, signInAsGuest } from '../../services/auth';
import { colors, minTapTarget, spacing, typography } from '../../theme';

function messageForAuthError(code: string) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Email or password is incorrect.';
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/operation-not-allowed':
      return 'Guest access is unavailable right now.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a few minutes.';
    case 'auth/network-request-failed':
      return 'No connection. Check your internet and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function SignInScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState<'credentials' | 'guest'>();
  const busy = pending !== undefined;

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    const nextEmailError = trimmedEmail ? undefined : 'Enter your email.';
    const nextPasswordError = password ? undefined : 'Enter your password.';

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setFormError(undefined);

    if (nextEmailError || nextPasswordError) return;

    setPending('credentials');
    try {
      await signIn(trimmedEmail, password);
    } catch (error) {
      setFormError(messageForAuthError((error as { code?: string }).code ?? ''));
      setPending(undefined);
    }
  }

  async function handleGuest() {
    setEmailError(undefined);
    setPasswordError(undefined);
    setFormError(undefined);
    setPending('guest');
    try {
      await signInAsGuest();
    } catch (error) {
      setFormError(messageForAuthError((error as { code?: string }).code ?? ''));
      setPending(undefined);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.mark}>
            <Text style={styles.markText}>أثر</Text>
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to pick up where your family left off.</Text>
        </View>

        <View style={styles.form}>
          {formError ? (
            <View style={styles.banner} accessibilityRole="alert">
              <Text style={styles.bannerText}>{formError}</Text>
            </View>
          ) : null}

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            editable={!busy}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            placeholder="Your password"
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            editable={!busy}
          />

          <View style={styles.action}>
            <Button
              label="Sign in"
              onPress={handleSubmit}
              loading={pending === 'credentials'}
              disabled={busy}
            />
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            label="Continue as guest"
            variant="secondary"
            onPress={handleGuest}
            loading={pending === 'guest'}
            disabled={busy}
          />

          <Pressable
            onPress={() => navigation.navigate('SignUp')}
            disabled={busy}
            accessibilityRole="link"
            style={styles.link}
          >
            <Text style={styles.linkText}>Don’t have an account? Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    gap: spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  markText: {
    ...typography.display,
    color: colors.textOnAccent,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    gap: spacing.sm,
  },
  banner: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bannerText: {
    ...typography.body,
    color: colors.error,
  },
  action: {
    marginTop: spacing.xs,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  link: {
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    ...typography.label,
    color: colors.primary,
  },
});
