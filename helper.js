exports.tileAlreadyPartOfShip = (ships, x, y) => {
    return ships.findIndex(match => match.findIndex(subMatch => subMatch.x === x && subMatch.y === y) !== -1) !== -1;
};
