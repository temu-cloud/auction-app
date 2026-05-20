import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config(); // load .env

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const bids = await prisma.bid.deleteMany({});
const sessions = await prisma.auctionSession.deleteMany({});
console.log(`Deleted ${bids.count} bids and ${sessions.count} auction sessions.`);
console.log("Users untouched.");

await prisma.$disconnect();
