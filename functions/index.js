const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nacl = require("tweetnacl");
const bs58 = require("bs58");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

const WHITELISTED_COLLECTIONS = new Set([
  "2m9DupVeheZ5vfuXZxqV3KSQ7HnVDk2tG6ouH1ZnLwYb",
  "DmRQEKrjRHrEVT8TNc7kWLjKbCv7RTn672LrgpnFagah",
  "dgd6We3oS4M5LSVzT6Ep39wwVpjLC336tCpyPZkLAHx",
  "FdpDYUWYC8PekGttXz9kPb48CxVjpiEm5NaBb3X6zExy",
  "HEyazxpV2wxMUvNx53UZUXthRS9Rjsbv7hoHYJNbVedC",
  "DoJoE6b8Lbb1t8qcdm4qDRXLS7RvadZo9Rfz8xq2VgLx",
]);
const SPIN_COST = 10;

const checkNftCountOnChain = async (ownerAddress) => {
  if (!ownerAddress) return 0;
  const heliusApiKey = functions.config().helius.apikey;
  if (!heliusApiKey) {
    console.error("Helius API key is not configured.");
    return 0;
  }
  const HELIUS_API_URL = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
  try {
    const response = await fetch(HELIUS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "digital-dojo-check",
        method: "getAssetsByOwner",
        params: { ownerAddress, page: 1, limit: 1000 },
      }),
    });
    if (!response.ok) throw new Error(`Helius API request failed: ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error(`Helius API error: ${data.error.message}`);
    const assets = data.result.items;
    let verifiedNftCount = 0;
    for (const asset of assets) {
      let collectionAddress = null;
      if (asset.grouping && Array.isArray(asset.grouping) && asset.grouping.length > 0) {
        const collectionInfo = asset.grouping.find(g => g.group_key === "collection");
        if (collectionInfo) collectionAddress = collectionInfo.group_value;
      }
      if (!collectionAddress && asset.content && asset.content.links && asset.content.links.collection) {
        collectionAddress = asset.content.links.collection;
      }
      if (collectionAddress && WHITELISTED_COLLECTIONS.has(collectionAddress)) {
        verifiedNftCount++;
      }
    }
    return verifiedNftCount;
  } catch (error) {
    console.error(`Failed to check NFT count for ${ownerAddress}:`, error);
    return 0;
  }
};

exports.getDynamicConfig = functions.https.onCall((data, context) => {
  try {
    const envId = functions.config().dynamic.envid;
    if (!envId) {
      console.error("CRITICAL ERROR: DYNAMIC_ENVID is not set in the server environment.");
      throw new functions.https.HttpsError(
        "failed-precondition",
        "The Dynamic environment ID is not configured on the server."
      );
    }
    console.log("getDynamicConfig: Successfully retrieved envId:", envId);
    return {
      environmentId: envId,
    };
  } catch (error) {
    console.error("getDynamicConfig: Error:", error.message, error.stack);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", "Failed to retrieve Dynamic configuration.");
  }
});

exports.getAuthChallenge = functions.https.onCall(async (data, context) => {
  const { publicKey } = data;
  if (!publicKey) {
    throw new functions.https.HttpsError("invalid-argument", "Public key is required.");
  }
  const nonce = Math.random().toString(36).substring(2);
  const issuedAt = new Date().toISOString();
  const message = `www.digital-dojo.xyz wants you to sign in with your Solana account:\n${publicKey}\n\nURI: https://www.digital-dojo.xyz\nVersion: 1\nChain ID: 1\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
  const challengeRef = db.collection("challenges").doc(publicKey);
  await challengeRef.set({ message, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  return { message };
});

exports.verifyAuthSignature = functions.https.onCall(async (data, context) => {
  const { publicKey, signature } = data;
  if (!publicKey || !signature) {
    throw new functions.https.HttpsError("invalid-argument", "Public key and signature are required.");
  }
  const challengeRef = db.collection("challenges").doc(publicKey);
  const challengeDoc = await challengeRef.get();
  if (!challengeDoc.exists) {
    throw new functions.https.HttpsError("not-found", "No challenge found or it has expired. Please try again.");
  }
  try {
    const { message } = challengeDoc.data();
    const messageBytes = new TextEncoder().encode(message);
    const publicKeyBytes = bs58.decode(publicKey);
    const signatureBytes = bs58.decode(signature);
    const isVerified = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    if (!isVerified) {
      throw new Error("Signature verification failed.");
    }
    await challengeRef.delete();
    const customToken = await admin.auth().createCustomToken(publicKey);
    return { token: customToken };
  } catch (error) {
    await challengeRef.delete();
    console.error("Verification error:", error);
    throw new functions.https.HttpsError("unauthenticated", "Signature verification failed. Please try again.");
  }
});

exports.updateUserWallet = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }
  const uid = context.auth.uid;
  const userDocRef = db.collection("users").doc(uid);
  const nftCount = await checkNftCountOnChain(uid);
  const now = new Date();
  const startOfPreviousHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - 1);
  await userDocRef.set({
    walletAddress: uid,
    nftCount: nftCount,
    lastClaimTimestamp: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return { success: true, nftCount: nftCount };
});

exports.claimRewards = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }
  const uid = context.auth.uid;
  const userDocRef = db.collection("users").doc(uid);
  return db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userDocRef);
    if (!userDoc.exists) {
      const nftCount = await checkNftCountOnChain(uid);
      const now = new Date();
      const startOfPreviousHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - 1);
      transaction.set(userDocRef, {
        walletAddress: uid,
        nftCount,
        tetoBalance: 0,
        lastClaimTimestamp: admin.firestore.Timestamp.fromDate(startOfPreviousHour),
      });
      throw new functions.https.HttpsError("aborted", "User profile created. Please try claiming again.");
    }
    const { lastClaimTimestamp, tetoBalance = 0 } = userDoc.data();
    const now = new Date();
    const startOfCurrentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const hoursToClaim = Math.floor((startOfCurrentHour.getTime() - lastClaimTimestamp.toMillis()) / 3600000);
    if (hoursToClaim < 1) {
      throw new functions.https.HttpsError("failed-precondition", "Next claim not available yet.");
    }
    const currentNftCount = await checkNftCountOnChain(uid);
    if (currentNftCount !== userDoc.data().nftCount) {
      transaction.update(userDocRef, { nftCount: currentNftCount });
    }
    if (currentNftCount <= 0) {
      transaction.update(userDocRef, { lastClaimTimestamp: startOfCurrentHour });
      return 0;
    }
    const totalRewards = hoursToClaim * currentNftCount * 10;
    if (totalRewards <= 0) return 0;
    transaction.update(userDocRef, {
      tetoBalance: tetoBalance + totalRewards,
      lastClaimTimestamp: startOfCurrentHour,
    });
    return totalRewards;
  }).then(amountClaimed => {
    if (amountClaimed > 0) return { success: true, amountClaimed };
    throw new functions.https.HttpsError("failed-precondition", "You must hold an NFT to claim rewards.");
  }).catch(error => {
    console.error("Error in claimRewards:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", "An error occurred during the claim process.");
  });
});

exports.spinTheWheel = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in to spin.");
  }
  const uid = context.auth.uid;
  const userDocRef = db.collection("users").doc(uid);
  return db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userDocRef);
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User data not found.");
    }
    const currentBalance = userDoc.data().tetoBalance || 0;
    if (currentBalance < SPIN_COST) {
      throw new functions.https.HttpsError("failed-precondition", "Not enough TETO to spin.");
    }
    const segments = [
      { prize: 20, segmentIndex: 0 },
      { prize: 0, segmentIndex: 1 },
      { prize: 30, segmentIndex: 2 },
      { prize: 0, segmentIndex: 3 },
      { prize: 20, segmentIndex: 4 },
      { prize: 0, segmentIndex: 5 },
    ];
    const randomNumber = Math.random();
    let result;
    if (randomNumber < 0.60) {
      const loseOptions = segments.filter(s => s.prize === 0);
      result = loseOptions[Math.floor(Math.random() * loseOptions.length)];
    } else if (randomNumber < 0.90) {
      const win2xOptions = segments.filter(s => s.prize === 20);
      result = win2xOptions[Math.floor(Math.random() * win2xOptions.length)];
    } else {
      result = segments.find(s => s.prize === 30);
    }
    transaction.update(userDocRef, { tetoBalance: currentBalance - SPIN_COST + result.prize });
    return { success: true, prizeSegment: result.segmentIndex, prize: result.prize };
  }).catch(error => {
    console.error("Error in spinTheWheel:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", "An error occurred during the spin.");
  });
});
