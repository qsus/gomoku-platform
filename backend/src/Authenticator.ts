import { Account, Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export class Authenticator {
	public constructor(
		private prisma: PrismaClient
	) {}

	/**
	 * Verify credentials and return Account object.
	 * @throws AccountNotFoundError if the account doesn't exist
	 * @throws InvalidPasswordError if the password is incorrect
	 */
	public async login(displayName: string, password: string): Promise<Account> {
		let account: Account | null = await this.prisma.account.findUnique({
			where: { displayName: displayName }
		});

		if (!account) {
			throw new AccountNotFoundError("Account not found");
		}

		if (!this.verifyPassword(password, account.passHash)) {
			throw new InvalidPasswordError("Invalid password");
		}

		return account;
	}

	/**
	 * Create a new account and return it. Throw Error if account already exists.
	 */
	public async register(displayName: string, password: string, email?: string): Promise<Account> {
		return this.prisma.account.create({
			data: {
				// id generated by prisma
				passHash: this.hashPassword(password),
				displayName: displayName,
				email: email
			}
		});
	}

	public async unregister(userId: string): Promise<void> {
		await this.prisma.account.delete({
			where: { id: userId }
		});
	}

	public async listUsers(): Promise<Account[]> {
		return this.prisma.account.findMany();
	}

	public hashPassword(password: string): string {
		return bcrypt.hashSync(password, 10);
	}

	public verifyPassword(password: string, hash: string): boolean {
		return bcrypt.compareSync(password, hash);
	}
}

export class AccountNotFoundError extends Error {}
export class InvalidPasswordError extends Error {}
