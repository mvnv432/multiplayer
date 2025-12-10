const tilesetArena = {
    0: "empty",
    1: "corner-top-left",
    2: "grass-center-top",
    3: "corner-top-right",
    4: "sides-left",
    5: "grass-center",
    6: "sides-right",
    7: "corner-down",
    8: "down-center",
    9: "corner-down-left"
};

const map1 = [
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6],
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6],
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6],
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6],
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6],
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6],
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6],
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6],
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6],
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6],
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6],
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6],
    [5, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 6],
];

const tilesetArena2 = {
    0: "empty",
    1: "pine up32",
    2: "pine-tall up32",
    3: "house",
    4: "bush up32",
    5: "rock1",
    6: "rock2",
    7: "tree1",
    8: "house-2 up32",
    9: "tower",
    10: "monastery up32",
    11: "tree2",
    12: "pine",
    13: "sheep",
    14: "bush2 up32",
    15: "bush2",
    16: "archery",
    17: "archerIdle",
    18: "monche",
}

const map2 = [
    [11, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 1, 2],
    [1, 13, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 11, 1],
    [1, 11, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 2, 1, 11],
    [11, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 1, 13, 2],
    [1, 2, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 2, 12],
    [2, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 2, 2, 11],
    [12, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 13, 6],
    [1, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 2, 2, 12],
    [2, 13, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 13],
    [2, 2, 13, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 6, 1, 2],
    [1, 11, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 1, 11],
];

function renderArena() {
    const container = document.getElementById("arena-tiles");
    const size = 64;

    // Island tiles
    map1.forEach((row, r) => {
        row.forEach((value, c) => {
            if (value === 0) return;

            const div = document.createElement("div");
            div.className = tilesetArena[value];
            div.style.position = "absolute";
            div.style.left = (c * size) + "px";
            div.style.top = (r * size) + "px";
            div.style.zIndex = 2;

            container.appendChild(div);
        });
    });

    //elevation tiles
    map2.forEach((row, r) => {
        row.forEach((value, c) => {
            if (value === 0) return;
    
            const div = document.createElement("div");
            div.className = tilesetArena2[value];
            div.style.position = "absolute";
            div.style.left = (c * size) + "px";
            div.style.top = (r * size) + "px";
            div.style.zIndex = 11; // ABOVE layer 1
    
            container.appendChild(div);
        });
    });

}

