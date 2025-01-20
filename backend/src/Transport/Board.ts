import { Color } from "./Misc";

export type Board = {
	stones: Color[][] // note: first number is y, second is x; first row is displayed on top
};

// TODO: think how to store moves in the array. Either make the array human readable [y][x], or the code human readable [x][y] (some values reversed, not sure which)
