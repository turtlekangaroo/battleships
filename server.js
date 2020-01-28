// https://github.com/turtlekangaroo/battleships
// This file handles the server-side of the game
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {});
const helper = require('./helper.js');
const game = require('./game.js');
const PORT = 80;
const MAX_PLAYERS_PER_ROOM = 2;
const GAME_STATE = {
    'MENU': 0,
    'WAITING_FOR_OPPONENT': 1,
    'PRE_GAME': 2,
    'PLAYING': 3,
    'END': 4
};
const CELL = {
    'NONE': 0,
    'SHIP': 1
};
const CELL_STATE = {
    'DEFAULT': 0,
    'SHOT': 1,
    'DESTROYED': 2
};

Object.freeze(GAME_STATE);
Object.freeze(CELL);
Object.freeze(CELL_STATE);

app.use(express.static('public'));
server.listen(PORT);

let matches = [];

io.on('connection', (socket) => {
    socket.on('disconnect', () => {
        let index = matches.findIndex(_m => _m.players.findIndex(_p => _p.socket === socket) !== -1);
        if (index !== -1) {
            let match = matches[index];
            let playerIndex = match.players.findIndex(_p => _p.socket === socket);
            if (playerIndex !== -1) {
                let player = match.players[playerIndex];
                // Update the match
                if (match.players.length > 1) {
                    match.players.splice(playerIndex, 1);
                    match.players[0] = new game.Player(match.players[0].socket);
                    match.gameState = GAME_STATE.WAITING_FOR_OPPONENT;
                    io.sockets.to(match.name).emit('game_state', GAME_STATE.WAITING_FOR_OPPONENT);
                }
                // Delete the empty match
                else {
                    matches.splice(index, 1);
                }
            }
        }
    });

    socket.on('join_room', (room) => {
        if (room.length === 5 && /^[0-9]*$/g.test(room)) {
            let isNewRoom = !(room in io.nsps['/'].adapter.rooms);
            let match = null;

            if (Object.keys(socket.rooms).length >= 2) {
                socket.emit('already_in_room');
                return;
            }
            if (!isNewRoom) {
                let isRoomFull = Object.keys(io.nsps['/'].adapter.rooms[room].sockets).length >= MAX_PLAYERS_PER_ROOM;

                if (isRoomFull) {
                    socket.emit('room_full');
                    return;
                }
                else {
                    match = matches.find(x => x.name === room);
                }
            }
            else {
                match = new game.Match(room);
                matches.push(match);
            }

            match.players.push(new game.Player(socket));

            socket.join(room);
            socket.emit('room_joined', room);
            socket.emit('game_state', GAME_STATE.WAITING_FOR_OPPONENT);

            if (match.players.length === 2) {
                match.players.forEach((player) => {
                    match.gameState = GAME_STATE.PRE_GAME;
                    player.socket.emit('game_state', match.gameState);
                    player.socket.emit('board_info', { 'myBoard': player.grid, 'enemyBoard': player.enemyGrid });
                });
            }
        }
    });

    socket.on('ready', () => {
        let index = matches.findIndex(_m => _m.players.findIndex(_p => _p.socket === socket) !== -1);
        if (index !== -1) {
            let match = matches[index];
            let player = match.players.find(_p => _p.socket === socket);
            if (!player.checkShips()) {
                player.ready = true;
                player.socket.emit('ready_success');

                if (match.players.findIndex(_p => _p.ready === false) === -1) {
                    match.gameState = GAME_STATE.PLAYING;
                    match.players.forEach((_p) => {
                        _p.socket.emit('game_state', match.gameState);
                        _p.socket.emit('turn', match.players.indexOf(_p) === match.currentTurn);
                    });
                }
            }
        }
    });

    socket.on('shoot', (x, y) => {
        // Find the correct match
        let index = matches.findIndex(_m => _m.players.findIndex(_p => _p.socket === socket) !== -1);

        // Check if a match was found
        if (index !== -1) {
            // Store the match in a variable
            let match = matches[index];
            //
            let player = match.players.find(_p => _p.socket === socket);
            let otherPlayer = match.players.find(_p => _p !== player);
            if (match.gameState === GAME_STATE.PLAYING &&
                match.players.indexOf(player) === match.currentTurn &&
                x > -1 && x < 10 && y > -1 && y < 10 &&
                player.enemyGrid[x][y].state === CELL_STATE.DEFAULT
            ) {
                otherPlayer.grid[x][y].state = CELL_STATE.SHOT;

                if (otherPlayer.grid[x][y].type === CELL.SHIP) {
                    let ships = otherPlayer.getShips();
                    let shipTiles = otherPlayer.getShipTiles();

                    let destroyedShip = ships.find(_ship => _ship.find(_t => _t.state !== CELL_STATE.SHOT) === undefined);
                    if (destroyedShip !== undefined) {
                        destroyedShip.forEach((tile) => {
                            otherPlayer.grid[tile.x][tile.y].state = CELL_STATE.DESTROYED;
                            otherPlayer.getDiags(tile.x, tile.y).forEach((_diag) => {
                                if (otherPlayer.grid[_diag.x][_diag.y].state === CELL_STATE.DEFAULT) {
                                    otherPlayer.grid[_diag.x][_diag.y].state = CELL_STATE.SHOT;
                                    player.enemyGrid[_diag.x][_diag.y] = otherPlayer.grid[_diag.x][_diag.y];
                                }
                            });
                            for (let i = -1; i < 3; i+=2) {
                                let _x = tile.x - i;
                                let _y = tile.y;
                                if (_x > -1 && _x < 10 && otherPlayer.grid[tile.x - i][tile.y].state === CELL_STATE.DEFAULT) {
                                    otherPlayer.grid[_x][_y].state = CELL_STATE.SHOT;
                                    player.enemyGrid[_x][_y] = otherPlayer.grid[_x][_y];
                                }
                            }
                            for (let j = -1; j < 3; j+=2) {
                                let _x = tile.x;
                                let _y = tile.y - j;
                                if (_y > -1 && _y < 10 && otherPlayer.grid[_x][_y].state === CELL_STATE.DEFAULT) {
                                    otherPlayer.grid[_x][_y].state = CELL_STATE.SHOT;
                                    player.enemyGrid[_x][_y] = otherPlayer.grid[_x][_y];
                                }
                            }
                        });
                    }
                }

                player.enemyGrid[x][y] = otherPlayer.grid[x][y];
                player.socket.emit('board_info', { 'myBoard': player.grid, 'enemyBoard': player.enemyGrid });
                otherPlayer.socket.emit('board_info', { 'myBoard': otherPlayer.grid, 'enemyBoard': otherPlayer.enemyGrid });

                let remainingShipTiles = 0;

                for (let col = 0; col < otherPlayer.grid.length; col++) {
                    for (let row = 0; row < otherPlayer.grid[0].length; row++) {
                        if (otherPlayer.grid[col][row].type === CELL.SHIP && otherPlayer.grid[col][row].state === CELL_STATE.DEFAULT) {
                            remainingShipTiles++;
                        }
                    }
                }

                if (remainingShipTiles === 0) {
                    match.gameState = GAME_STATE.END;
                    match.players.forEach((player) => {
                        player.socket.emit('game_state', match.gameState);
                    });
                    console.log(`Player ${match.players.indexOf(player)} has won the game.`);
                }
                else if (otherPlayer.grid[x][y].type !== CELL.SHIP) {
                    match.currentTurn = match.currentTurn === 0 ? 1 : 0;
                    match.players.forEach((_p) => {
                        _p.socket.emit('turn', match.players.indexOf(_p) === match.currentTurn);
                    });
                }
            }
        }
    });

    socket.on('place_ship', (x, y) => {
        let index = matches.findIndex(_m => _m.players.findIndex(_p => _p.socket === socket) !== -1);
        if (index !== -1) {
            let match = matches[index];
            let player = match.players.find(_p => _p.socket === socket);
            if (!player.checkDiag(x, y) && match.gameState === GAME_STATE.PRE_GAME && !player.ready) {
                player.grid[x][y].type = player.grid[x][y].type == CELL.NONE ? CELL.SHIP : CELL.NONE;
                player.socket.emit('board_info', { 'myBoard': player.grid, 'enemyBoard': player.enemyGrid });
                player.socket.emit('ship_validation', !player.checkShips());
            }
        }
    });

    socket.on('leave_room', () => {
        let index = matches.findIndex(_m => _m.players.findIndex(_p => _p.socket === socket) !== -1);
        if (index !== -1) {
            let match = matches[index];
            let playerIndex = match.players.findIndex(_p => _p.socket === socket);
            if (playerIndex !== -1) {
                let player = match.players[playerIndex];
                // Update the match
                if (match.players.length > 1) {
                    match.players.splice(playerIndex, 1);
                    match.players[0] = new game.Player(match.players[0].socket);
                    match.gameState = GAME_STATE.WAITING_FOR_OPPONENT;
                    io.sockets.to(match.name).emit('game_state', GAME_STATE.WAITING_FOR_OPPONENT);
                }
                // Delete the empty match
                else {
                    matches.splice(index, 1);
                }
                socket.leave(match.name);
                socket.emit('game_state', GAME_STATE.MENU);
            }
        }
    });
});
