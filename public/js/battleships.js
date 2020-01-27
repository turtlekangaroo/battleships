// https://github.com/turtlekangaroo/battleships
// This file handles the client-side of the game
let socket = null;
let myBoard = null;
let enemyBoard = null;
let selected = [-1, -1];

let ready = false;

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const CELL = {
    'NONE': 0,
    'SHIP': 1
};
const GAME_STATE = {
    'MENU': 0,
    'WAITING_FOR_OPPONENT': 1,
    'PRE_GAME': 2,
    'PLAYING': 3,
    'END': 4
};
const CELL_STATE = {
    'DEFAULT': 0,
    'SHOT': 1,
    'DESTROYED': 2
};

Object.freeze(LETTERS);
Object.freeze(CELL);
Object.freeze(GAME_STATE);
Object.freeze(CELL_STATE);

let gameState = GAME_STATE.MENU;


function setup() {
    socket = io({transports: ['websocket'], upgrade: false});
    createCanvas(900, 440);
    myBoard = new Board(40, 40, 40, true);
    enemyBoard = new Board(40, 500, 40);
    $('.p5Canvas').css('border', '1px solid black');
    $('body').append($('<br/>'));
    $('body').append($('<br/>'));
    $('body').append($('<input id="room_id" placeholder="Room ID" type="text" minlength="5" maxlength="5"/>'));
    $('#room_id').on("keypress keyup blur",function (event) {
        $(this).val($(this).val().replace(/[^\d].+/, ""));
        if ((event.which < 48 || event.which > 57)) {
            event.preventDefault();
        }
    });

    $('body').append($('<button id="btn_join" onclick="joinRoom()">Join Room</button>'));
    $('body').append($('<button id="btn_ready" onclick="readyUp()" disabled>Ready Up</button>'));
    // $('body').append($('<br/>'));
    //$('body').append($('<button id="btn_leave" onclick="leaveRoom()" disabled>Leave Room</button>'));

    socket.on('disconnect', () => {
        location.reload();
    });

    socket.on('game_state', (state) => {
        selected = [-1, -1];
        gameState = state;
        if (state === GAME_STATE.MENU) {
            $('#btn_join').removeAttr('disabled');
            //$('#btn_leave').attr('disabled', '');
        }
        else {
            $('#btn_join').attr('disabled', '');
            //$('#btn_leave').removeAttr('disabled');
        }

        if (state === GAME_STATE.WAITING_FOR_OPPONENT) {
            ready = false;
        }

        switch (state) {
            case GAME_STATE.MENU:
                document.title = 'Battleships - Menu';
                break;
            case GAME_STATE.WAITING_FOR_OPPONENT:
                document.title = 'Battleships - Waiting';
                break;
            case GAME_STATE.PRE_GAME:
                document.title = 'Battleships - Placement';
                break;
            case GAME_STATE.PLAYING:
                document.title = 'Battleships - Playing';
                break;
            case GAME_STATE.END:
                document.title = 'Battleships - Ended';
                break;
            default:
                document.title = 'Battleships';
                break;
        }
    });

    socket.on('board_info', (info) => {
        myBoard.grid = info.myBoard;
        enemyBoard.grid = info.enemyBoard;
    });

    socket.on('ship_validation', (state) => {
        let btn = $('#btn_ready');
        state ? btn.removeAttr('disabled') : btn.attr('disabled', '');
    });

    socket.on('ready_success', () => {
        $('#btn_ready').attr('disabled', '');
        ready = true;
    });
}

function draw() {
    background(255);
    if (gameState === GAME_STATE.PRE_GAME || gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.END) {
        selected = [-1, -1];
        myBoard.draw();
        enemyBoard.draw();
    }
    else if (gameState === GAME_STATE.WAITING_FOR_OPPONENT) {
        fill(0);
        textAlign(CENTER, CENTER);
        textSize(50);
        text('Waiting for opponent...', 0, 0, width, height);
    }
}

function mouseClicked() {
    if (selected[0] < 10 && selected[0] > -1 && selected[1] < 10 && selected[1] > -1) {
        if (gameState === GAME_STATE.PRE_GAME) {
            place_ship(selected[0], selected[1]);
        }
        else if (gameState === GAME_STATE.PLAYING) {
            shoot(selected[0], selected[1]);
        }
    }
}

function place_ship(x, y) {
    socket.emit('place_ship', x, y);
}

function joinRoom() {
    let room = $('#room_id').val();
    if (room.length === 5 && gameState === GAME_STATE.MENU) {
        socket.emit('join_room', room);
    }
}

function shoot(x, y) {
    if (gameState === GAME_STATE.PLAYING && selected !== [-1, -1]) {
        socket.emit('shoot', x, y);
    }
}

/*function leaveRoom() {
    if (gameState !== GAME_STATE.MENU) {
        socket.emit('leave_room');
    }
}*/

function readyUp() {
    socket.emit('ready');
}

class Board {
    constructor(cellSize = 40, gridOffsetX = 150, gridOffsetY = 150, ownBoard = false) {
        this.cellSize = cellSize;
        this.gridOffsetX = gridOffsetX;
        this.gridOffsetY = gridOffsetY;
        this.ownBoard = ownBoard;

        // Pre-defined
        this.grid = null;
        // ------------
    }

    draw() {
        if (this.grid === null) {
            return;
        }
        textSize(32);
        textAlign(CENTER, CENTER);
        for (let col = 0; col < this.grid.length; col++) {
            stroke(0);
            fill(0);
            text(LETTERS[col], this.gridOffsetX + 4 + col * this.cellSize, this.gridOffsetY - this.cellSize, this.cellSize, this.cellSize);
            for (let row = 0; row < this.grid[0].length; row++) {
                stroke(0);
                let cell = this.grid[col][row];
                fill(255);
                if (this.ownBoard) {
                    let cs = this.cellSize;
                    let cellX = this.gridOffsetX + col * cs;
                    let cellY = this.gridOffsetY + row * cs;
                    let mx = mouseX;
                    let my = mouseY;


                    if (gameState === GAME_STATE.PRE_GAME &&
                        !ready &&
                        mx >= cellX &&
                        my >= cellY &&
                        mx < cellX + cs &&
                        my < cellY + cs) {

                        fill(0);
                        selected = [col, row];
                    }
                }
                else {
                    let cs = this.cellSize;
                    let cellX = this.gridOffsetX + col * cs;
                    let cellY = this.gridOffsetY + row * cs;
                    let mx = mouseX;
                    let my = mouseY;


                    if (gameState === GAME_STATE.PLAYING &&
                        mx >= cellX &&
                        my >= cellY &&
                        mx < cellX + cs &&
                        my < cellY + cs) {
                        fill(200, 0, 0);
                        selected = [col, row];
                    }
                }

                if (cell.type === CELL.SHIP) {
                    if (this.ownBoard) {
                        fill(0);
                    }
                    else {
                        cell.state === CELL_STATE.SHOT ? fill(128, 0, 0) : fill(255, 0, 0);
                    }
                }

                rect(this.gridOffsetX + col * this.cellSize, this.gridOffsetY + row * this.cellSize, this.cellSize, this.cellSize);
                if (cell.state !== CELL_STATE.DEFAULT) {
                    this.ownBoard ? fill(200, 0, 0) : fill(0, 0, 0);
                    textSize(32);
                    textAlign(CENTER, CENTER);
                    text('X', this.gridOffsetX + 4 + col * this.cellSize, this.gridOffsetY + row * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }

        textAlign(CENTER, TOP);
        for (let row = 0; row < this.grid[0].length; row++) {
            fill(0);
            text((row+1).toString(), this.gridOffsetX - this.cellSize, this.gridOffsetY + 7 + row * this.cellSize, this.cellSize, this.cellSize);
        }
    }
}

class Cell {
    constructor(type = 0) {
        this.type = type;
        this.state = 0;
    }
}
