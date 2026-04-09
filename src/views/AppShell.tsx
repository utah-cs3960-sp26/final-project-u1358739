import { StyleSheet, Text, View } from 'react-native';

import { useAppViewModel } from '../viewModels/useAppViewModel';
import { useGameViewModel } from '../viewModels/useGameViewModel';
import { useHomeViewModel } from '../viewModels/useHomeViewModel';
import { GameScreen } from './screens/GameScreen';
import { HomeScreen } from './screens/HomeScreen';
import { palette } from './theme';

export function AppShell() {
  const app = useAppViewModel();

  const homeViewModel = useHomeViewModel(
    app.playerProgress,
    app.openGameScreen,
    app.updatePlayerProgress,
  );

  if (app.currentScreen === 'game' && app.activeLevel) {
    return (
      <GameScreenWrapper
        app={app}
      />
    );
  }

  if (app.currentScreen === 'home') {
    return <HomeScreen viewModel={homeViewModel} />;
  }

  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackText}>Preparing Web Escape...</Text>
    </View>
  );
}

/**
 * Wrapper component so `useGameViewModel` is only called when
 * a level is active and can safely receive a non-null Level.
 */
function GameScreenWrapper({ app }: { app: ReturnType<typeof useAppViewModel> }) {
  const gameViewModel = useGameViewModel(
    app.activeLevel!,
    app.persistProgress,
    app.returnHome,
    app.beginLevel,
  );

  return <GameScreen viewModel={gameViewModel} />;
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    backgroundColor: palette.background,
    flex: 1,
    justifyContent: 'center',
  },
  fallbackText: {
    color: palette.primary,
    fontSize: 18,
    fontWeight: '700',
  },
});
