import {
Client,
Account,
Functions
} from "https://cdn.jsdelivr.net/npm/appwrite@17.0.0/+esm";

// APPWRITE CONFIGURATION
const client = new Client()
.setEndpoint("https://nyc.cloud.appwrite.io/v1")
.setProject("69d1aaac0005506756e0");

export const account = new Account(client);
export const functions = new Functions(client);

// Replace with your actual Appwrite Function ID
const CRYPTO_FUNCTION_ID = "YOUR_CRYPTO_REWARDS_FUNCTION_ID";

// GET LOGGED-IN USER
export async function getCurrentUser() {
return await account.get();
}

// CRYPTO REWARDS FUNCTION
export async function cryptoAction(action, extra = {}) {
const execution = await functions.createExecution(
CRYPTO_FUNCTION_ID,
JSON.stringify({
action,
...extra
}),
false
);

if (execution.status !== "completed") {
throw new Error("Request is still processing. Please try again.");
}

let result;

try {
result = JSON.parse(execution.responseBody || "{}");
} catch {
throw new Error("Invalid response from Crypto Vault server.");
}

if (!result.success) {
throw new Error(result.message || "Transaction failed.");
}

return result;
}

// GET USER BALANCE
export async function getCryptoBalance() {
return await cryptoAction("balance");
}

// TAP TO EARN
export async function tapToEarn() {
return await cryptoAction("tap");
}

// DAILY PUZZLE
export async function submitPuzzle(answer) {
return await cryptoAction("puzzle", { answer });
}

// ADMIN TOP-UP
export async function adminTopUp(userId, amount) {
return await cryptoAction("topup", {
userId,
amount
});
}

// LOGOUT
export async function cryptoLogout() {
return await account.deleteSession("current");
}