const socket = io();

const lobbyOverlay = document.getElementById("lobby-overlay");
const playerList = document.getElementById("playerList");
const hostNotice = document.getElementById("hostNotice");
const startBtn = document.getElementById("startBtn");
const currentUser = document.getElementById("currentUser");

console.log("LOBBY.JS LOADED");

// Show lobby overlay immediately
lobbyOverlay.classList.remove("hidden");

// Load username
const username = localStorage.getItem("username");
currentUser.textContent = username ? ("Welcome to Tiny Swords, " + username) : "You: (unknown)";

let socketId = null;
let lobbyId = null;

// --- CONNECTED ---
socket.on("connect", () => {
    socketId = socket.id;
    console.log("Connected with socket ID:", socketId);

    // Load username
    const name = localStorage.getItem("username");
    if (name) {
        socket.emit("registerUsername", name);
    }
});

// Server conficmed username
socket.on("usernameStatus", ({ success }) => {
    if (success) {
        socket.emit("joinLobby");
    }
});

// Expose the socket globally for debugging
window.sharedSocket = socket;

// --- RECEIVED LOBBY ID ---
socket.on("lobbyAssigned", async ({ lobbyId: id }) => {
    console.log("Assigned to lobby:", id);
    lobbyId = id;
    window.currentLobbyId = id;

    // Preload assets **AFTER joining lobby**
    await preloadAssets();

        // After preload, tell server we're ready
    socket.emit("clientReady");
});

// --- LOBBY UPDATE ---
socket.on("lobbyUpdate", ({ players, hostId, readiness }) => {

    // Clear player list
    playerList.innerHTML = "";

    players.forEach(p => {
        let label = p.userName;
        if (p.userName === username) label += " (You)";
        if (p.id === hostId) label += " (Host)";
        if (!readiness[p.id]) label += " (loading...)";

        const li = document.createElement("li");
        li.textContent = label;
        playerList.appendChild(li);
    });

    const minPlayers = players.length >= 2;
    const allReady = players.every(p => readiness[p.id]);

    if (socketId === hostId) {
        startBtn.classList.remove("hidden");
        startBtn.disabled = !(minPlayers && allReady);

        hostNotice.textContent = !minPlayers
            ? "Waiting for at least 2 players..."
            : !allReady
                ? "Players are loading assets..."
                : "All ready! Start the game.";
    } else {
        startBtn.classList.add("hidden");

        hostNotice.textContent = !minPlayers
            ? "Waiting for players..."
            : !allReady
                ? "Players are loading assets..."
                : "Waiting for host to start the game...";
    }
});

// --- HOST STARTS GAME ---
startBtn.addEventListener("click", () => {
    socket.emit("startGame", { lobbyId });
});

// --- GAME START EVENT ---
socket.on("gameStarted", ({ lobbyId: id, players }) => {
    if (id !== window.currentLobbyId) return;

    console.log("GAME START for lobby:", id);

    lobbyOverlay.classList.add("hidden");

    // Pass players data into the main game logic
    window.playersDataFromServer = players;

    // Notify client.js that game should start
    window.dispatchEvent(new Event("serverGameStart"));
});

async function preloadAssets() {
    const assets = [
        "/assets/warrior_black/Warrior_Attack1.png",
        "/assets/warrior_black/Warrior_Idle.png",
        "/assets/warrior_black/Warrior_Run.png",
        "/assets/warrior_blue/Warrior_Attack1.png",
        "/assets/warrior_blue/Warrior_Idle.png",
        "/assets/warrior_blue/Warrior_Run.png",
        "/assets/warrior_red/Warrior_Attack1.png",
        "/assets/warrior_red/Warrior_Idle.png",
        "/assets/warrior_red/Warrior_Run.png",
        "/assets/warrior_yellow/Warrior_Attack1.png",
        "/assets/warrior_yellow/Warrior_Idle.png",
        "/assets/warrior_yellow/Warrior_Run.png",
        "/assets/sheep/Sheep_Grass192.png",
        "/assets/buffs/fc659.png"
    ];

    await Promise.all(
        assets.map(src => new Promise(async resolve => {
        const img = new Image();
        img.src = src;
        await img.decode();  // forces the browser to fully decode and rasterize the image BEFORE the animation uses it.
        resolve();
    }))
    );
}