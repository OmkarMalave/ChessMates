const express = require('express');
const socket = require('socket.io');
const http = require('http');
const path = require('path');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = socket(server);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

let matches = {}; // Store multiple matches

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniquesocket) {
  console.log("A new client connected");

  // Find an available match or create a new one
  let matchId = findAvailableMatch();
  
  if (!matchId) {
    matchId = createNewMatch();
    matches[matchId].white = uniquesocket.id;
    uniquesocket.join(matchId);
    uniquesocket.emit("playerRole", "w");
  } else if (!matches[matchId].black) {
    matches[matchId].black = uniquesocket.id;
    uniquesocket.join(matchId);
    uniquesocket.emit("playerRole", "b");
  }

  // Handle disconnection
  uniquesocket.on("disconnect", function () {
    for (let id in matches) {
      if (matches[id].white === uniquesocket.id) {
        delete matches[id].white;
      } else if (matches[id].black === uniquesocket.id) {
        delete matches[id].black;
      }
      if (!matches[id].white && !matches[id].black) {
        delete matches[id]; // Remove empty match
      }
    }
    console.log("A player disconnected");
  });

  // Handle player moves
  uniquesocket.on("move", (move) => {
    const room = getRoom(uniquesocket);
    const chess = matches[room].game;

    try {
      if (chess.turn() === "w" && uniquesocket.id !== matches[room].white) return;
      if (chess.turn() === "b" && uniquesocket.id !== matches[room].black) return;

      const result = chess.move(move);

      if (result) {
        io.to(room).emit("move", move);
        io.to(room).emit("boardState", chess.fen());
      } else {
        console.log("Invalid move");
        uniquesocket.emit("invalidMove", move);
      }
    } catch (err) {
      console.log(err);
      uniquesocket.emit("invalidMove", move);
    }
  });
});

// Find an available match with a missing player
function findAvailableMatch() {
  for (let matchId in matches) {
    if (!matches[matchId].black) return matchId;
  }
  return null;
}

// Create a new match
function createNewMatch() {
  const matchId = `match_${Date.now()}`;
  matches[matchId] = {
    game: new Chess(),
    white: null,
    black: null
  };
  return matchId;
}

// Get the room a player belongs to
function getRoom(uniquesocket) {
  for (let matchId in matches) {
    if (matches[matchId].white === uniquesocket.id || matches[matchId].black === uniquesocket.id) {
      return matchId;
    }
  }
  return null;
}

server.listen(4000, () => {
  console.log("Server is running on port 4000");
});
