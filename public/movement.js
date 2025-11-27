// Track key presses
export const keys = {};
let spaceDown = false;

export function initMovement() {
    document.addEventListener('keydown', e => {
        keys[e.key] = true;
        if (e.code === 'Space') {
            spaceDown = true;
        }
    });

    document.addEventListener('keyup', e => {
        keys[e.key] = false;
        if (e.code === 'Space') {
            spaceDown = false;
        }
    });
}

// Movement speed (gameplay)
export const speed = 200; // px/sec

// Get current input snapshot
export function getInput() {
    let dx = 0;
    let dy = 0;
    let moving = false;

    if (keys['ArrowLeft'] || keys['a'])  { dx -= 1; moving = true; }
    if (keys['ArrowRight']|| keys['d'])  { dx += 1; moving = true; }
    if (keys['ArrowUp']   || keys['w'])  { dy -= 1; moving = true; }
    if (keys['ArrowDown'] || keys['s'])  { dy += 1; moving = true; }

    // attack is simply "is space currently down?"
    const attack = spaceDown;

    return { dx, dy, moving, attack };
}