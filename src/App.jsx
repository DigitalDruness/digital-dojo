import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';

// --- Global variables provided by the Canvas environment ---
// These are necessary for Firebase to work.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : undefined;

// --- Helius API Configuration ---
// Your Helius API key and the collection mint addresses
const heliusApiKey = "6e2b3a8b-d410-46b1-9cc9-53d9dec76d02";
const heliusEndpoint = `https://rpc.helius.xyz/?api-key=${heliusApiKey}`;

const collectionMintAddresses = [
  '2m9DupVeheZ5vfuXZxqV3KSQ7HnVDk2tG6ouH1ZnLwYb',
  'DmRQEKrjRHrEVT8TNc7kWLjKbCv7RTn672LrgpnFagah',
  'FdpDYUWYC8PekGttXz9kPb48CxVjpiEm5NaBb3X6zExy',
  'HEyazxpV2wxMUvNx53UZUXthRS9Rjsbv7hoHYJNbVedC',
  'DoJoE6b8Lbb1t8qcdm4qDRXLS7RvadZo9Rfz8xq2VgLx'
];

// --- Utility Functions ---

// Simple message box for user feedback
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

// Formats time into a readable string
const formatTime = (ms) => {
  if (ms <= 0) return 'Ready to Claim!';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Truncates a public key for display
const truncatePublicKey = (key) => {
  if (!key) return '';
  const keyStr = key.toString();
  return `${keyStr.substring(0, 4)}...${keyStr.slice(-4)}`;
};

// Placeholder Icons as inline SVG strings
const icons = {
  Coins: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-yellow-400">
            <circle cx="8" cy="8" r="6" />
            <path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1.22a9 9 0 0 0 6.66 12.66" />
          </svg>`,
  Clock: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-red-400">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>`,
  Trophy: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-yellow-400">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4.5 15.5H19.5" />
            <path d="M12 17.5v3" />
            <path d="M19.5 9h-15V4a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1z" />
            <path d="M12 17.5a2.5 2.5 0 0 1-2.5-2.5v-10h5v10a2.5 2.5 0 0 1-2.5 2.5z" />
          </svg>`,
};

// Main App Component
export default function App() {
  const [wallet, setWallet] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [tetoBalance, setTetoBalance] = useState(0);
  const [lastClaimTimestamp, setLastClaimTimestamp] = useState(null);
  const [nftCount, setNftCount] = useState(0);
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

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
      
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          setIsAuthReady(true);
          // Set up real-time listener for user data once authenticated
          const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'tetoRewards', 'userData');
          onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setTetoBalance(data.balance || 0);
              setLastClaimTimestamp(data.lastClaimTimestamp || null);
              setNftCount(data.nftCount || 0);
              setIsLoading(false);
            } else {
              // Create a new document for the user if it doesn't exist
              setDoc(userDocRef, {
                balance: 0,
                lastClaimTimestamp: null,
                nftCount: 0,
              }).then(() => {
                setTetoBalance(0);
                setLastClaimTimestamp(null);
                setNftCount(0);
                setIsLoading(false);
              }).catch(error => {
                console.error("Error creating user document:", error);
                showMessage("Error setting up user data.");
                setIsLoading(false);
              });
            }
          });
        } else {
          setIsAuthReady(true);
          setIsLoading(false);
        }
      });
      handleAuth();
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      showMessage("Failed to initialize the app. Check console for details.");
      setIsLoading(false);
    }
  }, []);

  // --- Timer useEffect ---
  useEffect(() => {
    let timerInterval;
    if (lastClaimTimestamp !== null && nftCount > 0) {
      timerInterval = setInterval(() => {
        const now = Date.now();
        const dailyCooldown = 24 * 60 * 60 * 1000;
        const timeSinceLastClaim = now - lastClaimTimestamp;
        const timeLeft = dailyCooldown - timeSinceLastClaim;
        setTimeUntilNextClaim(timeLeft > 0 ? timeLeft : 0);
      }, 1000);
    } else {
        setTimeUntilNextClaim(0);
    }

    return () => clearInterval(timerInterval);
  }, [lastClaimTimestamp, nftCount]);

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
          params: {
            ownerAddress: ownerPublicKey.toString(),
            page: 1,
          },
        }),
      });

      const { result } = await response.json();
      
      if (!result || !result.items || result.items.length === 0) {
        return 0;
      }

      const verifiedNfts = result.items.filter(item => {
        const collectionKey = item.content?.metadata?.collection?.key;
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
        setWallet(solana);
        setPublicKey(response.publicKey);
        
        // After connecting, check for NFTs and update Firestore
        const count = await checkNFTCount(response.publicKey);
        const db = getFirestore();
        const auth = getAuth();
        const userId = auth.currentUser.uid;
        const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'tetoRewards', 'userData');
        await updateDoc(userDocRef, { nftCount: count });

        showMessage(`Wallet connected: ${truncatePublicKey(response.publicKey)}`);
      } else {
        showMessage('Phantom wallet not found! Please install Phantom.');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      showMessage('Failed to connect wallet. See console for details.');
    }
  };

  const disconnectWallet = async () => {
    if (wallet) {
      await wallet.disconnect();
      setWallet(null);
      setPublicKey(null);
      setLastClaimTimestamp(null);
      setTetoBalance(0);
      setNftCount(0);
      showMessage('Wallet disconnected.');
    }
  };

  const claimDailyReward = async () => {
    if (!isAuthReady || !publicKey || nftCount === 0 || timeUntilNextClaim > 0) return;
    
    const db = getFirestore();
    const auth = getAuth();
    const userId = auth.currentUser.uid;
    const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'tetoRewards', 'userData');
    
    try {
      const newReward = nftCount * 10;
      const newBalance = tetoBalance + newReward;
      const now = Date.now();
      
      await updateDoc(userDocRef, {
        balance: newBalance,
        lastClaimTimestamp: now,
      });

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
            <div>
              <h2 className="text-3xl font-bold text-red-900 font-['VT323']">TETO REWARDS</h2>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={disconnectWallet} className="bg-gray-700 hover:bg-gray-800 text-red-900 font-bold py-2 px-4 rounded-xl transition-colors">
                Disconnect
              </button>
              <span className="text-red-900">Connected: {truncatePublicKey(publicKey)}</span>
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
                  nftCount > 0 && timeUntilNextClaim <= 0
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/50'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
                disabled={nftCount === 0 || timeUntilNextClaim > 0}
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
      </div>
    );
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen relative overflow-hidden font-['VT323']">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=VT323&family=Noto+Sans+JP:wght@700&family=Zen+Antique&display=swap');
          body {
              font-family: 'VT323', monospace;
              background-color: #1f2937;
          }
          .wallet-connect-button {
              @apply w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-2 border-red-400 text-white font-bold py-4 px-8 text-lg rounded-xl transition-all duration-300 shadow-lg hover:shadow-red-500/50;
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
          }
        `}
      </style>
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://placehold.co/1920x1080/1a202c/ffffff?text=Dojo+Background')", filter: 'brightness(0.4)' }}>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-2xl w-full">
          <div id="app-container" className="bg-black/30 backdrop-blur-lg rounded-3xl p-10 border-2 border-red-500/50 shadow-2xl">
            {renderContent()}
          </div>
        </div>
      </div>
      <div id="messageBox" className="message-box"></div>
    </div>
  );
}
