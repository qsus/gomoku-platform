import { PrismaClient } from "@prisma/client";

/**
 * Handles all game logic. Connects to Prisma DB. Returns data in types specified below.
 * Example usage: SocketRouter sends events to GameServer. Cli commands, administration, REST API, ... send events to GameServer.
 * Does not care about authentication - caller such as SocketRouter must ensure authentication.
 * Does not care who the players actually are. Only works with IDs.
 */
export class GameServer {
	public constructor(
		private prisma: PrismaClient,
	) {
	}

	public async startGame(gameSettings: GameSettings): Promise<GameData> {
		if (gameSettings.type !== 'gomoku') throw new Error("Unknown game type: " + gameSettings.type);
		
		let board = Array.from({ length: gameSettings.boardSizeY }, () => Array(gameSettings.boardSizeX).fill(''));
		board[0][0] = 'b'; // example
		board[0][1] = 'w'; // example

		let game = await this.prisma.game.create({
			data: {
				gameState: {
					board: board
				}
			}
		})

		return { // transformation of Prisma-structure to GameServer-structure
			gameId: game.id,
			board: (game.gameState as { board: Board }).board,
			gameSettings: gameSettings,
			playerIds: []
		}
	}

	public async joinGame(gameId: string, userId: any): Promise<void> { // TODO
		// find game
		let game = await this.prisma.game.findUnique({
			where: {
				id: gameId
			},
			include: {
				players: true
			}
		})

		// check if game exists and not full
		if (!game) throw new Error("Game not found: " + gameId);
		if (game.players.length >= 2) throw new Error("Game is full: " + gameId);

		// add player
		this.prisma.game.update({
			where: {
				id: gameId
			},
			data: {
				players: {
					connect: {
						id: userId
					}
				}
			}
		});
	}
}

export type GameSettings = {
	boardSizeX: number,
	boardSizeY: number,
	type: string
}

export type GameData = {
	gameId: string,
	board: ('b' | 'w' | '')[][],
	gameSettings: GameSettings,
	playerIds: string[]
}

export type Board = ('b' | 'w' | '')[][]
