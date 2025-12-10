export function resizeGame() {
    const designW = 900;
    const designH = 600;

    const scaleX = window.innerWidth / designW;
    const scaleY = window.innerHeight / designH;

    let scale = Math.min(scaleX, scaleY);
    scale = Math.round(scale * 20) / 20; 

    const wrapper = document.getElementById("game-wrapper");
    const tiles = document.getElementById("arena-tiles");

    // The scaled game's size
    const scaledW = designW * scale;
    const scaledH = designH * scale;

    // Center it
    const offsetX = (window.innerWidth  - scaledW) / 2;
    const offsetY = (window.innerHeight - scaledH) / 2;

    wrapper.style.transform =
        `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;

        const backgroundScale = 0.93; // try values 0.9–0.97
    tiles.style.transformOrigin = "center center";
    tiles.style.transform = `scale(${backgroundScale})`;
}