import newCell from './newCell';
import { blankGrid } from './helperFunctions';
import { setScore } from './move';


function initializeGame(size) {
  let grid = blankGrid(size);
  setScore(0);
  grid = newCell(grid);
  grid = newCell(grid);
  return grid;
}

export default initializeGame;