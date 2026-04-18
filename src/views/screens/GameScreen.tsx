import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { GameViewModel } from '../../viewModels/useGameViewModel';
import { GameBoard } from '../components/GameBoard';
import { palette, spacing } from '../theme';


type GameScreenProps = {
  viewModel: GameViewModel;
};

export function GameScreen({ viewModel }: GameScreenProps) {
  const hearts = Array.from({ length: viewModel.maxLives }, (_, i) =>
    i < viewModel.livesRemaining ? '❤️' : '🩶',
  );

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.topBar}>
        <View style={styles.leftGroup}>
          <Pressable
            onPress={viewModel.returnHome}
            style={({ pressed }) => [styles.circleButton, pressed && styles.circleButtonPressed]}
          >
            <Text style={styles.circleButtonText}>⌂</Text>
          </Pressable>
          <Pressable
            onPress={viewModel.retryLevel}
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
          {viewModel.timeDisplay !== null && (
            <Text style={[styles.timerText, viewModel.isOutOfTime && styles.timerExpired]}>
              {viewModel.timeDisplay}
            </Text>
          )}
          <Pressable
            onPress={viewModel.toggleGrid}
            style={({ pressed }) => [styles.circleButton, pressed && styles.circleButtonPressed]}
          >
            <Text style={styles.circleButtonText}>⊞</Text>
          </Pressable>
        </View>
      </View>

      <GameBoard
        blockedEventToken={viewModel.blockedEventToken}
        blockedNodeId={viewModel.blockedNodeId}
        isInteractionLocked={viewModel.isInteractionLocked}
        activeEdges={viewModel.activeEdges}
        activeNodes={viewModel.activeNodes}
        levelView={viewModel.levelView}
        onNodePress={viewModel.handleNodePress}
        onRemovalComplete={viewModel.handleRemovalComplete}
        setZoom={viewModel.setZoom}
        showGrid={viewModel.showGrid}
        zoom={viewModel.zoom}
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  timerText: {
    color: palette.text,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  timerExpired: {
    color: '#e53935',
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
