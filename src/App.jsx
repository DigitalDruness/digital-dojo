import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { DynamicContextProvider, DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';
import bs58 from 'bs58';
import { auth, db, functions } from './firebase'; // Using the centralized firebase.js

// --- Helper Functions and Components ---

const showMessage = (message, type = 'info') => {
  const existingBox = document.getElementById('message-box-container');
  if (existingBox) {
    document.body.removeChild(existingBox);
  }

  const messageBox = document.createElement('div');
  messageBox.id = 'message-box-container';
  messageBox.className = 'fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg z-50 transition-opacity duration-300 bg-gray-800 border border-gray-700';
  
  let colorClass = 'border-blue-500';
  if (type === 'success') colorClass = 'border-green-500';
  else if (type === 'error') colorClass = 'border-red-500';
  
  messageBox.classList.add(colorClass);
  messageBox.textContent = message;
  
  document.body.appendChild(messageBox);

  // Fade in
  setTimeout(() => {
    messageBox.style.opacity = 1;
  }, 10);
  
  // Fade out
  setTimeout(() => {
    messageBox.style.opacity = 0;
    setTimeout(() => {
      if (document.body.contains(messageBox)) {
          document.body.removeChild(messageBox);
      }
    }, 300);
  }, 3000);
};

const truncatePublicKey = (key) => {
  if (!key) return '';
  const str = key.toString();
  return str.length > 8 ? `${str.substring(0, 4)}...${str.substring(str.length - 4)}` : str;
};

// --- Main App Content ---

function AppContent() {
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const [tetoBalance, setTetoBalance] = useState(0);
  const [nftCount, setNftCount] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showWheel, setShowWheel] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const signInWithSolana = async () => {
      if (primaryWallet && !firebaseUser) {
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
          console.error(err);
          showMessage(err.message, 'error');
          await handleLogOut();
        } finally {
          setIsLoading(false);
        }
      } else if (!primaryWallet && firebaseUser) {
        signOut(auth);
      }
    };
    signInWithSolana();
  }, [primaryWallet, firebaseUser, handleLogOut]);

  useEffect(() => {
    if (!firebaseUser) return;
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setTetoBalance(data.tetoBalance || 0);
        setNftCount(data.nftCount || 0);
      }
    });
    return () => unsubscribe();
  }, [firebaseUser]);

  const claimAccruedReward = useCallback(async () => {
    setIsClaiming(true);
    try {
      const claimRewardsFunc = httpsCallable(functions, 'claimRewards');
      const result = await claimRewardsFunc();
      if (result.data.success) {
        showMessage(`Claimed ${result.data.amountClaimed} TETO!`, 'success');
      } else { throw new Error(result.data.error || "Claim failed."); }
    } catch (err) { 
      showMessage(err.message, 'error');
    } finally { 
      setIsClaiming(false); 
    }
  }, []);

  if (isLoading) {
    return <div className="text-center text-red-700 animate-pulse">Initializing Dojo...</div>;
  }

  if (!firebaseUser || !primaryWallet) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4 text-red-700 tracking-wider">TRUE DEGENS WELCOME</h2>
        <p className="mb-8 text-gray-300 leading-relaxed">Connect your Solana wallet to prove ownership and begin your training.</p>
        <DynamicWidget />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-sm text-gray-400">Wallet Connected</p>
          <p className="font-mono text-lg text-white">{truncatePublicKey(primaryWallet.address)}</p>
        </div>
        <DynamicWidget />
      </div>
      <div className="bg-gray-800/20 p-6 rounded-xl shadow-lg mb-6">
        <h3 className="text-lg font-semibold text-gray-300 mb-4">Your TETO Balance</h3>
        <p className="text-4xl font-bold text-white">{tetoBalance.toLocaleString()}</p>
      </div>
      <div className="bg-gray-800/20 p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-gray-300 mb-2">Actions</h3>
        <button onClick={claimAccruedReward} disabled={isClaiming} className="w-full mt-4 font-bold py-3 px-4 rounded-lg flex items-center justify-center bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-500 transition-colors">
          <span className="ml-2">{isClaiming ? 'Claiming...' : 'Claim TETO'}</span>
        </button>
        <button onClick={() => setShowWheel(true)} className="w-full mt-4 font-bold py-3 px-4 rounded-lg flex items-center justify-center bg-yellow-500 hover:bg-yellow-600 text-gray-900 transition-colors">
          <span className="ml-2">Spin the Wheel</span>
        </button>
      </div>
      {/* {showWheel && <LotteryWheel onClose={() => setShowWheel(false)} functions={functions} tetoBalance={tetoBalance} />} */}
    </div>
  );
}


// --- Main App Component ---

function App() {
  const settings = {
    environmentId: "a20a507f-545f-48e3-8e00-813025fe99da", // Replace with your actual environment ID
    walletConnectors: [SolanaWalletConnectors],
  };

  return (
    <DynamicContextProvider settings={settings}>
      {/* This main div now centers everything */}
      <div className="min-h-screen p-4 flex items-center justify-center text-white" style={{ backgroundImage: "url('/dojo-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="w-full max-w-md mx-auto">
          {/* This main element has the glow and transparency */}
          <main className="bg-gray-900/50 backdrop-blur-md p-6 rounded-xl shadow-lg red-glow">
            <AppContent />
          </main>
        </div>
      </div>
    </DynamicContextProvider>
  );
}

export default App;
