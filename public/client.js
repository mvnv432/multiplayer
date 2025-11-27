import { initMovement, getInput, speed } from "./movement.js";
import { SpriteAnimation } from "./animation.js";
const socket = window.sharedSocket;

// Development mode flag
const isDev = location.hostname === "localhost" || location.hostname === "127.0.0.1";

if (isDev) {
    window.socket = socket;
    console.log("%cDev mode: socket exposed globally", "color: orange");
}

let lastUpdateTime = null;
window.gameFrozen = false;

// DOM references - Game area and local player
const player = document.getElementById('player');
player.classList.add("player");
const gameArea = document.getElementById('game-area');
document.getElementById("lobby-overlay").classList.remove("hidden");
gameArea.appendChild(player);

const hpBar = document.createElement('div');
hpBar.className = "hp-bar";
player.appendChild(hpBar);

const localPlayer = {
    hp: 4, 
    el: player,
    invuln: false,
    stunned: false,
    stunUntil: 0,
    invulnUntil: 0,
}

updateHPBarLocal();

// Wait for server start message
window.addEventListener("serverGameStart", () => {
    const playersData = window.playersDataFromServer;

    if (!playersData) return;

    console.log("Client received game start:", playersData);

    // LOCAL PLAYER
    const myColor = playersData[socket.id].color;
    initLocalPlayerAnimation(myColor);

    x = playersData[socket.id].x;
    y = playersData[socket.id].y;

    // OTHER PLAYERS
    for (const [id, info] of Object.entries(playersData)) {
        if (id === socket.id) continue;
        addOtherPlayer(id, info, info.color);
    }

    // Reset game start time
    lastUpdateTime = performance.now();

    window.gameRunning = true;
    // Start game loop
    requestAnimationFrame(update);
});

// Listen users
initMovement();

let anim; 

function initLocalPlayerAnimation(color) {
    anim = new SpriteAnimation(player, {
        frameWidth: 192,
        frameHeight: 192,
        animations: {
            idle:   { file: `/assets/warrior_${color}/Warrior_Idle.png`,   frames: 8, fps: 8 },
            run:    { file: `/assets/warrior_${color}/Warrior_Run.png`,    frames: 6, fps: 6 },
            attack: { file: `/assets/warrior_${color}/Warrior_Attack1.png`, frames: 4, fps: 5 },
            sheep: { 
                file: `/assets/sheep/Sheep_Grass192.png`,
                frames: 12,
                fps: 5,
            }
        }
    });
}

// Play area
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// Consts for clamping the player properly
const FOOT_OFFSET_Y = 70;   // try to clamp with feet
const BODY_WIDTH = 70;  // clamp with body width

// Player movement
let x = 100, y = 100;
let localDead = false;

   // Other players in memory
const others = {}; // { id: { el, x, y, tx, ty, t } }

// // Game loop

function update(time) {

    if (window.gameRunning === false) {
        return; // STOP GAME LOOP
    }

    if (!lastUpdateTime) {
        lastUpdateTime = time;
    }

    const delta = (time - lastUpdateTime) / 1000;
    lastUpdateTime = time;

    if (localDead) {
        anim.update(delta);  // still animate sheep
        player.style.transform = `translate(${x}px, ${y}px)`;  

        // DO NOT return — continue updating others
    } else {
    
        let input = { dx: 0, dy: 0, attack: false }; 

        // Only get input if game not frozen
        if (!window.gameFrozen) {
        // Read input snapshot
        input = getInput();

        // Tell animation about input (decides idle/run/attack)
        anim.handleInput(input);
        }

        if (!window.gameFrozen) {
            // When local attack animation starts, notify server to start animation for all
            if (anim.current === "attack" && anim.frame === 0 && !anim.sentAttack) {
                socket.emit("attack");
                anim.sentAttack = true;
            }
            // When in frame 3, spawn hitbox and it send if it
            if (anim.current === "attack" && anim.frame === 3 && !anim.spawnedHitbox) {
                // spawn sword hitbox (locally)
                spawnSwordHitbox(x, y, anim.lastFaceLeft)

                anim.spawnedHitbox = true;
            }
            if (anim.current !== "attack") {
                anim.sentAttack = false;
                anim.spawnedHitbox = false;
            }

            if (localPlayer.stunned) {
                if (performance.now() >= localPlayer.stunUntil) {
                    localPlayer.stunned = false;
                } else {
                    // Skip movement while stunned
                    input.dx = 0;
                    input.dy = 0;
                }
            }

            if (localPlayer.invuln && performance.now() >= localPlayer.invulnUntil) {
                localPlayer.invuln = false;
                stopBlink(player)
            }
        }

        // Advance animation frames
        anim.update(delta);

        // Movement frozen while winscreen
        if (!window.gameFrozen) {
        // Movement (frozen while attacking)
            if (!anim.isAttacking && !anim.justFinishedAttack) {
                let { dx, dy } = input;

                if (dx !== 0 || dy !== 0) {
                    const len = Math.sqrt(dx*dx + dy*dy);
                    dx /= len;
                    dy /= len;
                }

                x += dx * speed * delta;
                y += dy * speed * delta;

                // clamp inside area
                const footX = x + BODY_WIDTH / 2;
                const footY = y + FOOT_OFFSET_Y;

                const clampedFootX = Math.max(0, Math.min(footX, GAME_WIDTH));
                const clampedFootY = Math.max(0, Math.min(footY, GAME_HEIGHT));

                // Convert clamped feet back to sprite position
                x = clampedFootX - BODY_WIDTH / 2;
                y = clampedFootY - FOOT_OFFSET_Y;

                // Top clamp. Because feet are so slow
                const TOP_PADDING = 40;    // tune this
                if (y + TOP_PADDING < 0) {
                    y = -TOP_PADDING;
                }

                // Right clamp 
                const RIGHT_PADDING = 60;  // tune this
                if (x + RIGHT_PADDING > GAME_WIDTH) {
                    x = GAME_WIDTH - RIGHT_PADDING;
                }
            }
        }
    }

    // Apply transform (movement + flip)
    player.style.transform = anim.getTransform(x, y);

    // Send position to server periodically
    socket.emit('move', { x, y });

    // UPDATE OTHER PLAYERS LOOP
    for (const id in others) {
        const p = others[id];

        if (p.dead) {
            // remote sheep — only animate sheep
            p.anim.update(delta);
            p.el.style.transform = p.anim.getTransform(p.x, p.y);
            continue; // skip run/idle/attack logic
        }

        // Interpolation
        p.t = Math.min(p.t + delta * 10, 1);
        const ix = p.x + (p.tx - p.x) * p.t;
        const iy = p.y + (p.ty - p.y) * p.t;

        // Determine if moving
        const moving = (Math.abs(p.tx - p.x) > 0.5 || Math.abs(p.ty - p.y) > 0.5);

        // If remotes stunned
        if (p.stunned && performance.now() < p.stunUntil) {

        } else {
            p.stunned = false
        }

        // Invulnerability timeout
        if (p.invuln && performance.now() >= p.invulnUntil) {
            p.invuln = false;
            stopBlink(p.el);
        }

        // Animation choice only when needed
        if (p.anim.current === "attack" || p.anim.isAttacking) {
            // Dont switch yet
        } else {
            // Handle idle/run normally
            if (moving) {
                if (p.anim.current !== "run") p.anim._play("run");
            } else {
                if (p.anim.current !== "idle") p.anim._play("idle");
            }
        }

        // Flip direction using lastFaceLeft
        if (p.tx < p.x)    p.anim.lastFaceLeft = true;
        else if (p.tx > p.x) p.anim.lastFaceLeft = false;

        // Advance animation frames
        p.anim.update(delta);

        // Remote attack ended
        if (p.anim.justFinishedAttack) {
        p.anim.isAttacking = false;
        }

        // Apply full animation transform
        p.el.style.transform = p.anim.getTransform(ix, iy);

        // lock if finished
        if (p.t >= 1) {
            p.x = p.tx;
            p.y = p.ty;
        }
    }

    requestAnimationFrame(update);
}

// Socket events

socket.on("playerAttacked", (id) => {
    const p = others[id];
    if (!p) return;

    p.anim.isAttacking = true;
    p.anim.justFinishedAttack = false;  // prevent override
    p.anim._play("attack");
});

socket.on('playerJoined', data => {
    if (data.id !== socket.id) {
        addOtherPlayer(data.id, data.pos, data.color);
    }
    
});

socket.on('players', (data) => {
    // Get my own color
    const myColor = data[socket.id].color;
    initLocalPlayerAnimation(myColor);

    // Spawn all current players (excluding self)
    for (const [id, pos] of Object.entries(data)) {
        if (id === socket.id) continue; // skip self
        addOtherPlayer(id, pos, pos.color);
    }
    // Start game loop after we have our color & animation
    requestAnimationFrame(update);
});

socket.on('playerMoved', ({ id, pos }) => {
    const p = others[id];
    if (p) {
        // set interpolation targets
        p.x = p.tx; p.y = p.ty;
        p.tx = pos.x;
        p.ty = pos.y;
        p.t = 0;
    }
});

socket.on("playerHP", ({ id, hp}) =>{

    // Update local hp bar
    if (id === socket.id) {
        if (!localPlayer.invuln) {
            localPlayer.hp = hp;
            updateHPBarLocal();

            triggerHitReactionLocal(); // stun + blink anim
        }
        
        return;
    }

    // Remote players
    const p = others[id];
    if (!p) return;

    if(p) {
        p.hp = hp;
        // Update HP bar UI
        updateHPBar(p);
        triggerHitReactionRemote(p); // stun + blink anim
    }
})

socket.on("playerDied", (id) => {
    console.log("Player died:", id);

    if (id === socket.id) {
        // LOCAL PLAYER DIED
        localDead = true;

        anim._play("sheep");
        anim.isAttacking = false;
        anim.justFinishedAttack = false;
        alert("You died! 💀");

        return;
    }

        // Remote player sheepify
        const p = others[id];
        if (p) {
            p.dead = true;
            p.anim._play("sheep");
            p.anim.isAttacking = false;
            p.anim.justFinishedAttack = false;
        }
});

socket.on('gameOver', ({ winnerName, roundTime }) => {
    showWinScreen(winnerName, roundTime);

     // Freeze timer (dont remove)
    timerEl.textContent = formatTime(roundTime);
})

socket.on('playerLeft', (id) => {
    const p = others[id];
    if (p) {
        p.el.remove();
        delete others[id];
    }
});

// Timer
const timerEl = document.getElementById("game-timer");
socket.on("updateTimer", (elapsed) => {
    if (!timerEl) return;
    timerEl.textContent = formatTime(elapsed);
});

// --- Quit button logic ---
const quitBtn = document.getElementById('quitBtn');
if (quitBtn) {
    quitBtn.addEventListener('click', () => {
        console.log("Player quit");
        socket.disconnect(); // cleanly close socket
        window.location.href = 'index.html'; // go back to menu
    });
}

// Helper: create new player DOM element
function addOtherPlayer(id, pos, color) {
    const div = document.createElement('div');
    div.id = `player-${id}`;
    div.classList.add('player', `player-${color}`);
    gameArea.appendChild(div);

    // Hp bar
    const hpBar = document.createElement('div');
    hpBar.className = "hp-bar";
    div.appendChild(hpBar);

    // Animation handler for this div
    const anim = new SpriteAnimation(div, {
        frameWidth: 192,
        frameHeight: 192,
        animations: {
            idle:   { file: `/assets/warrior_${color}/Warrior_Idle.png`,   frames: 8, fps: 8 },
            run:    { file: `/assets/warrior_${color}/Warrior_Run.png`,    frames: 6, fps: 6 },
            attack: { file: `/assets/warrior_${color}/Warrior_Attack1.png`, frames: 4, fps: 5 },
            sheep: { 
                file: `/assets/sheep/Sheep_Grass192.png`,
                frames: 12,
                fps: 5,
            }
        }
    });
    div.style.transform = `translate(${pos.x}px, ${pos.y}px)`;

    others[id] = {
        el: div, 
        anim,
        x: pos.x, y: pos.y, tx: pos.x, ty: pos.y, t: 0, dead: false,
        hp: 4,
        invuln: false,
        stunned: false,
        stunUntil: 0,
        invulnUntil: 0,
    };
    updateHPBar(others[id]);
}

// Helper: Sword hitbox
function spawnSwordHitbox(px, py, facingLeft) {
    const hitbox = document.createElement('div');
    hitbox.classList.add("hitbox-sword");

    // Size
    const W = 40, H = 40;

    hitbox.style.width = W + "px";
    hitbox.style.height = H + "px";
    hitbox.style.position = "absolute";
    hitbox.style.zIndex = 5;

    // Offset sword vs player
    const offsetX = facingLeft ? 5 : 50;
    const offsetY =  30;

    hitbox.style.left = (px + offsetX) + "px";
    hitbox.style.top = (py + offsetY) + "px";

    gameArea.appendChild(hitbox);

    // Detect collision (only client side on hit, then server validates death)
    for (const id in others) {
        const p = others[id];

        if (!p.invuln && rectsOverlap(hitbox, p.el)) {
            socket.emit("hit", id);
        }
    }

    // Remove hitbox after delay
    setTimeout(() => hitbox.remove(), 1500);
}

function rectsOverlap(a, b) {
    const r1 = a.getBoundingClientRect();
    const r2 = b.getBoundingClientRect();

    return !(
        r1.right < r2.left ||
        r1.left > r2.right ||
        r1.bottom < r2.top ||
        r1.top > r2.bottom
    );
}

function updateHPBar(p) {
    if (!p.el.querySelector('.hp-bar-inner')) {
        const inner = document.createElement('div');
        inner.className = 'hp-bar-inner';
        p.el.querySelector('.hp-bar').appendChild(inner);
    }

    const hpPercent = Math.max(0, p.hp) / 4 * 100;
    p.el.querySelector('.hp-bar-inner').style.width = hpPercent + "%";
}

function updateHPBarLocal() {
    let bar = player.querySelector('.hp-bar-inner');
    if (!bar) {
        bar = document.createElement('div');
        bar.className = 'hp-bar-inner';
        player.querySelector('.hp-bar').appendChild(bar);
    }

    const hpPercent = Math.max(0, localPlayer.hp) / 4 * 100;
    bar.style.width = hpPercent + "%";
}

function showWinScreen(winnerName, roundTime) {
    const overlay = document.getElementById("win-screen");
    const nameEl = document.getElementById("winner-name");
    const timeEl = document.getElementById("winner-time");
    overlay.classList.remove("hidden");
    overlay.classList.add("show");

    nameEl.textContent = `${winnerName} wins!`;
    timeEl.textContent = `Round lasted ${roundTime} seconds`;

    overlay.classList.add("show");

    // freeze inputs & movement
    window.gameFrozen = true;

    // go back to lobby
    document.getElementById("back-to-menu")
        .onclick = () =>  window.location.href = "./index.html";  // simplest method
}

// converts time to mm:ss (server sends only 1s interval)
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function triggerHitReactionLocal() {
    const t = performance.now();

    // stun for some ms
    localPlayer.stunned = true;
    localPlayer.stunUntil = t + 500;

    // invul 2sec
    localPlayer.invuln = true;
    localPlayer.invulnUntil = t + 2000;

    // visual feedback / blink white
    if (p.hp > 0) { 
        blinkSprite(player);
    }

    // if player died just return (sheepify)
    if (localPlayer.hp <= 0) return;
}

function triggerHitReactionRemote(p) {
    const t = performance.now();

    p.stunned = true;
    p.stunUntil = t + 700;

    p.invuln = true;
    p.invulnUntil = t + 2000;

    if (p.hp > 0) { 
    blinkSprite(p.el);
    }
}

function blinkSprite(el) {
    el.classList.add("blink");
}

function stopBlink(el) {
    el.classList.remove("blink");
}