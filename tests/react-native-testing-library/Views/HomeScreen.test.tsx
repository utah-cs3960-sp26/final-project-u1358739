import { render, screen } from '@testing-library/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from '../../../src/views/screens/HomeScreen';
import { defaultPlayerProgress } from '../../../src/storage/playerProgressStore.shared';

describe('HomeScreen', () => {
  it('displays the current level label', () => {
    const mockViewModel = {
      currentLevelLabel: 'Level 5',
      homeHeadline: 'Test headline',
      openGameScreen: jest.fn(),
      playButtonLabel: 'Play',
      playerProgress: defaultPlayerProgress,
      playerStats: {
        levelsCompleted: 0,
        perfectClears: 0,
        totalAttempts: 0,
        totalMistakes: 0,
      },
      updatePlayerProgress: jest.fn(),
    };

    render(
      <SafeAreaProvider>
        <HomeScreen viewModel={mockViewModel} />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Level 5')).toBeTruthy();
  });
});
