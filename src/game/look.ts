// 저장된 외형(look)을 실제로 그릴 텍스처·크기·무기 위치로 바꾼다.
// look.char가 있고 chars 시트에 해당 프레임이 있으면 커스텀 캐릭터, 아니면 기존 Kenney 프레임.
import type Phaser from 'phaser';
import { CLASSES } from '../data/classes';
import { CHAR_BY_ID, CHAR_SHEET, CHAR_SCALE, CHAR_ORIGIN_Y, CHAR_HAND, CHAR_H } from '../data/chars';

export interface Look { frame: number; tint: number; char?: string }
export interface Body { tex: string; frame: number; scale: number; originY: number; tint: number; weapon: boolean; hand: { x: number; y: number }; height: number }

export function hasCharFrame(scene: Phaser.Scene, frame: number) {
  return scene.textures.exists(CHAR_SHEET) && scene.textures.get(CHAR_SHEET).has(frame as any);
}

export function resolveBody(scene: Phaser.Scene, look: Look | undefined, classId: string): Body {
  const d = look?.char ? CHAR_BY_ID[look.char] : undefined;
  if (d && hasCharFrame(scene, d.frame)) {
    return { tex: CHAR_SHEET, frame: d.frame, scale: CHAR_SCALE, originY: CHAR_ORIGIN_Y, tint: 0xffffff, weapon: d.weapon !== false, hand: CHAR_HAND, height: CHAR_H * CHAR_SCALE };
  }
  return { tex: 'dun', frame: look?.frame ?? CLASSES[classId]?.spr.frame ?? 96, scale: 3, originY: 0.86, tint: look?.tint ?? 0xffffff, weapon: true, hand: { x: 10, y: -18 }, height: 48 };
}
