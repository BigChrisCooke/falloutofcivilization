# Backlog ideas
# Throw items into this document then ask AI to clean it up and organise it


Big fun features
Turn based combat, learn from Baldur’s gate
Multiple endings, ways to win, and companions that bicker with one another in an entertaining fashion.

Vault Base just automatically grows as your player levels up and quests are completed, gives choices for what to invest in. Has effects, factions change too. Battles level up to you+ companions to Squads of units. (hoover dam could be epic).

Dialogue system best practices (future polish)
- Data separation: dialogue already lives in YAML, keep it there. When localisation arrives, consider a key-based lookup so translators work from flat files.
- Event-driven: dialogue manager should emit events ("player picked option X") and let game logic react — keep UI and state changes decoupled.
- Node metadata: plan for speaker name, audio file reference, and animation cue per node so voice acting and cutscenes can be wired later.
- Meaningful choices: every dialogue branch should have consequences (even if subtle). Avoid "press A to continue" dead ends.
- Sub-choices with tone tags: use tags like [Lighten Mood], [Sassy], [Threaten] to add depth to conversation tone without changing plot outcome.
