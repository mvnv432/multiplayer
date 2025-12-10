export class SpriteAnimation {
    constructor(element, config) {
        this.el = element;

        this.animations = config.animations; 
        this.frameWidth = config.frameWidth;     // 192
        this.frameHeight = config.frameHeight;   // 192

        // Scale factor: 192 → 96
        this.scale = config.scale ?? 0.5;
        this.scaledFrameWidth = this.frameWidth * this.scale;
        this.scaledFrameHeight = this.frameHeight * this.scale;

        this.current = "idle";
        this.frame = 0;
        this.frameTimer = 0;
        this.totalFrames = 0;
        this.fps = 8;

        this.isAttacking = false;
        this.justFinishedAttack = false;
        this.lastFaceLeft = false;
        this.prevAttackDown = false;

        this._play("idle");
    }

    // Internal: load animation + reset
    _play(name) {
        const animInfo = this.animations[name];
        if (!animInfo) return;

        this.current = name;
        this.frame = 0;
        this.frameTimer = 0;
        this.totalFrames = animInfo.frames;
        this.fps = animInfo.fps ?? 8;

        // set sprite sheet file
        this.el.style.backgroundImage = `url("${animInfo.file}")`;

        // scale sheet width / height
        const sheetWidth = this.totalFrames * this.scaledFrameWidth;
        const sheetHeight = this.scaledFrameHeight;

        this.el.style.backgroundSize = `${sheetWidth}px ${sheetHeight}px`;
    }

    // Called each frame from client.js
    handleInput(input) {
        const { dx, dy, moving, attack } = input;

        // If in attack animation, ignore input entirely
        if (this.current === "attack") {
            this.prevAttackDown = attack;
            return;
        }

        // Ignore input for exactly one frame after attack
        if (this.justFinishedAttack) {
            this.justFinishedAttack = false;
            this.prevAttackDown = attack;
            return;
        }

        // Attack edge detection (press only once)
        const attackPressed = attack && !this.prevAttackDown;
        this.prevAttackDown = attack;

        // Facing logic
        if (dx < 0) this.lastFaceLeft = true;
        else if (dx > 0) this.lastFaceLeft = false;

        // Attack triggers attack animation
        if (attackPressed) {
            console.log("%cATTACK TRIGGERED", "color:red;font-weight:bold;");
            this.isAttacking = true;
            this._play("attack");
            return;
        }

        // Movement run
        if (moving) {
            if (this.current !== "run") this._play("run");
        }
        // Standing still → idle
        else {
            if (this.current !== "idle") this._play("idle");
        }
    }

    // Animation step
    update(delta) {
        const anim = this.animations[this.current];
        if (!anim) return;

        this.frameTimer += delta;

        if (this.frameTimer >= 1 / this.fps) {
            this.frameTimer -= 1 / this.fps;
            
            
            this.frame++;

            if (this.current === "attack") {
                // Attack ends when reaching last *visible* frame
                if (this.frame >= this.totalFrames) {
                    console.log("%cATTACK FINISHED", "color:blue;font-weight:bold;");

                    this.isAttacking = false;
                    this.justFinishedAttack = true;

                    this._play("idle"); 
                    // DO NOT PLAY IDLE HERE — client will do it next frame naturally
                    return;
                }
            } else {
                // Loop idle/run
                this.frame = this.frame % this.totalFrames;
            }
        }

        // Use CORRECT scaled frame width here
        const posX = -this.frame * this.scaledFrameWidth;
        this.el.style.backgroundPosition = `${posX}px 0px`;
    }

    // Movement + flipping transform
    getTransform(x, y) {
        const scaleDir = this.lastFaceLeft ? "scaleX(-1)" : "scaleX(1)";
        return `translate(${x}px, ${y}px) ${scaleDir}`;
    }
}
