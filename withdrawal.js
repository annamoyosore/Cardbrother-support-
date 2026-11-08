import {
account,
databases,
getCurrentUser,
getUserProfile
} from "./appwrite.js";

const DATABASE_ID = "69d1aaf5000f43c786be";
const COLLECTION_ID = "6af03bb90002e65a0035";

const SUCCESS_URL = "";

const networkInput = document.getElementById("walletNetwork");
const addressInput = document.getElementById("walletAddress");
const amountInput = document.getElementById("withdrawalAmount");
const saveWalletBtn = document.getElementById("saveWalletBtn");
const withdrawBtn = document.getElementById("withdrawBtn");
const messageElement = document.getElementById("message");

let currentUser = null;
let userProfile = null;
let walletLoaded = false;

function showMessage(message, type = "info") {
messageElement.style.display = "block";
messageElement.textContent = message;

messageElement.style.color =
type === "success" ? "#16d39a" :
type === "error" ? "#ff7070" :
"#aab5c8";
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
throw new Error("Invalid wallet address.");
}

return { network, address };
}

// LOAD USER PROFILE AND SAVED WALLET DETAILS
async function loadData() {
try {
showMessage("Loading your withdrawal profile...");

currentUser = await getCurrentUser();

if (!currentUser) {
  throw new Error("Please log in again.");
}

userProfile = await getUserProfile(currentUser.$id);

if (!userProfile) {
  throw new Error("Your user profile was not found.");
}

networkInput.value = userProfile.walletNetwork || "";
addressInput.value = userProfile.walletAddress || "";

walletLoaded = true;

showMessage("Withdrawal profile loaded successfully.", "success");

} catch (error) {
console.error("Profile loading error:", error);

walletLoaded = false;

showMessage(
  "FAILED TO LOAD: " + getErrorMessage(error),
  "error"
);

}
}

// SAVE WALLET DETAILS
saveWalletBtn.addEventListener("click", async () => {
if (!walletLoaded) {
showMessage("Your profile has not loaded.", "error");
return;
}

try {
const wallet = validateWallet();

saveWalletBtn.disabled = true;
showMessage("Saving wallet details...");

await databases.updateDocument(
  DATABASE_ID,
  COLLECTION_ID,
  currentUser.$id,
  {
    walletAddress: wallet.address,
    walletNetwork: wallet.network
  }
);

showMessage("Wallet details saved successfully.", "success");

} catch (error) {
console.error("Wallet save error:", error);

showMessage(
  "SAVE ERROR: " + getErrorMessage(error),
  "error"
);

} finally {
saveWalletBtn.disabled = false;
}
});

// SUBMIT WITHDRAWAL REQUEST
withdrawBtn.addEventListener("click", async () => {
if (!walletLoaded) {
showMessage("Your profile has not loaded.", "error");
return;
}

try {
const wallet = validateWallet();
const amount = Number(amountInput.value);

if (!Number.isFinite(amount) || amount <= 0) {
  throw new Error("Enter a valid withdrawal amount.");
}

withdrawBtn.disabled = true;
saveWalletBtn.disabled = true;

showMessage("Submitting withdrawal request...");

await databases.updateDocument(
  DATABASE_ID,
  COLLECTION_ID,
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

if (SUCCESS_URL.trim() !== "") {
  window.location.href = SUCCESS_URL;
}

} catch (error) {
console.error("Withdrawal error:", error);

showMessage(
  "WITHDRAWAL ERROR: " + getErrorMessage(error),
  "error"
);

} finally {
withdrawBtn.disabled = false;
saveWalletBtn.disabled = false;
}
});

// START
showMessage("Starting withdrawal page...");
loadData();