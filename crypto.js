import {
Client,
Account,
Databases
} from "https://cdn.jsdelivr.net/npm/appwrite@17.0.0/+esm";

const client = new Client()
.setEndpoint("https://nyc.cloud.appwrite.io/v1")
.setProject("69d1aaac0005506756e0");

const account = new Account(client);
const databases = new Databases(client);

// APPWRITE DATABASE
const DATABASE_ID = "69d1aaf5000f43c786be";
const USERS_COLLECTION_ID = "6af03bb90002e65a0035";

// MINING REWARDS
const TAP_REWARD = 0.000000002333;
const PUZZLE_REWARD = 0.000000025000;

// GET CURRENT USER
export async function getCurrentUser() {
return await account.get();
}

// GET SAVED CRYPTO BALANCE
export async function getCryptoBalance() {
const user = await account.get();

const profile = await databases.getDocument(
DATABASE_ID,
USERS_COLLECTION_ID,
user.$id
);

return {
balance: Number(profile.coinBalance || 0),
totalMined: Number(profile.totalMined || 0),
totalWithdrawn: Number(profile.totalWithdrawn || 0),
tapCount: Number(profile.tapCount || 0),
puzzleCompleted: Number(profile.puzzleCompleted || 0)
};
}

// SAVE MINING REWARD
async function saveReward(amount, extra = {}) {
const user = await account.get();

const profile = await databases.getDocument(
DATABASE_ID,
USERS_COLLECTION_ID,
user.$id
);

const balance = Number(profile.coinBalance || 0) + amount;

const totalMined =
Number(profile.totalMined || 0) + amount;

await databases.updateDocument(
DATABASE_ID,
USERS_COLLECTION_ID,
user.$id,
{
coinBalance: balance,
totalMined,
...extra
}
);

return {
success: true,
balance,
totalMined,
earned: amount
};
}

// TAP MINING
export async function tapToEarn() {
const user = await account.get();

const profile = await databases.getDocument(
DATABASE_ID,
USERS_COLLECTION_ID,
user.$id
);

const now = Date.now();

const previous = profile.lastTapAt
? new Date(profile.lastTapAt).getTime()
: 0;

if (now - previous < 5000) {
throw new Error(
"Please wait 5 seconds before tapping again."
);
}

const tapCount =
Number(profile.tapCount || 0) + 1;

return await saveReward(
TAP_REWARD,
{
tapCount,
lastTapAt: new Date().toISOString()
}
);
}

// DAILY PUZZLE
export async function submitPuzzle(answer) {
if (String(answer).trim() !== "12") {
throw new Error("Incorrect answer. Try again.");
}

const user = await account.get();

const profile = await databases.getDocument(
DATABASE_ID,
USERS_COLLECTION_ID,
user.$id
);

const today = new Date().toISOString().slice(0, 10);

if (profile.lastPuzzleDate === today) {
throw new Error(
"You have already completed today's puzzle."
);
}

const puzzleCompleted =
Number(profile.puzzleCompleted || 0) + 1;

return await saveReward(
PUZZLE_REWARD,
{
puzzleCompleted,
lastPuzzleDate: today
}
);
}

// LOGOUT
export async function cryptoLogout() {
return await account.deleteSession("current");
}