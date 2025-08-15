import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, collection } from 'firebase/firestore';

// --- Global variables provided by the Canvas environment ---
// These are necessary for Firebase to work.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : undefined;

// --- Helius API Configuration ---
// It's recommended to move sensitive keys to environment variables in a real-world scenario.
const heliusApiKey = "6e2b3a8b-d410-46b1-9cc9-53d9dec76d02";
const heliusEndpoint = `https://rpc.helius.xyz/?api-key=${heliusApiKey}`;

// --- NFT Collection Addresses to verify ---
const collectionMintAddresses = [
    '2m9DupVeheZ5vfuXZxqV3KSQ7HnVDk2tG6ouH1ZnLwYb',
    'DmRQEKrjRHrEVT8TNc7kWLjKbCv7RTn672LrgpnFagah',
    'FdpDYUWYC8PekGttXz9kPb48CxVjpiEm5NaBb3X6zExy',
    'HEyazxpV2wxMUvNx53UZUXthRS9Rjsbv7hoHYJNbVedC',
    'DoJoE6b8Lbb1t8qcdm4qDRXLS7RvadZo9Rfz8xq2VgLx'
];

// --- Utility Functions ---

/**
 * Displays a temporary message to the user.
 * @param {string} message - The message to display.
 */
const showMessage = (message) => {
    const messageBox = document.getElementById('messageBox');
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.style.display = 'block';
        setTimeout(() => {
            messageBox.style.display = 'none';
        }, 5000);
    }
};

/**
 * Formats milliseconds into a HH:MM:SS string.
 * @param {number} ms - The time in milliseconds.
 * @returns {string} The formatted time string.
 */
const formatTime = (ms) => {
    if (ms <= 0) return 'Ready to Claim!';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Truncates a Solana public key for display.
 * @param {string | object} key - The public key.
 * @returns {string} The truncated key.
 */
const truncatePublicKey = (key) => {
    if (!key) return '';
    const keyStr = key.toString();
    return `${keyStr.substring(0, 4)}...${keyStr.slice(-4)}`;
};

// --- SVG Icons ---
const icons = {
    Coins: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-yellow-400">
                <circle cx="8" cy="8" r="6" />
                <path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1.22a9 9 0 0 0 6.66 12.66" />
            </svg>`,
    Clock: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-red-400">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>`,
};

// --- Main App Component ---
export default function App() {
    // --- State Management ---
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
            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            const db = getFirestore(app);

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
                    // Set up a real-time listener for the user's data.
                    const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'tetoRewards', 'userData');
                    const userUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            setTetoBalance(data.balance || 0);
                            setLastClaimTimestamp(data.lastClaimTimestamp || null);
                            setNftCount(data.nftCount || 0);
                        } else {
                            // Create a new document for the user if it doesn't exist.
                            setDoc(userDocRef, {
                                balance: 0,
                                lastClaimTimestamp: null,
                                nftCount: 0,
                            }).catch(error => {
                                console.error("Error creating user document:", error);
                                showMessage("Error setting up user data.");
                            });
                        }
                        setIsLoading(false);
                    }, (error) => {
                         console.error("Error with user data snapshot:", error);
                         showMessage("Could not load user data.");
                         setIsLoading(false);
                    });
                    // Cleanup user listener on component unmount or user change
                    return () => userUnsubscribe();
                } else {
                    setIsAuthReady(true);
                    setIsLoading(false);
                }
            });

            handleAuth();
            
            // Cleanup auth listener on component unmount
            return () => authUnsubscribe();

        } catch (error) {
            console.error("Firebase initialization failed:", error);
            showMessage("Failed to initialize the app. Check console for details.");
            setIsLoading(false);
        }
    }, []);

    // --- Timer and Claim Availability Logic ---
    useEffect(() => {
        const updateClaimStatus = () => {
            const now = new Date();
            
            // **FIXED TIMEZONE LOGIC**
            // The daily reset is now based on UTC midnight (00:00 UTC).
            // This is equivalent to 7 PM CST (UTC-5) of the previous day.
            const lastResetUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
            
            // A user can claim if they have NFTs AND their last claim was before the last UTC reset.
            const canClaimNow = nftCount > 0 && (!lastClaimTimestamp || lastClaimTimestamp < lastResetUTC.getTime());
            setCanClaim(canClaimNow);
            
            // Calculate time until the next UTC midnight for the countdown display.
            const nextResetUTC = new Date(lastResetUTC.getTime());
            nextResetUTC.setUTCDate(nextResetUTC.getUTCDate() + 1);

            const timeUntilReset = nextResetUTC.getTime() - now.getTime();
            setTimeUntilNextClaim(timeUntilReset > 0 ? timeUntilReset : 0);
        };

        const timerInterval = setInterval(updateClaimStatus, 1000);
        updateClaimStatus(); // Run once immediately

        return () => clearInterval(timerInterval);
    }, [lastClaimTimestamp, nftCount]);

    // --- Leaderboard Data Fetching ---
    useEffect(() => {
        if (!isAuthReady) return;
        const db = getFirestore();
        const leaderboardColRef = collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard');

        const unsubscribe = onSnapshot(leaderboardColRef, (querySnapshot) => {
            const topHolders = [];
            querySnapshot.forEach((doc) => {
                // Store doc ID for a stable React key
                topHolders.push({ id: doc.id, ...doc.data() });
            });

            // Sort in-memory to avoid complex Firestore indexes and get top 5.
            topHolders.sort((a, b) => b.balance - a.balance);
            setLeaderboardData(topHolders.slice(0, 5));
        }, (error) => {
            console.error("Error fetching leaderboard data:", error);
            showMessage("Could not load leaderboard data.");
        });

        return () => unsubscribe(); // Cleanup the listener
    }, [isAuthReady]);

    // --- Helius API: Check NFT count ---
    const checkNFTCount = async (ownerPublicKey) => {
        try {
            const response = await fetch(heliusEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getAssetsByOwner',
                    params: { ownerAddress: ownerPublicKey.toString(), page: 1 },
                }),
            });

            const { result } = await response.json();
            if (!result || !result.items) return 0;
            
            // Filter assets to count only those from the specified collections.
            const verifiedNfts = result.items.filter(item => {
                const collectionKey = item.content?.grouping?.find(g => g.group_key === 'collection')?.group_value;
                return collectionKey && collectionMintAddresses.includes(collectionKey);
            });

            return verifiedNfts.length;
        } catch (error) {
            console.error('Error during Helius API verification:', error);
            showMessage('Error verifying NFT status. Check console for details.');
            return 0;
        }
    };

    // --- Wallet and Database Operations ---
    const connectWallet = async () => {
        try {
            const { solana } = window;
            if (solana && solana.isPhantom) {
                const response = await solana.connect();
                const connectedPublicKey = response.publicKey;
                setPublicKey(connectedPublicKey);

                // After connecting, check for NFTs and update Firestore.
                const count = await checkNFTCount(connectedPublicKey);
                const db = getFirestore();
                const auth = getAuth();
                const userId = auth.currentUser.uid;
                const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'tetoRewards', 'userData');
                await updateDoc(userDocRef, { nftCount: count });

                showMessage(`Wallet connected: ${truncatePublicKey(connectedPublicKey)}`);
            } else {
                showMessage('Phantom wallet not found! Please install Phantom.');
            }
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            showMessage('Failed to connect wallet. See console for details.');
        }
    };

    const disconnectWallet = async () => {
        const { solana } = window;
        if (solana && solana.isPhantom && solana.isConnected) {
            await solana.disconnect();
        }
        setPublicKey(null);
        // Reset local state, Firestore data will persist.
        setTetoBalance(0);
        setNftCount(0);
        setLastClaimTimestamp(null);
        showMessage('Wallet disconnected.');
    };

    const claimDailyReward = async () => {
        if (!isAuthReady || !publicKey || !canClaim) return;

        const db = getFirestore();
        const auth = getAuth();
        const userId = auth.currentUser.uid;
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

            // Update or create the user's public leaderboard entry.
            await setDoc(leaderboardDocRef, {
                walletAddress: publicKey.toString(),
                balance: newBalance,
            }, { merge: true });

            showMessage(`Claimed ${newReward} TETO! New balance: ${newBalance}`);
        } catch (error) {
            console.error("Error claiming reward:", error);
            showMessage("Failed to claim reward. Please try again.");
        }
    };

    // --- Conditional Rendering ---
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-red-500"></div>
                </div>
            );
        }

        if (!publicKey) {
            return (
                <div>
                    <div className="mb-6">
                        <h3 className="text-3xl font-bold text-red-900 mb-4 font-['Noto Sans JP']">
                            TRUE DEGENS WELCOME
                        </h3>
                        <p className="text-red-200 text-lg leading-relaxed">
                            Connect your Solana wallet to verify your holder status and begin your training. Earn <span className="text-red-900 font-bold">Teto</span> rewards every 24 hours and test your luck on the <span className="text-red-900 font-bold">Wheel</span>!
                        </p>
                    </div>
                    <div className="text-center mb-6">
                        <p className="mb-2 text-red-200 font-semibold flex items-center justify-center space-x-2">
                            <span className="text-red-900">⛩</span>
                            <span>Daily Teto Rewards</span>
                        </p>
                        <p className="mb-2 text-red-200 font-semibold flex items-center justify-center space-x-2">
                            <span className="text-red-900">⛩</span>
                            <span>Lottery Wheel Gambling</span>
                        </p>
                        <p className="mb-2 text-red-200 font-semibold flex items-center justify-center space-x-2">
                            <span className="text-red-900">⛩</span>
                            <span>Degen Duels</span>
                        </p>
                    </div>
                    <div className="relative">
                        <button onClick={connectWallet} className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-2 border-red-400 text-white font-bold py-4 px-8 text-lg rounded-xl transition-all duration-300 shadow-lg hover:shadow-red-500/50">
                            Connect Wallet
                        </button>
                        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-400 rounded-xl blur opacity-30 animate-pulse"></div>
                    </div>
                </div>
            );
        }

        return (
            <div>
                <header className="mb-8">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-bold text-red-900 font-['VT323']">TETO REWARDS</h2>
                        <div className="flex items-center space-x-4">
                            <button onClick={disconnectWallet} className="bg-gray-700 hover:bg-gray-800 text-red-900 font-bold py-2 px-4 rounded-xl transition-colors">
                                Disconnect
                            </button>
                            <span className="text-red-900 hidden sm:block">Connected: {truncatePublicKey(publicKey)}</span>
                        </div>
                    </div>
                </header>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-black/30 backdrop-blur-lg rounded-3xl p-8 border-2 border-red-500/50 shadow-2xl">
                            <h3 className="text-2xl font-bold text-red-900 mb-4 font-['VT323']">NFT Verification</h3>
                            <p className="text-red-200 font-['VT323']">
                                {nftCount > 0 ? `You are a true degen! (${nftCount} NFT${nftCount > 1 ? 's' : ''})` : 'Not Verified'}
                            </p>
                        </div>
                        <div className="bg-black/30 backdrop-blur-lg rounded-3xl p-8 border-2 border-red-500/50 shadow-2xl">
                            <h3 className="text-2xl font-bold text-red-900 mb-4 font-['VT323']">Teto Rewards</h3>
                            <div className="flex items-center space-x-2 mt-4">
                                <span dangerouslySetInnerHTML={{ __html: icons.Coins }} />
                                <span className="text-4xl font-bold text-red-900 font-['VT323']">{tetoBalance} TETO</span>
                            </div>
                            <div className="mt-4">
                                <div className="flex items-center justify-between text-red-200 font-['VT323']">
                                    <div className="flex items-center space-x-2">
                                        <span dangerouslySetInnerHTML={{ __html: icons.Clock }} />
                                        <span>Next Claim:</span>
                                    </div>
                                    <span className="text-xl font-bold">
                                        {nftCount > 0 ? formatTime(timeUntilNextClaim) : 'Not Verified'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={claimDailyReward}
                                className={`w-full mt-6 py-3 px-6 rounded-xl font-bold transition-all duration-300 font-['VT323'] ${
                                    canClaim
                                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/50'
                                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                                disabled={!canClaim}
                            >
                                Claim {nftCount * 10} TETO
                            </button>
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        <div className="bg-black/30 backdrop-blur-lg rounded-3xl p-8 border-2 border-red-500/50 shadow-2xl">
                            <h3 className="text-2xl font-bold text-red-900 mb-4 font-['VT323']">Lottery Wheel</h3>
                            <p className="text-red-200 font-['VT323']">
                                The wheel of fortune is not yet implemented.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-12 bg-black/30 backdrop-blur-lg rounded-3xl p-8 border-2 border-red-500/50 shadow-2xl">
                    <h3 className="text-2xl font-bold text-red-900 mb-6 font-['VT323'] text-center">Top Degens</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-red-200 font-['VT323']">
                            <thead>
                                <tr className="border-b border-red-500/50">
                                    <th className="py-2 px-4 text-center">Rank</th>
                                    <th className="py-2 px-4">Wallet</th>
                                    <th className="py-2 px-4 text-right">TETO Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboardData.length > 0 ? (
                                    leaderboardData.map((user, index) => (
                                        <tr key={user.id} className="border-b border-red-500/20">
                                            <td className="py-2 px-4 text-center text-red-400 font-bold">{index + 1}</td>
                                            <td className="py-2 px-4">{truncatePublicKey(user.walletAddress)}</td>
                                            <td className="py-2 px-4 text-right">{user.balance}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="py-4 text-center text-red-400">
                                            No leaderboard data available. Be the first to claim!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen relative overflow-hidden font-['VT323']">
            {/* Best practice is to load fonts in the main index.html <head> tag.
              Placing it here works but can be slightly less performant.
            */}
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=VT323&family=Noto+Sans+JP:wght@700&family=Zen+Antique&display=swap');
                    body {
                        font-family: 'VT323', monospace;
                        background-color: #1f2937;
                    }
                    .message-box {
                        position: fixed;
                        bottom: 1rem;
                        right: 1rem;
                        z-index: 1000;
                        background-color: #333;
                        color: white;
                        padding: 1rem;
                        border-radius: 0.5rem;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        display: none;
                        transition: opacity 0.3s ease-in-out;
                    }
                `}
            </style>
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('https://placehold.co/1920x1080/1a202c/ffffff?text=Dojo+Background')", filter: 'brightness(0.4)' }}>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>
            <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
                <div className="w-full max-w-4xl">
                    <div id="app-container" className="bg-black/30 backdrop-blur-lg rounded-3xl p-6 sm:p-10 border-2 border-red-500/50 shadow-2xl">
                        {renderContent()}
                    </div>
                </div>
            </div>
            <div id="messageBox" className="message-box"></div>
        </div>
    );
}
