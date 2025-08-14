import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Coins, Trophy, Zap, Clock, Swords } from 'lucide-react';
import NFTVerification from './NFTVerification';
import LotteryWheel from './LotteryWheel';
import RewardsDisplay from './RewardsDisplay';

const RewardsApp = () => {
  const { connected, publicKey } = useWallet();
  const [tetoBalance, setTetoBalance] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [lastClaimTime, setLastClaimTime] = useState(null);
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState(0);

  // Load saved data on component mount
  useEffect(() => {
    if (publicKey) {
      const savedBalance = localStorage.getItem(`teto_balance_${publicKey.toString()}`);
      const savedLastClaim = localStorage.getItem(`last_claim_${publicKey.toString()}`);
      const savedVerification = localStorage.getItem(`verified_${publicKey.toString()}`);
      
      if (savedBalance) setTetoBalance(parseInt(savedBalance));
      if (savedLastClaim) setLastClaimTime(parseInt(savedLastClaim));
      if (savedVerification) setIsVerified(JSON.parse(savedVerification));
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
    if (!isVerified) return;
    
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    
    if (!lastClaimTime || (now - lastClaimTime) >= hourInMs) {
      const reward = 10; // 10 Teto per hour
      const newBalance = tetoBalance + reward;
      
      setTetoBalance(newBalance);
      setLastClaimTime(now);
      
      // Save to localStorage
      localStorage.setItem(`teto_balance_${publicKey.toString()}`, newBalance.toString());
      localStorage.setItem(`last_claim_${publicKey.toString()}`, now.toString());
    }
  };

  const updateTetoBalance = (newBalance) => {
    setTetoBalance(newBalance);
    if (publicKey) {
      localStorage.setItem(`teto_balance_${publicKey.toString()}`, newBalance.toString());
    }
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!connected) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/dojo-bg.jpg)',
            filter: 'brightness(0.4)'
          }}
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        
        {/* Digital-Dojo Red Banner */}
        <div className="relative z-10 bg-gradient-to-r from-red-600 via-red-500 to-red-600 border-b-4 border-red-400 shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center space-x-3">
              <Swords className="w-8 h-8 text-white animate-pulse" />
              <h1 className="text-3xl font-bold text-white tracking-wider font-mono">
                DIGITAL DOJO
              </h1>
              <Swords className="w-8 h-8 text-white animate-pulse" />
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
                <Coins className="w-32 h-32 mx-auto text-red-500 neon-glow-red animate-pulse" />
                <div className="absolute -top-2 -right-2">
                  <Swords className="w-12 h-12 text-yellow-400 animate-bounce" />
                </div>
              </div>
              <h2 className="text-7xl font-bold text-white neon-text-red mt-6 font-mono tracking-wider">
                TETO
              </h2>
              <p className="text-2xl text-red-200 mt-3 font-semibold">
                Warrior Rewards Portal
              </p>
              <div className="flex items-center justify-center space-x-2 mt-4">
                <div className="w-16 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
                <Trophy className="w-6 h-6 text-yellow-400" />
                <div className="w-16 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
              </div>
            </div>
            
            {/* Welcome Card */}
            <div className="bg-black/60 backdrop-blur-lg rounded-3xl p-10 border-2 border-red-500/50 shadow-2xl dojo-card">
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
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-center space-x-3 text-red-300">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span>Hourly Teto Rewards</span>
                </div>
                <div className="flex items-center justify-center space-x-3 text-red-300">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span>Lottery Wheel Multipliers</span>
                </div>
                <div className="flex items-center justify-center space-x-3 text-red-300">
                  <Swords className="w-5 h-5 text-yellow-400" />
                  <span>NFT Warrior Verification</span>
                </div>
              </div>
              
              <div className="relative">
                <WalletMultiButton className="!bg-gradient-to-r !from-red-600 !to-red-700 hover:!from-red-700 hover:!to-red-800 !border-2 !border-red-400 !text-white !font-bold !py-4 !px-8 !text-lg !rounded-xl !transition-all !duration-300 !shadow-lg hover:!shadow-red-500/50" />
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-400 rounded-xl blur opacity-30 animate-pulse"></div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="mt-8 flex justify-center space-x-8 opacity-60">
              <div className="text-red-400 animate-bounce delay-100">⚔️</div>
              <div className="text-yellow-400 animate-bounce delay-200">🏆</div>
              <div className="text-red-400 animate-bounce delay-300">⚔️</div>
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
          backgroundImage: 'url(/dojo-bg.jpg)',
          filter: 'brightness(0.3)'
        }}
      />
      
      {/* Overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />

      {/* Digital-Dojo Red Banner */}
      <div className="relative z-10 bg-gradient-to-r from-red-600 via-red-500 to-red-600 border-b-4 border-red-400 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center space-x-3">
            <Swords className="w-8 h-8 text-white animate-pulse" />
            <h1 className="text-3xl font-bold text-white tracking-wider font-mono">
              DIGITAL DOJO
            </h1>
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-center text-red-100 text-sm mt-1 font-semibold">
            TRUE DEGENS WELCOME
          </p>
        </div>
      </div>

      <div className="relative z-10 p-4">
        <header className="max-w-6xl mx-auto mb-8">
          <div className="flex justify-between items-center bg-black/60 backdrop-blur-lg rounded-2xl p-6 border-2 border-red-500/50 dojo-card">
            <div className="flex items-center space-x-4">
              <Coins className="w-12 h-12 text-red-500 neon-glow-red" />
              <div>
                <h2 className="text-3xl font-bold text-white neon-text-red font-mono">TETO REWARDS</h2>
                <p className="text-red-200">Warrior Portal</p>
              </div>
            </div>
            <WalletMultiButton className="!bg-gradient-to-r !from-red-600 !to-red-700 hover:!from-red-700 hover:!to-red-800 !border-2 !border-red-400" />
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

export default RewardsApp;
