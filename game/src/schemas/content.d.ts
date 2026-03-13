import { z } from "zod";
export declare const regionSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    biome: z.ZodString;
    mapId: z.ZodString;
    summary: z.ZodString;
    startingLocationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    biome: string;
    mapId: string;
    summary: string;
    startingLocationId: string;
}, {
    id: string;
    name: string;
    biome: string;
    mapId: string;
    summary: string;
    startingLocationId: string;
}>;
export declare const locationSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
    regionId: z.ZodString;
    position: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
    }>;
    interiorMapId: z.ZodNullable<z.ZodString>;
    factionTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    questTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    encounterFlags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    type: string;
    regionId: string;
    position: {
        x: number;
        y: number;
    };
    interiorMapId: string | null;
    factionTags: string[];
    questTags: string[];
    encounterFlags: string[];
    description: string;
}, {
    id: string;
    name: string;
    type: string;
    regionId: string;
    position: {
        x: number;
        y: number;
    };
    interiorMapId: string | null;
    description: string;
    factionTags?: string[] | undefined;
    questTags?: string[] | undefined;
    encounterFlags?: string[] | undefined;
}>;
export declare const overworldMapSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    theme: z.ZodString;
    width: z.ZodNumber;
    height: z.ZodNumber;
    pointsOfInterest: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    theme: string;
    width: number;
    height: number;
    pointsOfInterest: string[];
}, {
    id: string;
    name: string;
    theme: string;
    width: number;
    height: number;
    pointsOfInterest?: string[] | undefined;
}>;
export declare const interiorMapSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    theme: z.ZodString;
    layout: z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">;
    spawnPoints: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        x: number;
        y: number;
    }, {
        id: string;
        x: number;
        y: number;
    }>, "many">;
    exits: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        target: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        x: number;
        y: number;
        target: string;
    }, {
        id: string;
        x: number;
        y: number;
        target: string;
    }>, "many">;
    interactables: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        type: string;
        label: string;
    }, {
        id: string;
        type: string;
        label: string;
    }>, "many">>;
    npcs: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        disposition: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        disposition: string;
    }, {
        id: string;
        name: string;
        disposition: string;
    }>, "many">>;
    loot: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        label: string;
    }, {
        id: string;
        label: string;
    }>, "many">>;
    questHooks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    theme: string;
    layout: string[][];
    spawnPoints: {
        id: string;
        x: number;
        y: number;
    }[];
    exits: {
        id: string;
        x: number;
        y: number;
        target: string;
    }[];
    interactables: {
        id: string;
        type: string;
        label: string;
    }[];
    npcs: {
        id: string;
        name: string;
        disposition: string;
    }[];
    loot: {
        id: string;
        label: string;
    }[];
    questHooks: string[];
}, {
    id: string;
    name: string;
    theme: string;
    layout: string[][];
    spawnPoints: {
        id: string;
        x: number;
        y: number;
    }[];
    exits: {
        id: string;
        x: number;
        y: number;
        target: string;
    }[];
    interactables?: {
        id: string;
        type: string;
        label: string;
    }[] | undefined;
    npcs?: {
        id: string;
        name: string;
        disposition: string;
    }[] | undefined;
    loot?: {
        id: string;
        label: string;
    }[] | undefined;
    questHooks?: string[] | undefined;
}>;
export type RegionDefinition = z.infer<typeof regionSchema>;
export type LocationDefinition = z.infer<typeof locationSchema>;
export type OverworldMapDefinition = z.infer<typeof overworldMapSchema>;
export type InteriorMapDefinition = z.infer<typeof interiorMapSchema>;
