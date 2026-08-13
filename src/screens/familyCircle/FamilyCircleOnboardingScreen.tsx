import type { User } from 'firebase/auth';
import { useState } from 'react';
import { CreateFamilyCircleScreen } from './CreateFamilyCircleScreen';
import { JoinFamilyCircleScreen } from './JoinFamilyCircleScreen';

interface FamilyCircleOnboardingScreenProps {
  user: User;
  onCircleReady: (circleId: string) => void;
}

export function FamilyCircleOnboardingScreen({
  user,
  onCircleReady,
}: FamilyCircleOnboardingScreenProps) {
  const [mode, setMode] = useState<'create' | 'join'>('create');

  if (mode === 'join') {
    return (
      <JoinFamilyCircleScreen
        user={user}
        onJoined={onCircleReady}
        onSwitchToCreate={() => setMode('create')}
      />
    );
  }

  return (
    <CreateFamilyCircleScreen
      user={user}
      onContinue={onCircleReady}
      onSwitchToJoin={() => setMode('join')}
    />
  );
}
