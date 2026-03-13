wha are the next stages?

--

no, we need to pause here and get what we have more aligned.
it's not an isometric view yet, it's FLAT!

also i want a placeholder for the person, not just text on the grid element.

--

http://localhost:6301/api/auth/register

{
    "username": "darren2",
    "password": "abcabc123"
}

i';m getting a network error or something

--

you do it

--

i see no rendering, no isometric map or anything

--

HexOverworld.tsx:58 
 GET http://localhost:6200/node_modules/.vite/deps/browserAll-MAOI7HRW.js?v=ccc540e6 net::ERR_ABORTED 404 (Not Found)

HexOverworld.tsx:260 Uncaught (in promise) TypeError: Failed to fetch dynamically imported module: http://localhost:6200/node_modules/.vite/deps/browserAll-MAOI7HRW.js?v=ccc540e6
﻿

--

ok so the isometric isn't right, they should all be connected together, we kind of went 3d, but it should look more flat, like civ 4

--

in the game i can't move the player at all, i click on the other shapes and nothing happens

--

still not working.

let's review this tile thing, we need to break it down into various components as it will expand and get more complicated

review what we need and how we restructure this. think about the original game and what elements appear on the map.

why? because we want to get to a point of vibe programming the game and we don't want to end up with files that are massive!

so let's get the correct structure now, even if it's thin so we can improve on it.

also make this clicking / move work

--

was astro a good idea? when i said frontend in the original spec i was thinking a marketing frontend.

--

let's change it now before we get deeper!

change the frontend directory to client and migrate it to Vite, React and Pixi

--

[client]   ➜  Local:   http://localhost:6200/
[client]   ➜  Network: http://192.168.1.127:6200/
[client]   ➜  Network: http://192.168.64.1:6200/
[backend] node:events:497
[backend]       throw er; // Unhandled 'error' event
[backend]       ^
[backend]
[backend] Error: listen EADDRINUSE: address already in use :::6301

--

ok so game content should all be served from the backend.

--

ok now we need to fix the vaults and entering other places..

we fixed the main map because it wasn't showing the grid properly, but i think we skipped that fix on the other areas

so for example the main world works fine, but when i enter a vault the grids aren't connected - it should be the SAME as the main world..

also in the vaults i can't move around

--

i just registered a new account, and i don't see the world etc..

--

ok when i click on a space the map flashes for a second

--

it still flashes when i click somewhere

--

it still flashes

--

stop and think. is this rendering constructed optimaly? it's still flashing, which means something isn't coded correctly - plan carefully. make sure this rendering engine is top quality because it's going to have a lot added to it over the coming months