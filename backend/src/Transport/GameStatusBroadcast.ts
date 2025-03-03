export type GameStatusBroadcast = {
	gameId: string,
	players: string[], // ids
	playerOnTurn: number, // index
	board: number[][],
	nextTurn?: {
		player: number, // index
		stone: number, // stone color
		//allowedTypes: string[] // place, swap, pass, ...
	}
};
