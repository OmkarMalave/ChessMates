const socket = io();

const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const RenderBoard = () => {
  const board = chess.board();

  boardElement.innerHTML = "";
  board.forEach((row, rowindex) => {
    row.forEach((square, squareindex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add("square", (rowindex + squareindex) % 2 === 0 ? "light" : "dark");

      squareElement.dataset.row = rowindex;
      squareElement.dataset.col = squareindex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add("piece", square.color === 'w' ? "white" : "black");
        pieceElement.innerText = getPieceUnicode(square);
        pieceElement.draggable = playerRole === square.color;
        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowindex, col: squareindex };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", function (e) {
        e.preventDefault();
      });

      squareElement.addEventListener("drop", function (e) {
        e.preventDefault();

        if (draggedPiece) {
          const targetSquare = { row: parseInt(squareElement.dataset.row), col: parseInt(squareElement.dataset.col) };
          handleMove(sourceSquare, targetSquare);
        }
      });

      boardElement.appendChild(squareElement);
    });
  });

  // Rotate board if the player is black
  if (playerRole === 'b') {
    boardElement.classList.add('flipped');
  } else {
    boardElement.classList.remove('flipped');
  }
};

const handleMove = (sourceSquare, targetSquare) => {
  const move = {
    from: `${String.fromCharCode(97 + sourceSquare.col)}${8 - sourceSquare.row}`,
    to: `${String.fromCharCode(97 + targetSquare.col)}${8 - targetSquare.row}`,
    promotion: 'q',
  };

  socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
  const unicodePieces = {
    p: "♙", 
    r: "♖",
    n: "♘",
    b: "♗",
    q: "♕",
    k: "♔",
    P: "♟",
    R: "♜",
    N: "♞",
    B: "♝",
    Q: "♛",
    K: "♚"
  };
  return unicodePieces[piece.type] || "";
};

socket.on("playerRole", function(role) {
  playerRole = role;
  RenderBoard();
});

socket.on("spectatorRole", function() {
  playerRole = null;
  RenderBoard();
});

socket.on("boardState", function(fen) {
  chess.load(fen);
  RenderBoard();
});

socket.on("move", function(move) {
  chess.move(move);
  RenderBoard();
});

RenderBoard();