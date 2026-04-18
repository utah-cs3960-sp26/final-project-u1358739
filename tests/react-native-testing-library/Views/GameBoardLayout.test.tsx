import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Animated, View } from 'react-native';

import { GameBoard } from '../../../src/views/components/GameBoard';
import type { EdgeView, LevelView, NodeView } from '../../../src/viewModels/useGameViewModel';

const levelView: LevelView = {
  id: 'layout-test-level',
  gridWidth: 10,
  gridHeight: 10,
};

const activeNodes: NodeView[] = [
  { id: 1, x: 3, y: 3, status: 'active' },
];

const activeEdges: EdgeView[] = [];

function buildBoard() {
  let tree: ReactTestRenderer;

  act(() => {
    tree = create(
      <GameBoard
        activeEdges={activeEdges}
        activeNodes={activeNodes}
        blockedEventToken={0}
        blockedNodeId={null}
        isInteractionLocked={false}
        levelView={levelView}
        onNodePress={jest.fn()}
        onRemovalComplete={jest.fn()}
        setZoom={jest.fn()}
        showGrid={false}
        zoom={0.5}
      />,
    );
  });

  return tree!;
}

function getViewport(root: ReturnType<typeof buildBoard>) {
  return root.root.findAllByType(View)[0];
}

function getBoard(root: ReturnType<typeof buildBoard>) {
  return root.root.findAllByType(View)[1];
}

function emitLayout(root: ReturnType<typeof buildBoard>, width: number, height: number) {
  act(() => {
    getViewport(root).props.onLayout({
      nativeEvent: {
        layout: { width, height, x: 0, y: 0 },
      },
    });
  });
}

describe('GameBoard startup layout stability', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays hidden while startup layout is still changing', () => {
    const tree = buildBoard();

    expect(getBoard(tree).props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ opacity: 0 })]),
    );

    emitLayout(tree, 400, 700);

    expect(getBoard(tree).props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ opacity: 0 })]),
    );

    emitLayout(tree, 400, 650);

    expect(getBoard(tree).props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ opacity: 0 })]),
    );
  });

  it('reveals the board once the measured frame stops changing', () => {
    const tree = buildBoard();

    emitLayout(tree, 400, 650);

    act(() => {
      jest.advanceTimersByTime(32);
    });

    expect(getBoard(tree).props.style).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ opacity: 0 })]),
    );
  });
});

describe('GameBoard same-level retry behavior', () => {
  const originalTiming = Animated.timing;

  beforeEach(() => {
    jest.spyOn(Animated, 'timing').mockImplementation((value, config) => {
      return {
        reset: jest.fn(),
        start: (callback?: (result: { finished: boolean }) => void) => {
          value.setValue(config.toValue);
          callback?.({ finished: true });
        },
        stop: jest.fn(),
      } as any;
    });
  });

  afterEach(() => {
    Animated.timing = originalTiming;
    jest.restoreAllMocks();
  });

  it('allows the same node id to be removed again after restarting the same level', () => {
    const onRemovalComplete = jest.fn();
    let tree: ReactTestRenderer;

    act(() => {
      tree = create(
        <GameBoard
          activeEdges={[]}
          activeNodes={[{ id: 1, x: 3, y: 3, status: 'fading' }]}
          blockedEventToken={0}
          blockedNodeId={null}
          isInteractionLocked={false}
          levelView={levelView}
          onNodePress={jest.fn()}
          onRemovalComplete={onRemovalComplete}
          setZoom={jest.fn()}
          showGrid={false}
          zoom={0.5}
        />,
      );
    });

    expect(onRemovalComplete).toHaveBeenCalledTimes(1);

    act(() => {
      tree!.update(
        <GameBoard
          activeEdges={[]}
          activeNodes={[]}
          blockedEventToken={0}
          blockedNodeId={null}
          isInteractionLocked={false}
          levelView={levelView}
          onNodePress={jest.fn()}
          onRemovalComplete={onRemovalComplete}
          setZoom={jest.fn()}
          showGrid={false}
          zoom={0.5}
        />,
      );
    });

    act(() => {
      tree!.update(
        <GameBoard
          activeEdges={[]}
          activeNodes={[{ id: 1, x: 3, y: 3, status: 'active' }]}
          blockedEventToken={0}
          blockedNodeId={null}
          isInteractionLocked={false}
          levelView={levelView}
          onNodePress={jest.fn()}
          onRemovalComplete={onRemovalComplete}
          setZoom={jest.fn()}
          showGrid={false}
          zoom={0.5}
        />,
      );
    });

    act(() => {
      tree!.update(
        <GameBoard
          activeEdges={[]}
          activeNodes={[{ id: 1, x: 3, y: 3, status: 'fading' }]}
          blockedEventToken={0}
          blockedNodeId={null}
          isInteractionLocked={false}
          levelView={levelView}
          onNodePress={jest.fn()}
          onRemovalComplete={onRemovalComplete}
          setZoom={jest.fn()}
          showGrid={false}
          zoom={0.5}
        />,
      );
    });

    expect(onRemovalComplete).toHaveBeenCalledTimes(2);
  });
});
