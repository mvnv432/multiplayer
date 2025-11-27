import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import path from "path";
import { fileURLToPath } from "url";

const app = express();
const server = createServer(app);
const io = new Server(server);

// Needed because ES modules don't have __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

const players = {};
const users = {};
const waitingLobby = [];
const COLORS = ['red', 'blue', 'black', 'yellow'];
let roundStartTime = null;
let timerInterval = null;

// Helper: broadcast full lobby state
function updateLobby() {
  const hostId = waitingLobby[0];

   // Broadcast full lobby to everyone inside it
    waitingLobby.forEach(id => {
        io.to(id).emit("lobbyUpdate", {
            players: waitingLobby.map(pid => ({
                id: pid,
                userName: users[pid]?.userName || "(unknown)",
                ready: users[pid]?.ready || false
            })),
            hostId
        });
    });
}

io.on('connection', (socket) => {

  console.log('Connected:', socket.id);
  
  // --- CREATE USER (username only) ---
  socket.on('createUser', ({ userName }) => {
    const normalized = userName.trim().toLowerCase();
    const exists = Object.values(users).some(u => u.userName.toLowerCase() === normalized);

    if (exists) {
        socket.emit("usernameStatus", { success: false });
        return;
    }

    // Create user object
    users[socket.id] = { userName, ready: false };

    socket.emit("usernameStatus", { success: true, userName });
    console.log(`User created: ${userName}`);
  });




  // --- JOIN LOBBY ---
  socket.on("joinLobby", () => {
    // Prevent duplicates
    if (!waitingLobby.includes(socket.id)) {
        waitingLobby.push(socket.id);
    }

    // Every user MUST HAVE a ready property
    if (!users[socket.id]) {
        users[socket.id] = { userName: "(unknown)", ready: false };
    }

    updateLobby();
  });

  socket.on("registerUsername", (username) => {
    if (!username) return;

    users[socket.id] = { 
        userName: username, 
        ready: false 
    };

    console.log("Username registered for socket:", socket.id, "=>", username);
});

  // Start Game (host only)
  socket.on("startGame", () => {
    const hostId = waitingLobby[0];
    if (socket.id !== hostId) return;

    // Create players for everyone in lobby
    waitingLobby.forEach((id, index) => {
      players[id] = {
        x: 100,
        y: 100,
        color: COLORS[index % COLORS.length],
        hp: 4
      };
    });

    // Tell clients game is starting
    io.emit("gameStarted", players);

    // Also start round timer
    roundStartTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - roundStartTime) / 1000);
        io.emit("updateTimer", elapsed);
    }, 1000);

    console.log("Game Started with players:", players);
  });

  // Movement
    socket.on('move', (pos) => {

      if (!players[socket.id]) return; // ignore movement before game starts

      // Clamp values
      const AREA_WIDTH = 800;
      const AREA_HEIGHT = 600;
      const PLAYER_SIZE = 40;

      const x = Math.max(0, Math.min(pos.x, AREA_WIDTH - PLAYER_SIZE));
      const y = Math.max(0, Math.min(pos.y, AREA_HEIGHT - PLAYER_SIZE));

      // Update position only. Dont send color to keep it
      players[socket.id].x = x;
      players[socket.id].y = y;
      
      io.emit('playerMoved', { id: socket.id, pos: { x, y} });
    });

    // Send attack to all other clients
    socket.on("attack", () => {
    socket.broadcast.emit("playerAttacked", socket.id);
    });

    // When someone gets hit
    socket.on("hit", (victimId) => {
      const attacker = players[socket.id];
      const victim = players[victimId];

      if (!attacker || !victim) return;

        // Compute distance between players
        const dx = attacker.x - victim.x;
        const dy = attacker.y - victim.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // If close enough, valid hit
        if (dist < 60) {
            console.log(`Player ${socket.id} HIT ${victimId}`);

            // Reduce HP by 1
            victim.hp -= 1;

            // Send updated HP to everyone
            io.emit("playerHP", { id: victimId, hp: victim.hp });

            // If hp <= 0 player dies
            if (victim.hp <= 0) {
              io.emit("playerDied", victimId);
              delete players[victimId];
            }

            checkWinner(roundStartTime, timerInterval)

        }
    });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);

    delete users[socket.id];

    const index = waitingLobby.indexOf(socket.id);
    if (index !== -1) waitingLobby.splice(index, 1);

    // Cleans lobby
    updateLobby();

    // Cleans game
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => console.log(`Server running on ${PORT}`));


function checkWinner(roundStartTime, timerInterval) {
  const alive = Object.entries(players).filter(([id, p]) => p.hp > 0);

  if (alive.length <= 1) {
    const winnerId = alive[0]?.[0] || null;
    const winner = winnerId ? players[winnerId] : null;

    const roundTime = Math.floor((Date.now() - roundStartTime) / 1000 );

    clearInterval(timerInterval);

    io.emit("gameOver", {
      winnerId,
      winnerName: winner ? users[winnerId].userName : "Nobody",
      roundTime
    });
  }
}