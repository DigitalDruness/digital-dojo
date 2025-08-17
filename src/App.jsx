import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
// [MODIFIED] Added 'serverTimestamp' for the secure write operation
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, collection, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
// [REMOVED] No longer need the Cloud Functions library
// import { getFunctions, httpsCallable } from "firebase/functions";


// --- Global variables & Firebase Initialization ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : undefined;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// [REMOVED] No longer need to initialize functions
// const functions = getFunctions(app);


// --- Helius API & NFT Collections (unchanged) ---
const heliusApiKey = "6e2b3a8b-d410-46b1-9cc9-53d9dec76d02"; 
const heliusEndpoint = `https://rpc.helius.xyz/?api-key=${heliusApiKey}`;
const collectionMintAddresses = [ /* ... unchanged ... */ ];

// --- Utility Functions (unchanged) ---
const showMessage = (message) => { /* ... */ };
const formatTime = (ms) => { /* ... */ };
const truncatePublicKey = (key) => { /* ... */ };
const icons = { /* ... */ };


// --- Main App Component ---
export default function App() {
    // --- State Management (unchanged) ---
    const [publicKey, setPublicKey] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [tetoBalance, setTetoBalance] = useState(0);
    const [lastClaimTimestamp, setLastClaimTimestamp] = useState(null);
    const [nftCount, setNftCount] = useState(0);
    const [canClaim, setCanClaim] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [accumulatedRewards, setAccumulatedRewards] = useState(0);
    const [timeUntilNextHour, setTimeUntilNextHour] = useState(0);


    // --- Firebase Setup and Authentication (unchanged) ---
    useEffect(() => {
        // ... same as before
    }, []);

    // --- Timer and VISUAL Reward Accumulation (unchanged) ---
    // This hook's only job is to update the UI so the user sees rewards ticking up.
    useEffect(() => {
        // ... same as before
    }, [lastClaimTimestamp, nftCount]);

    // Leaderboard useEffect (unchanged)
    useEffect(() => { /* ... */ }, [isAuthReady]);

    // Helius API checkNFTCount function (unchanged)
    const checkNFTCount = async (ownerPublicKey) => { /* ... */ };

    // connectWallet function (unchanged) - it correctly saves the walletAddress
     const connectWallet = async () => {
        try {
            const { solana } = window;
            if (solana && solana.isPhantom) {
                const response = await solana.connect();
                const connectedPublicKey = response.publicKey;
                setPublicKey(connectedPublicKey);
                const count = await checkNFTCount(connectedPublicKey);
                const userId = auth.currentUser.uid;
                if (!userId) { showMessage("Authentication error."); return; }
                const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'tetoRewards', 'userData');
                await setDoc(userDocRef, { 
                    nftCount: count,
                    walletAddress: connectedPublicKey.toString()
                }, { merge: true });
                showMessage(`Wallet connected: ${truncatePublicKey(connectedPublicKey)}`);
            } else { showMessage('Phantom wallet not found!'); }
        } catch (error) { console.error('Failed to connect wallet:', error); }
    };

    // disconnectWallet function (unchanged)
    const disconnectWallet = async () => { /* ... */ };

    // --- [COMPLETELY REWRITTEN] Claim Function for Security Rules Method ---
    const claimAccruedReward = async () => {
        if (!canClaim || accumulatedRewards <= 0) return;

        // The client calculates the expected new balance.
        // The security rule on the server will verify this calculation is correct.
        const newBalance = tetoBalance + accumulatedRewards;
        const userId = auth.currentUser.uid;

        if (!userId) {
            showMessage("Authentication error. Please refresh.");
            return;
        }

        const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'tetoRewards', 'userData');
        const leaderboardDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', userId);

        try {
            // Attempt to update the user's document.
            // The security rule we wrote will automatically intercept and validate this request on the server.
            await updateDoc(userDocRef, {
                balance: newBalance,
                // We ask Firestore to use the true server's timestamp when writing.
                // The security rule will check for this.
                lastClaimTimestamp: serverTimestamp() 
            });

            // This second write updates the leaderboard.
            await setDoc(leaderboardDocRef, {
                balance: newBalance,
            }, { merge: true });

            showMessage(`Claimed ${accumulatedRewards} TETO!`);
            // Reset visual state immediately
            setAccumulatedRewards(0);
            setCanClaim(false);

        } catch (error) {
            console.error("Error claiming reward:", error);
            // If the user cheated, this error will most likely say "Permission Denied".
            showMessage("Claim failed. The server denied the request.");
        }
    };
    
    // --- Conditional Rendering & JSX (unchanged) ---
    // The visual part of the component doesn't need to change.
    const renderContent = () => {
        if (isLoading) { /* ... */ }
        if (!publicKey) { /* ... */ }
        return ( <div> {/* ... The rest of your JSX from the hourly update ... */} </div> );
    };

    return ( <div> {/* ... The main return wrapper with styles, etc. ... */} </div> );
}
