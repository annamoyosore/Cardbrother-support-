import {
    databases,
    getCurrentUser,
    getUserProfile
} from "./appwrite.js";

const DATABASE_ID = "69d1aaf5000f43c786be";
const COLLECTION_ID = "6af03bb90002e65a0035";

// ADD YOUR VERIFICATION URL LATER
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


// FORMAT BALANCE
function formatBalance(value) {
    return Number(value).toFixed(12);
}


// SHOW MESSAGE
function showMessage(text, type = "info") {
    message.textContent = text;
    message.className = "message " + type;
}


// VALIDATE WALLET
function isValidWallet(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}


// LOAD USER AND BALANCE
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

        // GET THE ACTUAL APPWRITE CVC BALANCE
        availableBalance = Number(currentProfile.coinBalance || 0);

        if (!Number.isFinite(availableBalance)) {
            throw new Error("Unable to read your CVC balance.");
        }

        // DISPLAY BALANCE
        balanceDisplay.textContent =
            formatBalance(availableBalance) + " CVC";

        // LOAD SAVED WALLET DETAILS
        walletInput.value = currentProfile.walletAddress || "";
        networkInput.value = currentProfile.walletNetwork || "";

        // ENABLE MAX BUTTON
        maxBtn.disabled = false;

        showMessage(
            "Account loaded successfully. Your full CVC balance is available for selection.",
            "success"
        );

    } catch (error) {

        console.error("Withdrawal loading error:", error);

        balanceDisplay.textContent = "Unavailable";

        showMessage(error.message, "error");

        maxBtn.disabled = true;
        submitBtn.disabled = true;
    }
}


// MAX BUTTON
// SELECTS THE ENTIRE AVAILABLE BALANCE
maxBtn.onclick = function(event) {

    event.preventDefault();

    if (!currentProfile) {
        showMessage("Your balance has not loaded yet.", "error");
        return;
    }

    const totalBalance = Number(currentProfile.coinBalance || 0);

    if (!Number.isFinite(totalBalance) || totalBalance <= 0) {
        showMessage("Your available CVC balance is zero.", "error");
        return;
    }

    availableBalance = totalBalance;

    // FILL THE INPUT WITH THE FULL BALANCE
    amountInput.value = String(totalBalance);

    amountInput.dispatchEvent(
        new Event("input", { bubbles: true })
    );

    amountInput.dispatchEvent(
        new Event("change", { bubbles: true })
    );

    showMessage(
        "MAX selected: Your full balance of " +
        formatBalance(totalBalance) + " CVC.",
        "success"
    );
};


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
        showMessage("Please select a withdrawal network.", "error");
        return;
    }

    if (!isValidWallet(walletAddress)) {
        showMessage(
            "Please enter a valid 0x wallet address.",
            "error"
        );
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        showMessage("Enter a valid withdrawal amount.", "error");
        return;
    }

    if (amount > availableBalance) {
        showMessage(
            "Your withdrawal amount exceeds your available balance.",
            "error"
        );
        return;
    }

    // SAVE DETAILS TEMPORARILY FOR CONFIRMATION
    pendingRequest = {
        network: network,
        walletAddress: walletAddress,
        amount: amount
    };

    // SHOW CONFIRMATION POPUP
    confirmNetwork.textContent = network;
    confirmAddress.textContent = walletAddress;
    confirmAmount.textContent = formatBalance(amount);

    modalMessage.textContent = "";

    verifyBtn.disabled = false;
    verifyBtn.textContent = "VERIFY ADDRESS";

    modal.style.display = "flex";

});


// CANCEL POPUP
cancelBtn.addEventListener("click", function() {

    modal.style.display = "none";

    pendingRequest = null;

});


// VERIFY AND SAVE WITHDRAWAL REQUEST
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

        // REDIRECT IF URL HAS BEEN ADDED
        if (VERIFY_URL.trim() !== "") {

            window.location.href = VERIFY_URL;

            return;
        }

        // URL NOT ADDED YET
        modalMessage.textContent =
            "Your withdrawal request has been saved successfully as Pending. Verification URL has not yet been configured.";

        verifyBtn.textContent = "REQUEST SAVED";

    } catch (error) {

        console.error("Withdrawal submission error:", error);

        modalMessage.textContent =
            "Withdrawal failed: " + error.message;

        verifyBtn.disabled = false;
        verifyBtn.textContent = "VERIFY ADDRESS";

    }

});


// LOAD PAGE
maxBtn.disabled = true;

loadWithdrawalPage();