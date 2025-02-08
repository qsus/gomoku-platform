export type GameStatusBroadcast = {
	gameId: string,
	players: string[],
	board: number[][],
};
