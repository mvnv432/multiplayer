// Create DOM elements for new players
export function addOtherPlayer(id, pos, color, gameArea, others, getUsernameById, SpriteAnimation, updateHPBar, playersData) {
    const div = document.createElement('div');
    div.id = `player-${id}`;
    div.classList.add('player', `player-${color}`);
    gameArea.appendChild(div);

    const nameTag = document.createElement("div");
    nameTag.className = "player-name";
    nameTag.textContent = getUsernameById(id, playersData);
    div.appendChild(nameTag);

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
        nameTag,
        x: pos.x, y: pos.y, tx: pos.x, ty: pos.y, t: 0, dead: false,
        hp: 4,
        invuln: false,
        stunned: false,
        stunUntil: 0,
        invulnUntil: 0,
        history: [],
    };

    updateHPBar(others[id]);
}

// Players hp Bar update
export function updateHPBar(p) {
    if (!p.el.querySelector('.hp-bar-inner')) {
        const inner = document.createElement('div');
        inner.className = 'hp-bar-inner';
        p.el.querySelector('.hp-bar').appendChild(inner);
    }

    const hpPercent = Math.max(0, p.hp) / 4 * 100;
    p.el.querySelector('.hp-bar-inner').style.width = hpPercent + "%";
}

export function updateHPBarLocal(playerEl, localPlayer) {
    let bar = playerEl.querySelector('.hp-bar-inner');
    if (!bar) {
        bar = document.createElement('div');
        bar.className = 'hp-bar-inner';
        playerEl.querySelector('.hp-bar').appendChild(bar);
    }

    const hpPercent = Math.max(0, localPlayer.hp) / 4 * 100;
    bar.style.width = hpPercent + "%";
}

// Checks if hitBox overlaps hurtBox
export function rectsOverlap(a, b) {
    const r1 = a.getBoundingClientRect();
    const r2 = b.getBoundingClientRect();

    return !(
        r1.right < r2.left ||
        r1.left > r2.right ||
        r1.bottom < r2.top ||
        r1.top > r2.bottom
    );
}

// Sprite blinks when player gets hitted or pick ups
export function blinkSprite(el) {
    el.classList.add("blink");
}

export function stopBlink(el) {
    el.classList.remove("blink");
}

// Hit reaction
export function triggerHitReactionLocal(localPlayer, playerEl, blinkSprite) {
    const t = performance.now();

    // Stun
    localPlayer.stunned = true;
    localPlayer.stunUntil = t + 700;

    // Invulnerability
    localPlayer.invuln = true;
    localPlayer.invulnUntil = t + 2000;

    // Visual feedback
    blinkSprite(playerEl);

    // If dead, nothing more to do
    if (localPlayer.hp <= 0) return;
}

export function triggerHitReactionRemote(p, blinkSprite) {
    const t = performance.now();

    // Stun for remote players
    p.stunned = true;
    p.stunUntil = t + 700;

    // Invulnerability
    p.invuln = true;
    p.invulnUntil = t + 2000;

    // Visual blink if they are still alive
    if (p.hp > 0) {
        blinkSprite(p.el);
    }
}

// creates hitbox div when sword is swinged
export function spawnSwordHitbox(px, py, facingLeft, gameArea, others, socket, rectsOverlap) {
    const hitbox = document.createElement('div');
    hitbox.classList.add("hitbox-sword");

    // Size
    const W = 40, H = 40;
    hitbox.style.width = W + "px";
    hitbox.style.height = H + "px";
    hitbox.style.position = "absolute";
    hitbox.style.zIndex = 5;

    // Offset
    const offsetX = facingLeft ? 5 : 50;
    const offsetY = 30;

    hitbox.style.left = (px + offsetX) + "px";
    hitbox.style.top = (py + offsetY) + "px";

    gameArea.appendChild(hitbox);

    // Collision detection
    for (const id in others) {
        const p = others[id];

        if (!p.invuln && rectsOverlap(hitbox, p.el)) {
            socket.emit("hit", id);
        }
    }

    // Cleanup
    setTimeout(() => hitbox.remove(), 1500);
}

export function checkPickup(localPlayerX, localPlayerY, socket) {
    const heart = document.getElementById("heart");
    if (!heart) return;

    const hx = parseInt(heart.style.left);
    const hy = parseInt(heart.style.top);

    const heartW = heart.offsetWidth;
    const heartH = heart.offsetHeight;

    // Heart center
    const cx = hx + heartW / 2;
    const cy = hy + heartH / 2;

    // Player center (feet + slight offset upward)
    const playerCenterX = localPlayerX + 35;
    const playerCenterY = localPlayerY + 50;

    const dist = Math.hypot(playerCenterX - cx, playerCenterY - cy);

    if (dist < 40) {
        socket.emit("pickupHeart");
    }
}

// converts time to mm:ss (server sends only 1s interval)
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function showWinScreen(winnerName, roundTime, formatTime) {
    const overlay = document.getElementById("win-screen");
    const nameEl = document.getElementById("winner-name");
    const timeEl = document.getElementById("winner-time");

    overlay.classList.remove("hidden");
    overlay.classList.add("show");

    nameEl.textContent = `${winnerName} wins!`;
    timeEl.textContent = `Round lasted ${formatTime(roundTime)}`;

    // Freeze movement
    window.gameFrozen = true;

    // Return to menu button
    const backBtn = document.getElementById("back-to-menu");
    if (backBtn) {
        backBtn.onclick = () => window.location.href = "./index.html";
    }
}

export function showDeathScreen(message = "You are now spectating") {
    const deathScreen = document.getElementById("death-screen");
    const deathInfo = document.getElementById("death-info");

    if (deathInfo) {
        deathInfo.textContent = message;
    }

    if (deathScreen) {
        deathScreen.classList.add("show");
    }
}

export function getUsernameById(id, playersData) {
    if (!playersData) return "Player";

    // Object format
    if (playersData[id]) {
        return playersData[id].userName || playersData[id].username || "Player";
    }

    // Array format
    if (Array.isArray(playersData)) {
        const p = playersData.find(p => p.id === id);
        if (!p) return "Player";
        return p.userName || p.username || "Player";
    }

    return "Player";
}

export function playSwordSwing(swordSwingEl, volume = 1.0) {
    const s = swordSwingEl.cloneNode();
    s.volume = volume;
    s.play();
}

export function playSwordHit(swordHitEl, volume = 1.0) {
    const s = swordHitEl.cloneNode();
    s.volume = volume;
    s.play();
}