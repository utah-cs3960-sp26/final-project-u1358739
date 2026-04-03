import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppViewModel } from '../../viewModels/useAppViewModel';
import { PrimaryButton } from '../components/PrimaryButton';
import { palette, spacing, typography } from '../theme';

type HomeScreenProps = {
  viewModel: AppViewModel;
};

export function HomeScreen({ viewModel }: HomeScreenProps) {
  const [showDebug, setShowDebug] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        {__DEV__ && (
          <Pressable
            onPress={() => setShowDebug(true)}
            style={({ pressed }) => [styles.debugButton, pressed && styles.debugButtonPressed]}
          >
            <Text style={styles.debugButtonText}>🛠</Text>
          </Pressable>
        )}

        <View style={styles.centerSection}>
          <Text style={styles.levelLabel}>{viewModel.currentLevelLabel}</Text>
        </View>

        <View style={styles.buttonWrapper}>
          <PrimaryButton label={viewModel.playButtonLabel} onPress={viewModel.openGameScreen} />
        </View>
      </View>

      {__DEV__ && (
        <Modal animationType="slide" transparent visible={showDebug} onRequestClose={() => setShowDebug(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Database Contents</Text>
              <ScrollView style={styles.modalScroll}>
                {Object.entries(viewModel.playerProgress).map(([key, value]) => {
                  const isEditable = key === 'currentLevelNumber';
                  const isEditing = editingKey === key;

                  return (
                    <Pressable
                      key={key}
                      onPress={() => {
                        if (isEditable && !isEditing) {
                          setEditingKey(key);
                          setEditValue(String(value));
                        }
                      }}
                      style={styles.modalRow}
                    >
                      <Text style={styles.modalKey}>{key}</Text>
                      {isEditing ? (
                        <TextInput
                          autoFocus
                          keyboardType="number-pad"
                          onBlur={() => {
                            const parsed = parseInt(editValue, 10);
                            if (!isNaN(parsed)) {
                              viewModel.updatePlayerProgress({ currentLevelNumber: parsed });
                            }
                            setEditingKey(null);
                          }}
                          onChangeText={setEditValue}
                          onSubmitEditing={() => {
                            const parsed = parseInt(editValue, 10);
                            if (!isNaN(parsed)) {
                              viewModel.updatePlayerProgress({ currentLevelNumber: parsed });
                            }
                            setEditingKey(null);
                          }}
                          style={styles.modalInput}
                          value={editValue}
                        />
                      ) : (
                        <Text style={styles.modalValue}>{String(value)}</Text>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Pressable
                onPress={() => setShowDebug(false)}
                style={({ pressed }) => [styles.modalCloseButton, pressed && styles.debugButtonPressed]}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: palette.background,
    flex: 1,
  },
  container: {
    flex: 1,
  },
  debugButton: {
    alignItems: 'center',
    backgroundColor: palette.surfaceAlt,
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    width: 36,
    zIndex: 1,
  },
  debugButtonPressed: {
    opacity: 0.7,
  },
  debugButtonText: {
    fontSize: 18,
  },
  centerSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: '12%',
  },
  levelLabel: {
    color: palette.text,
    fontSize: typography.titleSize,
    fontWeight: '800',
  },
  buttonWrapper: {
    alignItems: 'center',
    bottom: '20%',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '70%',
    padding: spacing.lg,
  },
  modalTitle: {
    color: palette.text,
    fontSize: typography.headingSize,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  modalScroll: {
    marginBottom: spacing.md,
  },
  modalRow: {
    backgroundColor: palette.surfaceAlt,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    padding: spacing.sm,
  },
  modalKey: {
    color: palette.mutedText,
    fontSize: typography.bodySize,
    fontWeight: '600',
  },
  modalValue: {
    color: palette.text,
    fontSize: typography.bodySize,
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: palette.surface,
    borderColor: palette.primary,
    borderRadius: 6,
    borderWidth: 1,
    color: palette.text,
    fontSize: typography.bodySize,
    fontWeight: '700',
    minWidth: 60,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    textAlign: 'right',
  },
  modalCloseButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  modalCloseText: {
    color: '#ffffff',
    fontSize: typography.bodySize,
    fontWeight: '700',
  },
});
