import { useState } from "react";

import type { GameState } from "../lib/api.js";
import { getSpecialDescription } from "../lib/item_descriptions.js";
import { SKILL_DEFINITIONS } from "../../../game/src/skills.js";

type PipBoyTab = "stats" | "quests" | "companions" | "inventory" | "map" | "factions";

interface PipBoyOverlayProps {
  state: GameState;
  onClose: () => void;
  selectedQuestId: string | null;
  onSelectQuest: (questId: string | null) => void;
  highlightedLocationId: string | null;
  onHighlightLocation: (locationId: string | null) => void;
}

const WEAPON_CATEGORY_LABELS: Record<string, string> = {
  small_guns: "Small Guns",
  big_guns: "Big Guns",
  energy_weapons: "Energy Weapons",
  melee_weapons: "Melee Weapons",
  throwing: "Throwing"
};

const SPECIAL_LABELS: Record<string, string> = {
  str: "Strength",
  per: "Perception",
  end: "Endurance",
  cha: "Charisma",
  int: "Intelligence",
  agl: "Agility",
  lck: "Luck"
};

function karmaLabel(karma: number): string {
  if (karma >= 20) return "Saint";
  if (karma >= 10) return "Good Samaritan";
  if (karma >= 1) return "Decent";
  if (karma === 0) return "Neutral";
  if (karma >= -9) return "Shady";
  if (karma >= -19) return "Villain";
  return "Demon";
}

export function PipBoyOverlay({ state, onClose, selectedQuestId, onSelectQuest, highlightedLocationId, onHighlightLocation }: PipBoyOverlayProps) {
  const [tab, setTab] = useState<PipBoyTab>("stats");
  const [selectedItem, setSelectedItem] = useState<GameState["inventory"][number] | null>(null);
  const special = state.playerCharacter.special;
  const karma = state.playerCharacter.karma;
  const quests = state.questState;
  const factions = Object.entries(state.factionStanding);

  const hasCompanions = state.companions.length > 0;
  const tabs: { key: PipBoyTab; label: string }[] = [
    { key: "stats", label: "Stats" },
    { key: "quests", label: "Quests" },
    ...(hasCompanions ? [{ key: "companions" as const, label: "Companions" }] : []),
    { key: "inventory", label: "Items" },
    { key: "map", label: "Map" },
    { key: "factions", label: "Factions" }
  ];

  return (
    <section className="pipboy-backdrop" onClick={onClose}>
      <article className="pipboy-card" onClick={(e) => e.stopPropagation()}>
        <div className="pipboy-header">
          <h2 className="pipboy-title">Pip-Boy 3000</h2>
          <button className="ghost-button interaction-close" type="button" onClick={onClose}>×</button>
        </div>

        <nav className="pipboy-tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`ghost-button pipboy-tab${tab === t.key ? " is-active" : ""}`}
              type="button"
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="pipboy-body">
          {tab === "stats" && (
            <div className="pipboy-stats">
              <div className="pipboy-section">
                <h3>S.P.E.C.I.A.L.</h3>
                {special ? (
                  <div className="special-grid">
                    {Object.entries(special).map(([key, value]) => (
                      <div key={key} className="special-display-row">
                        <span>{SPECIAL_LABELS[key] ?? key}</span>
                        <span className="special-display-value">{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="subtle">Character creation incomplete.</p>
                )}
              </div>
              <div className="pipboy-section">
                <h3>Karma</h3>
                <div className="karma-display">
                  <span className={`karma-value${karma >= 0 ? " karma-good" : " karma-bad"}`}>{karma}</span>
                  <span className="karma-label">{karmaLabel(karma)}</span>
                </div>
              </div>
              <div className="pipboy-section">
                <h3>Character</h3>
                <p>{state.playerCharacter.name} &middot; Level {state.playerCharacter.level} &middot; {state.playerCharacter.archetype}</p>
                <div className="xp-display">
                  <span className="xp-label">XP</span>
                  <div className="xp-bar-track">
                    <div className="xp-bar-fill" style={{ width: `${state.playerCharacter.xp % 100}%` }} />
                  </div>
                  <span className="xp-value">{state.playerCharacter.xp % 100}/100</span>
                </div>
              </div>
              {state.playerCharacter.skills && (
                <div className="pipboy-section">
                  <h3>
                    Skills
                    {state.playerCharacter.skills.unspentPoints > 0 && (
                      <span className="skill-points-badge">{state.playerCharacter.skills.unspentPoints} pts</span>
                    )}
                  </h3>
                  {(["combat", "active", "passive"] as const).map((category) => {
                    const catSkills = SKILL_DEFINITIONS.filter((s) => s.category === category);
                    const catLabel = category === "combat" ? "Combat" : category === "active" ? "Active" : "Passive";
                    return (
                      <div key={category} className="pipboy-skill-category">
                        <h4 className="pipboy-skill-cat-title">{catLabel}</h4>
                        {catSkills.map((def) => {
                          const value = state.playerCharacter.skills!.values[def.id] ?? 0;
                          const isTagged = state.playerCharacter.skills!.tagged.includes(def.id);
                          return (
                            <div key={def.id} className="pipboy-skill-row">
                              <span className="pipboy-skill-name">
                                {def.name}
                                {isTagged && <span className="skill-tagged-badge">{"\u2605"}</span>}
                              </span>
                              <span className="pipboy-skill-value">{value}%</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "quests" && (
            <div className="pipboy-quests">
              {quests.definitions.length === 0 && quests.active.length === 0 ? (
                <p className="subtle">No quests yet. Talk to people.</p>
              ) : (
                <>
                  {quests.definitions.filter((q) => quests.active.includes(q.id)).map((quest) => (
                    <div
                      key={quest.id}
                      className={`quest-entry clickable${selectedQuestId === quest.id ? " is-selected" : ""}`}
                      onClick={() => onSelectQuest(selectedQuestId === quest.id ? null : quest.id)}
                    >
                      <h4 className="quest-name">{quest.name}{selectedQuestId === quest.id ? " *" : ""}</h4>
                      <p className="quest-desc">{quest.description}</p>
                      {quest.objectives.length > 0 && (
                        <ul className="quest-objectives">
                          {quest.objectives.map((obj) => (
                            <li key={obj.id} className={`quest-objective${obj.completed ? " objective-completed" : " objective-active"}`}>
                              <span className="quest-objective-icon">{obj.completed ? "\u2714" : "\u25CB"}</span>
                              <span>{obj.description}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {quest.activeMapMarker && !quest.objectives.some(o => o.description === quest.activeMapMarker?.label) && (
                        <p className="quest-marker-label">
                          <span className="quest-marker-icon">&#9670;</span>
                          {quest.activeMapMarker.label}
                        </p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === "companions" && (
            <div className="pipboy-companions">
              {state.companions.map((companion) => (
                <div key={companion.companionId} className="companion-entry">
                  <div className="companion-header">
                    <span className="companion-portrait">&#9632;</span>
                    <div>
                      <h4 className="companion-name">{companion.name}</h4>
                      <span className="subtle">{companion.storyStageTitle ?? `Stage ${companion.storyStage + 1}`}</span>
                    </div>
                  </div>
                  <div className="companion-loyalty">
                    <span className="loyalty-label">Loyalty</span>
                    <div className="loyalty-bar-track">
                      <div
                        className={`loyalty-bar-fill${companion.loyalty < 20 ? " loyalty-low" : ""}`}
                        style={{ width: `${companion.loyalty}%` }}
                      />
                    </div>
                    <span className="loyalty-value">{companion.loyalty}/100</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "inventory" && (
            <div className="pipboy-inventory">
              {state.inventory.length === 0 ? (
                <p className="subtle">Your pockets are empty, stranger.</p>
              ) : (
                state.inventory.map((item) => (
                  <div
                    key={item.id}
                    className={`inventory-item clickable${item.ownedBy ? " is-stolen" : ""}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <span>{item.label}{item.quantity > 1 ? ` (${item.quantity})` : ""}</span>
                    {item.ownedBy ? <span className="stolen-tag">stolen</span> : null}
                  </div>
                ))
              )}
            </div>
          )}

          {selectedItem && (() => {
            const specialDesc = getSpecialDescription(selectedItem.id, special);
            const displayDesc = specialDesc ?? selectedItem.description;
            const weaponInfo = state.weaponCatalog?.find((w) => w.id === selectedItem.id);
            return (
              <div className="item-detail-popup" onClick={() => setSelectedItem(null)}>
                <div className="item-detail-card" onClick={(e) => e.stopPropagation()}>
                  <div className="item-detail-header">
                    <h3>{selectedItem.label}</h3>
                    <button className="ghost-button interaction-close" type="button" onClick={() => setSelectedItem(null)}>×</button>
                  </div>
                  {displayDesc && <p className="item-detail-desc">{displayDesc}</p>}
                  {weaponInfo && (
                    <div className="weapon-stats">
                      <p><strong>DMG</strong> {weaponInfo.damage} <span className="subtle">({weaponInfo.damageType})</span></p>
                      <p><strong>Type</strong> {WEAPON_CATEGORY_LABELS[weaponInfo.category] ?? weaponInfo.category}</p>
                      <p><strong>Weight</strong> {weaponInfo.weight} lbs</p>
                      <p><strong>Value</strong> {weaponInfo.value} caps</p>
                      <p><strong>Rarity</strong> {weaponInfo.rarity}</p>
                    </div>
                  )}
                  {selectedItem.quantity > 1 && <p className="subtle">Quantity: {selectedItem.quantity}</p>}
                  {selectedItem.ownedBy && <p className="stolen-tag">Stolen property</p>}
                </div>
              </div>
            );
          })()}

          {tab === "map" && (
            <div className="pipboy-map">
              {state.overworldMap ? (
                <>
                  <h3>{state.overworldMap.name}</h3>
                  {(() => {
                    const selectedQuest = selectedQuestId
                      ? quests.definitions.find((q) => q.id === selectedQuestId)
                      : null;
                    const selectedQuestMarkerLocId = selectedQuest?.activeMapMarker?.locationId ?? null;
                    const questMarkerLocIds = new Set(
                      quests.definitions
                        .filter((q) => quests.active.includes(q.id) && q.activeMapMarker)
                        .map((q) => q.activeMapMarker!.locationId)
                    );
                    const questMarkerPositions = new Set(
                      state.locations
                        .filter((l) => l.discovered && questMarkerLocIds.has(l.id))
                        .map((l) => `${l.position.x},${l.position.y}`)
                    );
                    const selectedQuestPosition = selectedQuestMarkerLocId
                      ? state.locations.find((l) => l.id === selectedQuestMarkerLocId && l.discovered)
                      : null;
                    const selectedQuestKey = selectedQuestPosition
                      ? `${selectedQuestPosition.position.x},${selectedQuestPosition.position.y}`
                      : null;

                    return (
                      <div className="minimap-grid" style={{
                        gridTemplateColumns: `repeat(${state.overworldMap.width}, 1fr)`
                      }}>
                        {state.overworldMap.layout.flatMap((row, y) =>
                          row.map((tile, x) => {
                            const key = `${x},${y}`;
                            const discovered = state.mapDiscovery.discoveredTileKeys.includes(key);
                            const isPlayer = state.worldState.player_x === x && state.worldState.player_y === y;
                            const location = state.locations.find((l) => l.position.x === x && l.position.y === y && l.discovered);
                            const isQuestTarget = questMarkerPositions.has(key);
                            const isSelectedObjective = selectedQuestKey === key;
                            const isHighlightedLocation = highlightedLocationId && location?.id === highlightedLocationId;
                            const isCurrentLocation = isPlayer && !!location;
                            return (
                              <div
                                key={key}
                                className={`minimap-cell${discovered ? ` tile-${tile}` : " tile-fog"}${isPlayer ? " is-player" : ""}${location ? " has-location" : ""}${isQuestTarget ? " has-quest-marker" : ""}${isSelectedObjective ? " is-selected-objective" : ""}${isHighlightedLocation ? " is-highlighted-location" : ""}${isCurrentLocation ? " is-current-location" : ""}`}
                                title={discovered ? (location ? location.name : tile) : "???"}
                              />
                            );
                          })
                        )}
                      </div>
                    );
                  })()}
                  <div className="minimap-legend">
                    <div className="map-key">
                      <div className="map-key-entry">
                        <span className="map-key-swatch map-key-player" />
                        <span>You</span>
                      </div>
                      <div className="map-key-entry">
                        <span className="map-key-swatch map-key-current-location" />
                        <span>Current Location</span>
                      </div>
                      <div className="map-key-entry">
                        <span className="map-key-swatch map-key-quest" />
                        <span>Quest Location</span>
                      </div>
                    </div>
                    <div className="map-key-counts">
                      <span>{state.mapDiscovery.discoveredTileKeys.length} tiles</span>
                      <span>{state.mapDiscovery.discoveredLocationIds.length} locations</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="subtle">No map data available.</p>
              )}
              {state.locations.filter((l) => l.discovered).length > 0 && (() => {
                const playerLocationId = state.locations.find(
                  (l) => l.discovered && l.position.x === state.worldState.player_x && l.position.y === state.worldState.player_y
                )?.id ?? null;
                return (
                <div className="pipboy-section">
                  <h3>Known Locations</h3>
                  {state.locations.filter((l) => l.discovered).map((loc) => (
                    <div
                      key={loc.id}
                      className={`location-entry clickable${highlightedLocationId === loc.id ? " is-selected" : ""}${loc.id === playerLocationId ? " is-current" : ""}`}
                      onClick={() => onHighlightLocation(highlightedLocationId === loc.id ? null : loc.id)}
                    >
                      <span className="location-name">{loc.name}</span>
                      <span className="subtle">{loc.type}</span>
                    </div>
                  ))}
                </div>
                );
              })()}
            </div>
          )}

          {tab === "factions" && (
            <div className="pipboy-factions">
              {factions.length === 0 ? (
                <p className="subtle">No faction contacts yet.</p>
              ) : (
                factions.map(([name, standing]) => (
                  <div key={name} className="faction-entry">
                    <span className="faction-name">{name}</span>
                    <span className={`faction-value${standing >= 0 ? " faction-positive" : " faction-negative"}`}>
                      {standing > 0 ? "+" : ""}{standing}
                    </span>
                    <span className="faction-rank">{factionRank(standing)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </article>
    </section>
  );
}

function factionRank(standing: number): string {
  if (standing >= 50) return "Idolized";
  if (standing >= 25) return "Liked";
  if (standing >= 5) return "Accepted";
  if (standing >= -4) return "Neutral";
  if (standing >= -24) return "Shunned";
  if (standing >= -49) return "Hated";
  return "Vilified";
}
