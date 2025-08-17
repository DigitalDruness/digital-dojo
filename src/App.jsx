import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, collection, query, orderBy, limit } from 'firebase/firestore';

// --- Global variables provided by the Canvas environment ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : undefined;

// --- IMPROVEMENT: Firebase Initialization (Done once outside the component) ---
// This prevents re-initialization on re-renders and makes instances easily accessible.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helius API Configuration ---
// IMPROVEMENT: In a real app, use environment variables (e.g., process.env.REACT_APP_HELIUS_API_KEY).
const heliusApiKey = "YOUR_HELIUS_API_KEY"; // Replaced for security
const heliusEndpoint = `https://rpc.helius.xyz/?api-key=${heliusApiKey}`;

// --- NFT Collection Addresses ---
const collectionMintAddresses = [
    '2m9DupVeheZ5vfuXZxqV3KSQ7HnVDk2tG6ouH1ZnLwYb',
    'DmRQEKrjRHrEVT8TNc7kWLjKbCv7RTn672LrgpnFagah',
    'FdpDYUWYC8PekGttXz9kPb48CxVjpiEm5NaBb3X6zExy',
    'HEyazxpV2wxMUvNx53UZUXthRS9Rjsbv7hoHYJNbVedC',
    'DoJoE6b8Lbb1t8qcdm4qDRXLS7RvadZo9Rfz8xq2VgLx'
];

// --- Utility Functions (unchanged, they are good) ---
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
    const [timeUntilNextClaim, setTimeUntilNextClaim] = useState(0);
    const [canClaim, setCanClaim] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [leaderboardData, setLeaderboardData] = useState([]);

    // --- Firebase Setup and Authentication ---
    useEffect(() => {
        try {
            const handleAuth = async () => {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            };

            const authUnsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    setIsAuthReady(true);
                    const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'tetoRewards', 'userData');
                    
                    const userUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            setTetoBalance(data.balance || 0);
                            setLastClaimTimestamp(data.lastClaimTimestamp || null);
                            setNftCount(data.nftCount || 0);
                        } else {
                            setDoc(userDocRef, { balance: 0, lastClaimTimestamp: null, nftCount: 0 })
                                .catch(error => console.error("Error creating user document:", error));
                        }
                        setIsLoading(false);
                    }, (error) => {
                        console.error("Error with user data snapshot:", error);
                        setIsLoading(false);
                    });
                    
                    return () => userUnsubscribe();
                } else {
                    // User is signed out or auth is not yet ready.
                    setIsAuthReady(true);
                    setIsLoading(false);
                }
            });

            handleAuth();
            return () => authUnsubscribe();

        } catch (error) {
            console.error("Firebase setup failed:", error);
            setIsLoading(false);
        }
    }, []);

    // --- Timer and Claim Availability Logic (unchanged, logic is sound) ---
    useEffect(() => {
        const updateClaimStatus = () => {
            const now = new Date();
            const lastResetUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
            const canClaimNow = nftCount > 0 && (!lastClaimTimestamp || lastClaimTimestamp < lastResetUTC.getTime());
            setCanClaim(canClaimNow);
            
            const nextResetUTC = new Date(lastResetUTC.getTime());
            nextResetUTC.setUTCDate(nextResetUTC.getUTCDate() + 1);
            const timeUntilReset = nextResetUTC.getTime() - now.getTime();
            setTimeUntilNextClaim(timeUntilReset > 0 ? timeUntilReset : 0);
        };

        const timerInterval = setInterval(updateClaimStatus, 1000);
        updateClaimStatus();
        return () => clearInterval(timerInterval);
    }, [lastClaimTimestamp, nftCount]);

    // --- Leaderboard Data Fetching ---
    useEffect(() => {
        if (!isAuthReady) return;

        // --- IMPROVEMENT: Use a Firestore query for efficiency ---
        const leaderboardColRef = collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard');
        const q = query(leaderboardColRef, orderBy('balance', 'desc'), limit(5));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const topHolders = [];
            querySnapshot.forEach((doc) => {
                topHolders.push({ id: doc.id, ...doc.data() });
            });
            setLeaderboardData(topHolders);
        }, (error) => {
            console.error("Error fetching leaderboard data:", error);
        });

        return () => unsubscribe();
    }, [isAuthReady]);

    // --- Helius API: Check NFT count (unchanged) ---
    const checkNFTCount = async (ownerPublicKey) => { /* ... */ };

    // --- Wallet and Database Operations ---
    const connectWallet = async () => {
        try {
            const { solana } = window;
            if (solana && solana.isPhantom) {
                const response = await solana.connect();
                const connectedPublicKey = response.publicKey;
                setPublicKey(connectedPublicKey);

                const count = await checkNFTCount(connectedPublicKey);
                
                // FIX: Use the globally defined `auth` and `db` instances
                const userId = auth.currentUser.uid;
                if (!userId) {
                    showMessage("Authentication error. Please refresh.");
                    return;
                }
                const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'tetoRewards', 'userData');
                await updateDoc(userDocRef, { nftCount: count });

                showMessage(`Wallet connected: ${truncatePublicKey(connectedPublicKey)}`);
            } else {
                showMessage('Phantom wallet not found!');
            }
        } catch (error) {
            console.error('Failed to connect wallet:', error);
        }
    };

    const disconnectWallet = async () => {
        const { solana } = window;
        if (solana && solana.isPhantom && solana.isConnected) {
            await solana.disconnect();
        }
        
        // FIX: Only reset the public key. The other data is still valid for the
        // authenticated user and will be shown again upon reconnection.
        // This prevents the UI from flickering to 0.
        setPublicKey(null);
        showMessage('Wallet disconnected.');
    };

    const claimDailyReward = async () => {
        if (!isAuthReady || !publicKey || !canClaim) return;
        
        // FIX: Use the globally defined `auth` and `db` instances
        const userId = auth.currentUser.uid;
        if (!userId) {
            showMessage("Authentication error. Please refresh.");
            return;
        }

        const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'tetoRewards', 'userData');
        const leaderboardDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', userId);

        try {
            const newReward = nftCount * 10;
            const newBalance = tetoBalance + newReward;
            const now = Date.now();

            await updateDoc(userDocRef, {
                balance: newBalance,
                lastClaimTimestamp: now,
            });

            await setDoc(leaderboardDocRef, {
                walletAddress: publicKey.toString(),
                balance: newBalance,
            }, { merge: true });

            showMessage(`Claimed ${newReward} TETO! New balance: ${newBalance}`);
        } catch (error) {
            console.error("Error claiming reward:", error);
        }
    };
    
    // --- Conditional Rendering & JSX (unchanged) ---
    const renderContent = () => { /* ... */ };
    return ( /* ... */ );
}
