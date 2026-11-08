const balanceElement = document.getElementById("balance");
const networkInput = document.getElementById("walletNetwork");
const addressInput = document.getElementById("walletAddress");
const amountInput = document.getElementById("withdrawalAmount");
const maxBtn = document.getElementById("maxBtn");
const saveWalletBtn = document.getElementById("saveWalletBtn");
const withdrawBtn = document.getElementById("withdrawBtn");
const messageElement = document.getElementById("message");

let account;
let databases;
let currentUser = null;
let userProfile = null;
let availableBalance = 0;
let walletLoaded = false;

const DATABASE_ID = "69d1aaf5000f43c786be";
const USERS_COLLECTION_ID = "6af03bb90002e65a0035";
const SUCCESS_URL = "";

function showMessage(message, type = "info") {
messageElement.style.display = "block";
messageElement.textContent = message;

messageElement.style.color =
type === "success" ? "#16d39a" :
type === "error" ? "#ff7070" : "#aab5c8";
}

function formatCVC(value) {
return Number(value || 0).toFixed(12);
}

function getErrorMessage(error) {
const code = error?.code ? " (Code: ${error.code})" : "";
return "${error?.message || String(error) || "Unknown error"}${code}";
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
showMessage("Loading Appwrite SDK...");

// Dynamic import allows us to display import errors on the page.
const Appwrite = await import(
  "https://cdn.jsdelivr.net/npm/appwrite@17.0.0/+esm"
);

const client = new Appwrite.Client()
  .setEndpoint("https://nyc.cloud.appwrite.io/v1")
  .setProject("69d1aaac0005506756e0");

account = new Appwrite.Account(client);
databases = new Appwrite.Databases(client);

showMessage("Checking your login session...");

currentUser = await account.get();

showMessage("Loading your Appwrite user profile...");

userProfile = await databases.getDocument(
  DATABASE_ID,
  USERS_COLLECTION_ID,
  currentUser.$id
);

if (userProfile.coinBalance === undefined ||
    userProfile.coinBalance === null) {
  throw new Error(
    "The coinBalance attribute is missing from your user document."
  );
}

availableBalance = Number(userProfile.coinBalance);

if (!Number.isFinite(availableBalance)) {
  throw new Error("Your coinBalance value is not a valid number.");
}

balanceElement.textContent =
  `${formatCVC(availableBalance)} CVC`;

networkInput.value = userProfile.walletNetwork || "";
addressInput.value = userProfile.walletAddress || "";

walletLoaded = true;

showMessage("Your wallet profile loaded successfully.", "success");

} catch (error) {
console.error("Withdrawal loading error:", error);

walletLoaded = false;
balanceElement.textContent = "Unable to load";

showMessage(
  "LOADING ERROR: " + getErrorMessage(error),
  "error"
);

}
}

// Save wallet information.
saveWalletBtn.addEventListener("click", async () => {
if (!walletLoaded) {
showMessage("Your profile has not loaded yet.", "error");
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

showMessage("Wallet details saved successfully.", "success");

} catch (error) {
console.error("Wallet save error:", error);
showMessage("SAVE ERROR: " + getErrorMessage(error), "error");

} finally {
saveWalletBtn.disabled = false;
}
});

// MAX balance.
maxBtn.addEventListener("click", () => {
if (!walletLoaded) {
showMessage("Please wait for your balance to load.", "error");
return;
}

amountInput.value = availableBalance;
});

// Submit withdrawal request.
withdrawBtn.addEventListener("click", async () => {
if (!walletLoaded) {
showMessage("Your profile has not loaded yet.", "error");
return;
}

try {
const wallet = validateWallet();
const amount = Number(amountInput.value);

if (!Number.isFinite(amount) || amount <= 0) {
  throw new Error("Enter a valid withdrawal amount.");
}

if (amount > availableBalance) {
  throw new Error("Your withdrawal exceeds your available balance.");
}

withdrawBtn.disabled = true;
saveWalletBtn.disabled = true;

showMessage("Submitting withdrawal request...");

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
  "REQUEST SAVED! Your withdrawal request is Pending.",
  "success"
);

if (SUCCESS_URL.trim()) {
  window.location.href = SUCCESS_URL;
}

} catch (error) {
console.error("Withdrawal submission error:", error);

showMessage(
  "WITHDRAWAL ERROR: " + getErrorMessage(error),
  "error"
);

} finally {
withdrawBtn.disabled = false;
saveWalletBtn.disabled = false;
}
});

// Start.
showMessage("Starting Crypto Vault...");
loadData();