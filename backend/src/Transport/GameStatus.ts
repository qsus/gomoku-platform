export type GameStatus = {
	gameId: string,
	board: string[][],
	players: string[]
}

export function isGameStatus(data: any): data is GameStatus {
	if (typeof data !== 'object') return false;
	if (typeof data.gameId !== 'string') return false;
	if (!Array.isArray(data.board)) return false;
	if (!Array.isArray(data.players)) return false;
	if (data.board.some((row: any) => !Array.isArray(row))) return false;
	if (data.board.some((row: any) => row.some((cell: any) => typeof cell !== 'string'))) return false;
	if (data.players.some((player: any) => typeof player !== 'string')) return false;
	return true;
}
