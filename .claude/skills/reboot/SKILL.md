---
name: reboot
description: Hard reboot the local dev server — kills all node processes, clears Vite cache, verifies ports are free, then starts fresh. Use when the server is misbehaving or you want a guaranteed clean restart.
---

# Reboot Dev Server

Hard reboot: kill everything, clear caches, verify ports, start fresh.

## Steps

### 1. Kill all node processes

```bash
powershell -Command "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force; Write-Host 'All node processes killed'"
```

### 2. Clear Vite cache

```bash
rm -rf client/.vite
```

### 3. Verify ports 6200 and 6201 are free

```bash
sleep 3 && cmd /c "netstat -ano | findstr LISTENING" | grep -E ":(6200|6201) " || echo "ports clear"
```

If either port is still in use, identify the PID from the output and kill it:

```bash
taskkill /F /PID <pid>
```

Repeat until both ports are clear before proceeding.

### 4. Start the dev server

```bash
cd "c:/Users/Mr. Big Boss Chris/Fallout of Civilizations/falloutofcivilization" && npm run dev
```

Run this in the background, wait 8 seconds, then check the output confirms:
- `[client] Local: http://localhost:6200/`
- `[backend] listening on http://localhost:6201`

### 5. Report back

Tell the user the server is running at **http://localhost:6200** and remind them to hard-refresh the browser (Ctrl+Shift+R) to bypass any browser-side cache.
