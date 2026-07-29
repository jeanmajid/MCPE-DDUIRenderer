import { Player, system, world } from "@minecraft/server";
import { CustomForm, Observable } from "@minecraft/server-ui";
import { indices, vertexes } from "./models/cube";

// This code uses a basic 3d setup, no matrices just
// x = x / z
// y = y / z

// We do this to not overload the js engine too much and also bcs its faster to type out

type Vertex = {
    x: number;
    y: number;
    z: number;
};

class DDUIRenderer {
    mapObservable: Observable<string>;
    mapBuffer: string[][];
    height: number = 16;
    width: number = 24;
    fps: number = 20;
    color1 = "□";
    color2 = "■";
    cameraZ: number = 0.6;

    constructor() {
        this.mapObservable = Observable.create<string>("");

        this.createBuffer();
        this.render();
    }

    createBuffer() {
        this.mapBuffer = [];
        for (let i = 0; i < this.height; ++i) {
            this.mapBuffer[i] = [];
        }
    }

    show(player: Player) {
        CustomForm.create(player, "3D").label(this.mapObservable).show();
    }

    clearScreen() {
        for (let x = 0; x < this.height; ++x) {
            for (let y = 0; y < this.width; ++y) {
                this.mapBuffer[x][y] = this.color1;
            }
        }
    }

    screenProject({ x, y, z }: Vertex) {
        const zOffset = z + this.cameraZ;

        return {
            x: Math.floor(((x / zOffset + 1) / 2) * this.width),
            y: Math.floor(((1 - y / zOffset) / 2) * this.height),
        };
    }

    setPixel(x: number, y: number) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.mapBuffer[y][x] = this.color2;
        }
    }

    point(vertex: Vertex) {
        const { x, y } = this.screenProject(vertex);
        this.setPixel(x, y);
    }

    // Bresenham line algorithm
    line(vertex1: Vertex, vertex2: Vertex) {
        const p1 = this.screenProject(vertex1);
        const p2 = this.screenProject(vertex2);

        let x0 = p1.x;
        let y0 = p1.y;
        const x1 = p2.x;
        const y1 = p2.y;

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            this.setPixel(x0, y0);

            if (x0 === x1 && y0 === y1) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }
    }

    rotateXZ({ x, y, z }: Vertex, angle: number) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: x * cos - z * sin,
            y,
            z: x * sin + z * cos,
        };
    }

    rotateXY({ x, y, z }: Vertex, angle: number) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: x * cos - y * sin,
            y: x * sin + y * cos,
            z,
        };
    }

    render() {
        let angle = 0;
        const deltaTime = 1 / this.fps;

        system.runInterval(() => {
            this.clearScreen();

            angle += (Math.PI * deltaTime) / 10;

            for (const indice of indices) {
                for (let i = 0; i < indice.length; ++i) {
                    const vertex1 = this.rotateXY(this.rotateXZ(vertexes[indice[i]], angle), angle);
                    const vertex2 = this.rotateXY(this.rotateXZ(vertexes[indice[(i + 1) % indice.length]], angle), angle);
                    this.line(vertex1, vertex2);
                }
            }

            this.mapObservable.setData(this.mapBuffer.map((b) => b.join("")).join("\n"));
        }, 1);
    }
}

const player = world.getAllPlayers()[0];
const renderer = new DDUIRenderer();

renderer.show(player);
