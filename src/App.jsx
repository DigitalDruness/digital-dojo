import React from 'react';
import { DynamicContextProvider, DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';
import bs58 from 'bs58';
import { auth, db, functions } from './firebase';
import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

// --- Helper Functions ---
const showMessage = (message, type = 'info') => {
  // ... (this function remains the same)
  const existingBox = document.getElementById('message-box');
  if (existingBox) {
    document.body.removeChild(existingBox);
  }
  
  const messageBox = document.createElement('div');
  messageBox.id = 'message-box';
  messageBox.textContent = message;
  messageBox.className = 'fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg z-50 transition-opacity duration-500';
  if (type === 'success') messageBox.classList.add('bg-green-500');
  else if (type === 'error') messageBox.classList.add('bg-red-500');
  else messageBox.classList.add('bg-blue-500');
  document.body.appendChild(messageBox);
  
  setTimeout(() => {
    messageBox.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(messageBox)) {
        document.body.removeChild(messageBox);
      }
    }, 500);
  }, 3000);
};

const truncatePublicKey = (key) => {
  // ... (this function remains the same)
  if (!key) return '';
  const str = key.toString();
  return str.length > 8 ? `${str.substring(0, 4)}...${str.substring(str.length - 4)}` : str;
};

// --- Main Application Logic Component ---
function AppContent() {
  // ... (This component remains largely the same, no major changes needed here)
  const { primaryWallet, events } = useDynamicContext();
  const [tetoBalance, setTetoBalance] = React.useState(0);
  const [firebaseUser, setFirebaseUser] = React.useState(auth.currentUser);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!events) return; 

    const handleWalletLink = async ({ primaryWallet }) => {
      if (primaryWallet && !auth.currentUser) {
        setIsLoading(true);
        try {
          showMessage("Please sign the message to log in.");
          const getAuthChallenge = httpsCallable(functions, 'getAuthChallenge');
          const challengeResult = await getAuthChallenge({ publicKey: primaryWallet.address });
          
          if (!challengeResult?.data?.message || typeof challengeResult.data.message !== 'string') {
            console.error("Invalid challenge response from server:", challengeResult.data);
            throw new Error("Failed to receive a valid login challenge from the server. Please try again.");
          }

          const message = challengeResult.data.message;
          const encodedMessage = new TextEncoder().encode(message);
          
          const signatureBytes = await primaryWallet.signMessage(encodedMessage);
          if (!signatureBytes) throw new Error("Signing failed or was rejected by the wallet.");
          const signatureB58 = bs58.encode(signatureBytes);

          showMessage("Verifying signature...");
          const verifyAuthSignature = httpsCallable(functions, 'verifyAuthSignature');
          const verifyResult = await verifyAuthSignature({ publicKey: primaryWallet.address, signature: signatureB58 });
          
          const token = verifyResult.data.token;
          await signInWithCustomToken(auth, token);
          
          showMessage("Verifying holder status...");
          const updateUserWallet = httpsCallable(functions, 'updateUserWallet');
          await updateUserWallet();

        } catch (err) {
            let errorMessage = "An unknown error occurred.";
            if (err.message) {
                errorMessage = err.message;
            }
            console.error("Full Authentication Error:", JSON.stringify(err, null, 2));
            showMessage(errorMessage, 'error');
        } finally {
          setIsLoading(false);
        }
      }
    };

    const handleLogout = () => {
      signOut(auth);
    };

    events.on('linkSuccess', handleWalletLink);
    events.on('logout', handleLogout);

    return () => {
      if (events) {
        events.off('linkSuccess', handleWalletLink);
        events.off('logout', handleLogout);
      }
    };
  }, [events]);

  React.useEffect(() => {
    if (!firebaseUser) {
      setTetoBalance(0);
      return;
    }

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setTetoBalance(data.tetoBalance || 0);
      } else {
        setTetoBalance(0);
      }
    });
    return () => unsubscribe();
  }, [firebaseUser]);

  return (
    <>
      {isLoading ? (
        <div className="text-center text-gray-400 animate-pulse">Initializing Dojo...</div>
      ) : !firebaseUser ? (
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-500 tracking-wider">TRUE DEGENS WELCOME</h2>
          <p className="mb-8 text-gray-300 leading-relaxed">Connect your Solana wallet to prove ownership and begin your training.</p>
          <DynamicWidget />
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-sm text-gray-400">Wallet Connected</p>
              <p className="font-mono text-lg">{truncatePublicKey(firebaseUser.uid)}</p>
            </div>
            <DynamicWidget />
          </div>
          <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg red-glow mb-6">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">Your TETO Balance</h3>
            <p className="text-4xl font-bold text-white">{tetoBalance.toLocaleString()}</p>
          </div>
        </div>
      )}
    </>
  );
}

// --- Main App Wrapper ---
function App() {
  const [sdkState, setSdkState] = React.useState('loading');

  const settings = {
    environmentId: "a20a507f-545f-4b5e-8e00-813025fe99da",
    walletConnectors: [SolanaWalletConnectors],
    chainConfigurations: [
      {
        chainId: 'solana',
        rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL,
      }
    ],
    events: {
      onSuccess: () => {
        setSdkState('ready');
      },
      onError: (error) => {
        console.error("Dynamic SDK initialization failed:", error);
        setSdkState('error');
      },
    },
  };

  return (
    <DynamicContextProvider settings={settings}>
      {/* This main container handles centering and positioning */}
      <div className="relative min-h-screen w-full flex items-center justify-center p-4 text-white">
        
        {/* This div is ONLY for the background image. It fills the screen and sits behind everything. */}
        <div 
          className="absolute inset-0 w-full h-full -z-10"
          style={{ backgroundImage: "url('/dojo-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
        />

        {/* This container holds the actual welcome card content */}
        <div className="w-full max-w-md mx-auto">
          <main className="bg-gray-900/50 backdrop-blur-md p-6 rounded-xl shadow-lg red-glow">
            {sdkState === 'loading' && <div className="text-center animate-pulse">Loading Authentication...</div>}
            {sdkState === 'error' && <div className="text-center text-red-400">Failed to connect to authentication service. Please disable ad-blockers or browser shields and refresh the page.</div>}
            {sdkState === 'ready' && <AppContent />}
          </main>
        </div>
      </div>
    </DynamicContextProvider>
  );
}

export default App;

