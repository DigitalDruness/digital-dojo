import React, { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { DynamicContextProvider, DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';
import bs58 from 'bs58';

// Import our initialized Firebase services from our new config file
import { auth, db, functions } from './firebase';

// --- Reusable Utility Functions ---

const showMessage = (message, type = 'info') => {
    const messageBox = document.getElementById('message-box');
    if (!messageBox) return;
    messageBox.textContent = message;
    
    // Reset classes
    messageBox.className = 'fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg z-50 transition-opacity duration-500';

    if (type === 'success') messageBox.classList.add('bg-green-500');
    else if (type === 'error') messageBox.classList.add('bg-red-500');
    else messageBox.classList.add('bg-blue-500');
    
    messageBox.style.display = 'block';
    messageBox.style.opacity = 1;
    
    setTimeout(() => {
        messageBox.style.opacity = 0;
        setTimeout(() => { messageBox.style.display = 'none'; }, 500);
    }, 3000);
};

const truncatePublicKey = (key) => {
    if (!key) return '';
    const str = key.toString();
    return str.length > 8 ? `${str.substring(0, 4)}...${str.substring(str.length - 4)}` : str;
};

// --- SVG Icons ---

const icons = {
    claim: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1m0-1V4m0 2.01V5M12 20v-1m0-1v-1m0-1v-1m0-1v-1" /></svg>,
    spinner: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
};

// --- React Components ---

function LotteryWheel({ onClose, tetoBalance }) {
    // Placeholder component logic
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-xl red-glow text-white text-center">
                <h2 className="text-2xl font-bold mb-4">Lottery Wheel</h2>
                <p className="mb-6">This feature is coming soon!</p>
                <p className="mb-6">Your current balance: {tetoBalance.toLocaleString()} TETO</p>
                <button 
                    onClick={onClose} 
                    className="mt-4 font-bold py-2 px-6 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                >
                    Close
                </button>
            </div>
        </div>
    );
}

function AppContent() {
    const { primaryWallet, handleLogOut } = useDynamicContext();
    const [tetoBalance, setTetoBalance] = useState(0);
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
                // Removed unused setNftCount
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
            } else {
                throw new Error(result.data.error || "Claim failed.");
            }
        } catch (err) {
            showMessage(err.message, 'error');
        } finally {
            setIsClaiming(false);
        }
    }, []);

    if (isLoading) {
        return <div className="text-center text-red-700 font-russo-one text-xl">Initializing Dojo...</div>;
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
                    <p className="font-mono text-lg">{truncatePublicKey(primaryWallet.address)}</p>
                </div>
                <DynamicWidget />
            </div>
            <div className="bg-gray-800/10 p-6 rounded-xl shadow-lg red-glow mb-6">
                <h3 className="text-lg font-semibold text-gray-300 mb-4">Your TETO Balance</h3>
                <p className="text-4xl font-bold text-white">{tetoBalance.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800/10 p-6 rounded-xl shadow-lg red-glow">
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Actions</h3>
                <button onClick={claimAccruedReward} disabled={isClaiming} className="w-full mt-4 font-bold py-3 px-4 rounded-lg flex items-center justify-center bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-500">
                    {icons.claim}
                    <span className="ml-2">{isClaiming ? 'Claiming...' : 'Claim TETO'}</span>
                </button>
                <button onClick={() => setShowWheel(true)} className="w-full mt-4 font-bold py-3 px-4 rounded-lg flex items-center justify-center bg-yellow-500 hover:bg-yellow-600 text-gray-900">
                    {icons.spinner}
                    <span className="ml-2">Spin the Wheel</span>
                </button>
            </div>
            {showWheel && <LotteryWheel onClose={() => setShowWheel(false)} tetoBalance={tetoBalance} />}
        </div>
    );
}

function App() {
    const settings = {
        environmentId: "a20a507f-545f-48e3-8e00-813025fe99da",
        walletConnectors: [SolanaWalletConnectors],
    };

    return (
        <DynamicContextProvider settings={settings}>
            <div className="min-h-screen font-russo-one p-4 flex items-center justify-center text-glow" style={{ backgroundImage: "url('/dojo-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="w-full max-w-md mx-auto">
                    <div id="message-box" className="hidden"></div>
                    <main className="bg-gray-800/10 backdrop-blur-sm p-6 rounded-xl shadow-lg red-glow">
                        <AppContent />
                    </main>
                </div>
            </div>
        </DynamicContextProvider>
    );
}

export default App;
