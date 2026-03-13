import { type InteriorMapDefinition, type LocationDefinition, type OverworldMapDefinition, type RegionDefinition } from "../schemas/content.js";
export interface GameContentBundle {
    contentRoot: string;
    regions: RegionDefinition[];
    locations: LocationDefinition[];
    overworldMaps: OverworldMapDefinition[];
    interiorMaps: InteriorMapDefinition[];
}
export declare function getDefaultContentRoot(): string;
export declare function loadGameContent(contentRoot?: string): GameContentBundle;
export declare function validateGameContent(contentRoot?: string): GameContentBundle;
