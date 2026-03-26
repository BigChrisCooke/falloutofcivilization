import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { HexOverworld } from "./HexOverworld.js";
import { InteriorMapPanel } from "./InteriorMapPanel.js";
import { PipBoyOverlay } from "./PipBoyOverlay.js";
import { SkillAllocationPanel } from "./SkillAllocationPanel.js";

import {
  createSave,
  deleteSave,
  enterLocation,
  exitInterior,
  getGameState,
  getSession,
  listSaves,
  loadSave,
  login,
  moveInterior,
  logout,
  register,
  saveCurrentGame,
  travel,
  updateScreen,
  type AuthUser,
  type GameState,
  type SaveGame
} from "../lib/api.js";

type AuthMode = "login" | "register";
type DialogName = "settings" | "saves" | "pipboy" | null;

export function AppRoot() {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<AuthMode>("login");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saves, setSaves] = useState<SaveGame[]>([]);
  const [saveName, setSaveName] = useState("Chris Run");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [activeDialog, setActiveDialog] = useState<DialogName>(null);
  const [saveConfirmation, setSaveConfirmation] = useState<string | null>(null);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [highlightedLocationId, setHighlightedLocationId] = useState<string | null>(null);
  const [levelUpToast, setLevelUpToast] = useState<number | null>(null);
  const [showOverworldSkills, setShowOverworldSkills] = useState(false);
  const prevLevelRef = useRef<number | null>(null);

  const updateGameState = useCallback((newState: GameState) => {
    setGameState((prev) => {
      const prevLevel = prev?.playerCharacter.level ?? prevLevelRef.current;
      const newLevel = newState.playerCharacter.level;
      if (prevLevel !== null && newLevel > prevLevel) {
        setLevelUpToast(newLevel);
        setTimeout(() => setLevelUpToast(null), 3000);
      }
      prevLevelRef.current = newLevel;
      return newState;
    });
  }, []);

  async function refreshSession() {
    setLoading(true);
    setError(null);

    try {
      const session = await getSession();
      if (!session.authenticated || !session.user) {
        setUser(null);
        setSaves([]);
        setGameState(null);
        setLoading(false);
        return;
      }

      setUser(session.user);
      const savesResponse = await listSaves();
      setSaves(savesResponse.saves);

      const stateResponse = await getGameState();
      if (stateResponse.saveLoaded) {
        updateGameState(stateResponse.state);
      } else {
        setGameState(null);
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Failed to restore session.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshSession();
  }, []);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      if (mode === "register") {
        const response = await register(username, password);
        setUser(response.user);
      } else {
        const response = await login(username, password);
        setUser(response.user);
      }

      setUsername("");
      setPassword("");
      await refreshSession();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    }
  }

  async function handleCreateSave() {
    setError(null);

    try {
      await createSave(saveName);
      await refreshSession();
      setActiveDialog(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to create save.");
    }
  }

  async function handleLoadSave(saveId: string) {
    setError(null);

    try {
      await loadSave(saveId);
      await refreshSession();
      setActiveDialog(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to load save.");
    }
  }

  async function handleDeleteSave(saveId: string, saveName: string) {
    if (!confirm(`Confirm delete save file: ${saveName}`)) {
      return;
    }

    try {
      await deleteSave(saveId);
      setSaves((prev) => prev.filter((s) => s.id !== saveId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete save.");
    }
  }

  async function handleSaveGame() {
    if (!gameState) return;
    setError(null);
    setSaveConfirmation(null);

    try {
      const response = await saveCurrentGame(gameState.save.id);
      setSaveConfirmation(response.message);
      setTimeout(() => setSaveConfirmation(null), 3000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save game.");
    }
  }

  async function handleScreenChange(screen: "overworld" | "vault") {
    setError(null);

    try {
      const response = await updateScreen(screen);
      updateGameState(response.state);
    } catch (screenError) {
      setError(screenError instanceof Error ? screenError.message : "Failed to switch screen.");
    }
  }

  async function handleEnterLocation(locationId: string) {
    setError(null);

    try {
      const response = await enterLocation(locationId);
      updateGameState(response.state);
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : "Failed to enter location.");
    }
  }

  async function handleTravel(x: number, y: number) {
    setError(null);

    try {
      const response = await travel(x, y);
      updateGameState(response.state);
    } catch (travelError) {
      setError(travelError instanceof Error ? travelError.message : "Failed to travel.");
    }
  }

  async function handleInteriorMove(x: number, y: number) {
    setError(null);

    try {
      const response = await moveInterior(x, y);
      updateGameState(response.state);
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "Failed to move inside the current area.");
    }
  }

  async function handleInteriorExit(exitId: string) {
    setError(null);

    try {
      const response = await exitInterior(exitId);
      updateGameState(response.state);
    } catch (exitError) {
      setError(exitError instanceof Error ? exitError.message : "Failed to leave the current area.");
    }
  }

  async function handleLogout() {
    setError(null);

    try {
      await logout();
      setUser(null);
      setGameState(null);
      setSaves([]);
      setActiveDialog(null);
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Failed to log out.");
    }
  }

  const activeScreen = gameState?.worldState.current_screen ?? null;
  const discoveredCount = gameState?.mapDiscovery.discoveredLocationIds.length ?? 0;
  const revealedTiles = gameState?.mapDiscovery.discoveredTileKeys.length ?? 0;
  const factionEntries = gameState ? Object.entries(gameState.factionStanding) : [];

  if (loading) {
    return <main className="shell loading-state">Loading the wasteland...</main>;
  }

  if (!user) {
    return (
      <main className="shell auth-shell">
        <section className="auth-card">
          <p className="eyebrow">Fallout Of Civilization</p>
          <h1>Phase 1 Base</h1>
          <p className="subtle">
            A safe starting point for Chris to build on with AI help, not a throwaway login demo.
          </p>
          <form className="auth-form" onSubmit={submitAuth}>
            <label>
              Username
              <input value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} required />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <button className="primary-button" type="submit">
              {mode === "register" ? "Register and Enter" : "Login"}
            </button>
          </form>
          <button
            className="ghost-button"
            type="button"
            onClick={() => setMode((currentMode) => (currentMode === "login" ? "register" : "login"))}
          >
            {mode === "login" ? "Need an account?" : "Already registered?"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell game-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Logged In</p>
          <h1>{user.username}</h1>
        </div>
        <button className="icon-button" type="button" onClick={() => setActiveDialog("settings")}>
          Settings
        </button>
      </header>

      {error ? <p className="banner error-text">{error}</p> : null}

      {!gameState ? (
        <section className="panel">
          <h2>Start or Load a Game</h2>
          <p className="subtle">
            Your progress saves automatically as you play.
          </p>
          <div className="save-create">
            <input value={saveName} onChange={(event) => setSaveName(event.target.value)} />
            <button className="primary-button" type="button" onClick={handleCreateSave}>
              New Game
            </button>
          </div>
          <div className="save-list">
            {saves.length === 0 ? <p className="subtle">No saves yet.</p> : null}
            {saves.map((save) => (
              <div key={save.id} className="save-entry">
                <button className="list-button" type="button" onClick={() => handleLoadSave(save.id)}>
                  <span>{save.name}</span>
                  <span>{save.region_id}</span>
                </button>
                <button
                  className="ghost-button delete-save-button"
                  type="button"
                  title="Delete save"
                  onClick={() => void handleDeleteSave(save.id, save.name)}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="panel hero-panel">
            <div>
              <p className="eyebrow">{gameState.region?.name ?? "Unknown Region"}</p>
              <h2>{gameState.save.name}</h2>
              <p className="subtle">{gameState.currentLocation?.name ?? gameState.region?.summary}</p>
            </div>
            <div className="hero-meta">
              <span>{gameState.playerCharacter.name}</span>
              <span>Level {gameState.playerCharacter.level}</span>
              <span>{gameState.worldState.current_screen}</span>
              {gameState.companions.length > 0 && gameState.companions[0] && (
                <span className="companion-hud-indicator" title={`Companion: ${gameState.companions[0].name} (Loyalty: ${gameState.companions[0].loyalty})`}>
                  &#9632; {gameState.companions[0].name}
                </span>
              )}
            </div>
          </section>

          <section className="panel status-panel compact-status-panel">
            <div className="status-grid compact-status-grid">
              <article className="status-card compact-status-card">
                <p className="eyebrow">Mode</p>
                <h3>{activeScreen}</h3>
              </article>
              <article className="status-card compact-status-card">
                <p className="eyebrow">Discovery</p>
                <h3>{discoveredCount} sites</h3>
              </article>
              <article className="status-card compact-status-card">
                <p className="eyebrow">Map</p>
                <h3>{revealedTiles} tiles</h3>
              </article>
              <article className="status-card compact-status-card">
                <p className="eyebrow">Factions</p>
                <h3>{factionEntries.length}</h3>
              </article>
            </div>
            <div className="detail-grid scene-detail-grid">
              <div>
                <h3>Standing</h3>
                {factionEntries.map(([name, value]) => (
                  <p key={name}>
                    {name} · {value}
                  </p>
                ))}
              </div>
              <div>
                <h3>Scene focus</h3>
                <p>{activeScreen === "overworld" ? "Travel and discover" : "Inspect the current space"}</p>
                <p>{gameState.playerCharacter.archetype}</p>
              </div>
            </div>
          </section>

          {gameState.worldState.current_screen === "location" && gameState.currentInteriorMap ? (
            <InteriorMapPanel
              state={gameState}
              variant="location"
              onMove={(x, y) => handleInteriorMove(x, y)}
              onExit={(exitId) => void handleInteriorExit(exitId)}
              onStateRefresh={(newState) => updateGameState(newState)}
            />
          ) : gameState.worldState.current_screen === "vault" && gameState.currentInteriorMap ? (
            <InteriorMapPanel
              state={gameState}
              variant="vault"
              onMove={(x, y) => handleInteriorMove(x, y)}
              onExit={(exitId) => void handleInteriorExit(exitId)}
              onStateRefresh={(newState) => updateGameState(newState)}
            />
          ) : (
            <div style={{ position: "relative" }}>
              <HexOverworld
                state={gameState}
                selectedQuestId={selectedQuestId}
                highlightedLocationId={highlightedLocationId}
                onHighlightLocation={setHighlightedLocationId}
                onTravel={(x, y) => handleTravel(x, y)}
                onEnterLocation={(locationId) => void handleEnterLocation(locationId)}
              />
              {showOverworldSkills && gameState.playerCharacter.skills && (
                <SkillAllocationPanel
                  state={gameState}
                  onComplete={(newState) => {
                    setShowOverworldSkills(false);
                    updateGameState(newState);
                  }}
                  onClose={() => setShowOverworldSkills(false)}
                />
              )}
              {!showOverworldSkills && gameState.playerCharacter.skills && gameState.playerCharacter.skills.unspentPoints > 0 && (
                <button
                  className="skill-points-notify"
                  type="button"
                  onClick={() => setShowOverworldSkills(true)}
                >
                  {gameState.playerCharacter.skills.unspentPoints} skill points available
                </button>
              )}
            </div>
          )}
        </>
      )}

      <nav className="bottom-bar">
        <button className="nav-button" type="button" onClick={() => void handleScreenChange("overworld")}>
          World
        </button>
        <button className="nav-button" type="button" onClick={() => void handleScreenChange("vault")}>
          Vault
        </button>
        <button className="nav-button pipboy-nav-button" type="button" onClick={() => setActiveDialog("pipboy")}>
          Pip-Boy
        </button>
        <button className="nav-button" type="button" onClick={() => setActiveDialog("saves")}>
          Saves
        </button>
      </nav>

      {activeDialog === "settings" ? (
        <section className="dialog-backdrop" onClick={() => setActiveDialog(null)}>
          <article className="dialog-card" onClick={(event) => event.stopPropagation()}>
            <h2>Settings</h2>
            <p className="subtle">Phase 1 keeps this simple: session, shell, and safe exit paths.</p>
            <button className="primary-button" type="button" onClick={() => void handleLogout()}>
              Logout
            </button>
          </article>
        </section>
      ) : null}

      {activeDialog === "pipboy" && gameState ? (
        <PipBoyOverlay
          state={gameState}
          onClose={() => setActiveDialog(null)}
          selectedQuestId={selectedQuestId}
          onSelectQuest={setSelectedQuestId}
          highlightedLocationId={highlightedLocationId}
          onHighlightLocation={setHighlightedLocationId}
        />
      ) : null}

      {levelUpToast !== null && (
        <div className="level-up-toast">
          <div>LEVEL UP</div>
          <div className="level-up-label">You are now Level {levelUpToast}</div>
        </div>
      )}

      {activeDialog === "saves" ? (
        <section className="dialog-backdrop" onClick={() => setActiveDialog(null)}>
          <article className="dialog-card" onClick={(event) => event.stopPropagation()}>
            <h2>Save Slots</h2>
            {gameState ? (
              <div style={{ marginBottom: "0.75rem" }}>
                <button className="primary-button" type="button" onClick={() => void handleSaveGame()}>
                  Save Game
                </button>
                {saveConfirmation ? <p className="subtle" style={{ marginTop: "0.25rem" }}>{saveConfirmation}</p> : null}
                <p className="subtle" style={{ marginTop: "0.25rem", fontSize: "0.75rem" }}>Your progress saves automatically as you play.</p>
              </div>
            ) : null}
            <div className="save-create">
              <input value={saveName} onChange={(event) => setSaveName(event.target.value)} />
              <button className="ghost-button" type="button" onClick={() => void handleCreateSave()}>
                New Game
              </button>
            </div>
            <div className="save-list">
              {saves.map((save) => (
                <div key={save.id} className="save-entry">
                  <button className="list-button" type="button" onClick={() => void handleLoadSave(save.id)}>
                    <span>{save.name}</span>
                    <span>{save.region_id}</span>
                  </button>
                  <button
                    className="ghost-button delete-save-button"
                    type="button"
                    title="Delete save"
                    onClick={() => void handleDeleteSave(save.id, save.name)}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}
    </main>
  );
}
