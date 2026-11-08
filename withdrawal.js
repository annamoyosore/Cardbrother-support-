import {
    databases,
    getCurrentUser,
    getUserProfile
} from "./appwrite.js";

const DATABASE_ID = "69d1aaf5000f43c786be";
const COLLECTION_ID = "6af03bb90002e65a0035";

/*
ADD YOUR VERIFICATION URL HERE LATER.
Example:
const VERIFY_URL = "https://your-verification-site.com";
*/

const VERIFY_URL = "";

const balanceDisplay = document.getElementById("balance");
const form = document.getElementById("withdrawalForm");
const networkInput = document.getElementById("network");
const walletInput = document.getElementById("walletAddress");
const amountInput = document.getElementById("amount");
const maxBtn = document.getElementById("maxBtn");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");

const modal = document.getElementById("confirmModal");
const confirmNetwork = document.getElementById("confirmNetwork");
const confirmAddress = document.getElementById("confirmAddress");
const confirmAmount = document.getElementById("confirmAmount");
const verifyBtn = document.getElementById("verifyBtn");
const cancelBtn = document.getElementById("cancelBtn");
const modalMessage = document.getElementById("modalMessage");

let currentUser = null;
let currentProfile = null;
let availableBalance = 0;
let pendingRequest = null;


// DISPLAY MESSAGE
function showMessage(text, type = "info") {
    message.textContent = text;
    message.className = "message " + type;
}


// VALIDATE EVM WALLET ADDRESS
function isValidWallet(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}


// LOAD ACCOUNT AND BALANCE
async function loadWithdrawalPage() {

    try {

        currentUser = await getCurrentUser();

        if (!currentUser) {
            window.location.href = "./index.html";
            return;
        }

        currentProfile = await getUserProfile(currentUser.$id);

        if (!currentProfile) {
            throw new Error("Your user profile could not be found.");
        }

        availableBalance = Number(currentProfile.coinBalance || 0);

        balanceDisplay.textContent =
            availableBalance.toFixed(12) + " CVC";

        walletInput.value = currentProfile.walletAddress || "";
        networkInput.value = currentProfile.walletNetwork || "";

        showMessage(
            "Your account is ready. Enter your withdrawal details.",
            "success"
        );

    } catch (error) {

        console.error("Account loading error:", error);

        balanceDisplay.textContent = "Unavailable";

        showMessage(error.message, "error");

        submitBtn.disabled = true;
        maxBtn.disabled = true;
    }
}


// MAX BUTTON
maxBtn.addEventListener("click", function() {

    if (availableBalance <= 0) {
        showMessage("Your available balance is zero.", "error");
        return;
    }

    amountInput.value = availableBalance;

});


// SUBMIT WITHDRAWAL
form.addEventListener("submit", function(event) {

    event.preventDefault();

    if (!currentUser || !currentProfile) {
        showMessage("Your account is not ready.", "error");
        return;
    }

    const network = networkInput.value;
    const walletAddress = walletInput.value.trim();
    const amount = Number(amountInput.value);

    if (!network) {
        showMessage("Please select a network.", "error");
        return;
    }

    if (!isValidWallet(walletAddress)) {
        showMessage("Please enter a valid 0x wallet address.", "error");
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        showMessage("Enter a valid withdrawal amount.", "error");
        return;
    }

    if (amount > availableBalance) {
        showMessage("Your withdrawal amount exceeds your available balance.", "error");
        return;
    }

    // KEEP REQUEST DETAILS FOR CONFIRMATION
    pendingRequest = {
        network,
        walletAddress,
        amount
    };

    // DISPLAY CONFIRMATION POPUP
    confirmNetwork.textContent = network;
    confirmAddress.textContent = walletAddress;
    confirmAmount.textContent = amount.toFixed(12);

    modalMessage.textContent = "";

    modal.style.display = "flex";

});


// CANCEL CONFIRMATION
cancelBtn.addEventListener("click", function() {

    modal.style.display = "none";

});


// VERIFY ADDRESS AND SAVE REQUEST
verifyBtn.addEventListener("click", async function() {

    if (!pendingRequest) {
        modalMessage.textContent = "No withdrawal request found.";
        return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = "PROCESSING...";

    try {

        // SAVE REQUEST TO EXISTING USERS COLLECTION
        await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_ID,
            currentUser.$id,
            {
                walletAddress: pendingRequest.walletAddress,
                walletNetwork: pendingRequest.network,
                withdrawalAmount: pendingRequest.amount,
                withdrawalStatus: "Pending",
                withdrawalRequestedAt: new Date().toISOString()
            }
        );

        // CHECK WHETHER VERIFICATION URL HAS BEEN ADDED
        if (!VERIFY_URL) {

            modalMessage.textContent =
                "Your withdrawal request has been saved as Pending. The verification URL has not been configured yet.";

            verifyBtn.textContent = "REQUEST SAVED";
            verifyBtn.disabled = true;

            return;
        }

        // REDIRECT TO VERIFICATION PAGE
        window.location.href = VERIFY_URL;

    } catch (error) {

        console.error("Withdrawal error:", error);

        modalMessage.textContent =
            "Unable to submit request: " + error.message;

        verifyBtn.disabled = false;
        verifyBtn.textContent = "VERIFY ADDRESS";
    }

});


// START
loadWithdrawalPage();