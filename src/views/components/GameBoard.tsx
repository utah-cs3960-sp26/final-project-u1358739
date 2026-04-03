import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle as SvgCircle, G, Line, Polygon } from 'react-native-svg';

import type { Level } from '../../models/Level';
import type { Node, NodeSnapshot } from '../../models/Node';
import type { RemovalAnimationSnapshot } from '../../viewModels/useAppViewModel';
import { palette, spacing, typography } from '../theme';

type GameBoardProps = {
  level: Level;
  zoom: number;
  setZoom: (newZoom: number) => void;
  showGrid: boolean;
  blockedNodeId: number | null;
  blockedEventToken: number;
  isInteractionLocked: boolean;
  removalEvent: RemovalAnimationSnapshot | null;
  onNodePress: (nodeId: number) => void;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.55;

const BASE_GRID_UNIT = 54;

function getTouchDistance(touches: React.TouchList) {
  const t0 = touches[0];
  const t1 = touches[1];
  const dx = t0.pageX - t1.pageX;
  const dy = t0.pageY - t1.pageY;
  return Math.hypot(dx, dy);
}

export function GameBoard({
  level,
  zoom,
  setZoom,
  showGrid,
  blockedNodeId,
  blockedEventToken,
  isInteractionLocked,
  removalEvent,
  onNodePress,
}: GameBoardProps) {
  const windowSize = useWindowDimensions();
  const horizontalScrollRef = useRef<ScrollView>(null);
  const verticalScrollRef = useRef<ScrollView>(null);
  const [didPrimeScrollPosition, setDidPrimeScrollPosition] = useState(false);
  const [frameSize, setFrameSize] = useState({ height: 0, width: 0 });
  const [removalProgress, setRemovalProgress] = useState(1);
  const removalAnimationValue = useRef(new Animated.Value(1)).current;

  const pinchRef = useRef<{ startDistance: number; startZoom: number } | null>(null);
  const viewportRef = useRef<View>(null);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta)));
      }
    },
    [zoom, setZoom],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = viewportRef.current as unknown as HTMLElement | null;
    if (!node) return;
    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      node.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const nativeEvent = e.nativeEvent as unknown as TouchEvent;
      if (nativeEvent.touches.length === 2) {
        pinchRef.current = {
          startDistance: getTouchDistance(nativeEvent.touches as unknown as React.TouchList),
          startZoom: zoom,
        };
      }
    },
    [zoom],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const nativeEvent = e.nativeEvent as unknown as TouchEvent;
      if (nativeEvent.touches.length === 2 && pinchRef.current) {
        const currentDistance = getTouchDistance(nativeEvent.touches as unknown as React.TouchList);
        const scale = currentDistance / pinchRef.current.startDistance;
        setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchRef.current.startZoom * scale)));
      }
    },
    [setZoom],
  );

  const onTouchEnd = useCallback(() => {
    pinchRef.current = null;
  }, []);

  const gridUnit = BASE_GRID_UNIT * zoom;
  const nodeRadius = gridUnit;
  const boardWidth = (level.gridWidth + 1) * gridUnit;
  const boardHeight = (level.gridHeight + 1) * gridUnit;
  const viewportWidth = frameSize.width || windowSize.width;
  const viewportHeight = frameSize.height || windowSize.height;
  const overscrollX = viewportWidth / 2;
  const overscrollY = viewportHeight / 2;

  const activeNodes = level.graph.getActiveNodes();
  const activeEdges = level.graph.getActiveEdges();

  useEffect(() => {
    setDidPrimeScrollPosition(false);
  }, [level.id, viewportHeight, viewportWidth]);

  useEffect(() => {
    if (didPrimeScrollPosition || viewportWidth === 0 || viewportHeight === 0) {
      return;
    }

    const primeScroll = requestAnimationFrame(() => {
      horizontalScrollRef.current?.scrollTo({ x: overscrollX, animated: false });
      verticalScrollRef.current?.scrollTo({ y: overscrollY, animated: false });
      setDidPrimeScrollPosition(true);
    });

    return () => cancelAnimationFrame(primeScroll);
  }, [didPrimeScrollPosition, overscrollX, overscrollY, viewportHeight, viewportWidth]);

  useEffect(() => {
    const listener = removalAnimationValue.addListener(({ value }) => {
      setRemovalProgress(value);
    });

    return () => {
      removalAnimationValue.removeListener(listener);
    };
  }, [removalAnimationValue]);

  useEffect(() => {
    if (!removalEvent) {
      removalAnimationValue.setValue(1);
      setRemovalProgress(1);
      return;
    }

    removalAnimationValue.setValue(0);

    Animated.timing(removalAnimationValue, {
      toValue: 1,
      duration: 320,
      useNativeDriver: false,
    }).start();
  }, [removalAnimationValue, removalEvent]);

  const removalSourcePoint = removalEvent
    ? toBoardPoint(removalEvent.source, level.gridHeight, gridUnit)
    : null;
  const removalNeighborPoints = removalEvent?.neighbors.map((neighbor) => ({
    snapshot: neighbor,
    point: toBoardPoint(neighbor, level.gridHeight, gridUnit),
  }));

  const boardStyle = useMemo(
    () => [styles.board, { height: boardHeight, width: boardWidth }],
    [boardHeight, boardWidth],
  );

  return (
    <View
      ref={viewportRef}
      onLayout={(event) => {
        const { height, width } = event.nativeEvent.layout;

        setFrameSize((previousSize) =>
          previousSize.height === height && previousSize.width === width
            ? previousSize
            : { height, width },
        );
      }}
      onTouchStart={onTouchStart as unknown as View['props']['onTouchStart']}
      onTouchMove={onTouchMove as unknown as View['props']['onTouchMove']}
      onTouchEnd={onTouchEnd as unknown as View['props']['onTouchEnd']}
      style={styles.viewportFrame}
    >
      <ScrollView
        horizontal
        ref={horizontalScrollRef}
        contentContainerStyle={{ paddingHorizontal: overscrollX }}
        showsHorizontalScrollIndicator={false}
        style={styles.axisScroller}
      >
        <ScrollView
          ref={verticalScrollRef}
          contentContainerStyle={{ paddingVertical: overscrollY }}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={[styles.axisScroller, { width: boardWidth }]}
        >
          <View style={boardStyle}>
            <Svg height={boardHeight} pointerEvents="none" style={StyleSheet.absoluteFill} width={boardWidth}>
              {showGrid ? renderGrid(level, gridUnit) : null}
              {activeEdges.map((edge) => renderEdge(edge.from, edge.to, level.gridHeight, gridUnit, nodeRadius))}

              {removalEvent && removalSourcePoint ? (
                <G opacity={1 - removalProgress}>
                  {removalNeighborPoints?.map(({ snapshot, point }) =>
                    renderAnimatedEdge(
                      removalEvent.source,
                      snapshot,
                      removalSourcePoint,
                      point,
                      level.gridHeight,
                      gridUnit,
                      nodeRadius,
                      removalProgress,
                    ),
                  )}
                </G>
              ) : null}
            </Svg>

            {activeNodes.map((node) => {
              const point = toBoardPoint(node, level.gridHeight, gridUnit);

              return (
                <NodeToken
                  blockedEventToken={blockedEventToken}
                  blockedNodeId={blockedNodeId}
                  isInteractionLocked={isInteractionLocked}
                  key={node.id}
                  node={node}
                  onPress={onNodePress}
                  point={point}
                  radius={nodeRadius}
                />
              );
            })}

            {removalEvent && removalSourcePoint ? (
              <View
                pointerEvents="none"
                style={[
                  styles.removalGhost,
                  {
                    height: nodeRadius * 2,
                    left: removalSourcePoint.x - nodeRadius,
                    opacity: 1 - removalProgress,
                    top: removalSourcePoint.y - nodeRadius,
                    transform: [{ scale: 1 - removalProgress * 0.12 }],
                    width: nodeRadius * 2,
                  },
                ]}
              >
                <Text style={styles.nodeId}>{removalEvent.source.id}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

type NodeTokenProps = {
  blockedEventToken: number;
  blockedNodeId: number | null;
  isInteractionLocked: boolean;
  node: Node;
  onPress: (nodeId: number) => void;
  point: { x: number; y: number };
  radius: number;
};

function NodeToken({
  blockedEventToken,
  blockedNodeId,
  isInteractionLocked,
  node,
  onPress,
  point,
  radius,
}: NodeTokenProps) {
  const shake = useRef(new Animated.Value(0)).current;
  const isReady = node.inDegree === 0;

  useEffect(() => {
    if (blockedNodeId !== node.id || blockedEventToken === 0) {
      return;
    }

    shake.setValue(0);

    Animated.sequence([
      Animated.timing(shake, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [blockedEventToken, blockedNodeId, node.id, shake]);

  return (
    <Animated.View
      style={[
        styles.nodeWrapper,
        {
          height: radius * 2,
          left: point.x - radius,
          top: point.y - radius,
          transform: [{ translateX: shake }],
          width: radius * 2,
        },
      ]}
    >
      <Pressable
        disabled={isInteractionLocked}
        onPress={() => onPress(node.id)}
        style={({ pressed }) => [
          styles.node,
          isReady ? styles.nodeReady : styles.nodeBlocked,
          pressed && !isInteractionLocked ? styles.nodePressed : null,
        ]}
      >
        <Text style={styles.nodeId}>{node.id}</Text>
        <Text style={styles.nodeDegree}>in {node.inDegree}</Text>
      </Pressable>
    </Animated.View>
  );
}

function renderGrid(level: Level, gridUnit: number) {
  const dots: ReactElement[] = [];

  for (let x = 0; x < level.gridWidth; x += 1) {
    for (let y = 0; y < level.gridHeight; y += 1) {
      const point = toBoardPoint({ id: -1, x, y }, level.gridHeight, gridUnit);

      dots.push(
        <SvgCircle
          cx={point.x}
          cy={point.y}
          fill={palette.border}
          key={`dot-${x}-${y}`}
          opacity={0.75}
          r={3.5}
        />,
      );
    }
  }

  return dots;
}

function renderEdge(from: Node, to: Node, gridHeight: number, gridUnit: number, nodeRadius: number) {
  const start = toBoardPoint(from, gridHeight, gridUnit);
  const end = toBoardPoint(to, gridHeight, gridUnit);
  const vector = edgeVector(start, end, nodeRadius);

  return (
    <G key={`edge-${from.id}-${to.id}`}>
      <Line
        stroke="#000000"
        strokeLinecap="round"
        strokeWidth={4}
        x1={vector.lineStart.x}
        x2={vector.lineEnd.x}
        y1={vector.lineStart.y}
        y2={vector.lineEnd.y}
      />
      <Polygon fill="#000000" points={vector.arrowPoints} />
    </G>
  );
}

function renderAnimatedEdge(
  from: NodeSnapshot,
  to: NodeSnapshot,
  fromPoint: { x: number; y: number },
  toPoint: { x: number; y: number },
  gridHeight: number,
  gridUnit: number,
  nodeRadius: number,
  progress: number,
) {
  const baseVector = edgeVector(fromPoint, toPoint, nodeRadius);
  const animatedEnd = {
    x: lerp(baseVector.lineEnd.x, baseVector.lineStart.x, progress),
    y: lerp(baseVector.lineEnd.y, baseVector.lineStart.y, progress),
  };
  const tip = {
    x: lerp(toBoardPoint(to, gridHeight, gridUnit).x, baseVector.lineStart.x, progress),
    y: lerp(toBoardPoint(to, gridHeight, gridUnit).y, baseVector.lineStart.y, progress),
  };
  const animatedVector = edgeVector(fromPoint, tip, Math.max(nodeRadius * (1 - progress), 2));

  return (
    <G key={`removal-edge-${from.id}-${to.id}`} opacity={1 - progress * 0.5}>
      <Line
        stroke={palette.secondary}
        strokeLinecap="round"
        strokeWidth={4}
        x1={baseVector.lineStart.x}
        x2={animatedEnd.x}
        y1={baseVector.lineStart.y}
        y2={animatedEnd.y}
      />
      <Polygon fill={palette.secondary} points={animatedVector.arrowPoints} />
    </G>
  );
}

function edgeVector(start: { x: number; y: number }, end: { x: number; y: number }, nodeRadius: number) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const unitX = dx / length;
  const unitY = dy / length;
  const arrowSize = Math.max(10, nodeRadius * 0.22);
  const lineStart = {
    x: start.x + unitX * nodeRadius,
    y: start.y + unitY * nodeRadius,
  };
  const lineEnd = {
    x: end.x - unitX * (nodeRadius + arrowSize * 0.1),
    y: end.y - unitY * (nodeRadius + arrowSize * 0.1),
  };
  const arrowBase = {
    x: lineEnd.x - unitX * arrowSize,
    y: lineEnd.y - unitY * arrowSize,
  };
  const leftPoint = {
    x: arrowBase.x - unitY * arrowSize * 0.55,
    y: arrowBase.y + unitX * arrowSize * 0.55,
  };
  const rightPoint = {
    x: arrowBase.x + unitY * arrowSize * 0.55,
    y: arrowBase.y - unitX * arrowSize * 0.55,
  };

  return {
    arrowPoints: `${lineEnd.x},${lineEnd.y} ${leftPoint.x},${leftPoint.y} ${rightPoint.x},${rightPoint.y}`,
    lineEnd,
    lineStart,
  };
}

function toBoardPoint(node: NodeSnapshot | Node, gridHeight: number, gridUnit: number) {
  return {
    x: gridUnit + node.x * gridUnit,
    y: gridUnit + (gridHeight - 1 - node.y) * gridUnit,
  };
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

const styles = StyleSheet.create({
  axisScroller: {
    flex: 1,
  },
  board: {
    backgroundColor: palette.canvas,
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  node: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 3,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.sm,
  },
  nodeBlocked: {
    backgroundColor: '#f5ddd0',
    borderColor: '#000000',
  },
  nodeDegree: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  nodeId: {
    color: palette.text,
    fontSize: typography.headingSize,
    fontWeight: '800',
  },
  nodePressed: {
    opacity: 0.82,
  },
  nodeReady: {
    backgroundColor: '#cde8d7',
    borderColor: '#000000',
  },
  nodeWrapper: {
    position: 'absolute',
  },
  removalGhost: {
    alignItems: 'center',
    backgroundColor: '#efe6d8',
    borderColor: palette.secondary,
    borderRadius: 999,
    borderWidth: 3,
    justifyContent: 'center',
    position: 'absolute',
  },
  viewportFrame: {
    backgroundColor: '#ffffff',
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    flex: 1,
    minHeight: 360,
    overflow: 'hidden',
  },
});
