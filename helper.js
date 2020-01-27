// https://github.com/turtlekangaroo/battleships
// Please note that I have no reasonable
// explanation for this file's existence.
// (just roll with it)
exports.tileAlreadyPartOfShip = (ships, x, y) => {
    return ships.findIndex(match => match.findIndex(subMatch => subMatch.x === x && subMatch.y === y) !== -1) !== -1;
};
