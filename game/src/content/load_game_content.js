import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { ZodError } from "zod";
import { interiorMapSchema, locationSchema, overworldMapSchema, regionSchema } from "../schemas/content.js";
function loadYamlFile(filePath, parser) {
    const raw = readFileSync(filePath, "utf8");
    const parsed = yaml.load(raw);
    try {
        return parser.parse(parsed);
    }
    catch (error) {
        if (error instanceof ZodError) {
            const issues = error.issues
                .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
                .join("; ");
            throw new Error(`Invalid content file ${filePath}: ${issues}`);
        }
        throw error;
    }
}
function loadDirectory(directoryPath, parser) {
    return readdirSync(directoryPath)
        .filter((fileName) => fileName.endsWith(".yaml"))
        .sort()
        .map((fileName) => loadYamlFile(path.join(directoryPath, fileName), parser));
}
export function getDefaultContentRoot() {
    return path.resolve(import.meta.dirname, "..", "..", "content");
}
export function loadGameContent(contentRoot = getDefaultContentRoot()) {
    const regions = loadDirectory(path.join(contentRoot, "world"), regionSchema);
    const locations = loadDirectory(path.join(contentRoot, "locations"), locationSchema);
    const overworldMaps = loadDirectory(path.join(contentRoot, "maps", "overworld"), overworldMapSchema);
    const interiorMaps = loadDirectory(path.join(contentRoot, "maps", "interiors"), interiorMapSchema);
    const regionIds = new Set(regions.map((region) => region.id));
    const interiorMapIds = new Set(interiorMaps.map((map) => map.id));
    const overworldMapIds = new Set(overworldMaps.map((map) => map.id));
    for (const region of regions) {
        if (!overworldMapIds.has(region.mapId)) {
            throw new Error(`Region ${region.id} references missing overworld map ${region.mapId}`);
        }
    }
    for (const location of locations) {
        if (!regionIds.has(location.regionId)) {
            throw new Error(`Location ${location.id} references missing region ${location.regionId}`);
        }
        if (location.interiorMapId && !interiorMapIds.has(location.interiorMapId)) {
            throw new Error(`Location ${location.id} references missing interior map ${location.interiorMapId}`);
        }
    }
    return {
        contentRoot,
        regions,
        locations,
        overworldMaps,
        interiorMaps
    };
}
export function validateGameContent(contentRoot = getDefaultContentRoot()) {
    return loadGameContent(contentRoot);
}
//# sourceMappingURL=load_game_content.js.map