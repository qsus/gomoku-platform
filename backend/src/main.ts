import { PrismaClient } from "@prisma/client";
import { Authenticator } from "./Authenticator";
import { SocketRouter } from "./SocketRouter";
import { SocketIoProvider } from "./SocketIoProvider";

const prisma: PrismaClient = new PrismaClient();
const authenticator: Authenticator = new Authenticator(prisma);
const socketIoProvider: SocketIoProvider = new SocketIoProvider();

const socketRouter: SocketRouter = new SocketRouter(socketIoProvider.getIo(), authenticator, prisma);
