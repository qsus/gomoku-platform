// This is a wrapper containing all web stuff. Its main goal is socket event parsing:
// - app can register functions to be called when a given event is received
// - when event is recieved, registered function will be called;
// - optional result from that function will be returned alongside a mandatory status object

import { Server, Socket } from "socket.io";
import { ErrorType, Status } from "./Transport/Status";
import { AccountNotFoundError, Authenticator, InvalidPasswordError } from "./Authenticator";
import { PrismaClient, Account } from "@prisma/client";
import { GameStatusBroadcast as GameStatusBroadcast, MoveType } from "./Transport/GameStatusBroadcast";
import { z } from "zod";
import { GamePhase, GameState, GameStateHelper } from "./GameStateHelper";

/**
 * Provides websocket API for clients.
 * All types must adhere to the Transport types.
 */
export class SocketRouter {
	public constructor(
		private io: Server,
		private authenticator: Authenticator,
		private prisma: PrismaClient,
	) {
		this.io.on('connection', (socket) => {
			console.log('user connected');

			socket.on('disconnect', () => {
				console.log('user disconnected');
			});

			socket.on('test', this.withStructureCheck(this.withErrorHandling((requestData: object, callback: Callback): void => {
				throw new Error("experiment");
				//callback({ success: true, message: requestData.message });
			})));

			socket.on('login', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback): Promise<void> => {
				if ( // verify request format
					!("displayName" in requestData) || typeof requestData.displayName !== 'string' ||
					!("password" in requestData) || typeof requestData.password !== 'string'
				) {
					throw new Error("Invalid request format (missing displayName or password)");
				}
				
				try {
					// call authenticator
					let account = await this.authenticator.login(requestData.displayName, requestData.password);
					socket.data.account = account;
					callback({ success: true, message: "Logged in" }, { displayName: account.displayName, id: account.id });
				} catch (e) {
					// possible authenticator errors
					if (e instanceof InvalidPasswordError) {
						callback({ success: false, error: ErrorType.Other, message: "Invalid credentials" });
					} else if (e instanceof AccountNotFoundError) {
						callback({ success: false, error: ErrorType.Other, message: "Account not found" });
					} else {
						throw e;
					}
				}
			})));

			socket.on('register', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback): Promise<void> => {
				if ( // verify request format
					!("displayName" in requestData) || typeof requestData.displayName !== 'string' ||
					!("password" in requestData) || typeof requestData.password !== 'string' ||
					!("email" in requestData) || typeof requestData.email !== 'string'
				) {
					throw new Error("Invalid request format (missing displayName or password)");
				}
				
				// call authenticator
				try {
					let account = await this.authenticator.register(requestData.displayName, requestData.password, requestData.email);
					socket.data.account = account;
					callback({ success: true, message: "Registered" }, { displayName: account.displayName, id: account.id });
				} catch (e) {
					callback({ success: false, error: ErrorType.Other, message: "Failed to register, most likely account already exists." });
					return;
				}
			})));

			socket.on('unregister', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback) => {
				// make sure that user is logged in
				if (!socket.data.account) {
					callback({ success: false, error: ErrorType.NotAuthenticated, message: "Not authenticated" });
					return;
				}

				// call authenticator
				try {
					await this.authenticator.unregister(socket.data.account.userId);
					callback({ success: true, message: "Unregistered" });
				} catch (e) {
					callback({ success: false, error: ErrorType.Other, message: "Failed to unregister" });
					return;
				}
			})));

			socket.on('createGame', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback) => {
				// make sure that user is logged in
				if (!socket.data.account) {
					callback({ success: false, error: ErrorType.NotAuthenticated, message: "Not authenticated" });
					return;
				}

				let gameStateHelper = GameStateHelper.newGomoku();

				let game = await this.prisma.game.create({
					data: {
						gameState: gameStateHelper.getGameState(),
					}
				})
				this.notifyGameList();

				callback({ success: true, message: "Started game" }, game);
			})));

			socket.on('listenGameList', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback) => {
				socket.join('gameList');
				this.notifyGameList(); // notifies user immediately; TODO: notify only this user
				callback({ success: true, message: "Listening to game list" });
			})));

			socket.on('listenGame', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback) => {
				if ( // verify request format
					!("gameId" in requestData) || typeof requestData.gameId !== 'string'
				) {
					throw new Error("Invalid request format (missing gameId)");
				}
				
				socket.join("game:" + requestData.gameId);
				callback({ success: true, message: "Listening to game" });
				this.notifyGameStatus(requestData.gameId); // notifies user immediately; TODO: notify only this user
			})));

			// Define schemas using zod
			const playMoveSchema = z.object({
				gameId: z.string(),
				move: z.object({
					moveType: z.nativeEnum(MoveType),
					stone:
						z.object({
							x: z.number(),
							y: z.number(),
							color: z.number(),
						})
						.optional(), // stone is optional and depends on MoveType
				}),
			});

			// Update playMove handler
			socket.on('playMove', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback) => {
				// Validate request format using zod
				const validationResult = playMoveSchema.safeParse(requestData);
				if (!validationResult.success) {
					callback({ success: false, error: ErrorType.InvalidRequestFormat, message: validationResult.error.errors.map(err => err.message).join(", ") });
					return;
				}
				const validatedData = validationResult.data;
			
				// Check if user is authenticated
				if (!socket.data.account) {
					callback({ success: false, error: ErrorType.NotAuthenticated, message: "Not authenticated" });
					return;
				}
			
				// Load game
				const game = await this.prisma.game.findUnique({
					where: { id: validatedData.gameId },
					include: { players: true },
				});
				if (!game) {
					callback({ success: false, error: ErrorType.Other, message: "Game not found" });
					return;
				}
				const gameStateHelper = new GameStateHelper(game.gameState as GameState);
			
				// Check if it is the player's turn; TODO: remove hack for not enough joined players
				if (game.players[gameStateHelper.getPlayerOnTurn()]?.id !== socket.data.account.id) {
					callback({ success: false, error: ErrorType.Other, message: "Not your turn" });
					return;
				}
			
				// Attempt to play the move
				gameStateHelper.playSimplifiedMove(validatedData.move);

				// Store new game state
				await this.prisma.game.update({
					where: { id: validatedData.gameId },
					data: {
						gameState: gameStateHelper.getGameState(),
					},
				});
			
				callback({ success: true, message: "Played move" });
				this.notifyGameStatus(validatedData.gameId);
			})));

			socket.on('joinGame', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback) => {
				if ( // verify request format
					!("gameId" in requestData) || typeof requestData.gameId !== 'string'
				) {
					throw new Error("Invalid request format (missing gameId)");
				}

				// load game
				let game = await this.prisma.game.findUnique({ 
					where: { id: requestData.gameId },
					include: { players: true }
				});
				if (!game) {
					callback({ success: false, error: ErrorType.Other, message: "Game not found" });
					return;
				}
				
				// find player
				let account: Account = socket.data.account; // prisma account
				if (!account) {
					callback({ success: false, error: ErrorType.NotAuthenticated, message: "Not authenticated" });
					return;
				}
				
				// check if player is already in game
				if (game.players.some(player => player.id === account.id)) {
					callback({ success: false, error: ErrorType.Other, message: "Player already in game" });
					return;
				}

				// add player to game
				await this.prisma.game.update({
					where: { id: requestData.gameId },
					data: {
						players: {
							connect: {
								id: account.id
							}
						}
					}
				});

				callback({ success: true, message: "Joined game" });
				this.notifyGameStatus(requestData.gameId);

			})));

			socket.onAny((eventName, ...args) => {
				// if handler exists, do nothing
				if (socket.listenerCount(eventName) > 0) return;

				// no handler exists, log
				console.log("Unknown event: " + eventName);

				// try at least telling the user if he provided a callback
				if (typeof args[args.length - 1] === 'function') {
					args[args.length - 1]({ success: false, error: ErrorType.Other, message: "Unknown event: " + eventName });
				}
			});
		});
	}

	private withErrorHandling(serverFunction: ServerFunction): ServerFunction {
		return async (data, callback) => { // types are derived from return type
			try {
				return await serverFunction(data, callback);
			} catch (e) {
				//throw e; // for debugging
				console.log("Error in server function: " + e);
				if (e instanceof NotAuthenticatedErrorExample) {
					callback({ success: false, error: ErrorType.NotAuthenticated, message: e.message });
				} else {
					callback({ success: false, error: ErrorType.Other, message: e.message });
				}
			}
		}
	}

	private withStructureCheck(serverFunction: ServerFunction): ServerFunction {
		return async (data, callback) => { // types are derived from return type
			if (typeof callback !== 'function') {
				console.warn("User sent an event without callback. Event not executed.");
				return;
			}

			if (typeof data !== 'object') {
				callback({ success: false, error: ErrorType.InvalidRequestFormat, message: "First argument must be an object" });
				return;
			}

			return await serverFunction(data, callback);
		}
	}

	private async notifyGameList(): Promise<void> {
		let games = await this.prisma.game.findMany();
		let response = games.map(game => game.id);
		this.io.to('gameList').emit('gameList', response);
	}

	private async notifyGameStatus(gameId: string): Promise<void> {
		// TODO
		let game = await this.prisma.game.findUnique({ 
			where: { id: gameId },
			include: { players: true }
		});
		if (!game) return; // TODO: error handling

		let gameStatusHelper = new GameStateHelper(game.gameState as GameState);
		let board: number[][] = gameStatusHelper.movesToBoard();
		
		let gameStatusBroadcast: GameStatusBroadcast = {
			gameId: gameId,
			players: game.players.map(player => player.id),
			//playerOnTurn: gameStatus.playerOnTurn,
			board: board,
			nextTurn: {
				player: gameStatusHelper.getPlayerOnTurn(),
				stone: gameStatusHelper.getNextStoneColor(),
				allowedMoveTypes: gameStatusHelper.getLegalMoveTypes()
			}
		};
		this.io.to('game:' + gameId).emit('gameStatus', gameStatusBroadcast);
	}
}

/**
 * Function called when event is recieved
 */
type ServerFunction = (data: object, callback: Callback) => any;

/**
 * Socket.io callback.
 */
type Callback = (status: Status, result?: any) => void;

// TODO: move to error.ts
class NotAuthenticatedErrorExample extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CustomError";
	}
}

