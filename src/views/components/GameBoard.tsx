import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  Animated,
  Platform,
  Pressable,
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
const TAP_DISTANCE_THRESHOLD = 8;

function getDistance(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x2 - x1, y2 - y1);
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
  const viewportRef = useRef<View>(null);
  const [frameSize, setFrameSize] = useState({ height: 0, width: 0 });
  const [removalProgress, setRemovalProgress] = useState(1);
  const removalAnimationValue = useRef(new Animated.Value(1)).current;

  // Pan/scroll offset (translation applied to the board)
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });

  // Gesture tracking refs
  const panRef = useRef<{ startPageX: number; startPageY: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const pinchRef = useRef<{
    startDistance: number;
    startZoom: number;
    focalX: number;
    focalY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);
  const wasPinchingRef = useRef(false);
  const viewportLayoutRef = useRef({ x: 0, y: 0 });

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

  const clampOffset = useCallback(
    (x: number, y: number, z: number) => {
      const gu = BASE_GRID_UNIT * z;
      const bw = (level.gridWidth + 1) * gu;
      const bh = (level.gridHeight + 1) * gu;
      const minX = Math.min(0, viewportWidth - bw - overscrollX);
      const maxX = overscrollX;
      const minY = Math.min(0, viewportHeight - bh - overscrollY);
      const maxY = overscrollY;
      return {
        x: Math.min(maxX, Math.max(minX, x)),
        y: Math.min(maxY, Math.max(minY, y)),
      };
    },
    [level.gridWidth, level.gridHeight, viewportWidth, viewportHeight, overscrollX, overscrollY],
  );

  // Reset offset when level or viewport changes
  useEffect(() => {
    if (viewportWidth === 0 || viewportHeight === 0) return;
    const initial = clampOffset(0, 0, zoom);
    offsetRef.current = initial;
    setOffset(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.id, viewportWidth, viewportHeight]);

  // --- Touch handlers (pan + pinch) ---
  const onTouchStart = useCallback(
    (e: any) => {
      const touches = e.nativeEvent.touches ?? e.nativeEvent.changedTouches;
      if (!touches) return;

      if (touches.length === 2) {
        const dist = getDistance(touches[0].pageX, touches[0].pageY, touches[1].pageX, touches[1].pageY);
        const focalX = (touches[0].pageX + touches[1].pageX) / 2 - viewportLayoutRef.current.x;
        const focalY = (touches[0].pageY + touches[1].pageY) / 2 - viewportLayoutRef.current.y;
        pinchRef.current = {
          startDistance: dist,
          startZoom: zoom,
          focalX,
          focalY,
          startOffsetX: offsetRef.current.x,
          startOffsetY: offsetRef.current.y,
        };
        panRef.current = null;
        wasPinchingRef.current = true;
      } else if (touches.length === 1) {
        panRef.current = {
          startPageX: touches[0].pageX,
          startPageY: touches[0].pageY,
          startOffsetX: offsetRef.current.x,
          startOffsetY: offsetRef.current.y,
        };
        wasPinchingRef.current = false;
      }
    },
    [zoom],
  );

  const onTouchMove = useCallback(
    (e: any) => {
      const touches = e.nativeEvent.touches ?? e.nativeEvent.changedTouches;
      if (!touches) return;

      if (touches.length === 2 && pinchRef.current) {
        const dist = getDistance(touches[0].pageX, touches[0].pageY, touches[1].pageX, touches[1].pageY);
        const scale = dist / pinchRef.current.startDistance;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchRef.current.startZoom * scale));
        const s = newZoom / pinchRef.current.startZoom;
        const boardX = pinchRef.current.focalX - pinchRef.current.startOffsetX;
        const boardY = pinchRef.current.focalY - pinchRef.current.startOffsetY;
        const newOffsetX = pinchRef.current.focalX - boardX * s;
        const newOffsetY = pinchRef.current.focalY - boardY * s;
        const clamped = clampOffset(newOffsetX, newOffsetY, newZoom);
        offsetRef.current = clamped;
        setOffset(clamped);
        setZoom(newZoom);
      } else if (touches.length === 1 && panRef.current && !wasPinchingRef.current) {
        const dx = touches[0].pageX - panRef.current.startPageX;
        const dy = touches[0].pageY - panRef.current.startPageY;
        const clamped = clampOffset(panRef.current.startOffsetX + dx, panRef.current.startOffsetY + dy, zoom);
        offsetRef.current = clamped;
        setOffset(clamped);
      }
    },
    [zoom, setZoom, clampOffset],
  );

  const onTouchEnd = useCallback(() => {
    pinchRef.current = null;
    panRef.current = null;
  }, []);

  // --- Mouse handlers for web (drag to pan, wheel to scroll, ctrl+wheel to zoom) ---
  const mouseDragRef = useRef<{ startPageX: number; startPageY: number; startOffsetX: number; startOffsetY: number } | null>(null);

  const onMouseDown = useCallback((e: any) => {
    // Only left-click
    if (e.button !== undefined && e.button !== 0) return;
    mouseDragRef.current = {
      startPageX: e.pageX ?? e.nativeEvent?.pageX,
      startPageY: e.pageY ?? e.nativeEvent?.pageY,
      startOffsetX: offsetRef.current.x,
      startOffsetY: offsetRef.current.y,
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = viewportRef.current as unknown as HTMLElement | null;
    if (!node) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseDragRef.current) return;
      const dx = e.pageX - mouseDragRef.current.startPageX;
      const dy = e.pageY - mouseDragRef.current.startPageY;

      // Only start dragging after passing tap threshold to avoid eating node clicks
      if (Math.abs(dx) < TAP_DISTANCE_THRESHOLD && Math.abs(dy) < TAP_DISTANCE_THRESHOLD) return;

      const clamped = clampOffset(mouseDragRef.current.startOffsetX + dx, mouseDragRef.current.startOffsetY + dy, zoom);
      offsetRef.current = clamped;
      setOffset(clamped);
    };

    const handleMouseUp = () => {
      mouseDragRef.current = null;
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = node.getBoundingClientRect();
        const focalX = e.clientX - rect.left;
        const focalY = e.clientY - rect.top;
        const delta = -e.deltaY * 0.001;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));
        const s = newZoom / zoom;
        const boardX = focalX - offsetRef.current.x;
        const boardY = focalY - offsetRef.current.y;
        const newOffsetX = focalX - boardX * s;
        const newOffsetY = focalY - boardY * s;
        const clamped = clampOffset(newOffsetX, newOffsetY, newZoom);
        offsetRef.current = clamped;
        setOffset(clamped);
        setZoom(newZoom);
      } else {
        // Regular wheel scrolls the board
        const clamped = clampOffset(offsetRef.current.x - e.deltaX, offsetRef.current.y - e.deltaY, zoom);
        offsetRef.current = clamped;
        setOffset(clamped);
      }
    };

    node.addEventListener('mousemove', handleMouseMove);
    node.addEventListener('mouseup', handleMouseUp);
    node.addEventListener('mouseleave', handleMouseUp);
    node.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      node.removeEventListener('mousemove', handleMouseMove);
      node.removeEventListener('mouseup', handleMouseUp);
      node.removeEventListener('mouseleave', handleMouseUp);
      node.removeEventListener('wheel', handleWheel);
    };
  }, [zoom, setZoom, clampOffset]);

  // --- Removal animation ---
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
    () => [
      styles.board,
      {
        height: boardHeight,
        width: boardWidth,
        transform: [{ translateX: offset.x }, { translateY: offset.y }],
      },
    ],
    [boardHeight, boardWidth, offset.x, offset.y],
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
        (viewportRef.current as any)?.measureInWindow?.((x: number, y: number) => {
          viewportLayoutRef.current = { x: x ?? 0, y: y ?? 0 };
        });
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      {...(Platform.OS === 'web' ? { onMouseDown } : {})}
      style={styles.viewportFrame}
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
    lineEnd: arrowBase,
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
  board: {
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
    borderColor: '#000000',
  },
  nodeWrapper: {
    position: 'absolute',
  },
  removalGhost: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: palette.secondary,
    borderRadius: 999,
    borderWidth: 3,
    justifyContent: 'center',
    position: 'absolute',
  },
  viewportFrame: {
    backgroundColor: '#ffffff',
    flex: 1,
    minHeight: 360,
    overflow: 'hidden',
  },
});
