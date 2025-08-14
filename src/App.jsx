import React, { useState, useEffect, useMemo } from 'react';

// Replicating Lucide-React icons with inline SVGs for a self-contained example
const Coins = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-coins">
    <circle cx="8" cy="8" r="6" />
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1.22a9 9 0 0 0 6.66 12.66" />
  </svg>
);

const Trophy = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trophy">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4.5 15.5H19.5" />
    <path d="M12 17.5v3" />
    <path d="M19.5 9h-15V4a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1z" />
    <path d="M12 17.5a2.5 2.5 0 0 1-2.5-2.5v-10h5v10a2.5 2.5 0 0 1-2.5 2.5z" />
  </svg>
);

const Zap = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const Clock = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const Swords = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-swords">
    <polyline points="14.5 17.5 17.5 14.5" />
    <path d="M2.5 13.5l1.5 1.5c-3-3 6-6 9-9l1.5 1.5" />
    <path d="M11 22l1.5-1.5c3 3 6-6 9-9l-1.5-1.5" />
    <path d="M4 16l-1.5-1.5c-3 3-6 6-9 9l1.5 1.5" />
  </svg>
);

// Placeholder components from the original RewardsApp file
const NFTVerification = ({ isVerified, setIsVerified, publicKey }) => (
  <div className="bg-black/60 backdrop-blur-lg rounded-3xl p-8 border-2 border-red-500/50 shadow-2xl">
    <h3 className="text-2xl font-bold text-white mb-4 font-mono">NFT Verification</h3>
    <p className="text-red-200">
      {isVerified ? "You are a verified NFT warrior!" : "Verify your NFT to claim rewards."}
    </p>
  </div>
);

const LotteryWheel = ({ tetoBalance, updateTetoBalance, isVerified }) => (
  <div className="bg-black/60 backdrop-blur-lg rounded-3xl p-8 border-2 border-red-500/50 shadow-2xl">
    <h3 className="text-2xl font-bold text-white mb-4 font-mono">Lottery Wheel</h3>
    <p className="text-red-200">
      The wheel of fortune is not yet implemented.
    </p>
  </div>
);

const RewardsDisplay = ({ tetoBalance, isVerified, timeUntilNextClaim, onClaimReward, formatTime }) => (
  <div className="bg-black/60 backdrop-blur-lg rounded-3xl p-8 border-2 border-red-500/50 shadow-2xl">
    <h3 className="text-2xl font-bold text-white mb-4 font-mono">Teto Rewards</h3>
    <div className="flex items-center space-x-2 mt-4">
      <Coins className="w-8 h-8 text-yellow-400" />
      <span className="text-4xl font-bold text-white">{tetoBalance} TETO</span>
    </div>
    <div className="mt-4">
      <div className="flex items-center justify-between text-red-200">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-red-400" />
          <span>Next Claim:</span>
        </div>
        <span className="text-xl font-bold">
          {isVerified ? formatTime(timeUntilNextClaim) : 'Not Verified'}
        </span>
      </div>
    </div>
    <button
      onClick={onClaimReward}
      disabled={!isVerified || timeUntilNextClaim > 0}
      className={`w-full mt-6 py-3 px-6 rounded-xl font-bold transition-all duration-300
        ${!isVerified || timeUntilNextClaim > 0 ?
        'bg-gray-700 text-gray-400 cursor-not-allowed' :
        'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/50'
      }`}
    >
      Claim 10 TETO
    </button>
  </div>
);

// A custom hook to simulate the wallet adapter's behavior without external dependencies
const useMockWallet = () => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState(null);

  const connect = async () => {
    setConnecting(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async connection
    setPublicKey(`SimulatedPublicKey${Math.floor(Math.random() * 1000000)}`);
    setConnected(true);
    setConnecting(false);
  };

  const disconnect = () => {
    setConnected(false);
    setPublicKey(null);
  };

  return { connected, connecting, publicKey, connect, disconnect };
};

// Main App component that contains the UI logic
const App = () => {
  const { connected, connecting, publicKey, connect, disconnect } = useMockWallet();

  const [tetoBalance, setTetoBalance] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [lastClaimTime, setLastClaimTime] = useState(null);
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState(0);

  // Load saved data on component mount based on the connected wallet's public key
  useEffect(() => {
    if (publicKey) {
      const savedBalance = localStorage.getItem(`teto_balance_${publicKey}`);
      const savedLastClaim = localStorage.getItem(`last_claim_${publicKey}`);
      const savedVerification = localStorage.getItem(`verified_${publicKey}`);
      
      if (savedBalance) setTetoBalance(parseInt(savedBalance));
      if (savedLastClaim) setLastClaimTime(parseInt(savedLastClaim));
      if (savedVerification) setIsVerified(JSON.parse(savedVerification));
    } else {
      // Clear state if wallet is disconnected
      setTetoBalance(0);
      setIsVerified(false);
      setLastClaimTime(null);
      setTimeUntilNextClaim(0);
    }
  }, [publicKey]);

  // Timer for next claim
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastClaimTime) {
        const now = Date.now();
        const hourInMs = 60 * 60 * 1000;
        const timeSinceLastClaim = now - lastClaimTime;
        const timeLeft = hourInMs - timeSinceLastClaim;
        
        if (timeLeft <= 0) {
          setTimeUntilNextClaim(0);
        } else {
          setTimeUntilNextClaim(timeLeft);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastClaimTime]);

  const claimHourlyReward = () => {
    if (!isVerified || !publicKey) return;
    
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    
    if (!lastClaimTime || (now - lastClaimTime) >= hourInMs) {
      const reward = 10; // 10 Teto per hour
      const newBalance = tetoBalance + reward;
      
      setTetoBalance(newBalance);
      setLastClaimTime(now);
      
      // Save to localStorage using the real public key
      localStorage.setItem(`teto_balance_${publicKey}`, newBalance.toString());
      localStorage.setItem(`last_claim_${publicKey}`, now.toString());
    }
  };

  const updateTetoBalance = (newBalance) => {
    setTetoBalance(newBalance);
    if (publicKey) {
      localStorage.setItem(`teto_balance_${publicKey}`, newBalance.toString());
    }
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const truncatePublicKey = (key) => {
    if (!key) return '';
    return `${key.substring(0, 4)}...${key.slice(-4)}`;
  }
  
  if (!connected) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(dojo-bg.jpg.jpg)`,
            filter: 'brightness(0.4)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        
        {/* Digital-Dojo Red Banner */}
        <div className="relative z-10 bg-gradient-to-r from-red-600 via-red-500 to-red-600 border-b-4 border-red-400 shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center space-x-3">
              <h1 className="text-3xl font-bold text-white tracking-wider font-mono">
                DIGITAL DOJO
              </h1>
            </div>
            <p className="text-center text-red-100 text-sm mt-1 font-semibold">
              TRUE DEGENS WELCOME
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)] p-4">
          <div className="text-center max-w-2xl">
            {/* Logo Section */}
            <div className="mb-12">
              <div className="relative inline-block">
                {/* Icons removed */}
              </div>
            </div>
            
            {/* Welcome Card */}
            <div className="bg-black/60 backdrop-blur-lg rounded-3xl p-10 border-2 border-red-500/50 shadow-2xl">
              <div className="mb-6">
                <h3 className="text-3xl font-bold text-white mb-4 font-mono">
                  TRUE DEGENS WELCOME
                </h3>
                <p className="text-red-200 text-lg leading-relaxed">
                  Connect your Solana wallet to verify your NFT warrior status and begin your training. 
                  Earn <span className="text-red-400 font-bold">Teto</span> rewards every hour and test your luck in the 
                  <span className="text-yellow-400 font-bold"> Wheel of Fortune</span>!
                </p>
              </div>
              
              {/* Removed decorative icons and their containers */}
              
              <div className="relative">
                <button
                  onClick={connect}
                  disabled={connecting}
                  className="w-full !bg-gradient-to-r !from-red-600 !to-red-700 hover:!from-red-700 hover:!to-red-800 !border-2 !border-red-400 !text-white !font-bold !py-4 !px-8 !text-lg !rounded-xl !transition-all !duration-300 !shadow-lg hover:!shadow-red-500/50"
                >
                  {connecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-400 rounded-xl blur opacity-30 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
            backgroundImage: `url(dojo-bg.jpg.jpg)`,
            filter: 'brightness(0.3)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        }}
      />
      
      {/* Overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />

      {/* Digital-Dojo Red Banner */}
      <div className="relative z-10 bg-gradient-to-r from-red-600 via-red-500 to-red-600 border-b-4 border-red-400 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center space-x-3">
            <h1 className="text-3xl font-bold text-white tracking-wider font-mono">
              DIGITAL DOJO
            </h1>
          </div>
          <p className="text-center text-red-100 text-sm mt-1 font-semibold">
            TRUE DEGENS WELCOME
          </p>
        </div>
      </div>

      <div className="relative z-10 p-4">
        <header className="max-w-6xl mx-auto mb-8">
          <div className="flex justify-between items-center bg-black/60 backdrop-blur-lg rounded-2xl p-6 border-2 border-red-500/50 shadow-2xl">
            <div className="flex items-center space-x-4">
              <div>
                <h2 className="text-3xl font-bold text-white font-mono">TETO REWARDS</h2>
              </div>
            </div>
            <div className="flex items-center space-x-4">
               {/* Updated button to toggle connection */}
               <button
                  onClick={disconnect}
                  className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-xl transition-colors"
                >
                  Disconnect Wallet
               </button>
               <span className="text-white">Connected: {truncatePublicKey(publicKey)}</span>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - NFT Verification & Rewards */}
          <div className="lg:col-span-1 space-y-6">
            <NFTVerification 
              isVerified={isVerified} 
              setIsVerified={setIsVerified}
              publicKey={publicKey}
            />
            
            <RewardsDisplay 
              tetoBalance={tetoBalance}
              isVerified={isVerified}
              timeUntilNextClaim={timeUntilNextClaim}
              onClaimReward={claimHourlyReward}
              formatTime={formatTime}
            />
          </div>

          {/* Right Column - Lottery Wheel */}
          <div className="lg:col-span-2">
            <LotteryWheel 
              tetoBalance={tetoBalance}
              updateTetoBalance={updateTetoBalance}
              isVerified={isVerified}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
