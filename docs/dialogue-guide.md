# Fallout of Civilization — Complete Dialogue Guide

Every NPC dialogue branch, SPECIAL stat gate, quest interaction, and interactable object across all 20 interior locations.

**Legend:**
- `[CHA 7+]` = requires Charisma 7 or higher
- `[INT ≤3]` = requires Intelligence 3 or lower
- `[STR 7+]` = requires Strength 7 or higher
- `[PER 6+]` = requires Perception 6 or higher
- `QUEST GRANT: quest_name` = this option starts a quest
- `QUEST COMPLETE: quest_name` = this option completes a quest
- `QUEST FAIL: quest_name` = this option fails a quest
- `INVENTORY GATE: item` = requires the item in inventory
- `INVENTORY TAG GATE: tag` = requires any item with that tag
- `CONSUME ITEM` = the gated item is consumed
- `COMPANION RECRUIT: name` = recruits a companion
- `KARMA +/-N` = karma change
- `FACTION: faction +/-N` = faction standing change

---

## 1. Vault 47 Home

### Overseer Hale (friendly, x:1 y:1)

**Conditional Greeting — after completing `vault_47_repairs_pending`:**
> "Welcome back. The vault's doing well — better than it has in years. What can I do for you?"
- "You mentioned a Doc Mitchell at the Dusty Spur. I should go see him." → `QUEST GRANT: see_doc_mitchell` → *"Good idea. Head south once you're outside..."*
- "How are the vault systems doing?" → `QUEST COMPLETE: vault_47_repairs_pending` → *"Better than they've been in years. That repair kit you found bought us real time..."*
- "Any news from outside?" → *"Radio chatter's been picking up..."*
- "Any advice for what I should do next?" → *"Explore. Help people. Make allies..."*

**Conditional Greeting — after completing `save_vault_47`:**
> "Welcome back. Thanks to you, the vault's holding steady — power core is stabilized and the water recycler is running clean. You've earned your place here. Need anything?"
- "You mentioned a Doc Mitchell at the Dusty Spur. I should go see him." → `QUEST GRANT: see_doc_mitchell` → *"Good idea..."*
- "How are the vault systems doing?" → `QUEST GRANT: vault_47_repairs_pending` → *"I'm still working on it..."*
- "Any news from outside?" → *"Radio chatter's been picking up..."*
- "Any advice for what I should do next?" → *"Explore. Help people. Make allies..."*

**Default Greeting:**
> "Ah, you're awake. I dragged you inside when you crawled up to the vault door, you were barely conscious. I thought you were a gonner. I'm Overseer Hale — or what's left of the title. There's a tavern down the road — the Dusty Spur. A man they call Doc Mitchell has medical know-how. You should get your head checked before anything else. Tap on objects and people to interact with them — like you just did with me."

- "I'll go find Doc Mitchell." → `QUEST GRANT: see_doc_mitchell` → *"Good idea. Head south once you're outside — follow the road to the Dusty Spur Tavern. Doc Mitchell has medical know-how. Get your head checked before anything else. Grab anything useful from the stash before you go."*
  - "I'm on it. I'll be back." → *"Be careful out there..."*
  - "Any survival tips before I head out?" → **Survival Tips** (see below)
- "What happened to everyone?" → **Vault History**
- "What's wrong with the vault?" → **Vault Systems**
- "What's it like outside?" → **Outside Info**
- "Is there anything I can do to help?" → **Vault Help**
- `[CHA 7+]` "We'll figure this out together, Overseer. You're not alone." → *"That... means more than you know. It's been a long time since I've had someone to talk to who wasn't a terminal..."* → leads to quest offer
- `[CHA ≤3]` "So you're useless and the vault is broken. Great." → *"I've kept this vault running for thirty years by myself..."* → leads to quest offer
- `[INT ≤3]` "Pretty lights! Me push buttons?" → *"No! Do not push — catches your hand — look, the vault is broken..."* → `QUEST GRANT: save_vault_47`
- `INVENTORY GATE: makeshift_repair_kit` / `CONSUME ITEM` / `QUEST COMPLETE: save_vault_47` "I found a repair kit. Will this work?" → **Quest Complete** *"Hale's eyes widen. That's — yes! A makeshift repair kit with a fusion cell adapter..."*

**Vault History:**
> "Vault 47 was never meant for long-term habitation — it was a monitoring station. The original crew left decades ago. I stayed behind to maintain the systems. You wandered in half-dead about a week ago."
- `[INT 7+]` "A monitoring station implies external sensor arrays. Are they still functional?" → *"Sharp. Yes — the topside antenna still pings..."*
- `[INT ≤3]` "So... this is my house now? I live in a big metal tube?" → *"...Yes. You live in the big metal tube..."*
- "Is there anything I can do to help?" → Vault Help

**Vault Systems:**
> "Power core is down to 23%. Water recycler works but the filters need replacing. Air filtration is holding, barely. If we don't find parts, this vault becomes a tomb in about six months. Check your Pip-Boy for details..."
- `[INT 7+]` "Fusion cell degradation at 23% means we have about 4-5 months before cascade failure. What's the priority?" → *"Water filters first..."*
- `[INT ≤3]` "Can you fix it with tape? Tape fixes everything." → *"No, tape will not — actually, you know what, there's a surprising amount of duct tape holding this vault together already..."*
- "I'll find what you need. Tell me what to do." → Vault Help

**Outside Info:**
> "Dangerous. The valley has settlements — I've picked up radio chatter. There's a tavern on the road, some kind of old power station, and cave systems. Raiders too..."
- "Tell me about the tavern." → *"The Dusty Spur, they call it. Neutral ground..."*
- "A power station? That could help the vault." → *"The Solar Spire. Pre-war solar collection tower..."*
- "Anywhere I could scavenge parts nearby?" → **Gas Station Hint** → `QUEST GRANT: save_vault_47`

**Vault Help:**
> "The power systems are dying. I need someone to find a repair kit — duct tape and prayers won't cut it anymore. There's an Abandoned Gas Station east of the valley..."
- "I'll find what you need. Count on it." → `QUEST GRANT: save_vault_47` → *"Thank you. Head east once you're outside..."*
- `[CHA 5+]` "I'll save your vault — but I expect the best room when this is over." → `QUEST GRANT: save_vault_47` / `FACTION: vault_dwellers +3` → *"Hale cracks a rare smile. Deal..."*
- `[INT ≤3]` "Me find tool thing! Me fix tube house!" → `QUEST GRANT: save_vault_47` → *"...Right. The tool thing is in the big building with the gas pumps..."*
- "I've got my own problems." → *"I understand. The offer stands..."*

**Survival Tips:**
> "Tap on everything — stashes, terminals, people. Items you pick up go into your Pip-Boy inventory. Your S.P.E.C.I.A.L. stats open different dialogue options..."

**Quest Complete:**
> "Hale's eyes widen. That's — yes! A makeshift repair kit with a fusion cell adapter. This is exactly what we need..."
- "Just doing what needed to be done." → *"And that's what makes you different from the people who left..."*
- `[CHA 5+]` "What can I say? I'm a natural hero." → *"Hale laughs — a real laugh..."*
- `[INT ≤3]` "Me did it! Tube house saved!" → *"Hale looks at you with genuine warmth..."*

### Interactables

**Home Stash** (stash)
- Examine → *"A reinforced footlocker bolted to the floor..."*
- Take Emergency Rations → grants `emergency_rations` [food]
- Take Faded Photograph → grants `faded_photograph`

**Vault Terminal** (terminal)
- Examine → *"A chunky green-screen terminal..."*
- Access Logs → *"VAULT 47 STATUS: Population — 1 (you). Water recycler — NOMINAL..."*

---

## 2. The Dusty Spur Tavern

### Doc Mitchell (friendly, x:8 y:8)

**Greeting:**
> "Whoa there — easy now. You hit your head real hard out there. Can you hear me alright?"

Character intro options (lead to personality responses):
- "Yeah I'm fine. I was more of a fighter before..." → *"Figured. You've got the look of someone who's taken a few hits and kept swinging..."*
- "My head's spinning. I'm more of a thinker normally..." → *"Smart. Thinkers last longer out in the waste..."*
- "I'm quick on my feet — usually dodge what I can't fight." → *"Agile type. Good. Fast hands and quick feet..."*
- "I take hits. Always have. Built like a brahmin, they say." → *"Ha! Durable stock then..."*
- "I can talk my way out of most situations." → *"The silver tongue. Rare as clean water out here..."*
- "I prefer to work alone. Keep my own counsel." → *"A lone wolf. Harder road..."*
- "So... who am I, exactly?" → *"That's the question, ain't it?"*

All personality responses lead to:
- "What happened to me?" → *"Found you face-down outside. Looked like radscorpions got the better of you. Mina patched you up..."*
  - "Thanks for saving me." → *"Don't thank me — thank Mina..."*
  - `[INT 7+]` "Radscorpion venom has a half-life of six hours. I should be fine by now." → *"Well, well. A brain that still works after a head wound..."*
  - `[INT ≤3]` "Bug... hurt me? Me hit bug next time." → *"...Right. Well, at least you're enthusiastic..."*
- "Where am I?" → *"The Dusty Spur Tavern, Frontier Valley..."*
  - `[CHA 7+]` "You've been incredibly kind. I won't forget this." → *"Ha! Careful with that charm, kid..."*
  - `[CHA ≤3]` "Great. A dump in the middle of nowhere." → *"...You're welcome for saving your life, by the way..."*
  - "Thanks. I'll look around." → *"You do that. And talk to Mina..."*

### Mina (friendly, Dusty Spur Tavern faction, x:5 y:1)

**Greeting:**
> "Well now, a new face in the Dusty Spur. Name's Mina. I run this place — or what's left of it."

- "Doc Mitchell said I should thank you — for patching me up." → grants `stimpak` → *"Oh, that old fool told you? It was nothing — just a stimpak and some clean bandages. Here, take this spare..."*
- "Heard any rumors?" → *"Rumors? Honey, I hear everything in this bar..."*
- "What happened to the world?" → *"The bombs fell about two hundred years back..."*
  - `[INT 7+]` "Two hundred years — that puts pre-war collapse around 2077..." → *"Well aren't you a walking encyclopedia..."*
  - `[INT ≤3]` "Boom booms made everything all gone-gone?" → *"...Yeah, sweetie. The boom booms made everything all gone-gone..."*
  - "Tell me more about the NCR." → *"New California Republic. They mean well, mostly..."*
  - "And the Legion?" → *"Caesar's Legion. Slavers with delusions of Rome..."*
- "How do I get around?" → *"Tap a hex tile to walk there..."* → can ask about SPECIAL stats
- "What should I be doing?" → *"Survive. Find other settlements..."*
  - `[INT 7+]` "What's the optimal faction alliance for this region?" → *"Ha! No one's ever asked me that before..."*
  - `[INT ≤3]` "What's a survive?" → *"...It means don't die, honey. Just... don't die."*
- "What's the Dusty Spur Tavern faction?" → *"Neutral ground. Everyone's welcome as long as they behave..."*
- `[CHA 7+]` "Name's not the only nice thing in here." → *"Ha! Smooth talker. Buy a drink first..."*
- `[CHA ≤3]` "Looks like a dump." → *"And you look like something the radroaches dragged in..."*

### Private Reyes (neutral, NCR faction, x:3 y:3)

**Conditional Greeting — after completing `ncr_raider_problem`:**
> "Well, look who it is. The raider problem's been dealt with, and the NCR has you to thank for it..."
- "How's the north road looking?" → *"Clear and quiet..."*
- "What's my standing with the NCR?" → *"Solid. I put in a good word..."*
- "Any new threats?" → *"Nothing immediate..."*

**Default Greeting:**
> "Civilian. Private Reyes, NCR liaison. Frontier Valley's under NCR protection. Keep your nose clean."

- "Tell me about the NCR." → *"New California Republic. Largest government left standing..."*
  - `[INT 7+]` "Republic implies elected officials. How's voter turnout in a post-apocalyptic democracy?" → *"...You'd be surprised. President Kimball's got about 60% approval..."*
  - `[INT ≤3]` "You got a flag? I like flags." → *"...Yeah, we've got a flag. Two-headed bear..."*
- "Any work for a capable person?" → *"There's a raider gang making trouble north of the valley..."*
  - "I'll handle it. Consider it done." → `QUEST GRANT: ncr_raider_problem` / `FACTION: ncr +2`
  - `[CHA 7+]` "I'll do it — but I expect fair compensation, Private." → `QUEST GRANT: ncr_raider_problem` / `FACTION: ncr +5` → *"Ha. Fair enough — I like someone who knows their worth..."*
  - `[INT ≤3]` "Me smash bad guys! Where bad guys?" → `QUEST GRANT: ncr_raider_problem` → *"...North. The bad guys are north..."*
  - "Not interested in doing your dirty work." → *"Suit yourself..."*
- "How do you feel about this place?" → *"Good neutral ground..."*
- `[CHA 7+]` "Private. Appreciate what the NCR does out here. Truly." → *"At ease. It's rare someone says that without wanting something..."*
- `[CHA ≤3]` "Protection? More like occupation." → *"Watch your mouth, civilian..."*

### Decanus Varro (hostile, Caesar's Legion faction, x:4 y:3)

**Greeting:**
> "Another soft-headed courier wandering the valley. Caesar's patience for these lands grows thin."

- "Tell me about Caesar's Legion." → *"Caesar's Legion brings order..."* → can ask about Caesar's goals
- "You don't scare me." → *"Bravado. The Legion has heard that before..."*
- "I respect Caesar's discipline." → *"Hmph. Unusual for a courier..."*
- `[INT 7+]` "Decanus — that's a Roman rank for a squad of ten. How many men do you actually command?" → *"...You know your history. Eight, currently..."*
- `[INT ≤3]` "You talk funny. Are you from... the place with the hats?" → *"...Caesar's Legion comes from the East. We wear armor, not hats..."*
- `[CHA 7+]` "Caesar's ambition is impressive. I'd be interested to hear the Legion's perspective." → *"A diplomat. Rare in these lands..."*

### Vera — Gun Runner Rep (neutral, Gun Runners faction, x:5 y:3)

**Greeting:**
> "Looking to buy, sell, or just drinking? I'm open for all three."

- "What do you buy?" → *"Weapons, ammo, and working parts..."*
  - `[INT 7+]` "Do you deal in energy weapons?" → *"Oh, a connoisseur..."*
  - `[INT ≤3]` "You have... boom stick? Big boom?" → *"...Yes. I have 'boom sticks.'"*
- "What do you know about the local situation?" → *"Powder Gangers are getting bold..."*
- "The Gun Runners don't pick sides?" → *"We pick the side of the cap..."*
  - `[INT 7+]` "Selling to both sides of a conflict doubles your revenue but also makes you a target for both." → *"That's why Gun Runners travel in packs..."*
- `[CHA 7+]` "I like a woman who knows the value of a good deal..." → *"Ha! Flattery won't get you a discount..."*
- `[CHA ≤3]` "Sell me something useful or stop talking." → *"Charming. Tell you what — I'll sell you whatever you want at full price..."*

### Frankie — The Kings (friendly, Kings faction, x:6 y:3)

**Conditional Greeting — after completing `kings_missing_courier`:**
> "Hey, it's you! The one who found Danny! Man, The King hasn't stopped talking about it..."
- "How's Danny doing?" → *"Back on the route, believe it or not..."*
- "How are things with the Kings?" → *"Good, real good. Morale's up..."*

**Default Greeting:**
> "Hey, friend. New blood in the valley. The King says everyone deserves a fair shake — I'm inclined to agree."

- "Who are The Kings?" → *"Born in Freeside..."*
  - `[INT 7+]` "Elvis Presley — pre-war entertainer, 1935 to 1977..." → *"...Wow. You know your history..."*
  - `[INT ≤3]` "Who's Elvis? Is he here? Can I meet him?" → *"He's... well, he's been dead for about 250 years, friend..."*
- "Anything you need help with?" → *"Actually, yeah. There's a courier gone missing..."*
  - "I'll keep an eye out. Where was he last seen?" → `QUEST GRANT: kings_missing_courier` / `FACTION: kings +2`
  - `[CHA 7+]` "You've got my word. I'll find your man..." → `QUEST GRANT: kings_missing_courier` / `FACTION: kings +5`
  - `[INT ≤3]` "Me find lost mail man!" → `QUEST GRANT: kings_missing_courier`
  - "Not my problem." → *"Fair enough..."*
- "What do you think of the Legion over there?" → *"I think he should drink his drink and stay on his side of the bar..."*
- `[CHA 7+]` "The King's got good taste in representatives. You seem like good people." → *"Hey, thanks!"*
- `[CHA ≤3]` "Elvis impersonators? In the apocalypse? Seriously?" → *"Hey, don't knock it till you try it..."*

### Boxcars (hostile, Powder Gangers faction, x:7 y:3)

**Greeting:**
> "Don't look at me. I'm just drinking."

- "You look like trouble." → *"And you look like someone who's gonna have a bad day..."*
  - `[INT 7+]` "The defensive posture, the shaking hands — you're not a threat, you're scared..." → *"...Keep your voice down. The Gangers are getting organized..."*
- "No trouble here. Just curious." → *"...Fine. We're Powder Gangers..."*
  - `[INT ≤3]` "Why do they call you Powder Gangers? Do you make baby powder?" → *"...Baby powder. Yeah, sure..."*
- "Is it true the NCR locked you up?" → *"Worked us half to death on a railroad..."*
- `[CHA 7+]` "Relax. I'm not NCR and I'm not looking for a fight. Can I buy you a drink?" → *"Boxcars eyes you suspiciously, then relaxes slightly..."*
- `[CHA ≤3]` "Powder Gangers, right? You people blow things up real good." → *"Boxcars stands up abruptly..."*

### Dex (friendly, x:3 y:5) — Companion

**Greeting:**
> "*A lean, weathered man sits alone, nursing a drink. He watches you approach with sharp, appraising eyes.* You look like someone with a purpose. That's rare around here."

- "Who are you?" → *"Name's Dex. Used to run guard for the Crimson Caravan..."*
  - "I'm sorry about your crew." → **Offer Join**
  - "Sounds rough. What's your plan now?" → **Offer Join**
  - `[INT 7+]` "An ambush on the north road — that's organized. Raiders don't usually coordinate like that." → *"You're not wrong. The hit was too clean..."*
    - "I'm in. Let's find out who set up your crew." → `COMPANION RECRUIT: dex`
- "Why are you sitting alone?" → *"Everyone here's got a faction or a friend. I had a caravan..."*
  - "Maybe I'm that something." → **Offer Join**
- `[CHA 7+]` "You look like you can handle yourself. I could use someone like that." → *"Straight to the point. I respect that..."*
  - "Welcome aboard, Dex." → `COMPANION RECRUIT: dex`

**Offer Join:**
> "Look, I'll be straight with you. I've got skills — caravan guard, seven years..."
- "Alright, Dex. You're with me." → `COMPANION RECRUIT: dex` → *"About damn time. I was starting to grow roots..."*
- "I work alone." → *"Dex nods slowly and turns back to his drink..."*
- `[CHA 7+]` "Seven years of caravan work? That's valuable. But I need to know you won't cut and run when it gets ugly." → *"Dex holds your gaze without flinching..."*
  - "That's good enough for me. Let's go." → `COMPANION RECRUIT: dex`

### Scavenge the Dog (friendly, x:5 y:6)

**Greeting:**
> "*The dog wags its tail and sniffs your hand.*"

- "Pet the dog." → *"Scavenge leans into your hand and closes his eyes..."*
  - "Keep petting." → *"Scavenge rolls onto his back. Maximum wasteland happiness achieved."*
- "Examine the dog." → *"A scraggly-eared mutt, lean but bright-eyed..."*
- "Feed the dog." → *"Scavenge sniffs your pockets hopefully..."*
  - "Share some food with Scavenge." → `INVENTORY TAG GATE: food` / `CONSUME ITEM` → *"Scavenge devours the food in three bites..."*
    - "Good boy." → *"Scavenge barks once — sharp and happy..."*
  - "Sorry boy, I don't have anything." → *"Scavenge sniffs hopefully... you don't have any food..."*
- `[INT 7+]` "Check the dog for parasites and injuries." → *"You check behind the ears and along the belly. No ticks, no mange..."*
- `[INT ≤3]` "PUPPY! ME LOVE PUPPY!" → *"Scavenge is startled by the volume but then starts licking your face enthusiastically..."*

### Interactables

**Bar Counter** — Examine / Buy Drinks
**Pool Table** — Examine / Play Pool / Steal Cue Ball (steal: `cue_ball`)
**Jukebox** — Examine / Play Music / Steal Caps (steal: 15 caps)
**Notice Board** — Examine / Read Bounty Notice / Read Caravan Notice / Read Reactor Warning

---

## 3. The King's Court

### The King (friendly, Kings faction, x:3 y:1)

**Conditional Greeting — after completing `kings_rescue_danny`:**
> "*The King rises from his throne and spreads his arms wide.* There they are! The hero of the hour. Danny's back safe and sound..."
- "How's Danny holding up?" → *"Shaken up, but alive. Pacer's been hovering over him..."*
- "How are the Kings holding up?" → *"Better than ever. Morale's through the roof..."*
- "Got any more work?" → *"Always. The wasteland never runs out of problems..."*

**Conditional Greeting — after failing `kings_rescue_danny`:**
> "*The King regards you coolly from his throne.* Pacer took some boys out and found Danny. He's alive — barely. Would've been nice if someone had helped..."
- "I'm sorry I didn't help." → *"Words are cheap out here, friend..."*
- "Glad he's safe." → *"Yeah. No thanks to you..."*

**Conditional Greeting — after completing `kings_missing_courier`:**
> "*The King leans forward on his throne, expression serious but grateful.* Welcome back, friend. Getting that satchel back was solid work..."
- "I'll go find Danny myself." → `QUEST GRANT: kings_rescue_danny` / `FACTION: kings +5`
- "I'm sure your people will find him." → `QUEST GRANT: kings_rescue_danny` / `QUEST FAIL: kings_rescue_danny` / `KARMA -5` / `FACTION: kings -5`
- "How are the Kings holding up?" → *"Better, thanks to you..."*

**Default Greeting:**
> "*A man in a perfectly maintained leather jacket and impeccable pompadour looks up from his throne.* Well, well. A new face in the Court. Welcome, friend. I'm The King. And before you ask — yes, that's my real title. Around here, it means something."

- `QUEST GATE: kings_missing_courier` / `INVENTORY GATE: courier_satchel` / `CONSUME ITEM` / `QUEST COMPLETE: kings_missing_courier` "I found your courier's satchel at the Caravan Waystation." → *"Danny's satchel... this is his, alright..."* → leads to Danny rescue offer
- "Who are the Kings?" → *"We're a family. Started in Freeside..."*
  - `[INT 7+]` "Elvis Aaron Presley, 1935-1977. You've modeled an entire social structure on a pre-war entertainer..." → *"Well now. I don't get many academics in here..."*
  - `[INT ≤3]` "So you're all named King? That must get confusing at dinner." → *"...No. I'm The King. They're the Kings..."*
  - "What's the code?" → *"Simple. Take care of your own..."*
- "I heard you're looking for a missing courier." → *"Yeah. One of our boys. Name's Danny..."*
  - "I'll find him. Where was he last seen?" → `QUEST GRANT: kings_missing_courier` / `FACTION: kings +3`
  - `[CHA 7+]` "You have my word. I'll bring Danny home..." → `QUEST GRANT: kings_missing_courier` / `FACTION: kings +5`
  - `[INT 7+]` "Three days overdue on a known route. That narrows the search area significantly. Was he carrying anything valuable?" → *"Sharp. He was carrying dispatches..."*
    - "I'll check the ridgeline approach. Consider it done." → `QUEST GRANT: kings_missing_courier` / `FACTION: kings +5`
  - `[INT ≤3]` "Danny lost? Me find Danny! Me good finder!" → `QUEST GRANT: kings_missing_courier` / `FACTION: kings +1`
  - "Sorry, I've got my own problems." → *"I understand..."*
- "What's your territory like?" → *"We hold a few blocks around the Court..."*
- "What do the Kings stand for?" → *"Freedom. Dignity..."*
- `[CHA 7+]` "I've heard of you. They say The King is the most charismatic leader in the wasteland. I can see why." → *"Well now, I see you've got some style yourself..."*
- `[CHA ≤3]` "You named yourself 'The King'? Bit much, don't you think?" → *"Pacer takes a step forward, but The King waves him off..."*

### Pacer (wary, Kings faction, x:6 y:2)

**Conditional Greeting — after completing `kings_rescue_danny`:**
> "*Pacer nods at you with something that might be respect.* Danny's back. Kid's shaken up, but he'll be alright..."

**Conditional Greeting — after failing `kings_rescue_danny`:**
> "*Pacer glares at you.* We found Danny ourselves. No thanks to you..."

**Conditional Greeting — after completing `kings_missing_courier`:**
> "*Pacer is pacing near the door, agitated.* You got the satchel back — good. But Danny's still out there..."

**Default Greeting:**
> "*A heavyset man with slicked-back hair cracks his knuckles.* You're in the King's Court. Show respect or the door's that way. Your choice."

- "What's your role here?" → *"I keep the King safe..."*
- "Is there trouble I should know about?" → *"There's always trouble..."*
- `QUEST GATE: kings_missing_courier` "I heard about Danny. What's going on?" → *"There's always trouble. NCR keeps pushing..."*
- `[CHA 7+]` "Easy, friend. I come in peace..." → *"Pacer relaxes slightly..."*
- `[CHA ≤3]` "You don't scare me, pompadour." → *"Pacer's jaw tightens..."*

### Rex the Cyberdog (friendly, Kings faction, x:4 y:1)

**Greeting:**
> "*A cyberdog with a partially exposed brain case wags its mechanical tail...*"

- "Pet Rex carefully." → *"Rex leans into your hand. His tail wags faster..."*
  - "Look in the direction Rex is indicating." → *"Rex is pointing toward the east road — the same direction Danny took..."*
- "Examine Rex's cybernetics." → *"Rex is a pre-war cyberdog — organic brain in a mechanical body..."*
- `[INT 7+]` "Pre-war military cyberdog, probably a K-9000 variant..." → *"Rex tilts his head at you, as if recognizing someone who understands what he is..."*
- `[INT ≤3]` "ROBOT PUPPY! Can I keep him?!" → *"Rex backs away slightly from the volume..."*

### Interactables

**Jukebox** — Play Music (*"'Hound Dog' crackles through ancient speakers..."*) / Examine
**Theater Stage** — Examine
**The King's Chair** — Examine (*"A salvaged movie theater seat, elevated on a platform..."*)

---

## 4. Abandoned Gas Station

No NPCs.

### Interactables

**Gas Pump** — Examine (*"A rusted Poseidon Energy pump..."*)
**Store Shelves** — Look Around / Take Fancy Lads Snack Cakes (grants `fancy_lads_snack_cakes` [food])
**Back Room Cache** — Examine / Take Makeshift Repair Kit (grants `makeshift_repair_kit` — needed for `save_vault_47`)

---

## 5. Caravan Waystation

### Cassidy (neutral, Traders faction, x:3 y:2)

**Greeting:**
> "Another drifter. Welcome to the waystation — long as you're buying, selling, or moving on. Name's Cassidy. I run the caravan through this stretch of nowhere."

- "What are the trade routes like right now?" → Three routes described
  - `[INT 6+]` "If the east road is compromised, that creates a bottleneck on the north fork. Prices must be inflating." → *"Sharp. Yeah, supply costs are up 40%..."*
- "Heard any good rumors lately?" → Reactor, missing courier, cache rumors
- "What kind of goods are you moving?" → *"Basics, mostly..."*
  - `[CHA 6+]` "Sounds like essential supplies. I bet you could use someone reliable on the road." → `FACTION: traders +1`
- `[CHA 7+]` "Between you and me, Cassidy — I know how business works. What's really moving out here?" → *"...The real money isn't in water or food — it's in tech..."*
  - `[CHA 8+]` "Sounds like you could use a silent partner for those kinds of deals." → `FACTION: traders +3`
- `[CHA ≤3]` "You look like you sell junk to idiots. Am I wrong?" → *"...Wow..."*
- `[INT 7+]` "Your wagons are heavy but your guards are light. Supply chain optimization issue or budget constraint?" → *"...You're right — I'm running lean on guards..."*
  - `[INT 8+]` "If you stagger your departures and use decoy wagons..." → `FACTION: traders +5`
- `[INT ≤3]` "You sell... things? From the wagon? How does wagon know where to go?" → *"The brahmin pull the wagon..."*
- `QUEST GATE: kings_missing_courier` "I heard a Kings courier went missing. Know anything?" → Danny courier info with INT/CHA follow-ups

### Brick (neutral, x:5 y:3)

**Greeting:**
> "*A mountain of a man leans on a battered rifle, scanning the horizon.* Road's dangerous. You armed?"

- "What kind of dangers?" → Radscorpions, Powder Gangers, reactor
  - "What's coming out of the reactor?" → Blue pulsing lights, non-human tracks
    - `[INT 7+]` "Bioluminescence combined with unusual tracks — could be a new strain of ghoul mutation, or something mechanical." → *"Mechanical? Like robots? ...That's somehow worse..."*
- "I heard the Powder Gangers are active out here." → *"Active? They're running the east road like they own it..."*
- "You been doing this long? Guarding caravans?" → 12 years
  - `[CHA 5+]` "Twelve years is impressive..." → *"More than I'd like..."*
  - `[CHA ≤3]` "Twelve years? Doing THIS?" → *"Brick's grip tightens on his rifle..."*
- `[CHA 6+]` "Armed enough. I can handle myself." → *"Maybe you can..."*
- `[CHA ≤3]` "Why do you care? Mind your own business, big guy." → *"...Did you just tell me to mind my own business? At my waystation?"*
- `[STR 7+]` "*Crack your knuckles.* I don't need a weapon." → *"Ha! Alright, tough guy. I respect that..."*
- `[INT ≤3]` "What is 'armed'? Like... more arms? I only got two." → *"...Armed. With weapons. Do you have weapons..."*

### Interactables

**Notice Board** — Examine / Read Bounty Notices / Read Caravan Routes
**Campfire** — Examine / Rest by the Fire

---

## 6. Crashed Vertibird Wreckage

### Tinker (neutral, x:3 y:2)

**Greeting:**
> "*A wiry figure looks up from a tangle of wires, goggles pushed up on their forehead.* Huh? Oh — another scavenger. Thought I had this wreck to myself. Name's Tinker."

- "What is this place?" → *"Pre-war military aircraft..."* → Brotherhood/radiation follow-ups
- "Find anything good in here?" → Copper wire, servos; gyroscope and flight computer locked
- "Interested in trading information?" → Intel exchange
  - `[CHA 6+]` "How about a fair exchange?" → Brotherhood cache location
- `[INT 7+]` "That's a VB-02 airframe. Pre-war tiltrotor design. What's the engine status?" → *"You know your aircraft!"*
  - `[INT 8+]` "A self-correcting gyroscope would need rare-earth magnets..." → *"Now you're talking my language! Neodymium magnets..."*
- `[INT ≤3]` "Big bird fall down go boom?" → *"...Yeah. Big bird fall down go boom..."*
  - `[INT ≤3]` "Me no touch! ...What that shiny thing?" → *"NO! Don't — that's a capacitor..."*
- `[CHA 6+]` "No claim-jumping here. Plenty of wreck for both of us." → *"Ha, appreciate that..."*

### Interactables

**Cockpit Console** — Examine / Attempt Data Recovery / `[INT 7+]` Bypass the encryption (*"Flight logs scroll past — the vertibird was carrying classified cargo..."*)
**Cargo Bay** — Search / Pry Open Sealed Container (grants `vertibird_gyroscope`) / Examine Crate Markings

---

## 7. Sunset Acres

No NPCs. Environmental storytelling location.

### Interactables

**Mailbox** — Examine / Open Mailbox (*"'Dear Tom — Sarah's recital is Saturday at 3. Don't forget flowers this time...' The date is October 22, 2077. One day before the bombs fell."*)
**Basement Hatch** — Examine / Search Below (grants `prewar_money`)
**Kitchen Counter** — Examine (*child's drawing: "MY FAMLY by Sarah H. age 6"*) / Read Note on Counter (*"Tom — went to get Sarah from school. The sirens are going off..."*)

---

## 8. St. Mercy General Hospital

### Doc Sawyer (friendly, x:4 y:2)

**Greeting:**
> "Well now, a visitor. Welcome to St. Mercy — or what's left of it. I'm Doc Sawyer. If you're hurt, you came to the right place..."

- "You're a real doctor? Out here?" → Followers of the Apocalypse training → Followers info
  - `[INT 6+]` "Followers training is good, but limited. Did you supplement with pre-war medical texts?" → *"Exactly right..."*
    - `[INT 8+]` "Have you found anything about pre-war surgical techniques that we've lost?" → Auto-Doc Mark IV schematics
  - `[CHA 5+]` "That's admirable. The wasteland needs more people like you." → *"Kind of you to say..."*
- "How's the medical supply situation?" → Dire; stimpaks for two weeks
  - `[INT 6+]` "The hospital pharmacy — have you fully cleared it?" → Controlled substances vault
  - `[CHA 5+]` "That sounds incredibly difficult. How do you keep going?" → Bullet removal story
- "What's the story with this hospital?" → Built 2041, expanded 2065
  - "Ferals? Are there still ghouls in the building?" → Upper floors sealed
  - "What's in the basement?" → Storage, morgue, pharmacy vault
    - `[INT 7+]` "Electronic lock — if the terminal network is still active, there might be an override code..." → Admin office on feral-infested 2nd floor
  - `[INT 7+]` "Backup power after two hundred years?" → Micro-fusion cells, military grade
- `[INT 7+]` "That operating table — you've been performing actual surgeries?" → *"Anesthetic is my biggest challenge..."*
  - `[INT 8+]` "Barrel cactus contains mescaline analogs — combined with the cognitive enhancement from mentats..." → *"You know your pharmacology!"*
- `[CHA 7+]` "Doc, I've been through the wringer. Any chance you could patch me up?" → Free healing
  - `[CHA 8+]` "You're a good man, Doc. The wasteland doesn't deserve you." → *"...Thank you. I don't hear that often..."*
- "I might have some things to trade for medical supplies." → Barter system
- `[CHA ≤3]` "Great, another quack playing doctor in a ruin." → *"'Quack.' Right. I'll remember that when you come crawling back with a bullet in your gut..."*
- `[INT ≤3]` "You a doctor? Can you fix my think-muscle?" → *"Your... think-muscle. You mean your brain?"*
  - `[INT ≤3]` "I dunno about reactors but I did eat a lot of glowing mushrooms when I was little. They tasted like angry." → *"Glowing mushrooms. Tasted like 'angry.' That is... genuinely the most medically alarming thing anyone has ever said to me..."*

### Interactables

**Pharmacy Counter** — Examine / Search Behind Counter (grants `stimpak`)
**Patient Records Terminal** — Examine / Access Patient Records / `[INT 7+]` Attempt Data Recovery (FEV, West Tek, Batch 11-011)
**Operating Table** — Examine / Inspect Surgical Tools

---

## 9. Bitter Hollow Cave

### Cave Raider / Kell (hostile, x:3 y:1)

**Conditional Greeting — after completing `danger_in_the_hollow`:**
> "*Kell looks up from a makeshift campfire, and for once the machete stays on the ground.* You actually did it..."
- "What are you going to do now?" → Crossroads Market, honest work
- "Are the Powder Gangers still a threat?" → Not to Kell anymore
- "You keeping the cave?" → Standing offer to use it

**Default Greeting:**
> "*A figure rises from the shadows, hand on a rusted machete.* Turn around. Now. This cave is mine."

- "Who are you?" → *"Nobody. Just someone who got in too deep with the wrong people..."* → Deal offer
- "What's in this cave?" → *"Supplies. Some weapons..."* → Deal offer
- `[CHA 7+]` "Easy. I'm not here for trouble. Looks like you're hurt..." → *"The raider hesitates, then winces..."*
  - "Let me take a look at that wound." → *"You patch the worst of it..."*
  - "Maybe I can help with the Ganger problem too." → **Make Deal**
- `[CHA ≤3]` "You point that thing at me again and I'll shove it somewhere dark." → *"Ha! Okay, tough guy..."*
- `[INT 7+]` "You're favoring your left side. Broken ribs, maybe two..." → *"...How did you — yeah. Two ribs, maybe three..."*
- `[INT ≤3]` "Ooh, dark cave! Me like caves. You live here? Like a bat?" → *"I can't stab someone this stupid. It wouldn't be right."*
  - "We friends now? Me like friends!" → **Make Deal**

**Make Deal:**
> "The raider lowers the machete slightly. ...I'm listening. There's a stash of dynamite the Gangers want back..."
- "Deal. Where's the dynamite?" → `QUEST GRANT: danger_in_the_hollow` / `FACTION: powder_gangers -2`
- `[CHA 7+]` "I'll do it — but you owe me. Whatever's in that cache, I get half." → `QUEST GRANT: danger_in_the_hollow`
- "Not my problem. Good luck." → *"Grips the machete tighter..."*

### Interactables

**Hidden Cache** — Examine / Search Thoroughly / Take .38 Rounds / Take Map Fragment

---

## 10. Gun Runner Depot

### Isaac (friendly, Gun Runners faction, x:2 y:1)

**Greeting:**
> "Welcome to the Gun Runner Depot. Isaac's the name, arms dealing's the game."

- "What have you got for sale?" → Standard inventory → **Weapon Shop** (with prices)
  - `[INT 7+]` "What's the muzzle velocity on your hunting rifles?" → *"Forged receivers, hand-fitted. 2,800 feet per second..."*
  - `[INT ≤3]` "Which one makes the biggest boom?" → *"...That'd be the grenade launcher, but I'm not sure I should sell you one..."*
  - "Tell me about the energy weapons." → Fusion cells discussion
    - `[INT 7+]` "High-output fusion cell... that sounds like it could jump-start a dormant reactor..." → Spire connection
- "You deal in pre-war tech?" → *"When we can get it..."*
  - `[INT 7+]` "The Brotherhood's Codex technically claims all pre-war tech. How do you navigate that legally?" → *"Legally? Ha!"*
- "Tell me about the Gun Runners." → *"Oldest weapons manufacturer in the NCR..."*
- "What do you know about the local situation?" → Raiders, NCR, reactor, Kings
- `[CHA 7+]` "A man who knows his craft. I respect that..." → *"A smooth operator, huh?"*
- `[CHA ≤3]` "Just show me the guns. Skip the sales pitch." → *"All business. Fine by me..."*

**Weapon Shop** (buy with caps):
- 9mm Pistol — 50 caps
- 10mm Pistol — 75 caps
- Hunting Rifle — 250 caps
- Service Rifle — 300 caps
- Combat Shotgun — 350 caps
- Sawed-Off Shotgun — 120 caps
- Combat Knife — 30 caps
- Laser Pistol — 200 caps

### Apprentice (neutral, x:2 y:3)

**Greeting:**
> "*The young apprentice looks up from filing a gun barrel...* Oh, hey! Sorry, didn't see you come in. I'm still learning the trade."

- "How long have you been apprenticing?" → Six months, trigger assembly incident
- "What's Isaac like as a teacher?" → *"Tough but fair..."*
- "Any tips for someone new to the wasteland?" → *"Keep your weapon clean..."*
  - `[INT ≤3]` "What's a cazza... cazzadoor... big bug?" → *"Yeah! Big bug! Very poisonous big bug!"*
- `[CHA 7+]` "Keep at it. The wasteland needs good craftspeople." → *"Thanks! That actually means a lot..."*
- `[INT 7+]` "Your filing angle is off by about three degrees." → *"You're... you're right..."*

### Interactables

**Workbench** — Examine / Use
**Weapon Display Case** — Examine

---

## 11. Raider Overlook

### Gristle (hostile, Raiders faction, x:3 y:1)

**Greeting:**
> "*A heavily scarred man with a shaved head and a necklace of dog tags...* Well, well. Either you're the bravest or the dumbest thing to walk into my camp. What do you want?"

This is the most complex dialogue tree in the game with many resolution paths:

- "I'm here to put an end to your raiding, Gristle." → Confrontation path
  - "Surrender and I'll let you walk." → `FACTION: rangers +5` → *"Walk? WALK? I've got fifteen people depending on me..."*
    - "I'll talk to the rangers. Reduced sentences for cooperation." → `FACTION: rangers +5`
      - `[CHA 7+]` "I give you my word. Cooperation for leniency." → `FACTION: rangers +10` / `KARMA +5`
  - "Last chance. Drop your weapons." → *"You've got nerve..."*
  - `[CHA 7+]` "Your people are hungry, Gristle. The NCR will wipe you out eventually. I'm offering a way out." → **Disband path**
- "I'm here to talk, not fight." → Negotiation path
  - "The rangers want you gone. I can tell them the job's done — if you actually leave." → *"And what — we just disappear?"*
  - "What do you actually need?" → *"Food. Medicine. A place..."*
    - "Help me shut this operation down peacefully and I'll find your people work." → `FACTION: rangers +5` / `KARMA +3`
  - `[INT 7+]` "Your supply lines are cut, your ammo is running low..." → *"You've done your homework..."*
    - "Disband. Leave the valley." → `FACTION: rangers +8` / `KARMA +3` → Disband
    - "Give me everything you know about raider operations." → Intel offer
- "I've killed worse than you. Stand down or join them." → Intimidation path
  - `[STR 7+]` "*Crack your knuckles and step forward.* Try me." → *"Gristle takes a step back..."*
    - "Pack up and leave. Tonight." → `FACTION: rangers +5`
- `[CHA 8+]` "Look around you, Gristle. Dwindling supplies, NCR closing in..." → **Disband path** → `FACTION: rangers +10` / `KARMA +5`
- "Before anything happens — why? Why raid the valley?" → *"We were Powder Gangers once..."*
  - `[PER 6+]` "You keep looking at that map. You're planning something bigger, aren't you?" → *"One last hit — the NCR supply convoy..."*
    - "Cancel it. Walk away now and I keep this between us." → `FACTION: rangers +5` / `KARMA +3`
    - "The rangers will want to know about this." → `FACTION: rangers +8`
- `[INT ≤3]` "You Gristle? You look like a gristle. What a gristle?" → *"...Gristle. It's the tough bit in meat..."*
  - `[INT ≤3]` "Me like meat! We friends now?" → *"No. We are not friends..."*

### Raider Guard (hostile, Raiders faction, x:5 y:2)

**Greeting:**
> "*A raider with a pipe rifle slung across their back...* You shouldn't be here. Boss didn't say nothing about visitors."

- "I'm here to see Gristle." → *"Boss is over there..."*
- "Just passing through." → *"Nobody 'passes through' a raider camp..."*
- `[CHA 6+]` "Easy. I'm not looking for trouble. Gristle and I have business." → *"...Fine. But I'm watching you..."*
- "Out of my way." → *"Big talk..."*

### Interactables

**Lookout Telescope** — Examine / Look Through / `[PER 6+]` Study the patrol route markings (*"Two-hour window every afternoon..."*)
**Ammo Crate** — Examine / Take .308 Rounds / Steal the Rest

---

## 12. Rusty's Scrapyard

### Rusty (neutral, x:2 y:2)

**Conditional Greeting — after completing `water_for_the_valley`:**
> "*Rusty looks up and his weathered face breaks into a genuine grin.* Well I'll be damned. The water's flowing..."
- "How's the plant running?" → 80% capacity and climbing
- "How are you doing, Rusty?" → Visits Copper's grave every morning
- "Got anything good in stock?" → Top shelf, preferred rates

**Default Greeting:**
> "*A stocky man with oil-stained coveralls and a prosthetic left hand...* Customer or scavenger? Either way, welcome to Rusty's. Touch anything without asking and you lose a finger..."

- "I'm looking to trade." → Parts, scrap, salvage
  - `[CHA 7+]` "Fair is good. But I have a feeling you could do better for a regular supplier." → 20% preferred rates deal
- "What kind of parts do you have?" → Generators, pumps, filters...
- "I heard something about a water purification plant nearby." → *"The old water purification plant, east of the valley..."*
  - "What's stopping it?" → Three problems: pump, ferals, technician
    - `[INT 7+]` "A pump regulator, feral clearance, and a technician. That's a solvable problem..." → *"You think like an engineer..."*
      - "Sounds like a plan." → `QUEST GRANT: water_for_the_valley` / `FACTION: scrapyard +5` / `KARMA +3`
  - "Why do you care about it?" → Daughter Copper story
    - "I'm sorry about your daughter." → *"Her name was Copper. Ironic, right?..."*
      - "We'll get that plant running. For Copper." → `QUEST GRANT: water_for_the_valley` / `FACTION: scrapyard +8` / `KARMA +5`
  - "I might be able to help with that." → `QUEST GRANT: water_for_the_valley` / `FACTION: scrapyard +5`
- `[CHA 7+]` "Nice operation you've got here..." → Partnership talk → `QUEST GRANT: water_for_the_valley`
- `[INT 7+]` "That's a pneumatic-assist prosthetic. Pre-war medical tech..." → Vault 34 story
  - `[INT 8+]` "Vault 34 used Broomhandle actuators..." → *"Ha! Someone actually knows their Vault-Tec engineering..."*
- `[CHA ≤3]` "Lose a finger? Whatever, stump-hand." → *"Rusty's prosthetic hand clenches with an audible whir..."*
- `[INT ≤3]` "You name Rusty because you rusty?" → *"...That's... actually, yeah..."*
  - `[INT ≤3]` "Me want shiny thing! Shiniest thing you got!" → Chrome hubcap for 5 caps

### Interactables

**Workbench** — Examine / Attempt Repair / `[INT 7+]` Calibrate tools and attempt precision repair / Examine Blueprints
**Scrap Pile** — Examine / Search for Useful Parts / Take Wrapped Component (grants `pump_regulator`) / `[PER 6+]` Look for anything hidden

---

## 13. Brotherhood Bunker

### Paladin Ramos (wary, Brotherhood faction, x:3 y:1)

**Greeting:**
> "*A powerfully built man in a Brotherhood flight suit rises from behind a desk, hand resting on a holstered laser pistol.* You shouldn't be here. State your name, your business, and how you found this location. You have thirty seconds."

- "I'm a traveler. I found the ventilation shaft by accident." → *"By accident. Right..."* → Brotherhood mission / artifact search
- `[CHA 7+]` "Paladin. I come with respect for the Brotherhood's mission..." → *"Mutual benefit. That's not a phrase most wastelanders use with us..."*
- `[CHA ≤3]` "Relax, tin man. I'm not here to steal your toys." → *"'Tin man.' That's what you're going with?"*
  - "Bad joke. I apologize." → Reluctant thaw
- `[INT 7+]` "Paladin-rank — that puts you at least ten years in the Brotherhood. Your bunker's ventilation system uses pre-war Poseidon Energy filters..." → *"Poseidon Energy filtration systems. You know your pre-war tech..."* → leads to respect
- `[INT ≤3]` "Ooh, cool underground place! Is this a vault? I like vaults!" → *"...It's not a vault. It's a Brotherhood of Steel forward operations bunker..."*
  - `[INT ≤3]` "You collect old stuff? Me find old stuff sometimes! We trade?" → *"Ibsen, deal with this one..."*

**Brotherhood Mission:**
> "The Brotherhood of Steel preserves dangerous pre-war technology..."
- `[INT 7+]` "The Codex — your founding document. Does it still hold up two centuries later?" → *"That's a question that's gotten more than one Knight stripped of rank..."*

**Artifact Search:**
> "We're looking for a pre-war signal processor. Military grade..."
- "I might be able to help." → `FACTION: brotherhood +2`
- `[INT 7+]` "A signal processor for long-range comms... that sounds like it could be related to the old communications spire..." → `FACTION: brotherhood +3`

### Scribe Ibsen (friendly, Brotherhood faction, x:5 y:3)

**Conditional Greeting — after completing `brotherhood_lost_tech`:**
> "*Ibsen practically leaps from his chair...* You're back! The holotape — the schematics — they're everything we hoped for!"
- "What did you find on the holotape?" → Communications array blueprints, signal encryption
- "How did Ramos take the news?" → *"He actually smiled..."*
- "What's the next step?" → Signal processor in the Spire

**Default Greeting:**
> "*A thin man in a worn lab coat looks up from a disassembled circuit board, magnifying goggles making his eyes comically large.* Oh! A visitor! Ramos didn't shoot you — that's a good sign..."

- `QUEST GATE: brotherhood_lost_tech` / `INVENTORY GATE: encrypted_holotape` / `CONSUME ITEM` / `QUEST COMPLETE: brotherhood_lost_tech` "I found an encrypted holotape at the crashed Vertibird." → *"Ibsen's hands tremble as he takes the holotape..."*
- "What are you working on?" → Reverse-engineering water purification controller
  - `[INT 7+]` "Have you tried bypassing the encryption on the ROM chip?" → *"Pin 7! I've been going through the main bus like an idiot!"*
- "Tell me about tech preservation." → *"The Brotherhood's core mission..."* → Sharing debate
- "The Paladin mentioned you're looking for something specific." → Holotape at crashed Vertibird + signal processor at Spire
  - "I'll look for the holotape at the Vertibird crash." → `QUEST GRANT: brotherhood_lost_tech` / `FACTION: brotherhood +3`
  - `[INT 7+]` "Cross-continental communications would fundamentally shift the power balance." → `QUEST GRANT: brotherhood_lost_tech` / `FACTION: brotherhood +5`
- "What's life like in the Brotherhood?" → *"Structured. Disciplined..."*
  - `[CHA 7+]` "That's genuinely inspiring." → *"You really think so?"*
- `[INT 7+]` "Is that a Wattz Electronics circuit board?" → *"A C-SERIES! You can IDENTIFY that?!"* → `FACTION: brotherhood +3`
- `[INT ≤3]` "Oooh, shiny bits! Can I touch?" → *"NO! No touching! This is a two-hundred-year-old circuit board!"*

### Interactables

**Research Terminal** — Examine / Access (password-locked)
**Weapon Rack** — Examine (locked, authorized personnel only)

---

## 14. Solar Spire Core

### Caretaker Drone (wary, x:2 y:2)

**Conditional Greeting — after completing `wake_the_spire`:**
> "WELCOME BACK, TECHNICIAN. FACILITY STATUS: OPERATIONAL. POWER OUTPUT: 4.2 kW AND STABLE..."
- "How's the facility holding up?" → All systems nominal, 47 years operational
- "Is the power reaching nearby settlements?" → Three regional nodes active
- "How are you doing, Caretaker?" → *"CARETAKER UNIT DOES NOT EXPERIENCE EMOTIONAL STATES. HOWEVER... OPERATIONAL FULFILLMENT IS AT MAXIMUM."*

**Default Greeting:**
> "ALERT — UNAUTHORIZED BIOLOGICAL ENTITY DETECTED. UNIT DESIGNATION: CARETAKER. FACILITY STATUS: COMPROMISED. STATE YOUR PURPOSE OR VACATE IMMEDIATELY."

- `QUEST GATE: wake_the_spire` / `INVENTORY GATE: fusion_cell` / `CONSUME ITEM` / `QUEST COMPLETE: wake_the_spire` "I found a military-grade fusion cell. Let's get this relay working." → *"COMPONENT DETECTED... INSTALLING... CALIBRATING... RELAY ONLINE."*
- "What is this place?" → *"DESIGNATION: SOLAR SPIRE COLLECTION FACILITY..."*
- "What happened here?" → *"ELECTROMAGNETIC PULSE EVENT — APPROXIMATE DATE: OCTOBER 2077..."*
  - `[INT 7+]` "An EMP would fuse ferrite cores but leave the capacitor bank intact..." → *"ANALYSIS: CORRECT. YOU POSSESS TECHNICAL KNOWLEDGE EXCEEDING 94%..."*
- "Can the power be restored?" → Needs stabilized fusion cell
  - `INVENTORY GATE: fusion_cell` / `CONSUME ITEM` / `KARMA +10` / `FACTION: old_world +15` — Use fusion cell directly
  - "I'll find a replacement part. Where should I look?" → `QUEST GRANT: wake_the_spire` → *"POSEIDON ENERGY MAINTAINED A SUPPLY CACHE... 'GUN RUNNER DEPOT'"*
  - `[INT ≤3]` "Me find shiny thing for robot!" → `QUEST GRANT: wake_the_spire` → *"FIND GLOWING TUBE. BRING HERE. PUT IN BIG MACHINE."*
  - "Not my problem." → *"ACKNOWLEDGED. FACILITY WILL CONTINUE DEGRADING..."*
- `[INT 7+]` "Caretaker, initiate maintenance protocol seven-seven-alpha." → *"PROTOCOL SEVEN-SEVEN-ALPHA RECOGNIZED. PRE-WAR CLEARANCE CODES STILL VALID..."* → Full facility access
- `[INT ≤3]` "Hello robot! You are a big shiny boy!" → *"CARETAKER IS NOT 'SHINY BOY.' ... HOWEVER... COMPLIMENT NOTED AND... LOGGED."*
- `[CHA 7+]` "I'm not here to cause trouble. I might be able to help..." → *"SINCERITY INDEX: HIGH."*
- `[CHA ≤3]` "Out of my way, tin can." → *"RUDENESS ASSESSMENT: MAXIMUM."*

### Interactables

**Power Console** — Examine / Access Readings
**Relay Core** — Examine / Attempt Repair (needs fusion cell)

---

## 15. Powder Ganger Camp

### Boss Eddie (hostile, Powder Gangers faction, x:5 y:1)

**Conditional Greeting — after completing `danger_in_the_hollow`:**
> "*Eddie leans back in his chair...* Look who it is. The hollow-clearer."

**Default Greeting:**
> "*A stocky man with a shaved head and prison tattoos sits behind a makeshift desk made from ammo crates.* Well, well. Either you're very brave or very stupid walking into my camp. Which is it?"

- `QUEST GATE: danger_in_the_hollow` / `INVENTORY GATE: dynamite_stash` / `CONSUME ITEM` / `QUEST COMPLETE: danger_in_the_hollow` "I've got the dynamite from the hollow." → *"Well, well. You actually did it..."*
- "Brave. I'm here to talk, not fight." → Talk options: dynamite, NCR, hollow
  - `[CHA 7+]` "I respect what you've built here..." → `FACTION: powder_gangers +3`
- "Maybe both. But I'm still standing." → *"Guts. I can work with guts..."*
- `[CHA 6+]` "Neither. I'm practical. And I think we can help each other." → Negotiation
  - Information / Trade / `[CHA 8+]` Legitimacy path → *"You're either the best liar I've ever met or the most idealistic fool..."* / `FACTION: powder_gangers +5` / `KARMA +3`
- "Nice setup you've got here..." → Breakout story
  - `[INT 6+]` "A coordinated demolitions assault on a guarded facility — that takes planning." → *"Six months..."*
- "Word is you've got dynamite." → *"Dynamite's our currency, our weapon, and our leverage..."*
  - `[CHA 6+]` "I'll be straight with you — I don't know yet..." → *"Honest. That's rare around here..."*
- `[INT 7+]` "Thirty-seven transferred, twenty-three survived the breakout. You've lost men since then. How many do you actually have left?" → *"Eighteen. I've got eighteen people..."*
  - `[INT 7+]` "Eighteen against an NCR garrison of fifty, with no supply line. That's not sustainable, Eddie." → *"You think I don't know that?"*
- `[CHA ≤3]` "Wow, a bald guy with tattoos sitting on boxes. Real scary." → *"The entire camp goes silent..."*
- `[INT ≤3]` "Is this... outside jail? Or inside jail?" → *"We BROKE OUT of jail. This is a CAMP..."*
  - `[INT ≤3]` "If no walls then how come I can't walk through the rocks? Checkmate." → *"Rocks are not walls. You cannot walk through rocks because rocks are SOLID..."*

### Scrambler (hostile, Powder Gangers faction, x:2 y:2)

**Greeting:**
> "*A wiry man with burn scars on his hands looks up from a workbench covered in blasting caps...* Don't touch anything. Seriously. One wrong bump and we're all confetti."

- "You're the demolitions guy?" → *"Demolitions expert, engineer..."*
  - "How'd you learn all this?" → Prison library, self-taught
- "I heard you blew the gates at NCRCF." → *"Three shaped charges..."*
  - `[INT 8+]` "Shaped charges require precise geometry. You calculated the Munroe effect angles in a prison cell?" → `FACTION: powder_gangers +2`
- `[INT 7+]` "Is that nitroglycerin-based or ammonium nitrate?" → *"You're the first person in this camp who would know that..."*
  - `[INT 8+]` "Someone who knows that temperature-cycled nitro should be stabilized with diatomaceous earth..." → `FACTION: powder_gangers +3`
- "I'll keep my distance." → *"Smart..."*
- `[CHA ≤3]` "Burn scars, huh? So you're the guy who's bad at his own job." → *"These are from the FIRST charge I ever built. Every one after that worked perfectly..."*
- `[INT ≤3]` "Ooh, pretty red sticks! Can I have one?" → *"NO... Those are nitroglycerin-based explosive charges..."*
  - `[INT ≤3]` "But... but the pretty red sticks... they look like candy..." → *"They are NOT candy. They are the OPPOSITE of candy..."*

### Chains (hostile, Powder Gangers faction, x:7 y:2)

**Greeting:**
> "*A massive man with a length of chain wrapped around his forearm steps into your path.* You shouldn't be here. Turn around."

- "I'm not going anywhere. Eddie and I are talking." → *"Eddie lets a lot of people talk. Not all of them leave."*
- "Easy. I'm not looking for trouble." → *"Trouble finds everyone eventually..."*
- `[CHA 7+]` "I've walked through worse places than this without breaking a sweat. Move." → *"Something like respect flickers in his eyes..."*
- "They call you Chains? Let me guess — it's not a fashion statement." → *"NCR welded it on as punishment for my third escape attempt..."*
  - `[INT 6+]` "Welded steel on skin. The infection risk alone should have killed you." → *"Almost did. Three weeks of fever..."*
- `[CHA ≤3]` "Ooh, big scary man with a chain. What are you gonna do, jingle at me?" → *"Chains doesn't say a word. He just uncoils about three feet of chain..."*
- `[INT ≤3]` "Ooh, shiny arm bracelet! Is it jewelry?" → *"The NCR welded this to my arm as punishment..."*
  - `[INT ≤3]` "But it IS pretty though. All shiny and jingly. Can I try it on?" → *"No. You cannot 'try it on.' It is WELDED to my BONES..."*

### Meyers (hostile, Powder Gangers faction, x:8 y:4)

**Greeting:**
> "*A middle-aged man with calloused hands sits apart from the others, repairing a water pump.* You're not Powder Ganger. And you're still breathing. That means Eddie's in a good mood. Lucky you."

- "You don't seem like the rest of them." → Manslaughter conviction, bar fight, mechanic
  - "Why not leave?" → No options, useful is only protection
    - `[CHA 6+]` "There are settlements that don't care about your past..." → **Escape Talk**
- "What are you working on?" → Water pump, Wattz C-series
  - `[INT 6+]` "What model? If it's a Wattz C-series, the impeller housing is interchangeable..." → *"It IS a Wattz C-series..."*
- `[CHA 6+]` "You look like a man who's in over his head. Maybe I can help." → *"Over my head doesn't begin to cover it..."*
  - `[CHA 7+]` "What if you had somewhere safe to go?" → **Escape Talk** → `KARMA +2`
  - `[INT 6+]` "The NCR needs engineers. If you turned yourself in with useful intel, they might grant amnesty." → NCR amnesty discussion
    - `[CHA 7+]` "The NCR needs engineers more than it needs examples." → `KARMA +1`
- "What do you think of Eddie?" → *"Eddie's smart. Smarter than people give him credit for. But smart and good aren't the same thing..."*
- "Are you here by choice?" → *"A bitter laugh. Choice..."*
- `[CHA ≤3]` "Great, the camp's sad sack." → *"'Sad sack.' That's... actually pretty accurate..."*
- `[INT ≤3]` "What that thing you fixing? Is it a robot?" → *"It's... it's a water pump..."*
  - `[INT ≤3]` "But what if the water pump WANTS to be a robot? You ever ask it?" → *"...No. I have not asked the water pump about its dreams..."*

### Interactables

**Dynamite Stash** — Examine / Take Dynamite Bundle (grants `dynamite_stash`)
**Prison Manifest** — Examine / Read Names
**Weapons Rack** — Examine / Steal Pipe Rifle

---

## 16. Water Purification Plant

### Engineer Torres (neutral, NCR faction, x:4 y:2)

**Conditional Greeting — after completing `water_for_the_valley`:**
> "*Torres looks up from the console — and for the first time, the dark circles under her eyes are offset by a genuine smile.*"
- "What's the current output?" → 80% and climbing
- "Has NCR command noticed?" → Colonel Moore has "renewed interest"
- "What's next for the plant?" → Expanding distribution network

**Default Greeting:**
> "*A woman in a grease-stained NCR jumpsuit looks up from a clipboard, dark circles under her eyes.* Another visitor. If you're here about the water, take a number. If you're here to help, grab a wrench."

- `QUEST GATE: water_for_the_valley` / `INVENTORY GATE: pump_regulator` "I found a pump regulator. Will this work?" → Install sequence → `CONSUME ITEM` / `QUEST COMPLETE: water_for_the_valley` / `FACTION: ncr +10` / `KARMA +5`
- "What's wrong with the water?" → Pump regulator failed 6 weeks ago → two weeks until reserves gone
  - `[INT 6+]` "What's the contamination level of the unfiltered source water?" → 340 rads per liter
- "What parts do you need?" → Pump regulator, military-grade
  - "I'll find your regulator." → `QUEST GRANT: water_for_the_valley` / `FACTION: ncr +3`
  - `[INT 7+]` "A pre-war maintenance depot would store regulators in the subsurface utility tunnels..." → `QUEST GRANT: water_for_the_valley` / `FACTION: ncr +5`
- "What are the NCR's plans for the valley?" → Garrison, water supply, trade route
  - `[CHA 7+]` "That sounds like you disagree with command's priorities." → NCR politics
- "I want to help. What can I do?" → Pump regulator needed
- `[CHA 6+]` "You seem stressed. Is it just the water, or is NCR command giving you trouble too?" → NCR politics (*"Colonel Moore wants to pull resources..."*)
  - `[CHA 7+]` "Sounds like you're fighting two battles..." → `FACTION: ncr +2`
- `[INT 7+]` "A Stage 2 filtration stall with zero pump pressure — that's a regulator failure, isn't it?" → *"You actually understand this equipment?"*
  - `[INT 8+]` "A cascade-fail with intact secondary seals means the filtration membranes should still be good." → `FACTION: ncr +3`
- `[CHA ≤3]` "Look lady, I don't care about your clipboard." → *"'Lady?' I've been keeping this valley alive on three hours of sleep..."*
- `[INT ≤3]` "Water come from... sky?" → *"...The water doesn't come from the sky here..."*
  - `[INT ≤3]` "Kill means... like, when you bonk something and it stops moving forever?" → *"Yes. Exactly like that. Dirty water bonks your insides..."*

### Interactables

**Purification Console** — Examine / Read Output Log
**Pipe Junction** — Examine / Attempt Manual Repair

---

## 17. NCR Outpost Alpha

### Corporal Hayes (friendly, NCR faction, x:3 y:1)

**Conditional Greeting — after completing `ncr_raider_problem`:**
> "*Hayes stands at attention and gives a sharp nod.* Outstanding work..."

**Default Greeting:**
> "At ease, traveler. Corporal Hayes, NCR 5th Battalion. We don't get many visitors out here — which means you're either lost or looking for work."

- `QUEST GATE: ncr_raider_problem` / `QUEST COMPLETE: ncr_raider_problem` "The raiders at the overlook are dealt with." → *"Outstanding work, civilian..."* / `FACTION: ncr +10`
- "I'm looking for work. What's the situation?" → Raiders hitting supply convoys
  - "Point me in the right direction. I'll handle it." → `QUEST GRANT: ncr_raider_problem` / `FACTION: ncr +3`
  - `[INT 7+]` "Three convoys hit on the same road suggests they have a fixed observation post." → Tactical intel → `QUEST GRANT: ncr_raider_problem` / `FACTION: ncr +5`
  - `[INT ≤3]` "Raiders bad? Me go punch raiders!" → `QUEST GRANT: ncr_raider_problem` / `FACTION: ncr +1`
  - `[CHA 7+]` "NCR has deep pockets. If I'm doing your battalion's job, I expect proper compensation." → Double rations, NCR scrip → `QUEST GRANT: ncr_raider_problem` / `FACTION: ncr +5`
  - "Not my problem, Corporal." → *"Can't say I'm not disappointed..."*
- "What is this place?" → NCR Outpost Alpha, forward operating base
  - `[INT 7+]` "Forward operating base with only two personnel?" → *"Perceptive. Yeah, we're spread thinner than pre-war paint..."*
- "Tell me about the NCR presence here." → *"The Republic's trying to secure Frontier Valley..."*
- `[CHA 7+]` "Corporal. It's good to see the Republic holding the line out here." → *"Appreciate that, truly..."*
- `[CHA ≤3]` "Great. More NCR grunts playing soldier." → *"Playing soldier? Listen here..."*

### Private Torres (neutral, NCR faction, x:4 y:3)

**Greeting:**
> "Civilian on site. State your business. ...Sorry, habit. Torres, NCR infantry."

- "What's NCR life like out here?" → Long hours, bad food
  - "Do you miss home?" → The Hub
- "What's the Corporal like?" → *"Hayes is solid..."*
- "What are the biggest threats in the area?" → Raiders, Powder Gangers, reactor rumors
  - `[INT 7+]` "A pre-war reactor would still have residual radiation. Has anyone done a survey?" → No resources
  - `[INT ≤3]` "Oooh, spooky reactor! Do ghosts live there?" → *"Ghosts? No. Radiation? Yes..."*
- `[CHA 7+]` "Must get lonely out here." → *"Yeah. It is, actually..."*
- `[CHA ≤3]` "You look bored out of your skull." → *"...Thanks for noticing..."*

### Interactables

**NCR Supply Crate** — Examine
**Radio Equipment** — Examine / Use

---

## 18. Radio Tower Bravo

### Ghost (neutral, x:2 y:1)

**Conditional Greeting — after completing `signal_in_the_dark`:**
> "*Ghost looks up from the console, and for the first time, there's something like peace behind those dark eyes.*"
- "What are the remnants saying?" → Doctor, engineer, teacher coming out of hiding
- "How are you holding up?" → *"Ghost actually smiles — thin, uncertain..."*
- "Is the threat from the southeast still out there?" → Sharing intel, coordinating

**Default Greeting:**
> "*A gaunt figure in a patched duster sits in the corner, headphones around their neck and a 10mm pistol on the desk.* You found the tower. Either you're very curious or very lost. Which is it?"

- `QUEST GATE: signal_in_the_dark` / `QUEST COMPLETE: signal_in_the_dark` "I found the repeater station." → *"You found it. The repeater is real..."*
- "Curious. I followed the signal." → *"Ghost tenses..."* → Signal truth
- "A little of both. What is this place?" → Radio Tower Bravo, pre-war emergency broadcast
- "Who are you and what are you broadcasting?" → *"Call me Ghost..."* → Remnants, warning
- `[INT 7+]` "That's pre-war military encryption on your broadcast frequency." → *"Ghost's hand moves toward the pistol..."*
  - "None of the above. Just well-read." → Knowledge preservation
  - `[INT 8+]` "Enclave standard modulation, but the handshake protocol is modified..." → *"In three years of broadcasting, no one has figured that out..."* → `FACTION: old_world +3` → Ghost's needs
- `[CHA 6+]` "Easy. I'm not here to cause trouble. You look like you could use a friend." → *"A friend. Haven't had one of those in a while..."* → Promise required
  - "What's the promise?" → Don't tell NCR, Brotherhood, anyone
    - "You have my word." → Trust earned → signal truth
    - `[CHA 7+]` "I'll keep your secret — but only if it's not going to get innocent people killed." → Honest promise → signal truth

**Signal Truth:** Enclave remnants — scientists, engineers, doctors who walked away. Ghost's father was Enclave meteorologist.
- `[INT 7+]` "The Enclave's Project Purity and FEV programs killed thousands." → *"I know what they did..."* → Father's story → `KARMA +2`

**Ghost's Needs:**
> "The return signal is coming from southeast of the valley... someone needs to scout that southeastern signal."
- "I'll do it. Tell me what to look for." → `QUEST GRANT: signal_in_the_dark` / `KARMA +2`
- `[CHA 7+]` "You've been carrying this alone for three years. Let me share the weight." → `QUEST GRANT: signal_in_the_dark` / `KARMA +3` / `FACTION: old_world +3`
- "I need to think about it." → *"Take your time..."*

### Interactables

**Broadcast Console** — Examine / Read Broadcast Log / `[INT 7+]` Trace the Signal Origin (Enclave-standard modulation, southeast)
**Antenna Junction Box** — Examine / `[INT 8+]` Recalibrate Antenna Array (*"...Enclave Remnant Station Foxtrot... convergence protocol..."*)
**Operator's Stash** — Examine / Take Tesla Science Magazine / Take Emergency Stimpak

---

## 19. Crossroads Market

### Merchant Ada (friendly, Traders faction, x:1 y:1)

**Conditional Greeting — after completing `water_for_the_valley`:**
> "*Ada beams the moment she sees you.* There's my favorite customer! Clean water is flowing again..."

**Default Greeting:**
> "Welcome to Crossroads Market! Ada's the name, trade's the game. We've got provisions, medicine, and the best gossip in Frontier Valley."

- "What do you have for trade?" → Stimpaks, rad-away, purified water, salvage
  - `[INT 7+]` "Are your stimpaks pre-war stock or locally manufactured?" → Locally made, 80% effective
  - `[INT ≤3]` "What's a stim-pack? Is it food?" → *"It's medicine, sweetie..."*
- "How's business these days?" → Rough; raiders hit caravans
  - "What if I could find a way to fix the water supply?" → `QUEST GRANT: water_for_the_valley` / `FACTION: traders +3`
  - "The NCR's got a bounty on those raiders." → `FACTION: traders +2`
  - `[INT 7+]` "Supply disruption cascades fast." → *"Don't I know it..."*
- "You mentioned gossip. What's the word?" → Kings courier, Brotherhood bunker, Gun Runners, reactor lights
  - "A Brotherhood bunker? Tell me more." → Talk to Vex
  - "What's the deal with the reactor?" → Pre-war, radiation, stay clear
- "Tell me about the Traders faction." → *"We're not a faction in the traditional sense..."*
- `[CHA 7+]` "Best gossip AND the friendliest smile in the valley?" → Friends-and-family discount
- `[CHA ≤3]` "Less talking, more trading." → *"...Right. Straight to business..."*

### Smuggler Vex (wary, x:6 y:1)

**Conditional Greeting — after completing `smugglers_tip`:**
> "*Vex spots you and gives a knowing nod.* Well, well. The person who actually followed through..."

**Default Greeting:**
> "*A lean figure in a patched duster leans against the stall, picking at his nails with a knife.* You're staring. That usually means you want something. Or you're a threat. Which is it?"

- `QUEST GATE: smugglers_tip` / `QUEST COMPLETE: smugglers_tip` "I found the Brotherhood Bunker." → *"You actually got in?"*
- "I hear you deal in information." → *"Information, salvage..."*
  - "I need to find the Brotherhood bunker." → *"Now that's premium information..."*
    - `[CHA 7+]` "I think the Brotherhood would pay handsomely for information about who's selling their location." → Location revealed → `QUEST GRANT: smugglers_tip`
    - `[INT 7+]` "East hills, limited water sources, needs pre-war infrastructure for power." → *"You just worked that out from context clues?"* → `QUEST GRANT: smugglers_tip`
    - "Name your price." → 50 caps → `QUEST GRANT: smugglers_tip`
    - `[CHA ≤3]` "Tell me or I break your fingers." → *"Cute. You think you're the first person to threaten me?"*
- "What do you know that others don't?" → Power-armored tech hoarders, routes, feuds
- "Who are you, exactly?" → *"Nobody important. That's the point..."*
- `[CHA 7+]` "Neither. I'm an opportunity." → *"Well, well. You speak my language..."*
- `[CHA ≤3]` "You look sketchy. What are you hiding?" → *"I prefer 'discreet.'"*

### Interactables

**Bulletin Board** — Examine
**Water Barrel** — Examine / Drink

---

## 20. Ranger Station Delta

### Ranger Jackson (friendly, Rangers faction, x:1 y:1)

**Conditional Greeting — after completing `ranger_bounty`:**
> "*Jackson stands and extends a hand.* There's the one who took care of Gristle..."

**Default Greeting:**
> "*A weathered man in a duster and wide-brimmed hat looks up from a map.* Ranger Jackson, Station Delta. If you've made it this far, you're either tough or lucky."

- `QUEST GATE: ranger_bounty` / `QUEST COMPLETE: ranger_bounty` "The raider boss at the overlook has been dealt with." → *"Confirmed kill on the raider boss..."*
- "Tell me about the Rangers." → *"Desert Rangers. We've been patrolling the wastes since before the NCR..."*
  - `[INT 7+]` "The Ranger Unification Treaty was controversial." → *"Officially? NCR. Practically? We do what needs doing..."*
  - `[INT ≤3]` "So you're like cowboys? Pew pew?" → *"...Yeah. We're like cowboys. Pew pew."* (reveals sequoia revolver, brush gun, three combat knives)
- "I hear you've got bounty work." → Three bounties: ghouls, raider lieutenant Gristle, reactor
  - "Tell me about the raider lieutenant." → Gristle, 50 caps + Ranger standing
    - "I'll take the bounty on Gristle." → `QUEST GRANT: ranger_bounty` / `FACTION: rangers +2`
    - `[INT 7+]` "An organized raider lieutenant is a force multiplier. Do you have intel on his command structure?" → `QUEST GRANT: ranger_bounty` / `FACTION: rangers +3` + tactical details
  - "What's near the reactor?" → Non-ghoul hostiles, laser burns
    - `[INT 7+]` "A pre-war reactor with non-ghoul hostiles... could be automated security systems." → *"That's Ghost's theory too..."*
    - `[INT ≤3]` "Spooky night monsters? I ain't afraid of no ghosts!" → *"Please don't die. I hate paperwork."*
  - `[CHA 7+]` "Three bounties at once? Sounds like you're understaffed. Maybe we can discuss premium rates." → Double rates, standing invitation
- "What are the biggest threats in the region?" → Raiders, radiation, wildlife, reactor
- "What is this place?" → Forward observation post
- `[CHA 7+]` "It's an honor, Ranger. Your reputation precedes you." → *"Appreciate that..."*
- `[CHA ≤3]` "Nice hat. You compensating for something?" → *"This hat has been through more firefights than you've had hot meals..."*

### Ranger Ghost (wary, Rangers faction, x:3 y:1)

**Greeting:**
> "*A lean woman with sharp eyes and a sniper rifle across her lap glances at you without moving.* Ghost. I handle recon. If Jackson sent you to chat, make it quick..."

- "Ghost — is that a callsign?" → *"Earned it. I move quiet and I see everything..."*
  - "What's your real name?" → *"Nice try. You earn that information..."*
- "What have you seen from the watchtower?" → Raider patrols, Kings routes, NCR thinning, reactor
  - "Tell me about the raider patrol patterns." → Six-hour rotation, dawn shift change
    - `[INT 7+]` "What's the range to their lookout position from the nearest concealed approach?" → *"Three hundred meters from the dry wash..."*
- "Jackson mentioned something near the reactor. What did you see?" → Three figures, too fast for ferals, moved in formation
  - `[INT 7+]` "Formation movement suggests programmed behavior. Military robots, maybe sentry bots..." → *"That's my theory too..."*
  - "That spooked you." → Laser burns, targeting systems
- `[CHA 7+]` "I won't waste your time. Just tell me what I need to know to survive out there." → *"Direct. I appreciate that..."*
- `[CHA ≤3]` "You don't talk much, do you? That must get boring." → *"I talk exactly as much as the situation requires..."*

### Interactables

**Map Table** — Examine (*"Pins mark known settlements, raider camps, and danger zones..."*)
**First Aid Station** — Examine / Use

---

## Quests Summary

| Quest | Grant Location(s) | Turn-in Location | Key Item |
|---|---|---|---|
| `see_doc_mitchell` | Vault 47 (Overseer Hale) | Dusty Spur (Doc Mitchell) | — |
| `save_vault_47` | Vault 47 (Overseer Hale) | Vault 47 (Overseer Hale) | `makeshift_repair_kit` |
| `vault_47_repairs_pending` | Vault 47 (Overseer Hale) | Vault 47 (Overseer Hale) | — |
| `kings_missing_courier` | Dusty Spur (Frankie), King's Court (The King) | King's Court (The King) | `courier_satchel` |
| `kings_rescue_danny` | King's Court (The King) | — | — |
| `ncr_raider_problem` | Dusty Spur (Reyes), NCR Outpost (Hayes) | NCR Outpost (Hayes) | — |
| `danger_in_the_hollow` | Bitter Cave (Kell) | Powder Ganger Camp (Eddie) | `dynamite_stash` |
| `ranger_bounty` | Ranger Station Delta (Jackson) | Ranger Station Delta (Jackson) | — |
| `water_for_the_valley` | Scrapyard (Rusty), Water Plant (Torres), Crossroads (Ada) | Water Plant (Torres) | `pump_regulator` |
| `wake_the_spire` | Solar Spire (Caretaker) | Solar Spire (Caretaker) | `fusion_cell` |
| `brotherhood_lost_tech` | Brotherhood Bunker (Ibsen) | Brotherhood Bunker (Ibsen) | `encrypted_holotape` |
| `signal_in_the_dark` | Radio Tower Bravo (Ghost) | Radio Tower Bravo (Ghost) | — |
| `smugglers_tip` | Crossroads Market (Vex) | Crossroads Market (Vex) | — |
| `kings_danny_returned` | — | — | — |
