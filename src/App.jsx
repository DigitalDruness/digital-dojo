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

// --- Main Application Logic (After login) ---
function AppContent() {
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
            throw new Error("Failed to get login challenge from server.");
          }

          const message = challengeResult.data.message;
          const encodedMessage = new TextEncoder().encode(message);
          
          const signatureBytes = await primaryWallet.signMessage(encodedMessage);
          if (!signatureBytes) throw new Error("Signing failed or was rejected.");
          const signatureB58 = bs58.encode(signatureBytes);

          showMessage("Verifying signature...");
          const verifyAuthSignature = httpsCallable(functions, 'verifyAuthSignature');
          const verifyResult = await verifyAuthSignature({ publicKey: primaryWallet.address, signature: signatureB58 });
          
          const token = verifyResult.data.token;
          await signInWithCustomToken(auth, token);
          
          showMessage("Updating user wallet...");
          const updateUserWallet = httpsCallable(functions, 'updateUserWallet');
          await updateUserWallet();

        } catch (err) {
            const errorMessage = err.message || "An unknown error occurred.";
            console.error("Authentication Error:", err);
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
      setTetoBalance(doc.exists() ? doc.data().tetoBalance || 0 : 0);
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
          <p className="mb-8 text-gray-300 leading-relaxed">Connect your wallet to begin.</p>
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

// --- Password Protection Component ---
function PasswordProtection({ onSuccess }) {
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const CORRECT_PASSWORD = '#4760';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setError('');
      onSuccess();
    } else {
      setError('Incorrect password.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-center text-red-500 tracking-wider">ACCESS REQUIRED</h2>
      <p className="text-center text-gray-300">Enter the password to access the Dojo.</p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="bg-gray-800/50 border border-red-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:outline-none"
        placeholder="Password"
      />
      <button type="submit" className="bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-4 rounded-lg transition-colors">
        Enter
      </button>
      {error && <p className="text-red-400 text-center text-sm">{error}</p>}
    </form>
  );
}

// --- This component manages the view after the password is correct ---
const AuthenticatedView = ({ sdkState }) => {
  if (sdkState === 'loading') {
    return <div className="text-center animate-pulse">Loading Authentication...</div>;
  }
  if (sdkState === 'error') {
    return <div className="text-center text-red-400">Failed to connect to authentication service.</div>;
  }
  return <AppContent />;
};


// --- Main App Wrapper ---
function App() {
  const [dynamicSettings, setDynamicSettings] = React.useState(null);
  const [configError, setConfigError] = React.useState(null);
  const [sdkState, setSdkState] = React.useState('loading');
  const [isPasswordCorrect, setIsPasswordCorrect] = React.useState(false);

  React.useEffect(() => {
    const fetchDynamicConfig = async () => {
      try {
        const getDynamicConfig = httpsCallable(functions, 'getDynamicConfig');
        const result = await getDynamicConfig();
        if (!result?.data?.environmentId) throw new Error("Invalid config from server.");

        const settings = {
          environmentId: result.data.environmentId,
          walletConnectors: [SolanaWalletConnectors],
          chainConfigurations: [{
            chainId: 'solana',
            rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL,
          }],
          events: {
            onSuccess: () => setSdkState('ready'),
            onError: (error) => {
              console.error("Dynamic SDK Error:", error);
              setSdkState('error');
            },
          },
        };
        setDynamicSettings(settings);
      } catch (error) {
        console.error("Could not fetch Dynamic Config:", error);
        setConfigError("Could not load app configuration.");
      }
    };
    fetchDynamicConfig();
  }, []);

  // --- Main Render Logic ---
  const renderContent = () => {
    if (!isPasswordCorrect) {
      return <PasswordProtection onSuccess={() => setIsPasswordCorrect(true)} />;
    }
    if (configError) {
      return <div className="text-center text-red-400">{configError}</div>;
    }
    if (!dynamicSettings) {
      return <div className="text-center animate-pulse">Loading Configuration...</div>;
    }
    return (
      <DynamicContextProvider settings={dynamicSettings}>
        <AuthenticatedView sdkState={sdkState} />
      </DynamicContextProvider>
    );
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 text-white">
      <div 
        className="absolute inset-0 w-full h-full -z-10"
        style={{ backgroundImage: "url('/dojo-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div className="w-full max-w-md mx-auto">
        <main className="bg-gray-900/50 backdrop-blur-md p-6 rounded-xl shadow-lg red-glow">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;

