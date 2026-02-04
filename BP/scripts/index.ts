import { world } from "@minecraft/server";

world.afterEvents.worldLoad.subscribe(() => {
    import("./3d.js");
});
