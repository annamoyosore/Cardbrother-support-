import {
    Client,
    Account,
    Databases,
    ID,
    Permission,
    Role
} from "https://cdn.jsdelivr.net/npm/appwrite@17.0.0/+esm";

// ===================================
// APPWRITE CONFIGURATION
// ===================================

const ENDPOINT = "https://nyc.cloud.appwrite.io/v1";

const PROJECT_ID = "69d1aaac0005506756e0";

const DATABASE_ID = "69d1aaf5000f43c786be";

const COLLECTION_ID = "6af03bb90002e65a0035";

// ===================================
// INITIALIZE APPWRITE
// ===================================

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

export const account = new Account(client);

export const databases = new Databases(client);

// ===================================
// REGISTER USER
// ===================================

export async function registerUser(name, email, password) {

    const user = await account.create(
        ID.unique(),
        email,
        password,
        name
    );

    await loginUser(email, password);

    return user;
}

// ===================================
// LOGIN USER
// ===================================

export async function loginUser(email, password) {

    return await account.createEmailPasswordSession(
        email,
        password
    );

}

// ===================================
// GET CURRENT USER
// ===================================

export async function getCurrentUser() {

    try {

        return await account.get();

    } catch (error) {

        return null;

    }

}

// ===================================
// LOGOUT
// ===================================

export async function logoutUser() {

    await account.deleteSession("current");

}

// ===================================
// GET USER PROFILE
// ===================================

export async function getUserProfile(userId) {

    try {

        return await databases.getDocument(
            DATABASE_ID,
            COLLECTION_ID,
            userId
        );

    } catch (error) {

        if (error.code === 404) {
            return null;
        }

        throw error;

    }

}

// ===================================
// SAVE USER PROFILE
// ===================================

export async function saveUserProfile(user, profileData) {

    const existing = await getUserProfile(user.$id);

    const data = {

        userId: user.$id,

        displayName: profileData.displayName,

        email: user.email,

        country: profileData.country,

        verificationMethod: profileData.verificationMethod,

        walletUsageMonths: Number(profileData.walletUsageMonths),

        selectedWallet: profileData.selectedWallet || "",

        verificationStatus: profileData.verificationStatus || "in_progress"

    };

    if (existing) {

        return await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_ID,
            user.$id,
            data
        );

    }

    return await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        user.$id,
        data,
        [
            Permission.read(Role.user(user.$id)),
            Permission.update(Role.user(user.$id))
        ]
    );

}