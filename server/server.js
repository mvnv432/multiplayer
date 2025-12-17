import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const players = {};
const users = {};
const COLORS = ['red', 'blue', 'black', 'yellow'];
let lobbies = [];
let lobbyCounter = 1;

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

    // --- REGISTER USERNAME (lobby.js reconnection) ---
  socket.on("registerUsername", (username) => {
    if (!username) return;

    users[socket.id] = { userName: username, ready: false };
    socket.emit("usernameStatus", { success: true, userName: username });
  });

  // Join lobby
  socket.on("joinLobby", () => {
    const user = users[socket.id];
    if (!user) return console.log("ERROR: joinLobby with no user:", socket.id);

    //Find a lobby with space (< 4 players) AND not started
    let lobby = lobbies.find(l => !l.started && l.players.length < 4);

    // If none exist, make a new one
    if (!lobby) {
        lobby = {
            id: "lobby_" + lobbyCounter++,
            players: [],
            hostId: null,
            started: false,
            readiness: {},
            pausedAt: null,
            accumulatedTime: 0
        };
        lobbies.push(lobby);
    }

    // Add the player
    lobby.players.push({ id: socket.id, userName: users[socket.id].userName });
    lobby.readiness[socket.id] = false;

    if (!lobby.hostId) {
        lobby.hostId = socket.id;
    }

    // Join the Socket.IO room for this lobby
    socket.join(lobby.id);
    users[socket.id].lobbyId = lobby.id;


    // Save lobby on user
    users[socket.id].lobbyId = lobby.id

    // Tell the client which lobby they're in
    socket.emit("lobbyAssigned", { lobbyId: lobby.id });

    // Send update only to this lobby
    io.to(lobby.id).emit("lobbyUpdate", {
      players: lobby.players,
      hostId: lobby.hostId,
      readiness: lobby.readiness
    });
});

  // Client ready check after preload
  socket.on("clientReady", () => {
    let lobby = lobbies.find(l => l.players.some(p => p.id === socket.id));
    if (!lobby) return;

    lobby.readiness[socket.id] = true;
    console.log("clientReady from", socket.id);
    io.to(lobby.id).emit("lobbyUpdate", {
        players: lobby.players,
        hostId: lobby.hostId,
        readiness: lobby.readiness
    });
  });
  
  // Start Game (host only)
  socket.on("startGame", () => {

    //Find the lobby this host belongs to
    const lobby = lobbies.find(l => l.hostId === socket.id);
    if (!lobby) return;

    // Ensure all players in this lobby are ready
    const allReady = lobby.players.every(p => lobby.readiness[p.id]);

    if (!allReady) {
        socket.emit("notAllReady");
        return;
    }

    lobby.started = true; // Prevent new players from joining

    const lobbyId = lobby.id;
    lobby.accumulatedTime = 0;
    lobby.roundStartTime = Date.now();

    const SPAWN_POINTS = [
    { x: 80, y: 80 },                                 // top-left
    { x: 900 - 120, y: 600 - 150 },                    // bottom-right
    { x: 80, y: 600 - 150 },                          // bottom-left
    { x: 900 - 120, y: 80 }                            // top-right
    ]; 

    // Create players only for this lobby
    lobby.players.forEach((p, index) => {
      const spawn = SPAWN_POINTS[index % SPAWN_POINTS.length];

        players[p.id] = {
            x: spawn.x,
            y: spawn.y,
            color: COLORS[index % COLORS.length],
            hp: 4,
            lobbyId,  // store players lobby
            userName: users[p.id]?.userName || "Player"
        };
    });

    // Emit only to this lobby
    io.to(lobby.id).emit("gameStarted", {
      lobbyId,
      players: playersForLobby(lobbyId)
    });

    //Start timer only for this lobby
    lobby.roundStartTime = Date.now();
    lobby.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - lobby.roundStartTime) / 1000);
        io.to(lobby.id).emit("updateTimer", { lobbyId, elapsed });
    }, 1000);

    console.log("Game Started in lobby:", lobby.id);

    // Heart spawn interval when lobby starts
    if (!lobby.heartInterval) {
      lobby.heartInterval = setInterval(() => {
        spawnHeart(lobby);
      }, 15000);
    }
  });


  // Movement
    socket.on('move', (pos) => {
      const p = players[socket.id];
      if (!p) return;

      p.x = pos.x;
      p.y = pos.y;

      // Update position only. Dont send color to keep it
      players[socket.id].x = p.x;
      players[socket.id].y = p.y;
        
      socket.broadcast.to(p.lobbyId).emit('playerMoved', { 
        lobbyId: p.lobbyId, 
        id: socket.id, 
        pos: { x: p.x, y: p.y }
      });
    });

    // Server validates + sends pickUp
    socket.on("pickupHeart", () => {
      const lobby = findLobbyForPlayer(socket);

      if (!lobby.currentHeart) return;

      // give updated HP to clients
      const p = players[socket.id];
      p.hp = Math.min(p.hp + 1, 4);

      // notify HP change
      io.to(lobby.id).emit("playerHP", { 
          lobbyId: lobby.id,
          id: socket.id,
          hp: p.hp
      });

      // tell clients that heart disappeared
      io.to(lobby.id).emit("heartCollected", {
          by: socket.id
      });

      lobby.currentHeart = null;
    });

    // Send attack to all other clients
    socket.on("attack", () => {
      const p = players[socket.id];
      if (!p) return;

      io.to(p.lobbyId).emit("playerAttacked", {
          lobbyId: p.lobbyId,
          id: socket.id
      });
    });

    // When someone gets hit
    socket.on("hit", (victimId) => {
      const attacker = players[socket.id];
      const victim = players[victimId];

      if (!attacker || !victim) return;
      if (attacker.lobbyId !== victim.lobbyId) return; 

      const lobbyId = attacker.lobbyId;

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
            io.to(lobbyId).emit("playerHP", { lobbyId, id: victimId, hp: victim.hp });

            io.to(lobbyId).emit("playerHit", {
              lobbyId,
              attackerId: socket.id,
              victimId
          });

            // If hp <= 0 player dies
            if (victim.hp <= 0) {
              io.to(lobbyId).emit("playerDied", { lobbyId, id: victimId } );
              // delete players[victimId];
            }

            checkWinner(lobbyId)

        }
    });

  socket.on("pauseGame", () => {
    const p = players[socket.id];
    if (!p) return;

    const lobby = lobbies.find(l => l.id === p.lobbyId);
    if (!lobby) return;

      // Save how much time has passed until now
      lobby.accumulatedTime += Math.floor((Date.now() - lobby.roundStartTime) / 1000);

      // Stop the timer interval
      clearInterval(lobby.timerInterval);
      lobby.timerInterval = null;

      // Broadcast pause to everyone in lobby
      io.to(lobby.id).emit("gamePaused", {
        lobbyId: lobby.id,
        by: users[socket.id].userName
      });
  });

  socket.on("resumeGame", () => {
    const p = players[socket.id];
    if (!p) return;

    const lobby = lobbies.find(l => l.id === p.lobbyId);
    if (!lobby) return;

    // new "start time" from now
    lobby.roundStartTime = Date.now();

    // Restart timer
    lobby.timerInterval = setInterval(() => {
        const nowElapsed = Math.floor((Date.now() - lobby.roundStartTime) / 1000);
        const totalElapsed = lobby.accumulatedTime + nowElapsed;

        io.to(lobby.id).emit("updateTimer", {
            lobbyId: lobby.id,
            elapsed: totalElapsed
        });
    }, 1000);

    io.to(lobby.id).emit("gameResumed", {
        lobbyId: lobby.id,
        by: users[socket.id].userName
    });
  })

    socket.on("quitGame", () => {
      const user = users[socket.id];
      if (!user) return;

      const lobbyId = user.lobbyId;
      if (!lobbyId) return;

      const by = user.userName;

      // Popup for others
      socket.to(lobbyId).emit("gameQuit", { lobbyId, by });

      // Turn quitter into sheep for others
      socket.to(lobbyId).emit("playerDied", {
          lobbyId,
          id: socket.id
      });
  });




  // Disconnect
  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);

    // Remove from users list
    delete users[socket.id];

    // Find the lobby the disconnecting player was in
    let lobby = lobbies.find(l =>
        l.players.some(p => p.id === socket.id)
    );

    if (!lobby) {
        console.log("Player was not in a lobby.");
        return;
    }

    // Remove player from this lobby
    lobby.players = lobby.players.filter(p => p.id !== socket.id);

    // Remove from global players map
    delete players[socket.id];


    // Case where only one player remains
    if (lobby.players.length === 1) {
        const lastPlayerId = lobby.players[0].id;

        const winnerName =
            users[lastPlayerId]?.userName ||
            users[lastPlayerId]?.username ||
            players[lastPlayerId]?.userName ||
            "Player";

        console.log("One player remains → declaring winner and closing lobby.");

        // Send win screen to the winner only
        io.to(lastPlayerId).emit("gameOver", {
            lobbyId: lobby.id,
            winnerId: lastPlayerId,
            winnerName,
            roundTime: getTotalElapsedTime(lobby)
        });

        // Stop timer
        clearInterval(lobby.timerInterval);

        // Remove winner from lobby list (so they don't remain stuck in a lobby)
        lobby.players = [];

        // Remove lobby from the global lobbies array
        lobbies = lobbies.filter(l => l.id !== lobby.id);

        // Remove lobbyId reference from player
        if (players[lastPlayerId]) {
            delete players[lastPlayerId].lobbyId;
        }

        return; //stop here
    }


    // Case where lobby becomes empty

    if (lobby.players.length === 0) {
        console.log("Lobby empty → removing:", lobby.id);
        lobbies = lobbies.filter(l => l.id !== lobby.id);
        return;
    }


    // Case normal disconnect

    // Update host if needed
    if (lobby.hostId === socket.id) {
        lobby.hostId = lobby.players[0]?.id || null;
    }

    // Send updated lobby state
    io.to(lobby.id).emit("lobbyUpdate", {
        players: lobby.players,
        hostId: lobby.hostId,
        readiness: lobby.readiness
    });
});

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => console.log(`Server running on ${PORT}`));


// Helpers

function checkWinner(lobbyId) {
  const alive = Object.entries(players)
    .filter(([_, p]) => p.lobbyId === lobbyId && p.hp > 0);

  if (alive.length <= 1) {
    const winnerId = alive[0]?.[0] || null;
    const winner = winnerId ? players[winnerId] : null;

    const lobby = lobbies.find(l => l.id === lobbyId);
    for (const pid in lobby.readiness) {
      lobby.readiness[pid] = false;
    }
    clearInterval(lobby.timerInterval);

    io.to(lobbyId).emit("gameOver", {
      lobbyId,
      winnerId,
      winnerName: winner ? users[winnerId].userName : "Nobody",
      roundTime: getTotalElapsedTime(lobby)
    });
  }
}

function playersForLobby(lobbyId) {
    return Object.fromEntries(
        Object.entries(players).filter(([_, p]) => p.lobbyId === lobbyId)
    );
}

function findLobbyForPlayer(socket) {
    return lobbies.find(lobby =>
        lobby.players.some(player => player.id === socket.id)
    );
}

function spawnHeart(lobby) {
    const x = Math.floor(Math.random() * 800); 
    const y = Math.floor(Math.random() * 500);

    lobby.currentHeart = { x, y };

    io.to(lobby.id).emit("spawnHeart", { x, y });
}

function getTotalElapsedTime(lobby) {
  let total = lobby.accumulatedTime || 0;

  if (lobby.roundStartTime) {
    total += Math.floor((Date.now() - lobby.roundStartTime) / 1000);
  }

  return total;
}