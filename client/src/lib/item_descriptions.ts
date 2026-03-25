/**
 * SPECIAL-stat-based item inner monologue descriptions.
 * When a player inspects an item, these provide flavor text
 * based on their character's stats.
 *
 * Each entry maps an itemId to an array of conditional descriptions.
 * The first matching condition wins. A condition with no stat/threshold
 * serves as the default fallback.
 */

interface StatCondition {
  stat: "str" | "per" | "end" | "cha" | "int" | "agl" | "lck";
  max?: number;
  min?: number;
}

interface ConditionalDescription {
  condition?: StatCondition;
  text: string;
}

type SpecialDescriptionMap = Record<string, ConditionalDescription[]>;

const SPECIAL_ITEM_DESCRIPTIONS: SpecialDescriptionMap = {
  dog_turd: [
    {
      condition: { stat: "int", max: 3 },
      text: "Doggy doo is good for you!"
    },
    {
      condition: { stat: "int", min: 7 },
      text: "I picked this up when I was still recovering from the rad scorpion poison. What the hell was I thinking?"
    },
    {
      condition: { stat: "lck", min: 7 },
      text: "You never know when this could come in handy."
    },
    {
      condition: { stat: "lck", max: 3 },
      text: "Just my luck — the first thing I steal in the wasteland. I guess karma is real."
    },
    {
      text: "A fresh pile of wasteland dog droppings. It stinks. Why do you still have this?"
    }
  ],

  faded_photograph: [
    {
      condition: { stat: "int", max: 3 },
      text: "Pretty picture! Who dat? ...Me know them? Head hurty."
    },
    {
      condition: { stat: "per", min: 7 },
      text: "The photo paper is pre-war stock — Kodak, maybe. The background looks like a vault common room, but not 47. There's a serial number stamped on the back edge: V-31-7742."
    },
    {
      condition: { stat: "cha", min: 7 },
      text: "Whoever they were, they mattered to someone. That's worth carrying."
    },
    {
      text: "Someone you don't recognize — maybe you did once. The back reads: 'Don't forget us.'"
    }
  ],

  rumor_note: [
    {
      condition: { stat: "int", min: 7 },
      text: "The handwriting is deliberately disguised — block letters, no slant. But there's a grease stain consistent with someone who works mechanical equipment. The coordinates reference a grid point southwest of the valley's center."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Words words words. Some of them are big. There's a picture of an arrow? Me go that way maybe."
    },
    {
      condition: { stat: "per", min: 6 },
      text: "The paper smells faintly of gun oil and brahmin. Whoever wrote this spends time around both caravans and weapons. The directions are precise — this person has been to wherever they're describing."
    },
    {
      text: "A crumpled note with hastily scrawled directions and a warning: 'Don't go alone.' The ink is still fairly fresh."
    }
  ],

  fancy_lads_snack_cakes: [
    {
      condition: { stat: "int", max: 3 },
      text: "CAKE! Cake cake cake! The fancy man on the box is smiling so it must be good!"
    },
    {
      condition: { stat: "end", min: 7 },
      text: "Two hundred years old and still edible. Your stomach has handled worse. Way worse."
    },
    {
      condition: { stat: "per", min: 7 },
      text: "The box is sealed but slightly swollen — gas buildup from bacterial decomposition. The snack cakes are technically still preserved, but 'edible' is doing a lot of heavy lifting here."
    },
    {
      text: "Pre-war packaged snack cakes. The mascot on the box looks suspiciously cheerful for a product that survived nuclear apocalypse. Still edible. Probably."
    }
  ],

  makeshift_repair_kit: [
    {
      condition: { stat: "int", min: 7 },
      text: "Whoever assembled this knew their way around a fusion cell adapter. The wiring isn't textbook, but it's sound. This could stabilize a Class-C power core for months."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Fix-it stuff! Tape and metal bits and a twisty thing. Me bring to vault lady!"
    },
    {
      text: "A bundle of duct tape, spare screws, a bent screwdriver, and what looks like a fusion cell adapter. Cobbled together by someone who knew what they were doing."
    }
  ],

  emergency_rations: [
    {
      condition: { stat: "end", min: 7 },
      text: "You've eaten worse. You've eaten much worse. At least these have vitamins listed on the label."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Yum box! It says 'nu-tri-tion' but it tastes like wall."
    },
    {
      condition: { stat: "cha", min: 7 },
      text: "Emergency rations — the great equalizer. Nothing brings people together like sharing terrible food."
    },
    {
      text: "Vacuum-sealed Vault-Tec rations. The label promises 'complete nutrition in every bite.' They taste like cardboard and desperation, but they'll keep you alive."
    }
  ],

  motor_oil: [
    {
      condition: { stat: "int", min: 7 },
      text: "SAE 10W-40, pre-war synthetic blend. Still viable. Useful for machinery maintenance, weapon lubrication, or improvised incendiaries — not that you'd do that."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Slippy juice! Don't drink it. ...Again."
    },
    {
      text: "A half-full can of pre-war motor oil. Still slick and usable — machines don't care how old their lubricant is."
    }
  ],

  stimpak_cache: [
    {
      condition: { stat: "int", min: 7 },
      text: "Military-grade stimpaks — the real ones, not the diluted knockoffs traders sell. The auto-injector mechanism still cycles cleanly."
    },
    {
      condition: { stat: "end", max: 3 },
      text: "You have a feeling you're going to need a LOT of these."
    },
    {
      text: "A dented metal case with a red cross stenciled on the lid. Inside: two stimpaks, a roll of gauze, and a faded instruction card that reads 'Apply directly to wound. Do not ingest.'"
    }
  ],

  sunset_sarsaparilla: [
    {
      condition: { stat: "lck", min: 7 },
      text: "You flip the cap. There's a blue star on the inside. That's gotta be worth something to a collector."
    },
    {
      condition: { stat: "end", min: 7 },
      text: "Flat, warm, and 200 years old. Still better than irradiated puddle water."
    },
    {
      text: "A bottle of Sunset Sarsaparilla. The label promises 'That special blend of 17 herbs and spices.' It's flat and warm, but it's still sarsaparilla."
    }
  ],

  nuka_cola: [
    {
      condition: { stat: "int", min: 7 },
      text: "The slight isotopic glow suggests trace amounts of strontium-90. Perfectly safe in small doses. Probably."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Ooh! Glowy drink! It makes your tummy feel all tingly and warm!"
    },
    {
      text: "A bottle of Nuka-Cola. Still faintly glowing after two centuries. The caffeine alone could restart a heart."
    }
  ],

  whiskey: [
    {
      condition: { stat: "cha", min: 7 },
      text: "Liquid courage — and liquid charisma. A few swigs of this and everyone's your friend. Or at least they're too blurry to disagree."
    },
    {
      condition: { stat: "end", min: 7 },
      text: "You could strip paint with this. Your liver doesn't care."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Burny water! Makes brain go quiet. Brain already pretty quiet though."
    },
    {
      text: "A bottle of locally distilled rotgut. The label is handwritten and just says 'WHISKEY' in aggressive capitals."
    }
  ],

  brahmin_milk: [
    {
      condition: { stat: "per", min: 7 },
      text: "Slightly irradiated, two-headed cow milk. The color is off and it smells like wet copper. Still, protein is protein."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Moo juice! From the big cow with two think-parts!"
    },
    {
      text: "A bottle of brahmin milk. Surprisingly fresh. Don't think too hard about the two-headed cow it came from."
    }
  ],

  pool_felt: [
    {
      condition: { stat: "int", min: 7 },
      text: "Tightly woven worsted wool — could be repurposed as a filter membrane, cleaning cloth, or improvised bandage material."
    },
    {
      condition: { stat: "lck", min: 7 },
      text: "You feel luckier just holding this. All those games of pool you've won... well, imagined winning."
    },
    {
      text: "A square of green felt from a pool table. Soft, durable, and almost certainly stolen. It smells like chalk and bad decisions."
    }
  ],

  caps: [
    {
      condition: { stat: "cha", min: 7 },
      text: "Money talks, and you're fluent."
    },
    {
      condition: { stat: "lck", min: 7 },
      text: "Found money is the best money. The wasteland provides."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Shiny circles! People give you stuff for them! Best game ever!"
    },
    {
      text: "Bottle caps — the universally accepted currency of the wasteland. Someone, somewhere decided these were money, and everyone just went along with it."
    }
  ],

  ammo_38: [
    {
      condition: { stat: "per", min: 7 },
      text: "Casings are tarnished but the primers look intact. Should fire reliably."
    },
    {
      text: "A handful of .38 caliber rounds. Common wasteland ammunition — won't win any wars, but it'll keep the radroaches honest."
    }
  ],

  map_fragment: [
    {
      condition: { stat: "per", min: 7 },
      text: "The topography matches the western edge of the valley. There are hand-drawn annotations — someone marked water sources and danger zones. This is recent work."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Paper with squiggly lines! Is this a drawing of a dog? No... it's a map. Maps show where things are. Me smart!"
    },
    {
      text: "A crumpled piece of paper showing part of the surrounding terrain. Hand-drawn with charcoal, but surprisingly detailed."
    }
  ],

  prewar_money: [
    {
      condition: { stat: "int", min: 7 },
      text: "Pre-war US currency. Worthless as legal tender but useful as toilet paper, fire starter, or wallpaper. Some collectors still pay caps for crisp bills."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Old-timey shiny circles on paper! Grandpa money! ...Is it still money? Can me buy snacks?"
    },
    {
      text: "Faded pre-war dollar bills. Not worth the paper they're printed on — unless you find someone nostalgic enough to trade for them."
    }
  ],

  pump_regulator: [
    {
      condition: { stat: "int", min: 7 },
      text: "A mechanical flow regulator — pressure-actuated, rated for liquid or gas transfer. Compatible with most pre-war municipal water systems. Could be very valuable at a water treatment facility."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Chunky metal donut! It spins! Wheee!"
    },
    {
      text: "A mechanical pump regulator, salvaged from scrapyard machinery. Someone who knows plumbing could put this to good use."
    }
  ],

  trade_manifest: [
    {
      condition: { stat: "int", min: 7 },
      text: "This manifest lists supply routes, quantities, and scheduled deliveries. Cross-referencing the dates suggests a weekly pattern. Whoever controls this information controls the supply chain."
    },
    {
      text: "A ledger of trade routes and delivery schedules. Names, dates, and quantities — the lifeblood of caravan commerce. Valuable information in the right hands."
    }
  ],

  holotape_fragment: [
    {
      condition: { stat: "int", min: 7 },
      text: "The magnetic substrate is degraded but the header block is readable. With the right terminal, you could extract partial data — military encryption signatures suggest this is Brotherhood of Steel origin."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Shiny tape thingy! You can see your face in it! Hi, face!"
    },
    {
      text: "A damaged holotape. Most of the data is corrupted, but fragments of text are still readable. Someone didn't want this found."
    }
  ],

  fusion_cell: [
    {
      condition: { stat: "int", min: 7 },
      text: "Microfusion cell with a stabilized plasma core. Output rating suggests military manufacture — consistent yield, minimal decay. These don't grow on trees."
    },
    {
      text: "A compact energy cell that hums faintly with stored power. Still holds a charge after two centuries of dormancy."
    }
  ],

  encrypted_holotape: [
    {
      condition: { stat: "int", min: 7 },
      text: "256-bit military encryption — pre-war Enclave standard. Cracking this would require a dedicated terminal with the right cipher keys. Whatever's on here was classified."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Fancy tape! It doesn't play when you shake it. Maybe it's broken. Or maybe it's shy."
    },
    {
      text: "A holotape sealed with military-grade encryption. The casing is stamped with 'CLASSIFIED — EYES ONLY.' Whatever this contains, someone went to great lengths to protect it."
    }
  ],

  military_ration: [
    {
      condition: { stat: "end", min: 7 },
      text: "MRE — Meal, Ready to Eat. You've had worse. The peanut butter cracker is actually pretty good, even after 200 years."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Army food! The brown packet says 'Beef Stew' but it tastes like salty sadness. Still yummy!"
    },
    {
      text: "A military Meal Ready to Eat, still vacuum-sealed. The US Army built these to survive anything — including the apocalypse, apparently."
    }
  ],

  teddy_bear: [
    {
      condition: { stat: "cha", min: 7 },
      text: "A child's teddy bear. Someone loved this once. The wasteland has enough sadness — maybe you can bring it somewhere it'll be appreciated again."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "BEAR FRIEND! Me and Bear Friend go on adventures now! *hugs tightly*"
    },
    {
      condition: { stat: "per", min: 7 },
      text: "Hand-stitched with pre-war thread. There's a name embroidered inside the left ear: 'Lily.' The stuffing is mostly intact."
    },
    {
      text: "A pre-war teddy bear, miraculously intact. One glass eye is missing and the fur is matted, but it's still huggable."
    }
  ],

  canned_food: [
    {
      condition: { stat: "int", max: 3 },
      text: "Dog food! But it's for people too, right? The dog on the label looks happy!"
    },
    {
      condition: { stat: "end", min: 7 },
      text: "Protein is protein. You've eaten worse things than canned dog food and you'll eat worse again."
    },
    {
      text: "A can of pre-war dog food. The label features a disturbingly happy cartoon dog. In the wasteland, beggars can't be choosers."
    }
  ],

  toy_car: [
    {
      condition: { stat: "int", max: 3 },
      text: "VROOM VROOM! *pushes along ground* Me go fast! Beep beep!"
    },
    {
      condition: { stat: "per", min: 7 },
      text: "A die-cast Chryslus Corvega, 1:32 scale. The paint is chipped but the axles still roll. Collector's item, if collectors still existed."
    },
    {
      text: "A pre-war toy car. The paint is faded and one wheel is bent, but it still rolls. A tiny reminder of a world where kids played in yards instead of rubble."
    }
  ],

  gristle_tags: [
    {
      condition: { stat: "per", min: 7 },
      text: "Military-style dog tags, but the stamping is crude — homemade. The name 'GRISTLE' is scratched in, along with a tally of... something. You don't want to know."
    },
    {
      text: "Dog tags from someone called 'Gristle.' The metal is scratched and dented. A trophy or a warning — depends on who's asking."
    }
  ],

  stolen_goods: [
    {
      condition: { stat: "cha", min: 7 },
      text: "Returning these to the right people could earn you some serious goodwill. Or you could sell them. Diplomacy has many forms."
    },
    {
      condition: { stat: "lck", max: 3 },
      text: "Stolen goods. Hot merchandise. You're holding evidence. This is fine. Everything is fine."
    },
    {
      text: "A bundle of goods clearly stolen from caravan traders — cloth, tools, and canned food, all with merchant tags still attached."
    }
  ],

  purified_water: [
    {
      condition: { stat: "int", min: 7 },
      text: "Filtered and irradiation-free — under 5 millirems. Clean water is the most valuable commodity in the wasteland. Guard this."
    },
    {
      condition: { stat: "end", max: 3 },
      text: "Clean water. Your body practically weeps with gratitude. You really need to take better care of yourself."
    },
    {
      text: "A bottle of purified water. Crystal clear and rad-free. In the wasteland, this is worth more than gold."
    }
  ],

  trail_mix: [
    {
      condition: { stat: "end", min: 7 },
      text: "Nuts, dried fruit, and some kind of jerky. Calorie-dense and portable. Exactly what you need for long treks."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Tiny foods all mixed together! Like a party in a bag! The crunchy bits are best."
    },
    {
      text: "A pouch of caravan trail mix — dried brahmin jerky, mutfruit pieces, and roasted nuts. Trail-tested nutrition."
    }
  ],

  pipe_wrench: [
    {
      condition: { stat: "str", min: 7 },
      text: "Solid steel, good weight. Could tighten pipes or loosen skulls. Versatile."
    },
    {
      condition: { stat: "int", min: 7 },
      text: "A 14-inch adjustable pipe wrench. The jaw still moves freely. Essential for any plumbing or mechanical repair work."
    },
    {
      text: "A heavy pipe wrench, rusted but functional. Useful for repairs — and in a pinch, self-defense."
    }
  ],

  ncr_field_manual: [
    {
      condition: { stat: "int", min: 7 },
      text: "NCR Ranger field procedures, 3rd edition. Covers patrol routes, supply cache protocols, and emergency communication codes. Tactically valuable intelligence."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Big boring book with a bear on it. Lots of words. Me use as pillow."
    },
    {
      text: "An NCR field manual. Practical survival information, patrol protocols, and radio frequencies. Could be useful — or valuable to the right buyer."
    }
  ],

  rad_away: [
    {
      condition: { stat: "int", min: 7 },
      text: "Chelation agent — binds to radioactive isotopes in the bloodstream for renal excretion. Tastes like chemical waste because it essentially is chemical waste."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Orange juice that makes the glowy sickness go away! Tastes yucky but makes you feel less burny inside."
    },
    {
      text: "A packet of RadAway — the standard treatment for radiation exposure. Tastes terrible, works wonders."
    }
  ],

  surgical_tubing: [
    {
      condition: { stat: "int", min: 7 },
      text: "Medical-grade latex tubing, still flexible. Useful for improvised IV lines, slingshots, tourniquets, or water filtration systems."
    },
    {
      text: "A length of surgical tubing from the hospital supply. Flexible, durable, and useful for a dozen different improvised applications."
    }
  ],

  medical_journal: [
    {
      condition: { stat: "int", min: 7 },
      text: "A pre-war journal on trauma surgery and field medicine. The techniques described could save lives — if you can understand the terminology. Some pages have handwritten annotations from a post-war practitioner."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Book with pictures of insides. EWWW! ...but also kinda cool. Red stuff everywhere."
    },
    {
      text: "A pre-war medical journal. Dense reading, but the surgical diagrams and drug interaction charts could be genuinely useful."
    }
  ],

  scrap_metal: [
    {
      condition: { stat: "str", min: 7 },
      text: "Good steel — you can tell by the weight. Could be hammered into armor plates, blade reinforcement, or structural supports."
    },
    {
      condition: { stat: "int", min: 7 },
      text: "Low-carbon steel, minimal corrosion. Suitable for forging, welding, or trading. Scrapyards are the hardware stores of the apocalypse."
    },
    {
      text: "Salvaged metal scraps. Not glamorous, but essential for repairs, crafting, and trade."
    }
  ],

  circuit_board: [
    {
      condition: { stat: "int", min: 7 },
      text: "Pre-war printed circuit board with intact copper traces. The IC chips are mostly fried, but the board itself could be repurposed for custom electronics projects."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Green square with shiny lines! Like a tiny city for ants! ...Do ants live here?"
    },
    {
      text: "A salvaged circuit board, copper traces still gleaming. Valuable to anyone who works with electronics or energy systems."
    }
  ],

  prison_manifest: [
    {
      condition: { stat: "int", min: 7 },
      text: "NCRCF inmate roster with security classifications. Cross-referencing names with known Powder Ganger leadership could identify who's really running the operation."
    },
    {
      text: "The prison manifest from NCRCF. Names, sentences, and cell assignments. A record of who the Powder Gangers were before they broke out."
    }
  ],

  powder_charge: [
    {
      condition: { stat: "int", min: 7 },
      text: "Improvised explosive — blasting powder packed into a tin can with a chemical fuse. Crude but effective. Handle with extreme care."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Shiny can! It rattles! ...why is there a string coming out of — DON'T PULL THE STRING."
    },
    {
      condition: { stat: "agl", min: 7 },
      text: "Light, throwable, and devastating in close quarters. Your quick hands could make good use of this."
    },
    {
      text: "An improvised explosive charge made from blasting powder. The Powder Gangers' signature weapon. Dangerous in anyone's hands."
    }
  ],

  stimpak_stolen: [
    {
      condition: { stat: "lck", max: 3 },
      text: "Stolen medical supplies. Because of course the first aid you find has to come with a side of moral compromise."
    },
    {
      text: "A stimpak with Powder Ganger markings scratched into the casing. Stolen from somewhere — but it'll work just the same."
    }
  ],

  pre_war_broadcast_log: [
    {
      condition: { stat: "int", min: 7 },
      text: "Emergency broadcast transcripts from the day the bombs fell. The timestamps show a 23-minute gap between first strike detection and total communications blackout. The final entry just reads 'God help us.'"
    },
    {
      condition: { stat: "per", min: 7 },
      text: "The paper is brittle but legible. Between the official broadcasts, someone scrawled personal notes in the margins. Names, addresses — people they were trying to reach."
    },
    {
      text: "A log of pre-war radio broadcasts from the day everything ended. Emergency alerts, military channels, and then... silence."
    }
  ],

  vacuum_tubes: [
    {
      condition: { stat: "int", min: 7 },
      text: "Glass vacuum tubes — the building blocks of pre-war electronics. Most solid-state replacements can't handle the power surges of wasteland equipment. These are surprisingly valuable."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Glass thingies with wire inside! They glow when you plug them in! Pretty!"
    },
    {
      text: "Pre-war vacuum tubes, still sealed in their original packaging. Essential components for maintaining older electronic equipment."
    }
  ],

  ranger_badge: [
    {
      condition: { stat: "cha", min: 7 },
      text: "A Ranger's badge carries weight — flash this at the right moment and doors open. People trust the badge, even if they don't know you."
    },
    {
      condition: { stat: "per", min: 7 },
      text: "Service number RNG-4471. The scratch pattern suggests years of field duty. This ranger saw some things."
    },
    {
      text: "A tarnished NCR Ranger service badge. The two-headed bear insignia is still visible. Carrying this says something about you."
    }
  ],

  kings_jacket: [
    {
      condition: { stat: "cha", min: 7 },
      text: "The King's colors. Wearing this in the right neighborhood means respect — and in the wrong one, a fight. Fashion is politics in the wasteland."
    },
    {
      condition: { stat: "agl", min: 7 },
      text: "Good leather, flexible joints. Doesn't restrict movement. Whoever designed gang wear around here knew you might need to run."
    },
    {
      text: "A leather jacket with the Kings' gang insignia. Worn with pride by members of the Kings. Makes a statement, whether you intend it or not."
    }
  ],

  ammo_mixed: [
    {
      condition: { stat: "per", min: 7 },
      text: "Mix of .38, 10mm, and a few 5.56 rounds. The 5.56 casings have reloading marks — someone's been recycling brass. Still, ammo is ammo."
    },
    {
      text: "A grab bag of mixed ammunition. Different calibers, different conditions, but all still fireable. Wasteland potpourri."
    }
  ],

  pipe_rifle: [
    {
      condition: { stat: "int", min: 7 },
      text: "Homemade receiver, plumbing pipe barrel, spring-loaded firing mechanism. Accuracy is questionable but it fires. Could be improved with proper workshop tools."
    },
    {
      condition: { stat: "str", min: 7 },
      text: "Crude but solid. The weight is actually reassuring — means the barrel won't warp under heat. Much."
    },
    {
      text: "A weapon cobbled together from pipe fittings and scrap. It's ugly, unreliable, and effective enough to kill. Welcome to the wasteland."
    }
  ],

  "9mm_pistol": [
    {
      condition: { stat: "per", min: 7 },
      text: "Standard 9mm, well-maintained. The sights are factory-aligned — unusual for wasteland hardware. Reliable out to 25 meters."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Pointy-shooty thing! Pull the clicky part and it goes BANG! Fun!"
    },
    {
      text: "A dependable 9mm pistol. Nothing fancy, but it goes bang when you pull the trigger. That's all you need."
    }
  ],

  "10mm_pistol": [
    {
      condition: { stat: "str", min: 7 },
      text: "Good weight, solid recoil. The 10mm round hits harder than a 9 — you can feel the difference in the kick."
    },
    {
      condition: { stat: "per", min: 7 },
      text: "N99 pattern, post-war manufacture. The slide has been re-blued and the feed ramp polished. Someone took care of this one."
    },
    {
      text: "The 10mm pistol — the wasteland's workhorse sidearm. A step up from a 9mm, and ammunition is everywhere."
    }
  ],

  "357_magnum": [
    {
      condition: { stat: "lck", min: 7 },
      text: "Six rounds, six chances to make your own luck. A revolver this clean practically begs to be spun."
    },
    {
      condition: { stat: "str", min: 7 },
      text: "Heavy cylinder, serious recoil. The .357 round doesn't mess around — neither should you."
    },
    {
      text: "A .357 magnum revolver. The cylinder clicks with satisfying precision. A classic weapon for a classic wasteland."
    }
  ],

  laser_pistol: [
    {
      condition: { stat: "int", min: 7 },
      text: "Wattz 1000 laser pistol. The focusing crystal is slightly misaligned — a quarter-turn of the adjustment screw would improve coherence by about 15%."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "Magic light gun! Makes red zappy beam! Don't point at face. ...Me already pointed at face."
    },
    {
      text: "A pre-war energy weapon that fires concentrated beams of light. Quiet, accurate, and unsettling to watch in action."
    }
  ],

  plasma_pistol: [
    {
      condition: { stat: "int", min: 7 },
      text: "Superheated plasma contained in a magnetic bottle and projected at range. The engineering required for this to not explode in your hand is genuinely impressive."
    },
    {
      condition: { stat: "end", min: 7 },
      text: "The grip gets uncomfortably hot after sustained firing. The blisters are worth it for what this does to the target."
    },
    {
      text: "A plasma pistol — fires bolts of superheated green plasma. Devastating on impact. The hum it makes when charged is deeply unsettling."
    }
  ],

  hunting_rifle: [
    {
      condition: { stat: "per", min: 7 },
      text: "Bolt-action, walnut stock, iron sights zeroed at 200 yards. The barrel is clean and the action is smooth. A marksman's tool."
    },
    {
      condition: { stat: "str", max: 3 },
      text: "Heavy. The recoil might knock you flat. Maybe stick to something lighter?"
    },
    {
      text: "A solid bolt-action hunting rifle. Accurate, reliable, and common enough that ammo is easy to find. A wasteland staple."
    }
  ],

  service_rifle: [
    {
      condition: { stat: "per", min: 7 },
      text: "NCR-issue, semi-automatic, 5.56mm. The receiver markings suggest Boneyard manufacture. Well-balanced with a 20-round magazine."
    },
    {
      condition: { stat: "int", min: 7 },
      text: "Based on the AR-15 platform — pre-war design, post-war necessity. The gas system has been modified for wasteland reliability over precision."
    },
    {
      text: "A semi-automatic service rifle. Standard NCR military issue, but effective in anyone's hands."
    }
  ],

  laser_rifle: [
    {
      condition: { stat: "int", min: 7 },
      text: "Wattz 2000 laser rifle. The longer beam path allows for tighter coherence than the pistol variant. The microfusion cell snaps in clean — good contacts."
    },
    {
      text: "A pre-war laser rifle. Fires a focused beam of light that can cut through most wasteland armor. Ammunition is the hard part."
    }
  ],

  plasma_rifle: [
    {
      condition: { stat: "int", min: 7 },
      text: "Urban Plasma Rifle — the toroid containment field is remarkably stable. Winchester Arms really knew what they were doing. Each shot costs a small fortune in microfusion cells."
    },
    {
      condition: { stat: "str", min: 7 },
      text: "Heavy weapon, heavier impact. The plasma bolt vaporizes on contact. Whatever you hit won't be getting back up."
    },
    {
      text: "A plasma rifle. Fires bolts of superheated plasma at range. Rare, expensive, and absolutely devastating."
    }
  ],

  sawed_off_shotgun: [
    {
      condition: { stat: "agl", min: 7 },
      text: "Compact, concealable, and fast on the draw. Two barrels, two chances. Make them count."
    },
    {
      condition: { stat: "str", max: 3 },
      text: "The kick on this might literally knock you down. Brace yourself. Seriously."
    },
    {
      text: "A sawed-off double-barrel shotgun. What it lacks in range, it makes up for in pure close-quarters devastation."
    }
  ],

  combat_shotgun: [
    {
      condition: { stat: "str", min: 7 },
      text: "Semi-auto, drum magazine. The recoil is manageable if you've got the arms for it. You do."
    },
    {
      condition: { stat: "per", min: 7 },
      text: "Effective range about 30 meters with standard buckshot. The drum holds 12 rounds. The spread pattern widens fast — this is a hallway weapon."
    },
    {
      text: "A semi-automatic combat shotgun with a drum magazine. Room-clearing made easy. Not subtle, but extremely effective."
    }
  ],

  combat_knife: [
    {
      condition: { stat: "agl", min: 7 },
      text: "Balanced for throwing or close work. The edge is razor-sharp — someone recently honed it. Quick hands make this lethal."
    },
    {
      condition: { stat: "str", min: 7 },
      text: "Military-grade steel. In your hands, this isn't just a knife — it's a statement."
    },
    {
      text: "A military-grade combat knife. Keeps an edge like nothing else. Every wastelander should have one."
    }
  ],

  baseball_bat: [
    {
      condition: { stat: "str", min: 7 },
      text: "Solid ash, good swing weight. You could send a raider's head into the cheap seats with this thing."
    },
    {
      condition: { stat: "int", max: 3 },
      text: "BONK STICK! Hehe. Bonk bonk bonk!"
    },
    {
      text: "A pre-war baseball bat. The American pastime takes on a whole new meaning in the wasteland."
    }
  ],

  tire_iron: [
    {
      condition: { stat: "str", min: 7 },
      text: "Heavy steel with good leverage. Meant for lug nuts, but it'll crack a skull just as easily."
    },
    {
      text: "A sturdy tire iron. The original owner used it on cars. The wasteland finds other uses for heavy blunt objects."
    }
  ],

  super_sledge: [
    {
      condition: { stat: "str", min: 7 },
      text: "Kinetic energy storage system in the head. When you swing, it RELEASES. The impact is genuinely terrifying. You love it."
    },
    {
      condition: { stat: "str", max: 3 },
      text: "You can barely lift this thing. It's heavier than you expected anything could be. Maybe just... leave it for someone else."
    },
    {
      condition: { stat: "int", min: 7 },
      text: "Pre-war kinetic energy storage hammer. The capacitor in the head stores momentum and releases it on impact, multiplying force dramatically. Brilliant and brutal engineering."
    },
    {
      text: "A massive sledgehammer with a built-in kinetic energy storage system. Requires serious strength to use, but the results speak for themselves."
    }
  ],

  power_fist: [
    {
      condition: { stat: "str", min: 7 },
      text: "Pneumatic actuators amplify your punch. With your natural strength plus this thing? You could dent power armor."
    },
    {
      condition: { stat: "agl", min: 7 },
      text: "The pneumatic mechanism has a half-second reset. Time your swings right and the rhythm is devastating."
    },
    {
      text: "A pneumatic power fist. Straps to your arm and turns every punch into a wrecking ball. Satisfying in a primal sort of way."
    }
  ],

  lucky_357: [
    {
      condition: { stat: "lck", min: 7 },
      text: "The cylinder spins perfectly. Every shot from this gun feels guided — like the universe wants you to hit. Your kind of weapon."
    },
    {
      condition: { stat: "per", min: 7 },
      text: "Custom sights, hand-filed trigger, mother-of-pearl grip. This wasn't manufactured — it was crafted. By someone who understood that a weapon is personal."
    },
    {
      text: "A unique .357 magnum, customized with care. The grip is inlaid with mother-of-pearl and the action is glass-smooth. This gun has a story."
    }
  ],

  this_machine: [
    {
      condition: { stat: "int", min: 7 },
      text: "M1 Garand pattern — .30-06, en-bloc clip, gas-operated. 'THIS MACHINE' is engraved on the receiver. A patriot's weapon, preserved across the apocalypse."
    },
    {
      condition: { stat: "str", min: 7 },
      text: "Heavy rifle, heavy round. The .30-06 hits like a freight train. The ping of the ejecting clip is the most satisfying sound in warfare."
    },
    {
      text: "A unique battle rifle with 'THIS MACHINE' engraved on the receiver. Pre-war craftsmanship at its finest — powerful, accurate, and storied."
    }
  ],

  travelers_cap: [
    {
      condition: { stat: "cha", min: 7 },
      text: "A well-worn cap that's seen a thousand miles of wasteland road. Wearing this says 'I've been places.' People respect a traveler."
    },
    {
      condition: { stat: "per", min: 7 },
      text: "Sweat-stained brim, sun-bleached crown. The size suggests a large head. There's a lucky bottle cap sewn into the inner band."
    },
    {
      text: "A dusty traveler's cap. It's been through a lot — faded, frayed, but still keeps the sun off. Every wastelander needs one."
    }
  ]
};

/**
 * Get the best matching SPECIAL-stat description for an item.
 * Returns null if no special descriptions exist for this item.
 */
export function getSpecialDescription(
  itemId: string,
  special: Record<string, number> | null
): string | null {
  const descriptions = SPECIAL_ITEM_DESCRIPTIONS[itemId];
  if (!descriptions) return null;

  for (const entry of descriptions) {
    if (!entry.condition) {
      return entry.text;
    }

    const statValue = special?.[entry.condition.stat] ?? 5;

    if (entry.condition.min !== undefined && statValue < entry.condition.min) {
      continue;
    }

    if (entry.condition.max !== undefined && statValue > entry.condition.max) {
      continue;
    }

    return entry.text;
  }

  return null;
}
