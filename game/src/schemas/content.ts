import { z } from "zod";

// --- SPECIAL stat names ---

export const specialStatNames = ["str", "per", "end", "cha", "int", "agl", "lck"] as const;
export const specialStatEnum = z.enum(specialStatNames);

// --- Dialogue tree schemas ---

export const specialGateSchema = z.object({
  stat: specialStatEnum,
  min: z.number().int().optional(),
  max: z.number().int().optional()
});

export const grantItemSchema = z.object({
  itemId: z.string().min(1),
  label: z.string().min(1),
  quantity: z.number().int().min(1).default(1)
});

export const dialogueOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  response: z.string().min(1).optional(),
  next: z.string().min(1).optional(),
  specialGate: specialGateSchema.optional(),
  questGate: z.object({ questId: z.string().min(1) }).optional(),
  inventoryGate: z.object({ itemId: z.string().min(1) }).optional(),
  consumeItem: z.boolean().optional(),
  questGrant: z.string().min(1).optional(),
  questComplete: z.string().min(1).optional(),
  factionDelta: z.object({
    factionId: z.string().min(1),
    delta: z.number().int()
  }).optional(),
  karmaDelta: z.number().int().optional(),
  grantItems: z.array(grantItemSchema).optional(),
  companionRecruit: z.string().min(1).optional(),
  returnToRoot: z.boolean().optional()
});

export const dialogueNodeSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  options: z.array(dialogueOptionSchema).default([])
});

export const dialogueTreeSchema = z.object({
  rootNodeId: z.string().min(1),
  conditionalRoots: z.array(z.object({
    questCompleted: z.string().min(1).optional(),
    karmaMin: z.number().int().optional(),
    nodeId: z.string().min(1)
  })).optional(),
  nodes: z.array(dialogueNodeSchema).min(1)
});

// --- Quest definition schema ---

export const questObjectiveSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(["talk", "fetch", "kill", "visit"]),
  target: z.string().min(1)
});

export const questSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  grantedBy: z.string().min(1).optional(),
  objectives: z.array(questObjectiveSchema).min(1),
  rewards: z.object({
    karma: z.number().int().optional(),
    factionDeltas: z.record(z.number().int()).optional(),
    items: z.array(grantItemSchema.extend({ description: z.string().optional() })).optional(),
    caps: z.number().int().optional()
  }).optional(),
  mapMarker: z.object({
    locationId: z.string().min(1),
    label: z.string().min(1)
  }).optional()
});

// --- World content schemas ---

export const regionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  biome: z.string().min(1),
  mapId: z.string().min(1),
  summary: z.string().min(1),
  startingLocationId: z.string().min(1)
});

export const locationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  regionId: z.string().min(1),
  position: z.object({
    x: z.number().int(),
    y: z.number().int()
  }),
  interiorMapId: z.string().min(1).nullable(),
  factionTags: z.array(z.string()).default([]),
  questTags: z.array(z.string()).default([]),
  encounterFlags: z.array(z.string()).default([]),
  description: z.string().min(1)
});

export const overworldMapSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  theme: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fogRevealRadius: z.number().int().positive().default(2),
  layout: z.array(z.array(z.string().min(1))).min(1),
  pointsOfInterest: z.array(z.string()).default([])
});

export const interiorMapSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  theme: z.enum(["vault", "cave", "wasteland_tavern", "prewar-reactor", "military", "workshop", "market", "ruins", "church", "camp", "wreck", "industrial", "radio_station", "suburb", "hospital"]),
  layout: z.array(z.array(z.string().min(1))).min(1),
  spawnPoints: z.array(
    z.object({
      id: z.string().min(1),
      x: z.number().int(),
      y: z.number().int()
    })
  ),
  exits: z.array(
    z.object({
      id: z.string().min(1),
      target: z.string().min(1),
      x: z.number().int(),
      y: z.number().int()
    })
  ),
  interactables: z.array(
    z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      label: z.string().min(1),
      x: z.number().int().optional(),
      y: z.number().int().optional(),
      actions: z.array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          response: z.string().min(1).optional(),
          steal: z.object({
            itemId: z.string().min(1),
            label: z.string().min(1),
            ownedBy: z.string().min(1).optional(),
            quantity: z.number().int().min(1).default(1),
            description: z.string().optional()
          }).optional(),
          grant: z.object({
            itemId: z.string().min(1),
            label: z.string().min(1),
            quantity: z.number().int().min(1).default(1),
            description: z.string().optional()
          }).optional()
        })
      ).optional()
    })
  ).default([]),
  npcs: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      disposition: z.enum(["friendly", "neutral", "hostile", "wary"]),
      factionId: z.string().min(1).optional(),
      x: z.number().int().optional(),
      y: z.number().int().optional(),
      dialogue: dialogueTreeSchema.optional()
    })
  ).default([]),
  loot: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      ownedBy: z.string().min(1).optional(),
      description: z.string().optional(),
      x: z.number().int().optional(),
      y: z.number().int().optional()
    })
  ).default([]),
  questHooks: z.array(z.string()).default([])
});

// --- Companion content schema ---

export const companionStoryStageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  triggerCondition: z.object({
    type: z.enum(["locationsVisited", "karma", "immediate"]),
    count: z.number().int().optional(),
    min: z.number().int().optional(),
    max: z.number().int().optional()
  }),
  dialogueTreeId: z.string().min(1)
});

export const companionReactionLineSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1)
});

export const companionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  bio: z.string().min(1),
  recruitLocationId: z.string().min(1),
  recruitDialogueId: z.string().min(1),
  storyStages: z.array(companionStoryStageSchema).min(1),
  storyDialogues: z.record(z.string(), dialogueTreeSchema).default({}),
  reactions: z.object({
    positive: z.array(companionReactionLineSchema).min(1),
    negative: z.array(companionReactionLineSchema).min(1),
    warning: z.string().min(1),
    farewell: z.string().min(1)
  })
});

export type SpecialStat = z.infer<typeof specialStatEnum>;
export type SpecialGate = z.infer<typeof specialGateSchema>;
export type DialogueOption = z.infer<typeof dialogueOptionSchema>;
export type DialogueNode = z.infer<typeof dialogueNodeSchema>;
export type DialogueTree = z.infer<typeof dialogueTreeSchema>;
export type QuestObjective = z.infer<typeof questObjectiveSchema>;
export type QuestDefinition = z.infer<typeof questSchema>;
export type RegionDefinition = z.infer<typeof regionSchema>;
export type LocationDefinition = z.infer<typeof locationSchema>;
export type OverworldMapDefinition = z.infer<typeof overworldMapSchema>;
export type InteriorMapDefinition = z.infer<typeof interiorMapSchema>;
export type CompanionDefinition = z.infer<typeof companionSchema>;
export type CompanionStoryStage = z.infer<typeof companionStoryStageSchema>;
export type CompanionReactionLine = z.infer<typeof companionReactionLineSchema>;
