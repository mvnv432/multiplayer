export class SpriteAnimation {
    constructor(element, config) {
        this.container = element;

        // Create IMG
        this.img = document.createElement("img");
        this.img.className = "sprite-img";
        this.img.draggable = false;
        this.container.appendChild(this.img);

        this.animations = config.animations;
        this.frameWidth = config.frameWidth;
        this.frameHeight = config.frameHeight;

        this.scale = config.scale ?? 0.5;
        this.scaledFrameWidth = this.frameWidth * this.scale;
        this.scaledFrameHeight = this.frameHeight * this.scale;

        // Resize container to scaled size
        this.container.style.width = this.scaledFrameWidth + "px";
        this.container.style.height = this.scaledFrameHeight + "px";

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

    _play(name) {
        const anim = this.animations[name];
        if (!anim) return;

        this.current = name;
        this.frame = 0;
        this.frameTimer = 0;
        this.totalFrames = anim.frames;
        this.fps = anim.fps ?? 8;

        // Set <img> source (already preloaded → no flicker)
        this.img.src = anim.file;



        // Scale the image to fit the display viewport
        this.img.style.transform = `scale(${this.scale})`;
        this.img.style.transformOrigin = "top left";

            // Prevent clipping glitches
            this.img.style.objectFit = "none";

            // First frame correctly positioned
            this.img.style.objectPosition = `0px 0px`;
    }

    handleInput(input) {
        const { dx, dy, moving, attack } = input;

        // Attack logic preserved
        if (this.current === "attack") {
            this.prevAttackDown = attack;
            return;
        }

        if (this.justFinishedAttack) {
            this.justFinishedAttack = false;
            this.prevAttackDown = attack;
            return;
        }

        const attackPressed = attack && !this.prevAttackDown;
        this.prevAttackDown = attack;

        // Facing direction
        if (dx < 0) this.lastFaceLeft = true;
        else if (dx > 0) this.lastFaceLeft = false;

        if (attackPressed) {
            this.isAttacking = true;
            this._play("attack");
            return;
        }

        if (moving) {
            if (this.current !== "run") this._play("run");
        } else {
            if (this.current !== "idle") this._play("idle");
        }
    }

update(delta) {
    const anim = this.animations[this.current];
    if (!anim) return;

    this.frameTimer += delta;

    if (this.frameTimer >= 1 / this.fps) {
        this.frameTimer -= 1 / this.fps;
        this.frame++;

        if (this.current === "attack") {
            if (this.frame >= this.totalFrames) {
                this.isAttacking = false;
                this.justFinishedAttack = true;
                this._play("idle");
                return;
            }
        } else {
            this.frame = this.frame % this.totalFrames;
        }
    }

    // FIXED — use scaled frame width
    const posX = -(this.frame * this.frameWidth);  // 192
    this.img.style.objectPosition = `${posX}px 0px`;
}


    getTransform(x, y) {
        const flip = this.lastFaceLeft ? "scaleX(-1)" : "scaleX(1)";
        return `translate(${x}px, ${y}px) ${flip}`;
    }
}
