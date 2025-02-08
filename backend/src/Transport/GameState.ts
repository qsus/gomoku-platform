import { Move } from "./Move";
import { Board } from "./Board";

export type GameState = {
	moves: Move[];
	board: Board;
}
