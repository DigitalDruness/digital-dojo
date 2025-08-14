import React, { useState } from 'react';
import { RotateCcw, Coins, Zap, Trophy } from 'lucide-react';

const LotteryWheel = ({ tetoBalance, updateTetoBalance, isVerified }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [betAmount, setBetAmount] = useState(10);

  const spinWheel = async () => {
    if (!isVerified || tetoBalance < betAmount || isSpinning) return;

    setIsSpinning(true);
    
    // Deduct bet amount immediately
    const newBalance = tetoBalance - betAmount;
    updateTetoBalance(newBalance);

    // Simulate wheel spin delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 10% chance to double, 90% chance to lose
    const isWin = Math.random() < 0.1;
    
    if (isWin) {
      const winAmount = betAmount * 2;
      const finalBalance = newBalance + winAmount;
      updateTetoBalance(finalBalance);
      setLastResult({ type: 'win', amount: winAmount });
    } else {
      setLastResult({ type: 'lose', amount: betAmount });
    }

    setIsSpinning(false);
  };

  const canSpin = isVerified && tetoBalance >= betAmount && !isSpinning;

  return (
    <div className="bg-black/60 backdrop-blur-lg rounded-2xl p-6 border-2 border-red-500/50 dojo-card">
      <div className="flex items-center space-x-3 mb-6">
        <RotateCcw className="w-8 h-8 text-yellow-400 neon-glow-yellow" />
        <h2 className="text-2xl font-bold text-white font-mono">WHEEL OF FORTUNE</h2>
      </div>

      <div className="text-center mb-8">
        {/* Wheel Visual */}
        <div className="relative mx-auto w-64 h-64 mb-6">
          <div 
            className={`w-full h-full rounded-full border-8 border-yellow-400 bg-gradient-to-br from-red-600 via-red-700 to-red-800 shadow-2xl ${
              isSpinning ? 'animate-spin' : ''
            }`}
            style={{ animationDuration: isSpinning ? '3s' : '0s' }}
          >
            {/* Wheel segments */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-red-500 to-red-900 flex items-center justify-center">
              <div className="text-center">
                {isSpinning ? (
                  <div className="text-white font-bold text-lg animate-pulse">
                    SPINNING...
                  </div>
                ) : (
                  <>
                    <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                    <div className="text-yellow-400 font-bold text-sm">2X WIN</div>
                    <div className="text-red-200 text-xs">10% CHANCE</div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
            <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-yellow-400"></div>
          </div>
        </div>

        {/* Bet Amount Selector */}
        <div className="mb-6">
          <label className="block text-red-200 mb-2 font-mono">BET AMOUNT</label>
          <div className="flex justify-center space-x-2 mb-4">
            {[10, 25, 50, 100].map(amount => (
              <button
                key={amount}
                onClick={() => setBetAmount(amount)}
                disabled={tetoBalance < amount || isSpinning}
                className={`px-4 py-2 rounded-lg font-bold transition-all duration-200 border-2 font-mono ${
                  betAmount === amount
                    ? 'bg-red-600 text-white border-red-400'
                    : tetoBalance >= amount && !isSpinning
                    ? 'bg-black/40 text-red-200 border-red-500/50 hover:bg-red-600/20'
                    : 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed opacity-50'
                }`}
              >
                {amount}
              </button>
            ))}
          </div>
          <div className="text-sm text-red-300">
            Potential win: <span className="text-yellow-400 font-bold">{betAmount * 2} Teto</span>
          </div>
        </div>

        {/* Spin Button */}
        <button
          onClick={spinWheel}
          disabled={!canSpin}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 border-2 font-mono ${
            canSpin
              ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white border-yellow-400 shadow-lg hover:shadow-yellow-500/50'
              : 'bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed opacity-50'
          }`}
        >
          {isSpinning ? (
            <span className="flex items-center justify-center space-x-2">
              <RotateCcw className="w-6 h-6 animate-spin" />
              <span>SPINNING...</span>
            </span>
          ) : !isVerified ? (
            'VERIFY WARRIOR STATUS FIRST'
          ) : tetoBalance < betAmount ? (
            'INSUFFICIENT TETO'
          ) : (
            <span className="flex items-center justify-center space-x-2">
              <Zap className="w-6 h-6" />
              <span>SPIN THE WHEEL</span>
            </span>
          )}
        </button>

        {/* Last Result */}
        {lastResult && (
          <div className={`mt-4 p-4 rounded-lg border-2 ${
            lastResult.type === 'win' 
              ? 'bg-green-900/50 border-green-400 text-green-400' 
              : 'bg-red-900/50 border-red-400 text-red-400'
          }`}>
            <div className="font-bold font-mono">
              {lastResult.type === 'win' ? '🎉 WINNER! 🎉' : '💀 BETTER LUCK NEXT TIME 💀'}
            </div>
            <div className="text-sm mt-1">
              {lastResult.type === 'win' 
                ? `Won ${lastResult.amount} Teto!` 
                : `Lost ${lastResult.amount} Teto`
              }
            </div>
          </div>
        )}

        {/* Game Info */}
        <div className="mt-6 text-xs text-red-300 bg-black/40 rounded-lg p-3 border border-red-500/30">
          <div className="font-bold mb-1">GAME RULES:</div>
          <div>• 10% chance to double your bet</div>
          <div>• 90% chance to lose your bet</div>
          <div>• Minimum bet: 10 Teto</div>
          <div className="mt-2 text-green-300">⚡ Powered by Helius RPC for instant results</div>
        </div>
      </div>
    </div>
  );
};

export default LotteryWheel;
