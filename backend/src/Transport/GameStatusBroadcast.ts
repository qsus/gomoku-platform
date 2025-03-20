export type GameStatusBroadcast = {
	gameId: string,
	players: string[], // ids
	board: number[][],
	nextTurn?: {
		player: number, // index
		stone: number, // stone color
		allowedMoveTypes: MoveType[] // place, swap, pass, ...
	}
};

export enum MoveType {
	placeOnly = "placeOnly",
	placeAndClock = "placeAndClock",
	clockOnly = "clockOnly",
	fullSwap1 = "fullSwap1", // not used
	fullSwap2 = "fullSwap2", // not used
	chooseColor = "chooseColor", // not used
}
