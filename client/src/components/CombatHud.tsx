import { useState } from "react";

import type { CombatAlly, CombatNpc, CombatState, GameState, WeaponDefinition } from "../lib/api.js";

interface CombatHudProps {
  combatState: CombatState;
  playerCharacter: GameState["playerCharacter"];
  weaponCatalog: WeaponDefinition[];
  inventory: GameState["inventory"];
  onEquipWeapon: (weaponId: string) => void;
  onAttack: (targetNpcId: string) => void;
  onResetArena?: () => void;
  lastMessage: string | null;
}

function HpBar({ current, max, label }: { current: number; max: number; label: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const color = pct > 50 ? "#4caf50" : pct > 25 ? "#ff9800" : "#f44336";

  return (
    <div className="combat-hp-row">
      <span className="combat-hp-label">{label}</span>
      <div className="combat-hp-track">
        <div className="combat-hp-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="combat-hp-value">{current}/{max}</span>
    </div>
  );
}

export function CombatHud({
  combatState,
  playerCharacter,
  weaponCatalog,
  inventory,
  onEquipWeapon,
  onAttack,
  onResetArena,
  lastMessage
}: CombatHudProps) {
  const [showWeaponPicker, setShowWeaponPicker] = useState(false);
  const [targetNpcId, setTargetNpcId] = useState<string | null>(null);

  const isPlayerTurn = combatState.activeTurn === "player";
  const isVictory = combatState.activeTurn === "victory";
  const equippedWeapon = weaponCatalog.find((w) => w.id === playerCharacter.equippedWeaponId) ?? null;
  const livingNpcs = combatState.npcs.filter((n) => !n.dead);

  const ownedWeapons = inventory
    .map((item) => weaponCatalog.find((w) => w.id === item.id))
    .filter((w): w is WeaponDefinition => w !== undefined);

  function handleAttackClick() {
    if (livingNpcs.length === 1) {
      onAttack(livingNpcs[0]!.id);
    } else if (targetNpcId) {
      onAttack(targetNpcId);
      setTargetNpcId(null);
    } else {
      // Cycle to first valid target
      setTargetNpcId(livingNpcs[0]?.id ?? null);
    }
  }

  function ammoCount(weapon: WeaponDefinition | null): number | null {
    if (!weapon?.ammoType) return null;
    return inventory.find((i) => i.id === weapon.ammoType)?.quantity ?? 0;
  }

  const ammo = ammoCount(equippedWeapon);

  return (
    <div className="combat-hud">
      <div className="combat-hud-header">
        <span className="combat-hud-title">
          {isVictory ? "VICTORY" : isPlayerTurn ? "YOUR TURN" : "ENEMY TURN"}
        </span>
        <span className="combat-hud-turn">Turn {combatState.turnNumber}</span>
      </div>

      <div className="combat-hp-list">
        <HpBar
          label={playerCharacter.name}
          current={playerCharacter.hp}
          max={playerCharacter.maxHp}
        />
        {combatState.allies.filter((a: CombatAlly) => !a.dead).map((ally: CombatAlly) => (
          <HpBar
            key={ally.id}
            label={`${ally.name} ${ally.weapon ? `[${ally.weapon}]` : "[Unarmed]"}`}
            current={ally.hp}
            max={ally.maxHp}
          />
        ))}
        {combatState.npcs.map((npc: CombatNpc) => (
          <HpBar
            key={npc.id}
            label={npc.dead ? `${npc.name} (dead)` : npc.name}
            current={npc.hp}
            max={npc.maxHp}
          />
        ))}
      </div>

      <div className="combat-weapon-row">
        <span className="combat-weapon-label">
          {equippedWeapon ? equippedWeapon.name : "No weapon equipped"}
          {ammo !== null && ` — ${ammo} ammo`}
        </span>
        <button
          className="ghost-button combat-change-weapon"
          type="button"
          onClick={() => setShowWeaponPicker((prev) => !prev)}
        >
          Change
        </button>
      </div>

      {showWeaponPicker && (
        <div className="combat-weapon-picker">
          {ownedWeapons.length === 0 && (
            <p className="combat-no-weapons">No weapons in inventory.</p>
          )}
          {ownedWeapons.map((w) => (
            <button
              key={w.id}
              className={`ghost-button combat-weapon-option${playerCharacter.equippedWeaponId === w.id ? " is-equipped" : ""}`}
              type="button"
              onClick={() => {
                onEquipWeapon(w.id);
                setShowWeaponPicker(false);
              }}
            >
              {w.name} ({w.damage} dmg, range {w.range})
            </button>
          ))}
        </div>
      )}

      {livingNpcs.length > 1 && isPlayerTurn && equippedWeapon && (
        <div className="combat-target-row">
          <span className="combat-target-label">Target:</span>
          {livingNpcs.map((npc) => (
            <button
              key={npc.id}
              className={`ghost-button combat-target-option${targetNpcId === npc.id ? " is-selected" : ""}`}
              type="button"
              onClick={() => setTargetNpcId(npc.id)}
            >
              {npc.name}
            </button>
          ))}
        </div>
      )}

      {!isVictory && (
        <button
          className="combat-attack-button"
          type="button"
          disabled={!isPlayerTurn || !equippedWeapon || livingNpcs.length === 0 || (livingNpcs.length > 1 && !targetNpcId)}
          onClick={handleAttackClick}
        >
          Attack
        </button>
      )}

      {isVictory && onResetArena && (
        <button
          className="ghost-button combat-reset-arena"
          type="button"
          onClick={onResetArena}
        >
          Revive opponents
        </button>
      )}

      {lastMessage && (
        <div className="combat-message">{lastMessage}</div>
      )}
    </div>
  );
}
