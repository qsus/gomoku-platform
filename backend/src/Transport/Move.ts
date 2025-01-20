import { Color } from "./Misc";

export type Move = {
	moveType: MoveType,
	stoneChanges: StoneChange[],
	chosenColor?: Color
};

export enum MoveType {
	Swap1 = "swap1",
	ChooseColor = "chooseColor",
	Swap2 = "swap2",
	PlaceStone = "placeStone"
}

export type StoneChange = {
	x: number,
	y: number,
	color: Color
};
