# Things to do
# Add things in here that you're actively working on
# Sometimes can be fleshed out and waiting for you to copy and paste to AI
your companion should follow you one tile behind, even in the Frontier Valley Overworld

1.) Corporal Hayes appears twice, please rename the NPC in The Dusty Spur Tavern, and look out for other duplicates. Where duplicates exist, keep them in the same faction, and give them an appropriate rename.

2.) the button to exit a map should only appear when it's possible to exit (e.g. you are 1 or 0 tiles away from an exit) Either hide the button when it's not an option, or make sure it works when you click it when it appears.

3.) The quest subtask colours aren't working. a subtask should be yellow until a quest subtask is completed, then it turns green. The area of the map (and Frontier Valley Overworld view) highlighted should correspond to the next uncompleted subtask in the quest list. Other quests are highlighted faintly on the map and frontier valley overworld view. This should only be for the next uncompleted sub task in any given quest.

When completing quest e.g. lost technology, search the vertibird is still highlighted as a quest bullet point and on the map, even though I’ve already done that and found the holotape.

Return the holotape should be the last quest bullet point, and the sub tasks of quests and map marker highlighted needs to reflect the location of the next subtask.

4.) There wasn't positive feedback, nothing turned green, nor was any reward given for fixing the  Caretaker Drone in the Solar Spire Core. Was this a quest? Some quests might not give rewards, but everything should give experience points. Every 100 Experience, The Player Character should Level Up. It says Level 1 at the bottom of the pip-boy 3000, under S.P.E.C.I.A.L. Stats, is there a Levelling Up mechanism?

5.) I should be able to click on a known location, and it should HIGHLIGHT it on the Frontier Valley Overworld view.

6.) If I click on a black/ undiscovered fog of war area on the map, it should path find to walk my character to the nearest discovered tile, and then keep going closer and closer to the area I clicked on, even if I click off the map.

7.) Implementation Best Practices for the dialogues.
Data Separation: Store dialogue in JSON, XML, or CSV, not hardcoded. This allows for easier writing and translation.
Event-Driven: Use events to separate the dialogue UI from game logic. The dialogue manager just tells the game "Player picked Option 3," and the game updates accordingly.
When we record audio, include Node Metadata: like speaker name, audio file, and animation to play.

Meaningful Choices: Ensure player choices feel impactful and have logical, if not always positive, consequences.

Active Listening: Avoid making dialogue a simple "press-a-to-continue" button. Ensure the player's choices change the flow of conversation.

Contextualize Sub-choices: Instead of purely linear branches, use sub-choices (e.g., "[Lighten Mood] Yes!" vs. "[Sassy] Fine.") to add depth to conversation tone.
