import { useState } from "react";

import type { GameState } from "../lib/api.js";

interface PlayerPanelProps {
  state: GameState;
  onClose: () => void;
}

type Tab = "special" | "inventory";

const SPECIAL_LABELS: Record<string, string> = {
  str: "Strength",
  per: "Perception",
  end: "Endurance",
  cha: "Charisma",
  int: "Intelligence",
  agl: "Agility",
  lck: "Luck"
};

export function PlayerPanel({ state, onClose }: PlayerPanelProps) {
  const [tab, setTab] = useState<Tab>("special");
  const [selectedItem, setSelectedItem] = useState<GameState["inventory"][number] | null>(null);
  const special = state.playerCharacter.special;
  const inventory = state.inventory;

  return (
    <div className="interaction-panel player-panel">
      <div className="interaction-panel-header">
        <span className="eyebrow">{state.playerCharacter.name}</span>
        <button className="ghost-button interaction-close" type="button" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="player-panel-tabs">
        <button
          className={`ghost-button player-panel-tab${tab === "special" ? " is-active" : ""}`}
          type="button"
          onClick={() => setTab("special")}
        >
          S.P.E.C.I.A.L.
        </button>
        <button
          className={`ghost-button player-panel-tab${tab === "inventory" ? " is-active" : ""}`}
          type="button"
          onClick={() => setTab("inventory")}
        >
          Inventory
        </button>
      </div>

      {tab === "special" && (
        <div style={{ marginTop: "0.5rem" }}>
          {special ? (
            Object.entries(special).map(([key, value]) => (
              <div key={key} className="special-display-row">
                <span>{SPECIAL_LABELS[key] ?? key}</span>
                <span className="special-display-value">{value}</span>
              </div>
            ))
          ) : (
            <p className="subtle">Character creation incomplete.</p>
          )}
        </div>
      )}

      {tab === "inventory" && (
        <div style={{ marginTop: "0.5rem" }}>
          {inventory.length === 0 ? (
            <p className="subtle">Your pockets are empty, stranger.</p>
          ) : (
            inventory.map((item) => (
              <div
                key={item.id}
                className={`inventory-item clickable${item.ownedBy ? " is-stolen" : ""}`}
                onClick={() => setSelectedItem(item)}
              >
                <span>{item.label}{item.quantity > 1 ? ` (${item.quantity})` : ""}</span>
                {item.ownedBy ? <span className="subtle" style={{ fontSize: "0.75rem" }}>stolen</span> : null}
              </div>
            ))
          )}
        </div>
      )}
      {selectedItem && (
        <div className="item-detail-popup" onClick={() => setSelectedItem(null)}>
          <div className="item-detail-card" onClick={(e) => e.stopPropagation()}>
            <div className="item-detail-header">
              <h3>{selectedItem.label}</h3>
              <button className="ghost-button interaction-close" type="button" onClick={() => setSelectedItem(null)}>×</button>
            </div>
            {selectedItem.description && <p className="item-detail-desc">{selectedItem.description}</p>}
            {selectedItem.quantity > 1 && <p className="subtle">Quantity: {selectedItem.quantity}</p>}
            {selectedItem.ownedBy && <p className="stolen-tag">Stolen property</p>}
          </div>
        </div>
      )}
    </div>
  );
}
