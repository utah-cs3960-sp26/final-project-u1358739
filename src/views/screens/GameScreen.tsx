import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppViewModel } from '../../viewModels/useAppViewModel';
import { GameBoard } from '../components/GameBoard';
import { palette, spacing } from '../theme';

const DEFAULT_LIVES = 2;

type GameScreenProps = {
  viewModel: AppViewModel;
};

export function GameScreen({ viewModel }: GameScreenProps) {
  if (!viewModel.gameScreen) {
    return null;
  }

  const { gameScreen } = viewModel;

  const hearts = Array.from({ length: DEFAULT_LIVES }, (_, i) =>
    i < gameScreen.livesRemaining ? '❤️' : '🩶',
  );

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.topBar}>
        <View style={styles.leftGroup}>
          <Pressable
            onPress={gameScreen.returnHome}
            style={({ pressed }) => [styles.circleButton, pressed && styles.circleButtonPressed]}
          >
            <Text style={styles.circleButtonText}>⌂</Text>
          </Pressable>
          <Pressable
            onPress={gameScreen.retryLevel}
            style={({ pressed }) => [styles.circleButton, pressed && styles.circleButtonPressed]}
          >
            <Text style={styles.circleButtonText}>↺</Text>
          </Pressable>
        </View>

        <View style={styles.livesContainer}>
          {hearts.map((heart, i) => (
            <Text key={i} style={styles.heartText}>
              {heart}
            </Text>
          ))}
        </View>

        <View style={styles.rightGroup}>
          <Pressable
            onPress={gameScreen.toggleGrid}
            style={({ pressed }) => [styles.circleButton, pressed && styles.circleButtonPressed]}
          >
            <Text style={styles.circleButtonText}>⊞</Text>
          </Pressable>
        </View>
      </View>

      <GameBoard
        blockedEventToken={gameScreen.blockedEventToken}
        blockedNodeId={gameScreen.blockedNodeId}
        isInteractionLocked={gameScreen.isInteractionLocked}
        level={gameScreen.level}
        onNodePress={gameScreen.handleNodePress}
        removalEvent={gameScreen.removalEvent}
        setZoom={gameScreen.setZoom}
        showGrid={gameScreen.showGrid}
        zoom={gameScreen.zoom}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: palette.boardBackground,
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  leftGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  livesContainer: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  heartText: {
    fontSize: 20,
  },
  rightGroup: {
    flexDirection: 'row',
  },
  circleButton: {
    alignItems: 'center',
    backgroundColor: palette.surfaceAlt,
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  circleButtonPressed: {
    opacity: 0.7,
  },
  circleButtonText: {
    color: palette.text,
    fontSize: 18,
  },
});
