// https://github.com/turtlekangaroo/battleships
// This file handles a lot of the logic for the game
const helper = require('./helper.js');

class Cell {
    constructor(type = 0) {
        this.type = type;
        this.state = 0;
    }
}

class Player {
    constructor(socket) {
        this.socket = socket;

        // Pre-defined
        this.grid = new Array(10).fill(null).map(() => (new Array(10).fill(null).map(() => (new Cell()))));
        this.enemyGrid = new Array(10).fill(null).map(() => (new Array(10).fill(null).map(() => (new Cell()))));
        this.ready = false;
        // -----------------
    }

    checkDiag(x, y) {
        let diags = [];

        if (x > 0) {
            if (y > 0) {
                diags.push(this.grid[x - 1][y - 1]);
            }
            if (y < 9) {
                diags.push(this.grid[x - 1][y + 1]);
            }
        }
        if (x < 9) {
            if (y > 0) {
                diags.push(this.grid[x + 1][y - 1]);
            }
            if (y < 9) {
                diags.push(this.grid[x + 1][y + 1]);
            }
        }

        return diags.findIndex(x => x !== undefined && x.type === 1) !== -1;
    }

    getShipTiles() {
        let shipTiles = [];
        for (let col = 0; col < this.grid.length; col++) {
            for (let row = 0; row < this.grid[0].length; row++) {
                let currentTile = this.grid[col][row];
                if (currentTile.type === 1) {
                    shipTiles.push({'x': col, 'y': row, 'state': currentTile.state});
                }
            }
        }

        return shipTiles;
    }

    getShips() {
        let shipTiles = this.getShipTiles();

        let ships = [];
        shipTiles.forEach((shipTile) => {
            // Make sure that this tile isn't already part of another ship;
            if (!helper.tileAlreadyPartOfShip(ships, shipTile.x, shipTile.y)) {
                let x = shipTile.x;
                let y = shipTile.y;
                let ship = [];

                while (x <= 9) {
                    let tile = {'x': x, 'y': y, 'state': this.grid[x][y].state};
                    if (shipTiles.findIndex(t => t.x === tile.x && t.y === tile.y) !== -1) {
                        if (ship.findIndex(t => t.x === tile.x && t.y === tile.y) === -1 && !helper.tileAlreadyPartOfShip(ships, x, y)) {
                            ship.push(tile);
                        }
                    } else {
                        break;
                    }

                    x++;
                }

                x = shipTile.x;

                while (x >= 0) {
                    let tile = {'x': x, 'y': y, 'state': this.grid[x][y].state};
                    if (shipTiles.findIndex(t => t.x === tile.x && t.y === tile.y) !== -1) {
                        if (ship.findIndex(t => t.x === tile.x && t.y === tile.y) === -1 && !helper.tileAlreadyPartOfShip(ships, x, y)) {
                            ship.push(tile);
                        }
                    } else {
                        break;
                    }

                    x--;
                }

                x = shipTile.x;

                while (y <= 9) {
                    let tile = {'x': x, 'y': y, 'state': this.grid[x][y].state};
                    if (shipTiles.findIndex(t => t.x === tile.x && t.y === tile.y) !== -1) {
                        if (ship.findIndex(t => t.x === tile.x && t.y === tile.y) === -1 && !helper.tileAlreadyPartOfShip(ships, x, y)) {
                            ship.push(tile);
                        }
                    } else {
                        break;
                    }

                    y++;
                }

                y = shipTile.y;

                while (y > 0) {
                    let tile = {'x': x, 'y': y, 'state': this.grid[x][y].state};
                    if (shipTiles.findIndex(t => t.x === tile.x && t.y === tile.y) !== -1) {
                        if (ship.findIndex(t => t.x === tile.x && t.y === tile.y) === -1 && !helper.tileAlreadyPartOfShip(ships, x, y)) {
                            ship.push(tile);
                        }
                    } else {
                        break;
                    }

                    y--;
                }

                ships.push(ship);
            }
        });

        return ships;
    }

    checkShips() {
        let shipTiles = this.getShipTiles();

        if (shipTiles.length !== 17) {
            return true;
        }

        let ships = this.getShips();
        let requirements = [2, 3, 3, 4, 5];

        ships.forEach((ship) => {
            let result = requirements.findIndex(size => size === ship.length);
            if (result !== -1) {
                requirements.splice(result, 1);
            }
        });

        return requirements.length !== 0;
    }
}

class Match {
    constructor(roomName) {
        this.name = roomName;

        // Pre-defined
        this.players = [];
        this.currentTurn = 0;
        this.gameState = 1;
        // ------------------
    }
}


exports.Cell = Cell;
exports.Player = Player;
exports.Match = Match;
