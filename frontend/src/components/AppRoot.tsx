import { useEffect, useState, type FormEvent } from "react";

import {
  createSave,
  enterLocation,
  getGameState,
  getSession,
  listSaves,
  loadSave,
  login,
  logout,
  register,
  updateScreen,
  type AuthUser,
  type GameState,
  type SaveGame
} from "../lib/api.js";

type AuthMode = "login" | "register";
type DialogName = "settings" | "saves" | null;

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
      setGameState(stateResponse.saveLoaded ? stateResponse.state : null);
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

  async function handleScreenChange(screen: "overworld" | "vault") {
    setError(null);

    try {
      const response = await updateScreen(screen);
      setGameState(response.state);
    } catch (screenError) {
      setError(screenError instanceof Error ? screenError.message : "Failed to switch screen.");
    }
  }

  async function handleEnterLocation(locationId: string) {
    setError(null);

    try {
      const response = await enterLocation(locationId);
      setGameState(response.state);
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : "Failed to enter location.");
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
          <h2>Create or Load a Save</h2>
          <p className="subtle">
            This is the first playable handoff point: get into a real saved game shell, not a placeholder page.
          </p>
          <div className="save-create">
            <input value={saveName} onChange={(event) => setSaveName(event.target.value)} />
            <button className="primary-button" type="button" onClick={handleCreateSave}>
              Create Save
            </button>
          </div>
          <div className="save-list">
            {saves.length === 0 ? <p className="subtle">No saves yet.</p> : null}
            {saves.map((save) => (
              <button key={save.id} className="list-button" type="button" onClick={() => handleLoadSave(save.id)}>
                <span>{save.name}</span>
                <span>{save.region_id}</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="panel hero-panel">
            <div>
              <p className="eyebrow">{gameState.region?.name ?? "Unknown Region"}</p>
              <h2>{gameState.save.name}</h2>
              <p className="subtle">{gameState.region?.summary}</p>
            </div>
            <div className="hero-meta">
              <span>{gameState.playerCharacter.name}</span>
              <span>Level {gameState.playerCharacter.level}</span>
              <span>{gameState.worldState.current_screen}</span>
            </div>
          </section>

          {gameState.worldState.current_screen === "location" && gameState.currentInteriorMap ? (
            <section className="panel">
              <p className="eyebrow">{gameState.currentLocation?.name}</p>
              <h2>{gameState.currentInteriorMap.name}</h2>
              <p className="subtle">Theme: {gameState.currentInteriorMap.theme}</p>
              <div className="map-grid">
                {gameState.currentInteriorMap.layout.map((row, rowIndex) =>
                  row.map((tile, columnIndex) => (
                    <span key={`${rowIndex}-${columnIndex}`} className="tile">
                      {tile}
                    </span>
                  ))
                )}
              </div>
              <div className="detail-grid">
                <div>
                  <h3>NPCs</h3>
                  {gameState.currentInteriorMap.npcs.map((npc) => (
                    <p key={npc.id}>
                      {npc.name} · {npc.disposition}
                    </p>
                  ))}
                </div>
                <div>
                  <h3>Interactables</h3>
                  {gameState.currentInteriorMap.interactables.map((item) => (
                    <p key={item.id}>
                      {item.label} · {item.type}
                    </p>
                  ))}
                </div>
              </div>
            </section>
          ) : gameState.worldState.current_screen === "vault" ? (
            <section className="panel">
              <p className="eyebrow">Vault Panel</p>
              <h2>Vault 47 Home</h2>
              <p className="subtle">
                This is the persisted home-base stub Chris can extend later with medbay, stash, companions, and services.
              </p>
              <div className="detail-grid">
                <div>
                  <h3>Current focus</h3>
                  <p>Safe storage</p>
                  <p>Recovery</p>
                  <p>Companion hub</p>
                </div>
                <div>
                  <h3>Available hooks</h3>
                  <p>Stash UI</p>
                  <p>Upgrade slots</p>
                  <p>Quest anchor events</p>
                </div>
              </div>
            </section>
          ) : (
            <section className="panel">
              <p className="eyebrow">Overworld</p>
              <h2>Reachable Locations</h2>
              <div className="location-list">
                {gameState.locations.map((location) => (
                  <button
                    key={location.id}
                    className="location-card"
                    type="button"
                    onClick={() => handleEnterLocation(location.id)}
                  >
                    <strong>{location.name}</strong>
                    <span>{location.type}</span>
                    <p>{location.description}</p>
                  </button>
                ))}
              </div>
            </section>
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

      {activeDialog === "saves" ? (
        <section className="dialog-backdrop" onClick={() => setActiveDialog(null)}>
          <article className="dialog-card" onClick={(event) => event.stopPropagation()}>
            <h2>Save Slots</h2>
            <div className="save-create">
              <input value={saveName} onChange={(event) => setSaveName(event.target.value)} />
              <button className="primary-button" type="button" onClick={() => void handleCreateSave()}>
                Create
              </button>
            </div>
            <div className="save-list">
              {saves.map((save) => (
                <button key={save.id} className="list-button" type="button" onClick={() => void handleLoadSave(save.id)}>
                  <span>{save.name}</span>
                  <span>{save.region_id}</span>
                </button>
              ))}
            </div>
          </article>
        </section>
      ) : null}
    </main>
  );
}
