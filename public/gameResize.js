export function resizeGame() {
    const designW = 900;
    const designH = 600;

    const scaleX = window.innerWidth / designW;
    const scaleY = window.innerHeight / designH;

    // Choose smallest dimension scale
    let scale = Math.min(scaleX, scaleY);

    // nearest full integer
    scale = Math.max(1, Math.floor(scale));  
    // So never decimals

    const wrapper = document.getElementById("game-wrapper");
    const tiles = document.getElementById("arena-tiles");

    const scaledW = designW * scale;
    const scaledH = designH * scale;

    // Center the scaled game
    const offsetX = Math.floor((window.innerWidth  - scaledW) / 2);
    const offsetY = Math.floor((window.innerHeight - scaledH) / 2);

    wrapper.style.transform =
        `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;

    // Background stays small (still independent)
    tiles.style.transformOrigin = "center center";
    tiles.style.transform = `scale(0.9)`;
}