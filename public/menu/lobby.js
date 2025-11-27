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
currentUser.textContent = username ? ("You: " + username) : "You: (unknown)";

let socketId = null;

socket.on("connect", () => {
    socketId = socket.id;
    console.log("Connected with socket ID:", socketId);

    const username = localStorage.getItem("username");
    if (username) {
        socket.emit("registerUsername", username);
    }

    // join lobby AFTER redirect
    if (localStorage.getItem("joinLobbyLater") === "yes") {
        socket.emit("joinLobby");
        localStorage.removeItem("joinLobbyLater");
    }
});

window.sharedSocket = socket;

// --- LOBBY UPDATE ---
socket.on("lobbyUpdate", ({ players, hostId }) => {
    console.log("LOBBY UPDATE RECEIVED:", players, hostId);  // FIXED

    // Clear player list
    playerList.innerHTML = "";

    players.forEach(p => {
        const li = document.createElement("li");
        li.textContent = p.userName;

        if (p.userName === username) li.textContent += " (You)";
        if (p.id === hostId) li.textContent += " (Host)";
        playerList.appendChild(li);
    });

    // Host logic
    if (socketId === hostId) {
        startBtn.classList.remove("hidden");
        startBtn.disabled = players.length < 2; // need at least 2 players
        hostNotice.textContent = players.length < 2
            ? "You are the host! Waiting for more players (min 2, max 4)."
            : "You are the host! Click Start Game when ready.";
    } else {
        startBtn.classList.add("hidden");
        hostNotice.textContent = players.length < 4
            ? "Waiting for more users to join..."
            : "Waiting for host to start the game...";
    }
});

// Start game
startBtn.addEventListener("click", () => {
    socket.emit("startGame");
});

// Hide overlay when game starts
socket.on("gameStarted", (playersData) => {
    console.log("GAME START TRIGGERED FROM SERVER");

    lobbyOverlay.classList.add("hidden");

    // Pass players data into the main game logic
    window.playersDataFromServer = playersData;

    // Tell client.js to start spawning players
    const event = new Event("serverGameStart");
    window.dispatchEvent(event);
});
