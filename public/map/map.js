const tileset = {
    0: "empty",
    1: "corner-top-left",
    2: "grass-center-top",
    3: "corner-top-right",
    4: "sides-left",
    5: "grass-center",
    6: "sides-right",
    7: "firstlayer-corner-down",
    8: "down-center",
    9: "corner-down",
    10: "island-row1",
    11: "island-center",
    12: "island-right-side",
    13:"island-left-side",
    14: "water-foam"
};

const map = [
    [0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 1, 2, 2, 2, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0],
    [1, 2, 2, 3, 0, 0, 0, 0, 0, 13, 12, 0, 0, 0, 0, 4, 5, 5, 5, 5, 5, 6, 0, 0, 0, 13, 12, 0, 0],
    [4, 5, 5, 5, 2, 2, 2, 2, 3, 0, 0, 0, 0, 0, 0, 4, 5, 5, 5, 5, 5, 6, 0, 0, 0, 0, 0, 0, 0],
    [4, 5, 5, 5, 5, 5, 5, 5, 5, 2, 2, 3, 0, 0, 0, 4, 5, 5, 5, 5, 5, 6, 0, 0, 0, 10, 0, 0, 0],
    [7, 8, 8, 8, 8, 5, 5, 5, 5, 5, 5, 5, 2, 2, 2, 5, 5, 5, 5, 5, 5, 5, 3, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 7, 8, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 8, 8, 5, 2, 3, 0, 0, 0, 0],
    [13, 12, 0, 0, 0, 0, 0, 7, 8, 8, 5, 5, 5, 5, 5, 5, 5, 5, 8, 9, 0, 0, 4, 5, 6, 0, 0, 0, 0],
    [0, 0, 13, 11, 12, 0, 0, 0, 0, 0, 4, 5, 5, 5, 5, 5, 5, 6, 0, 0, 0, 0, 4, 5, 6, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 4, 5, 5, 5, 5, 5, 5, 6, 0, 0, 0, 1, 5, 5, 5, 3, 0, 0, 0],
    [0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 4, 5, 5, 5, 5, 8, 8, 9, 0, 0, 0, 4, 5, 5, 5, 6, 0, 0, 0],
    [0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 7, 8, 8, 8, 9, 0, 0, 0, 0, 10, 0, 7, 8, 8, 8, 9, 0, 0, 0]
];

const tileset2 = {
    0: "empty",
    1: "corner-top-left-secondL",
    2: "cliff-side-left",
    3: "cliff-center-top",
    4: "cliff-before-bottom",
    5: "cliff-bottom",
    6: "cliff-center",
    7: "cliff-center-before-bottom",
    8: "cliff-center-bottom",
    9: "cliff-corner-top-right",
    10: "cliff-corner-down-right",
    11: "cliff-side-right",
    12: "cliff-slope-down",
    13: "cliff-slope",
    14: "cliff-slope-left",
    15: "cliff-slope-down-left"
}

const map2 = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 3, 3, 3, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 6, 6, 6, 6, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 9, 0, 0, 0, 0, 0, 0],
    [0, 4, 7, 7, 7, 7, 7, 13, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 6, 6, 6, 6, 10, 0, 0, 0, 0, 0, 0],
    [0, 5, 8, 8, 8, 8, 8, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 6, 6, 6, 11, 8, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 3, 9, , 0, 0, 0, 0, 4, 7, 7, 7, 7, 13, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 2, 6, 6, 9, 0, 0, 0, 5, 8, 8, 8, 8, 12, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 7, 6, 6, 3, 3, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 8, 2, 6, 6, 6, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 7, 7, 10, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 8, 8, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
]

const tileset3 = {
    0: "empty",
    1: "pine down16",
    2: "pine-tall",
    3: "house",
    4: "bush up32",
    5: "rock1",
    6: "rock2",
    7: "tree1",
    8: "house-2 up32",
    9: "tower up16",
    10: "monastery up32",
    11: "tree2 up16",
    12: "pine",
    13: "sheep",
    14: "bush2 up32",
    15: "bush2",
    16: "archery",
    17: "archerIdle",
    18: "monche",
}

const map3 = [
    [0, 2, 2, 1, 12, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 6, 3, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 0, 1, 11, 16, 0, 0, 0, 0, 0, 9, 0, 0, 0],
    [0, 5, 0, 0, 8, 0, 0, 0, 0, 4, 6, 0, 0, 0, 0, 7, 0, 17, 12, 0, 0, 13, 0, 0, 0, 0, 5, 0, 0],
    [0, 6, 0, 4, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 17, 17, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 13, 0, 12, 0, 0, 0, 0, 12, 2, 0, 0, 6, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 13, 0, 13, 0, 0, 0, 2, 12, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 13, 18, 0, 0, 0, 0, 0],
    [14, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 18, 0, 0, 13, 0, 0, 0, 0, 0, 0, 2, 0, 6, 0, 0, 0, 0],
    [0, 0, 0, 14, 0, 0, 0, 0, 0, 0, 2, 0, 0, 12, 13, 0, 2, 0, 0, 0, 0, 11, 7, 10, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 6, 0, 0, 0, 7, 0, 0, 0, 0, 18, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 13, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0],
]

function renderMap() {
    const container = document.getElementById("tiles");
    const size = 64;

    // Island tiles
    map.forEach((row, r) => {
        row.forEach((value, c) => {
            if (value === 0) return;

            const div = document.createElement("div");
            div.className = tileset[value];
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
            div.className = tileset2[value];
            div.style.position = "absolute";
            div.style.left = (c * size) + "px";
            div.style.top = (r * size) + "px";
            div.style.zIndex = 3; // ABOVE layer 1
    
            container.appendChild(div);
        });
    });

    // decorations / houses / trees
    map3.forEach((row, r) => {
        row.forEach((value, c) => {
            if (value === 0) return;

            const div = document.createElement("div");
            div.className = tileset3[value];
            div.style.position = "absolute";
            div.style.left = (c * size) + "px";
            div.style.top = (r * size) + "px";
            div.style.zIndex = 4; // ABOVE cliffs

            container.appendChild(div);
        });
    });
}

