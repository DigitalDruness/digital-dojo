import React from 'react';
import { Coins, Clock, Zap, Trophy } from 'lucide-react';

const RewardsDisplay = ({ tetoBalance, isVerified, timeUntilNextClaim, onClaimReward, formatTime }) => {
  const canClaim = isVerified && timeUntilNextClaim === 0;

  return (
    <div className="bg-black/60 backdrop-blur-lg rounded-2xl p-6 border-2 border-red-500/50 dojo-card">
      <div className="flex items-center space-x-3 mb-4">
        <Coins className="w-8 h-8 text-yellow-400 neon-glow-yellow" />
        <h2 className="text-2xl font-bold text-white font-mono">TETO BALANCE</h2>
      </div>
      
      <div className="text-center mb-6">
        <div className="text-5xl font-bold text-yellow-400 neon-text-yellow mb-2 font-mono">
          {tetoBalance.toLocaleString()}
        </div>
        <p className="text-red-200">Teto Tokens</p>
        <div className="text-xs text-red-300 opacity-75 mt-1">
          ⚡ Synced with Helius RPC
        </div>
      </div>

      {isVerified ? (
        <div className="space-y-4">
          <div className="bg-black/40 rounded-lg p-4 border border-red-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-200 flex items-center space-x-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span>Hourly Reward</span>
              </span>
              <span className="text-yellow-400 font-bold">10 Teto</span>
            </div>
            
            {timeUntilNextClaim > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-red-200 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-red-400" />
                  <span>Next claim in</span>
                </span>
                <span className="text-red-400 font-mono">{formatTime(timeUntilNextClaim)}</span>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-green-400 font-bold mb-2 animate-pulse">
                  ✨ REWARD READY! ✨
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onClaimReward}
            disabled={!canClaim}
            className={`w-full py-3 px-4 rounded-xl font-bold transition-all duration-200 border-2 font-mono ${
              canClaim
                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-green-400 shadow-lg hover:shadow-green-500/50'
                : 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed opacity-50'
            }`}
          >
            {canClaim ? (
              <span className="flex items-center justify-center space-x-2">
                <Trophy className="w-5 h-5" />
                <span>CLAIM REWARD</span>
              </span>
            ) : (
              <span>REWARD CLAIMED</span>
            )}
          </button>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="text-red-400 mb-2">⚔️</div>
          <p className="text-red-200">
            Verify your warrior status to start earning rewards
          </p>
        </div>
      )}
    </div>
  );
};

export default RewardsDisplay;
