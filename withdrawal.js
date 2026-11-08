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

const DATABASE_ID = "69d1aaf5000f43c786be";
const USERS_COLLECTION_ID = "6af03bb90002e65a0035";

// Add your success page URL here later.
const SUCCESS_URL = "";

const balanceElement = document.getElementById("balance");
const networkInput = document.getElementById("walletNetwork");
const addressInput = document.getElementById("walletAddress");
const amountInput = document.getElementById("withdrawalAmount");
const maxBtn = document.getElementById("maxBtn");
const saveWalletBtn = document.getElementById("saveWalletBtn");
const withdrawBtn = document.getElementById("withdrawBtn");
const messageElement = document.getElementById("message");

let currentUser = null;
let userProfile = null;
let availableBalance = 0;
let walletLoaded = false;

function showMessage(message, type = "info") {
messageElement.style.display = "block";
messageElement.textContent = message;

if (type === "success") {
messageElement.style.color = "#16d39a";
} else if (type === "error") {
messageElement.style.color = "#ff7070";
} else {
messageElement.style.color = "#aab5c8";
}
}

function formatCVC(value) {
return Number(value || 0).toFixed(12);
}

function getErrorMessage(error) {
const code = error?.code ? " (Code: ${error.code})" : "";
return "${error?.message || "Unknown error"}${code}";
}

function validateWallet() {
const network = networkInput.value;
const address = addressInput.value.trim();

if (!network) {
throw new Error("Please select your wallet network.");
}

if (!address) {
throw new Error("Please enter your wallet address.");
}

if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
throw new Error("Invalid wallet address. Enter a valid 0x EVM address.");
}

return { network, address };
}

async function loadData() {
try {
showMessage("Connecting to Appwrite...");

currentUser = await account.get();

showMessage("Loading your Crypto Vault profile...");

userProfile = await databases.getDocument(
  DATABASE_ID,
  USERS_COLLECTION_ID,
  currentUser.$id
);

availableBalance = Number(userProfile.coinBalance || 0);

if (!Number.isFinite(availableBalance)) {
  throw new Error("Your coinBalance value is invalid.");
}

balanceElement.textContent = `${formatCVC(availableBalance)} CVC`;

networkInput.value = userProfile.walletNetwork || "";
addressInput.value = userProfile.walletAddress || "";

walletLoaded = true;

showMessage("Your withdrawal profile loaded successfully.", "success");

} catch (error) {
console.error("Withdrawal page loading error:", error);

walletLoaded = false;
balanceElement.textContent = "Unable to load";

showMessage(
  "FAILED TO LOAD: " + getErrorMessage(error) +
  ". Check your Appwrite session, users collection, document ID, attributes and permissions.",
  "error"
);

}
}

// Save wallet details without submitting a withdrawal.
saveWalletBtn.addEventListener("click", async () => {
if (!walletLoaded || !userProfile) {
showMessage("Your profile has not loaded. Please reload the page.", "error");
return;
}

try {
const wallet = validateWallet();

saveWalletBtn.disabled = true;
showMessage("Saving wallet details...");

await databases.updateDocument(
  DATABASE_ID,
  USERS_COLLECTION_ID,
  currentUser.$id,
  {
    walletAddress: wallet.address,
    walletNetwork: wallet.network
  }
);

userProfile.walletAddress = wallet.address;
userProfile.walletNetwork = wallet.network;

showMessage("Wallet details saved successfully.", "success");

} catch (error) {
console.error("Wallet save error:", error);
showMessage("WALLET SAVE FAILED: " + getErrorMessage(error), "error");

} finally {
saveWalletBtn.disabled = false;
}
});

// Fill the full available balance.
maxBtn.addEventListener("click", () => {
if (!walletLoaded) {
showMessage("Please wait for your balance to load.", "error");
return;
}

amountInput.value = availableBalance;
});

// Submit withdrawal request.
withdrawBtn.addEventListener("click", async () => {
if (!walletLoaded || !userProfile) {
showMessage("Your profile has not loaded. Please reload the page.", "error");
return;
}

try {
const wallet = validateWallet();
const amount = Number(amountInput.value);

if (!Number.isFinite(amount) || amount <= 0) {
  throw new Error("Enter a valid withdrawal amount.");
}

if (amount > availableBalance) {
  throw new Error("Your withdrawal amount exceeds your available balance.");
}

withdrawBtn.disabled = true;
saveWalletBtn.disabled = true;

showMessage("Submitting your withdrawal request...");

await databases.updateDocument(
  DATABASE_ID,
  USERS_COLLECTION_ID,
  currentUser.$id,
  {
    walletAddress: wallet.address,
    walletNetwork: wallet.network,
    withdrawalAmount: amount,
    withdrawalStatus: "Pending",
    withdrawalRequestedAt: new Date().toISOString()
  }
);

showMessage(
  "REQUEST SAVED! Your withdrawal request has been recorded as Pending.",
  "success"
);

if (SUCCESS_URL.trim() !== "") {
  window.location.href = SUCCESS_URL;
}

} catch (error) {
console.error("Withdrawal submission error:", error);

showMessage(
  "WITHDRAWAL FAILED: " + getErrorMessage(error),
  "error"
);

} finally {
withdrawBtn.disabled = false;
saveWalletBtn.disabled = false;
}
});

// Start loading the user's profile.
loadData();