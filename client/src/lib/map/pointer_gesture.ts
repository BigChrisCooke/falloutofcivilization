import type { WorldPoint } from "./types.js";

export const DRAG_THRESHOLD = 4;

export interface MapPointerGesture {
  active: boolean;
  moved: boolean;
  pointerX: number;
  pointerY: number;
  worldX: number;
  worldY: number;
}

export function createPointerGesture(): MapPointerGesture {
  return {
    active: false,
    moved: false,
    pointerX: 0,
    pointerY: 0,
    worldX: 0,
    worldY: 0
  };
}

export function startPointerGesture(pointer: WorldPoint, worldPosition: WorldPoint): MapPointerGesture {
  return {
    active: true,
    moved: false,
    pointerX: pointer.x,
    pointerY: pointer.y,
    worldX: worldPosition.x,
    worldY: worldPosition.y
  };
}

export function updatePointerGesture(gesture: MapPointerGesture, pointer: WorldPoint): MapPointerGesture {
  if (!gesture.active) {
    return gesture;
  }

  const deltaX = pointer.x - gesture.pointerX;
  const deltaY = pointer.y - gesture.pointerY;
  const moved = gesture.moved || Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD;

  return {
    ...gesture,
    moved
  };
}

export function getDraggedWorldPosition(gesture: MapPointerGesture, pointer: WorldPoint): WorldPoint {
  return {
    x: gesture.worldX + (pointer.x - gesture.pointerX),
    y: gesture.worldY + (pointer.y - gesture.pointerY)
  };
}

export function clearPointerGesture(): MapPointerGesture {
  return createPointerGesture();
}
