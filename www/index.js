import { Game } from "tetris-wasm";
import { memory } from "tetris-wasm/tetris_wasm_bg";

const BLOCK_SIZE = 15;
const COLOR_MAP = [
    [255, 255, 255, 1], // WHITE
    [ 75,  75,  75, 1], // GRAY
    [  0,   0,   0, 0], // TRANS
    [  0, 255, 255, 1], // CYAN
    [255, 255,   0, 1], // YELOW
    [  0, 255,   0, 1], // LIME
    [255,   0,   0, 1], // RED
    [  0,   0, 255, 1], // BLUE
    [255, 165,   0, 1], // ORANGE
    [128,   0, 128, 1], // PURPLE
];

const getRGBAString = (rgb, alpha) => {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
};

const game = Game.new();

const canvas  = document.getElementById("field-canvas");
canvas.height = 500;
canvas.width  = 320;

const ctx = canvas.getContext("2d");

const fps = new class {
    constructor() {
        this.fps = document.getElementById("fps");
        this.frames = [];
        this.lastFrameTimeStamp = performance.now();
    }

    render() {
        // Convert the delta time since the last frame render into a measure
        // of frames per second.
        const now = performance.now();
        const delta = now - this.lastFrameTimeStamp;
        this.lastFrameTimeStamp = now;
        const fps = 1 / delta * 1000;

        // Save only the latest 100 timings.
        this.frames.push(fps);
        if (this.frames.length > 100) {
            this.frames.shift();
        }

        // Find the max, min, and mean of our 100 latest timings.
        let min = Infinity;
        let max = -Infinity;
        let sum = 0;
        for (let i = 0; i < this.frames.length; i++) {
            sum += this.frames[i];
            min = Math.min(this.frames[i], min);
            max = Math.max(this.frames[i], max);
        }
        let mean = sum / this.frames.length;

        // Render the statistics.
        this.fps.textContent = `
Frames per Second:
         latest = ${Math.round(fps)}
avg of last 100 = ${Math.round(mean)}
min of last 100 = ${Math.round(min)}
max of last 100 = ${Math.round(max)}
`.trim();
    }
};

let animationId = null;
let controller = new Array(7);
controller.fill(false);
let raw_controller = new Array(7);
raw_controller.fill(0);

const renderLoop = () => {
    fps.render();
    update_controller();
    game.tick(
        controller[0], controller[1],
        controller[2], controller[3],
        controller[4], controller[5],
        controller[6]
    );

    game.rendering();
    draw();

    if (game.is_gameover()) {
        alert("Game Over!");
        animationId = null;
        return;
    }

    animationId = requestAnimationFrame(renderLoop);
};

const draw = () => {
    const field = new Uint8Array(memory.buffer, game.field_ptr(), 200);
    const clear = new Uint8Array(memory.buffer, game.clear_ptr(), 200);
    const next  = new Uint8Array(memory.buffer, game.next_ptr(), 48);
    const hold  = new Uint8Array(memory.buffer, game.hold_ptr(), 16);

    // field
    ctx.clearRect(80, 50, 150, 300);
    for (let row = 0; row < 20; row++) {
        for (let col = 0; col < 10; col++) {
            const idx   = row * 10 + col;
            const color = COLOR_MAP[field[idx]];

            ctx.fillStyle = getRGBAString(color, clear[idx] == 1 ?
                                          1.0 - game.get_interval_ratio() :
                                          color[3]);

            ctx.fillRect(
                col * BLOCK_SIZE + 80,
                row * BLOCK_SIZE + 50,
                BLOCK_SIZE,
                BLOCK_SIZE
            );
        }
    }

    // hold
    ctx.clearRect(10, 80, 60, 60);
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            const ind = hold[row * 4 + col];
            const color = ind == 2 || game.can_use_hold() ? COLOR_MAP[ind] : COLOR_MAP[1];
            ctx.fillStyle = getRGBAString(color, color[3]);

            ctx.fillRect(
                col * BLOCK_SIZE + 10,
                row * BLOCK_SIZE + 80,
                BLOCK_SIZE,
                BLOCK_SIZE
            );
        }
    }

    // next
    ctx.clearRect(240, 60, 60, 180);
    for (let idx = 0; idx < 3; idx++) {
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const color = COLOR_MAP[next[(2 - idx) * 16 + row * 4 + col]];
                ctx.fillStyle = getRGBAString(color, color[3]);

                ctx.fillRect(
                    col * BLOCK_SIZE + 240,
                    row * BLOCK_SIZE + 60 + idx * 60,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
            }
        }
    }

    ctx.fillStyle = "#000000";
    ctx.clearRect(240, 240, 80, 170);
    ctx.fillText("Score", 240, 270);
    ctx.fillText(`${game.get_score()}`, 240, 310);
    ctx.fillText("Lines", 240, 350);
    ctx.fillText(`${game.get_clearlines()}`, 240, 390);

    // A
    ctx.beginPath();
    ctx.fillStyle = raw_controller[0] > 0 ? "#000000" : "#FFFFFF";
    ctx.moveTo(231, 435);
    ctx.arc(255, 435, 24, 0, 2*Math.PI, true);
    ctx.fill();
    // B
    ctx.beginPath();
    ctx.fillStyle = raw_controller[1] > 0 ? "#000000" : "#FFFFFF";
    ctx.moveTo(161, 466);
    ctx.arc(185, 466, 24, 0, 2*Math.PI, true);
    ctx.fill();

    // ↑
    ctx.fillStyle = raw_controller[2] > 0 ? "#000000" : "#FFFFFF";
    ctx.fillRect(60, 405, 30, 30);

    // ↓
    ctx.fillStyle = raw_controller[3] > 0 ? "#000000" : "#FFFFFF";
    ctx.fillRect(60, 467, 30, 30);

    // →
    ctx.fillStyle = raw_controller[4] > 0 ? "#000000" : "#FFFFFF";
    ctx.fillRect(91, 436, 30, 30);

    // ←
    ctx.fillStyle = raw_controller[5] > 0 ? "#000000" : "#FFFFFF";
    ctx.fillRect(29, 436, 30, 30);
};

const update_controller = () => {
    // A B hard drop
    for (let i = 0; i < 3; i++) {
        controller[i] = raw_controller[i] == 1;
    }
    // ↓→←
    for (let i = 3; i < 6; i++) {
        controller[i] = raw_controller[i] == 1 || raw_controller[i] > 20;
    }

    controller[6] = raw_controller[6] == 1;

    for (let i = 0; i < 7; i++) {
        if (raw_controller[i] > 0) raw_controller[i]++;
    }
};

const buttonDownFunc = (tx, ty) => {
    const boundingRect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / boundingRect.width;
    const scaleY = canvas.height / boundingRect.height;

    const x = (tx - boundingRect.left) * scaleX;
    const y = (ty - boundingRect.top) * scaleY;

    if ((x-255)**2+(y-435)**2 <= 576) {
        if (raw_controller[0] == 0) raw_controller[0] = 1;
    } else if ((x-185)**2+(y-466)**2 <= 576) {
        if (raw_controller[1] == 0) raw_controller[1] = 1;
    } else if (60 <= x && x < 90 && 405 <= y && y < 435) {
        if (raw_controller[2] == 0) raw_controller[2] = 1;
    } else if (60 <= x && x < 90 && 467 <= y && y < 497) {
        if (raw_controller[3] == 0) raw_controller[3] = 1;
    } else if (91 <= x && x < 121 && 436 <= y && y < 466) {
        if (raw_controller[4] == 0) raw_controller[4] = 1;
    } else if (29 <= x && x < 59 && 436 <= y && y < 466) {
        if (raw_controller[5] == 0) raw_controller[5] = 1;
    } else if (10 <= x && x <= 70 && 80 <= y && y <= 140) {
        if (raw_controller[6] == 0) raw_controller[6] = 1;
    }
};

const buttonUpFunc = event => {
    event.preventDefault();
    for (let i = 0; i < 7; i++) raw_controller[i] = 0;
};

canvas.addEventListener('touchmove', e => {e.preventDefault();}, {passive: false});
canvas.addEventListener("mousedown", e => {
    event.preventDefault();
    buttonDownFunc(e.clientX, e.clientY);
}, false);
canvas.addEventListener("touchstart", e => {
    event.preventDefault();
    buttonDownFunc(e.touches[0].clientX, e.touches[0].clientY);
}, false);
canvas.addEventListener("mouseup", buttonUpFunc, false);
canvas.addEventListener("touchend", buttonUpFunc, false);

document.addEventListener("keydown", event => {
    const k = event.keyCode;

    // switch文のほうがよかったかも定期
    if (k == 90 || k == 32) {
        if (raw_controller[0] == 0) raw_controller[0] = 1;
    } else if (k == 88) {
        if (raw_controller[1] == 0) raw_controller[1] = 1;
    } else if (k == 38) {
        if (raw_controller[2] == 0) raw_controller[2] = 1;
    } else if (k == 40) {
        if (raw_controller[3] == 0) raw_controller[3] = 1;
    } else if (k == 39) {
        if (raw_controller[4] == 0) raw_controller[4] = 1;
    } else if (k == 37) {
        if (raw_controller[5] == 0) raw_controller[5] = 1;
    } else if (k == 16) {
        if (raw_controller[6] == 0) raw_controller[6] = 1;
    }
}, false);

document.addEventListener("keyup", event => {
    let k = event.keyCode;
    if (k == 90) k = 32;
    const i = [32, 88, 38, 40, 39, 37, 16].indexOf(k);
    raw_controller[i] = 0;
}, false);

const main = () => {
    // default canvas
    // ctx.font = "16px 'Press Start 2P', cursive";
    ctx.font = "28px 'Century Gothic', sans-serif";
    ctx.fillText("Hold", 10, 24);
    ctx.fillText("Next", 240, 24);
    // ctx.font = "12px 'Press Start 2P', cursive";
    ctx.font = "20px 'Century Gothic', sans-serif";
    ctx.fillText("Score", 240, 270);
    ctx.fillText("Lines", 240, 350);
    // ctx.font = "12px 'Press Start 2P', cursive";
    ctx.font = "20px 'Century Gothic', sans-serif";
    ctx.fillText("↑touch", 0, 170);

    // field
    ctx.strokeRect(79, 49, 151, 301);

    // 十
    ctx.beginPath();
    ctx.moveTo( 59, 404);
    ctx.lineTo( 59, 435);
    ctx.lineTo( 28, 435);
    ctx.lineTo( 28, 466);
    ctx.lineTo( 59, 466);
    ctx.lineTo( 59, 497);
    ctx.lineTo( 90, 497);
    ctx.lineTo( 90, 466);
    ctx.lineTo(121, 466);
    ctx.lineTo(121, 435);
    ctx.lineTo( 90, 435);
    ctx.lineTo( 90, 404);
    ctx.closePath();

    // A
    ctx.moveTo(160, 466);
    ctx.arc(185, 466, 25, 0, 2*Math.PI, true);
    // B
    ctx.moveTo(230, 435);
    ctx.arc(255, 435, 25, 0, 2*Math.PI, true);

    ctx.stroke();

    game.rendering();
    draw();
    animationId = requestAnimationFrame(renderLoop);
};

// addEventListener("load", main, false);
main();
