import { z } from "zod";

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
  theme: z.string().min(1),
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
      label: z.string().min(1)
    })
  ).default([]),
  npcs: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      disposition: z.string().min(1)
    })
  ).default([]),
  loot: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1)
    })
  ).default([]),
  questHooks: z.array(z.string()).default([])
});

export type RegionDefinition = z.infer<typeof regionSchema>;
export type LocationDefinition = z.infer<typeof locationSchema>;
export type OverworldMapDefinition = z.infer<typeof overworldMapSchema>;
export type InteriorMapDefinition = z.infer<typeof interiorMapSchema>;
