import { initMovement, getInput, speed } from "./movement.js";
import { SpriteAnimation } from "./animation.js";
import { resizeGame } from "./gameResize.js";
import {
    addOtherPlayer,
    updateHPBar,
    updateHPBarLocal,
    rectsOverlap,
    blinkSprite,
    stopBlink,
    triggerHitReactionLocal,
    triggerHitReactionRemote,
    spawnSwordHitbox,
    checkPickup,
    formatTime,
    showWinScreen,
    showDeathScreen,
    getUsernameById,
    playSwordSwing,
    playSwordHit
} from "./helpers.js";

const socket = window.sharedSocket;
window.currentLobbyId = localStorage.getItem("currentLobbyId");

let gameIsOver = false;
const MOVE_RATE = 20; // per second
let lastMoveSend = 0;

const sheepSound = document.getElementById("sheepSound");
const swordSwing = document.getElementById("swordSwing");
const swordHit   = document.getElementById("swordHit");
const lifeGained = document.getElementById("lifeGained");
lifeGained.volume = 0.5;

const runningSound = document.getElementById("runningSound");
runningSound.volume = 0.5;
runningSound.isPlaying = false;

const LATE_FRAME_THRESHOLD = 0.018;

// Development mode flag
const isDev = location.hostname === "localhost" || location.hostname === "127.0.0.1";

if (isDev) {
    window.socket = socket;
    console.log("%cDev mode: socket exposed globally", "color: orange");
}

// Prevents interpolation to run when users window inactive
window.addEventListener("blur", () => {
    window._windowInactive = true;
});

window.addEventListener("focus", () => {
    // Reset delta spike when resuming from browser inactivity
    lastUpdateTime = performance.now();
    window._windowInactive = false;
});

let lastUpdateTime = null;
window.gameFrozen = false;
window.gamePaused = false;

// DOM references - Game area and local player
window.addEventListener("resize", resizeGame); 
resizeGame();

const player = document.getElementById('player');
player.classList.add("player");


const gameArea = document.getElementById('game-area');
document.getElementById("lobby-overlay").classList.remove("hidden");
gameArea.appendChild(player);

const localNameTag = document.createElement("div");
localNameTag.className = "player-name";
localNameTag.textContent =
localStorage.getItem("username") || "Player";
player.appendChild(localNameTag);


const hpBar = document.createElement('div');
hpBar.className = "hp-bar";
player.appendChild(hpBar);

// TEST if the arena-tiles are bottleneck
// document.getElementById("arena-tiles").style.display = "none";

const localPlayer = {
    hp: 4, 
    el: player,
    invuln: false,
    stunned: false,
    stunUntil: 0,
    invulnUntil: 0,
}

// Pause logic and buttons
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
pauseBtn.onclick = () => {
    socket.emit("pauseGame");
};

const pauseOverlay = document.getElementById("pause-overlay");
const pauseText = document.getElementById("pause-text");

socket.on("gamePaused", ({ lobbyId, by }) => {
    if (lobbyId !== window.currentLobbyId) return;

    window.gamePaused = true;

    // Show pause message
    pauseText.textContent = `${by} paused the game`;
    pauseOverlay.classList.remove("pause-hidden");

    pauseBtn.classList.add("hidden");
    resumeBtn.classList.remove("hidden");

    // Stop running sound if active
    if (runningSound?.isPlaying) {
        runningSound.pause();
        runningSound.isPlaying = false;
    }
});

resumeBtn.onclick = () => {
    socket.emit("resumeGame");
};

const resumeOverlay = document.getElementById("resume-overlay");
const resumeText = document.getElementById("resume-text");

socket.on("gameResumed", ({ lobbyId, by }) => {
    if (lobbyId !== window.currentLobbyId) return;

    window.gamePaused = false;

    // Hide pause window
    pauseOverlay.classList.add("pause-hidden");

    // Show resume popup with name
    resumeText.textContent = `${by} resumed the game`;
    resumeOverlay.classList.remove("resume-hidden");

    pauseBtn.classList.remove("hidden");
    resumeBtn.classList.add("hidden");

    // Delay actual resume so popup is visible
    setTimeout(() => {
        resumeOverlay.classList.add("resume-hidden");

        lastUpdateTime = performance.now();
        requestAnimationFrame(update);

    }, 1500);
});

updateHPBarLocal(player, localPlayer);

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
        addOtherPlayer(
            id,
            info,
            info.color,
            gameArea,
            others,
            getUsernameById,
            SpriteAnimation,
            updateHPBar,
            window.playersDataFromServer 
        );
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
const GAME_WIDTH = 900;
const GAME_HEIGHT = 600;

// Consts for clamping the player properly
const FOOT_OFFSET_Y = 70;   // try to clamp with feet
const BODY_WIDTH = 70;  // clamp with body width

// Player movement
let x = 100, y = 100;
let localDead = false;

   // Other players in memory
const others = {}; // { id: { el, x, y, tx, ty, t } }

function getInterpolatedPosition(p, renderTime) {
    const h = p.history;
    if (!h || h.length === 0) return { x: p.x ?? 0, y: p.y ?? 0 };

    // If we're looking too far back, return earliest snapshot
    if (renderTime < h[0].t) {
        return { x: h[0].x, y: h[0].y };
    }

    // Find two snapshots surrounding renderTime
    for (let i = 0; i < h.length - 1; i++) {
        const a = h[i];
        const b = h[i + 1];

        if (renderTime >= a.t && renderTime <= b.t) {
            const ratio = (renderTime - a.t) / (b.t - a.t);
            return {
                x: a.x + (b.x - a.x) * ratio,
                y: a.y + (b.y - a.y) * ratio
            };
        }
    }

    // If renderTime is beyond the latest snapshot → return last
    return h[h.length - 1];
}

// Game loop
function update(time) {
    // Pause game - FULL STOP
    if (window.gamePaused) {
        return;
    }

    if (!window.gameRunning) {
        return; // Stops game loop, but animation continues
    }

    if (!lastUpdateTime) {
        lastUpdateTime = time;
    }

    const delta = (time - lastUpdateTime) / 1000;
    lastUpdateTime = time;

    const isLateFrame = delta > LATE_FRAME_THRESHOLD;

    if (localDead) {
        anim.update(delta);  // still animate sheep
        player.style.transform = `translate(${x}px, ${y}px)`;  

        // DO NOT return — continue updating others
    } else {
    
        let input = { dx: 0, dy: 0, attack: false }; 

        // Only get input if game not frozen
        if (!window.gameFrozen && !window.gamePaused) {
        // Read input snapshot
        input = getInput();

        // Tell animation about input (decides idle/run/attack)
        anim.handleInput(input);

        const isRunning = anim.current === "run" && !anim.isAttacking;

            if (isRunning && !runningSound.isPlaying) {
                runningSound.isPlaying = true;
                runningSound.currentTime = 0;
                runningSound.play();
            }

            if (!isRunning && runningSound.isPlaying) {
                runningSound.isPlaying = false;
                runningSound.pause();
            }
        }

        if (!window.gameFrozen && !window.gamePaused) {
            // When local attack animation starts, notify server to start animation for all
            if (anim.current === "attack" && anim.frame === 0 && !anim.sentAttack) {
                socket.emit("attack");
            
                playSwordSwing(swordSwing, 1.0);
                anim.sentAttack = true;
            }
            
            // When in frame 3, spawn hitbox and it send if it
            if (anim.current === "attack" && anim.frame === 3 && !anim.spawnedHitbox) {
                // spawn sword hitbox (locally)
                spawnSwordHitbox( x, y, anim.lastFaceLeft, gameArea, others, socket, rectsOverlap);

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

            checkPickup(x, y, socket);
        }

        // Advance animation frames
        anim.update(delta);

        // Movement frozen while winscreen
        if (!window.gameFrozen && !window.gamePaused) {
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
                const RIGHT_PADDING = 40;  // tune this
                if (x + RIGHT_PADDING > GAME_WIDTH) {
                    x = GAME_WIDTH - RIGHT_PADDING;
                }
            }
        }
    }

    // Apply transform (movement + flip)
    player.style.transform = anim.getTransform(x, y);

    // LOCAL name tag flip
    if (anim.lastFaceLeft) {
        localNameTag.classList.add("name-no-flip");
    } else {
        localNameTag.classList.remove("name-no-flip");
    }

    // Send position to server

    if (!window.gameFrozen && !window.gamePaused) {
        if (performance.now() - lastMoveSend > (1000 / MOVE_RATE)) {
        socket.emit("move", { x, y });
        lastMoveSend = performance.now();
        }
    }

    // UPDATE OTHER PLAYERS LOOP
    for (const id in others) {
        const p = others[id];

        if (p.dead) {
            // remote sheep — only animate sheep
            if (!window.gameFrozen && !window.gamePaused) {
                p.anim.update(delta);
            }
            p.el.style.transform = p.anim.getTransform(p.x, p.y);
            continue; // skip run/idle/attack logic
        }

        // Smooth interpolation from buffered snapshots
        let ix = p.x;
        let iy = p.y;

        if (!isLateFrame) {
            const renderTimestamp = performance.now() - 100;
            const pos = getInterpolatedPosition(p, renderTimestamp);
            ix = pos.x;
            iy = pos.y;
        }
        // Initialise previous drawn position if missing
        if (p.prevX === undefined) {
            p.prevX = ix;
            p.prevY = iy;
        }

        // Determine if moving based on interpolated movement
        const moving = (
            Math.abs(ix - p.prevX) > 0.5 ||
            Math.abs(iy - p.prevY) > 0.5
        );

        if (!isLateFrame && moving && !p.runningSound) {
            p.runningSound = runningSound.cloneNode();
            p.runningSound.volume = 0.25;
            p.runningSound.loop = true;
            p.runningSound.play();
        }
        
        if (!moving && p.runningSound) {
            p.runningSound.pause();
            p.runningSound = null;
        }

        // Flip name tag for others
        if (p.anim.lastFaceLeft) {
            p.nameTag.classList.add("name-no-flip");
        } else {
            p.nameTag.classList.remove("name-no-flip");
        }

        // Animation choice only when needed
        if (p.anim.current === "attack" || p.anim.isAttacking) {
            // Dont switch yet
        } else {
            if (moving) {
                if (p.anim.current !== "run") p.anim._play("run");
            } else {
                if (p.anim.current !== "idle") p.anim._play("idle");
            }
        }
        
        // Flip direction using LAST movement direction
        if (ix < p.prevX)      p.anim.lastFaceLeft = true;
        else if (ix > p.prevX) p.anim.lastFaceLeft = false;

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

        // Advance animation frames
        if (!window.gameFrozen && !window.gamePaused) {
            if (!isLateFrame) {
                p.anim.update(delta);
            }
        }

        // Remote attack ended
        if (p.anim.justFinishedAttack) {
        p.anim.isAttacking = false;
        }

        // Apply full animation transform
        p.el.style.transform = p.anim.getTransform(ix, iy);

        // Save for next frame
        p.prevX = ix;
        p.prevY = iy;
    }

    requestAnimationFrame(update);
}

// Socket events

socket.on("playerAttacked", ({ lobbyId, id }) => {
    if (lobbyId !== window.currentLobbyId) return;

    const p = others[id];
    if (!p) return;

    p.anim.isAttacking = true;
    p.anim.justFinishedAttack = false;  // prevent override
    p.anim._play("attack");

    playSwordSwing(swordSwing, 1.0);
});

socket.on('playerJoined', ({ lobbyId, id, pos, color }) => {
    if (lobbyId !== window.currentLobbyId) return;

    if (id !== socket.id) {
        addOtherPlayer(
            id,
            info,
            info.color,
            gameArea,
            others,
            getUsernameById,
            SpriteAnimation,
            updateHPBar,
            window.playersDataFromServer 
        );
    }
});

socket.on('players', ({ lobbyId, data }) => {
    if (lobbyId !== window.currentLobbyId) return;

    // Get my own color
    const myColor = data[socket.id].color;
    initLocalPlayerAnimation(myColor);

    // Spawn all current players (excluding self)
    for (const [id, pos] of Object.entries(data)) {
        if (id === socket.id) continue; // skip self
        addOtherPlayer(
            id,
            info,
            info.color,
            gameArea,
            others,
            getUsernameById,
            SpriteAnimation,
            updateHPBar,
            window.playersDataFromServer 
        );
    }
    // Start game loop after we have our color & animation
    requestAnimationFrame(update);
});

let lastNetworkUpdate = performance.now();

socket.on('playerMoved', ({ lobbyId, id, pos }) => {
    if (lobbyId !== window.currentLobbyId) return;

    const p = others[id];
    if (!p) return;

    const now = performance.now();

    // timing logs
    // console.log("Δ Server update:", (now - lastNetworkUpdate).toFixed(1), "ms");
    lastNetworkUpdate = now;

    // snapshot of movement history
    p.history.push({
        x: pos.x,
        y: pos.y,
        t: now
    });

    // Limit buffer size
    if (p.history.length > 30) {
        p.history.shift();
    }
});

socket.on("heartCollected", ({ by }) => {
    const heart = document.getElementById("heart");
    if (heart) heart.remove();

    if (by === socket.id) {
        lifeGained.currentTime = 0;
        lifeGained.play();
    }
});

socket.on("playerHit", ({ attackerId, victimId }) => {
    // Local player got hit   
    if (victimId === socket.id) {
        triggerHitReactionLocal(localPlayer, player, blinkSprite);
        playSwordHit(swordHit, 1.0);
        return;
    }
    
    // Remote player got hit
    const p = others[victimId];
    if (!p) return;

    triggerHitReactionRemote(p, blinkSprite);
    playSwordHit(swordHit, 0.5);
});

socket.on("playerHP", ({ lobbyId, id, hp}) =>{
    if (lobbyId !== window.currentLobbyId) return;

    // Update local hp bar
    if (id === socket.id) {
        const oldHP = localPlayer.hp;

        localPlayer.hp = hp;
        updateHPBarLocal(player, localPlayer);

        // HP went DOWN → hit reaction
        if (hp < oldHP && !localPlayer.invuln) {
            triggerHitReactionLocal(localPlayer, player, blinkSprite);
        }

        // HP went UP → heal sound (optional but consistent)
        else if (hp > oldHP) {
            lifeGained.currentTime = 0;
            lifeGained.play();
        }
        
        return;
    }

    // Remote players
    const p = others[id];
    if (!p) return;

    if(p) {
        // Remote players animation + sounds on HP change
        const oldHP = p.hp;
        p.hp = hp;
        updateHPBar(p);

        // If HP went DOWN → play hit sound
        if (hp < oldHP) {
            playSwordHit(swordHit, 0.4);
            triggerHitReactionRemote(p, blinkSprite);
        }

        // If HP went UP → play heal sound
        else if (hp > oldHP) {
            const s = lifeGained.cloneNode();
            s.volume = 0.4;
            s.play();
        }
    }
})

socket.on("playerDied", ({ lobbyId, id }) => {
    if (lobbyId !== window.currentLobbyId) return;

    console.log("Player died:", id);

    if (id === socket.id) {
        localDead = true;
    
        sheepSound.currentTime = 0;
        sheepSound.play();
    
        anim._play("sheep");
        anim.isAttacking = false;
        anim.justFinishedAttack = false;
    
        if (!gameIsOver) {
            showDeathScreen("Better luck next time!");
        }
    
        return;
    }
    
        // Remote player sheepify
        const p = others[id];
        if (p) {
            sheepSound.currentTime = 0;
            sheepSound.play();

            p.dead = true;
            p.anim._play("sheep");
            p.anim.isAttacking = false;
            p.anim.justFinishedAttack = false;
        }
});

socket.on('gameOver', ({ lobbyId, winnerName, roundTime }) => {
    if (lobbyId !== window.currentLobbyId) return;

    gameIsOver = true;
    showWinScreen(winnerName, roundTime, formatTime);

     // Freeze timer (dont remove)
    timerEl.textContent = formatTime(roundTime);
});

socket.on("spawnHeart", ({x, y}) => {
    let heart = document.getElementById("heart");

    if (!heart) {
        heart = document.createElement("img");
        heart.id = "heart";
        heart.src = "/assets/buffs/fc659.png";
        heart.classList.add("pickup");
        document.getElementById("game-area").appendChild(heart);
    }

    heart.style.left = x + "px";
    heart.style.top = y + "px";
    heart.classList.remove("hidden");
})

socket.on('playerLeft', ({ lobbyId, id }) => {
    if (lobbyId !== window.currentLobbyId) return;

    const p = others[id];
    if (!p) return;

    console.log("Player left but sheep remains:", id);

});

// Timer
const timerEl = document.getElementById("game-timer");
socket.on("updateTimer", ({ lobbyId, elapsed }) => {
    if (lobbyId !== window.currentLobbyId) return;

    if (!timerEl) return;
    timerEl.textContent = formatTime(elapsed);
});

// --- Quit button logic ---
const quitBtn = document.getElementById('quitBtn');

socket.on("gameQuit", ({ lobbyId, by }) => {
    if (lobbyId !== window.currentLobbyId) return;

    resumeText.textContent = `${by} left the game`;
    resumeOverlay.classList.remove("resume-hidden");

    setTimeout(() => {
        resumeOverlay.classList.add("resume-hidden");
    }, 1500);
});

if (quitBtn) {
    quitBtn.addEventListener('click', () => {
        console.log("Player quit");

        // Tell the server WHO is quitting
        socket.emit("quitGame");

        // Small delay so the server can broadcast to others
        setTimeout(() => {
            socket.disconnect(); 
            window.location.href = 'index.html'; 
        }, 1500); 
    });
}