export type Status = {
	success: boolean,
	error?: ErrorType,
	message?: string
}

export enum ErrorType {
	NotAuthenticated = "notAuthenticated",
	InvalidMove = "invalidMove",
	UnknownGameId = "unknownGameId",
	Other = "other",
	InvalidRequestFormat = "invalidRequestFormat"
}
