import { GameStatusBroadcast as GameStatusBroadcast, MoveType } from "./Transport/GameStatusBroadcast";

export class GameStateHelper {
	//private originalGameState: GameState;
	public constructor(private gameState: GameState) {}

	public static newGomoku() {
		return new GameStateHelper({
			playerOnTurn: 0,
			moves: [],
			gamePhase: GamePhase.Started
		});
	}

	public getGameState() {
		return this.gameState;
	}

	public playSimplifiedMove(move: {
		stone?: {
			x: number,
			y: number,
			color: number // 0 = empty, 1 = black, 2 = white
		},
		moveType: MoveType
	}) {
		// Quick simple check, not needed
		if (!this.isLegalMoveType(move.moveType)) {
			throw new Error(`Illegal move type: ${move.moveType}`);
		}

		// Check that all stone-requiring move types do contain a stone
		// TODO: change implementation to requireNStones(1)
		if (
			!move.stone && [MoveType.placeAndClock, MoveType.placeOnly].includes(move.moveType)
		) {
			throw new Error("Missing stone");
		}

		// Check if implemented
		if (![MoveType.placeAndClock, MoveType.placeOnly, MoveType.clockOnly].includes(move.moveType)) {
			throw new Error(`Not implemented, even though legal: ${move.moveType}`);
		}

		let stage = this.setStage.bind(this);
		let place = this.placeStone.bind(this);
		let nextPlayer = this.nextPlayer.bind(this);
		
		// First branch depending on the game phase
		if (this.gameState.gamePhase === GamePhase.Started) {
			if (move.moveType === MoveType.placeOnly) {
				place(move.stone!);
				stage(GamePhase.PlacedSwap1_1);
			} else if (move.moveType === MoveType.fullSwap1) {
				// TODO: place three
				nextPlayer();
				stage(GamePhase.PlacedSwap1_Complete);
			} else {
				throw new Error(`Illegal move type: ${move.moveType}`);
			}
		} else if (this.gameState.gamePhase === GamePhase.PlacedSwap1_1) {
			if (move.moveType === MoveType.placeOnly) {
				place(move.stone!);
				stage(GamePhase.PlacedSwap1_2);
			} else {
				throw new Error(`Illegal move type: ${move.moveType}`);
			}
		} else if (this.gameState.gamePhase === GamePhase.PlacedSwap1_2) {
			if (move.moveType === MoveType.placeAndClock) {
				place(move.stone!);
				nextPlayer();
				stage(GamePhase.PlacedSwap1_Complete);
			} else {
				throw new Error(`Illegal move type: ${move.moveType}`);
			}
		} else if (this.gameState.gamePhase === GamePhase.PlacedSwap1_Complete) {
			if (move.moveType === MoveType.placeOnly) {
				place(move.stone!);
				stage(GamePhase.PlacedSwap2_1);
			} else if (move.moveType === MoveType.clockOnly) {
				// colors are now determined, but I actually do not need to store it anywhere
				nextPlayer();
				stage(GamePhase.MiddleGame);
			} else if (move.moveType === MoveType.placeAndClock) {
				// colors are now determined, but I actually do not need to store it anywhere
				place(move.stone!);
				nextPlayer();
				stage(GamePhase.MiddleGame);
			} else if (move.moveType === MoveType.chooseColor) {
				// colors are now determined, but I actually do not need to store it anywhere
				throw new Error("Not implemented");
				//if (move.color === 1) nextPlayer();
				stage(GamePhase.MiddleGame);
			} else {
				throw new Error(`Illegal move type: ${move.moveType}`);
			}
		} else if (this.gameState.gamePhase === GamePhase.PlacedSwap2_1) {
			if (move.moveType === MoveType.placeAndClock) { // let first player choose color
				place(move.stone!);
				nextPlayer();
				stage(GamePhase.PlacedSwap2_Complete);
			} else if (move.moveType === MoveType.clockOnly) {
				// colors are now determined, but I actually do not need to store it anywhere
				nextPlayer();
				stage(GamePhase.MiddleGame);
			} else {
				throw new Error(`Illegal move type: ${move.moveType}`);
			}
		} else if (this.gameState.gamePhase === GamePhase.PlacedSwap2_Complete) {
			if (move.moveType === MoveType.clockOnly) {
				// colors are now determined, but I actually do not need to store it anywhere
				nextPlayer();
				stage(GamePhase.MiddleGame);
			} else if (move.moveType === MoveType.placeAndClock) {
				// colors are now determined, but I actually do not need to store it anywhere
				place(move.stone!);
				nextPlayer();
				stage(GamePhase.MiddleGame);
			} else if (move.moveType === MoveType.chooseColor) {
				// colors are now determined, but I actually do not need to store it anywhere
				throw new Error("Not implemented");
				// if (move.color === 1) nextPlayer();
				stage(GamePhase.MiddleGame);
			} else {
				throw new Error(`Illegal move type: ${move.moveType}`);
			}
		} else if (this.gameState.gamePhase === GamePhase.MiddleGame) {
			if (move.moveType === MoveType.placeAndClock) {
				place(move.stone!);
				nextPlayer();
			} else {
				throw new Error(`Illegal move type: ${move.moveType}`);
			}
		} else if (this.gameState.gamePhase === GamePhase.Ended) {
			throw new Error(`Game has ended`);
		} else {
			throw new Error(`Unknown game phase: ${this.gameState.gamePhase}`);
		}

		// check for five in a row
		if (this.isWin()) {
			stage(GamePhase.Ended);
			// TODO: notify players
		}

	}

	private setStage(stage: GamePhase) {
		this.gameState.gamePhase = stage;
	}

	private isWin() {
		let board = this.movesToBoard();

		const rows = board.length;
		const cols = board[0].length;
	
		function checkSequence(seq: number[]): number {
			let count = 0;
			let prev = 0;
	
			for (let i = 0; i < seq.length; i++) {
				if (seq[i] !== 0) {
					if (seq[i] === prev) {
						count++;
						if (count > 5) count = 6; // Mark as invalid
					} else {
						if (count === 5) return prev; // Found valid sequence
						count = 1;
						prev = seq[i];
					}
				} else {
					if (count === 5) return prev;
					count = 0;
					prev = 0;
				}
			}
	
			return count === 5 ? prev : 0;
		}
	
		// Check rows
		for (let i = 0; i < rows; i++) {
			const result = checkSequence(board[i]);
			if (result) return result;
		}
	
		// Check columns
		for (let j = 0; j < cols; j++) {
			const column = board.map(row => row[j]);
			const result = checkSequence(column);
			if (result) return result;
		}
	
		// Check diagonals
		function getDiagonal(startRow: number, startCol: number, rowStep: number, colStep: number) {
			let diagonal: number[] = [];
			let r = startRow, c = startCol;
			while (r >= 0 && r < rows && c >= 0 && c < cols) {
				diagonal.push(board[r][c]);
				r += rowStep;
				c += colStep;
			}
			return diagonal;
		}
	
		// Check all diagonals (bottom-left to top-right)
		for (let r = 0; r < rows; r++) {
			const result = checkSequence(getDiagonal(r, 0, -1, 1));
			if (result) return result;
		}
		for (let c = 1; c < cols; c++) {
			const result = checkSequence(getDiagonal(rows - 1, c, -1, 1));
			if (result) return result;
		}
	
		// Check all diagonals (top-left to bottom-right)
		for (let r = 0; r < rows; r++) {
			const result = checkSequence(getDiagonal(r, 0, 1, 1));
			if (result) return result;
		}
		for (let c = 1; c < cols; c++) {
			const result = checkSequence(getDiagonal(0, c, 1, 1));
			if (result) return result;
		}
	
		return 0;
	}

	private isLegalMoveType(moveType: MoveType) {
		return this.getLegalMoveTypes().includes(moveType);
	}

	private nextPlayer() {
		this.gameState.playerOnTurn = (this.gameState.playerOnTurn + 1) % 2;
	}

	private placeStone(stone: { x: number, y: number, color: number }) {
		// TODO: validate if empty
		// TODO: automatic color
		this.gameState.moves.push({
			stones: [stone],
			pressClock: false
		});
	}

	public getLegalMoveTypes() {
		const moveTypeTable = {
			[GamePhase.Started]: [MoveType.placeOnly, MoveType.fullSwap1],

			[GamePhase.PlacedSwap1_1]: [MoveType.placeOnly],
			[GamePhase.PlacedSwap1_2]: [MoveType.placeAndClock],
			[GamePhase.PlacedSwap1_Complete]: [MoveType.placeOnly, MoveType.clockOnly, MoveType.placeAndClock, MoveType.chooseColor],

			[GamePhase.PlacedSwap2_1]: [MoveType.clockOnly, MoveType.placeAndClock],
			[GamePhase.PlacedSwap2_Complete]: [MoveType.placeAndClock, MoveType.clockOnly, MoveType.chooseColor],

			[GamePhase.MiddleGame]: [MoveType.placeAndClock],

			[GamePhase.Ended]: [],
		};

		if (!moveTypeTable[this.gameState.gamePhase]) {
			throw new Error(`Unknown game phase: ${this.gameState.gamePhase}`);
		}

		return moveTypeTable[this.gameState.gamePhase] as MoveType[];
	}

	public movesToBoard(): number[][] {
		let moves = this.gameState.moves;

		// TODO: not assume 15x15
		let board = Array.from({ length: 15 }, () => Array(15).fill(0));

		for (let move of moves) {
			for (let stone of move.stones) {
				board[stone.y][stone.x] = stone.color;
			}
		}

		return board;
	}

	public getNextStoneColor(): number {
		if (this.gameState.moves.length === 0) return 1;
		let lastMove = this.gameState.moves[this.gameState.moves.length - 1];
		let lastStone = lastMove.stones[lastMove.stones.length - 1];
		let lastColor = lastStone.color;
		let nextColor = lastColor + 1;
		if (nextColor > 2) nextColor = 1;
		return nextColor;
	}

	public getPlayerOnTurn(): number {
		return this.gameState.playerOnTurn;
	}
}

export type GameState = {
	playerOnTurn: number, // index starting at 0
	// TODO: gameStarted or gamePhase
	moves: {
		stones: {
			x: number,
			y: number,
			color: number // 0 = empty, 1 = black, 2 = white
		}[],
		pressClock: boolean
	}[],
	gamePhase: GamePhase
}

export enum GamePhase {
	Started, // waiting for swap 1

	PlacedSwap1_1,
	PlacedSwap1_2,
	PlacedSwap1_Complete, // full swap 1 has been placed

	PlacedSwap2_1,
	PlacedSwap2_Complete, // full swap 2 has been placed
	
	MiddleGame, // color chosen
	
	Ended
}
