import React, { useState, useEffect } from 'react';
import { DynamicContextProvider, DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';
import bs58 from 'bs58';
import { auth, db, functions } from './firebase';
import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

// --- Helper Functions ---
const showMessage = (message, type = 'info') => {
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
  if (!key) return '';
  const str = key.toString();
  return str.length > 8 ? `${str.substring(0, 4)}...${str.substring(str.length - 4)}` : str;
};

// --- Main Application Logic Component ---
function AppContent() {
  const { primaryWallet, events } = useDynamicContext();
  const [tetoBalance, setTetoBalance] = useState(0);
  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // --- THE FIX ---
    // This guard clause prevents the error. It ensures the `events` object
    // is ready before we try to attach listeners to it.
    if (!events) {
      return; 
    }
    // --- END OF FIX ---

    const handleWalletLink = async ({ primaryWallet }) => {
      if (primaryWallet && !auth.currentUser) {
        setIsLoading(true);
        try {
          const signer = await primaryWallet.connector.getSigner();
          if (!signer) throw new Error("Could not get signer from wallet.");
          
          showMessage("Please sign the message to log in.");
          const getAuthChallenge = httpsCallable(functions, 'getAuthChallenge');
          const challengeResult = await getAuthChallenge({ publicKey: primaryWallet.address });
          const message = challengeResult.data.message;
          const encodedMessage = new TextEncoder().encode(message);
          
          const signature = await signer.signMessage(encodedMessage);
          const signatureB58 = bs58.encode(signature);

          showMessage("Verifying signature...");
          const verifyAuthSignature = httpsCallable(functions, 'verifyAuthSignature');
          const verifyResult = await verifyAuthSignature({ publicKey: primaryWallet.address, signature: signatureB58 });
          
          const token = verifyResult.data.token;
          await signInWithCustomToken(auth, token);
          
          showMessage("Verifying holder status...");
          const updateUserWallet = httpsCallable(functions, 'updateUserWallet');
          await updateUserWallet();

        } catch (err) {
          showMessage(err.message, 'error');
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
      // We also check here in the cleanup function just to be safe.
      if (events) {
        events.off('linkSuccess', handleWalletLink);
        events.off('logout', handleLogout);
      }
    };
  }, [events]);

  useEffect(() => {
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
      ) : !primaryWallet ? (
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
              <p className="font-mono text-lg">{truncatePublicKey(primaryWallet.address)}</p>
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
  const settings = {
    environmentId: "a20a507f-545f-48e3-8e00-813025fe99da",
    walletConnectors: [SolanaWalletConnectors],
    chainConfigurations: [
      {
        chainId: 'solana',
        rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL,
      }
    ],
  };

  return (
    <DynamicContextProvider settings={settings}>
      <div 
        className="min-h-screen p-4 flex items-center justify-center text-white"
        style={{ backgroundImage: "url('/dojo-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="w-full max-w-md mx-auto">
          <main className="bg-gray-900/50 backdrop-blur-md p-6 rounded-xl shadow-lg red-glow">
            <AppContent />
          </main>
        </div>
      </div>
    </DynamicContextProvider>
  );
}

export default App;

