import React, { useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Shield, CheckCircle, XCircle, Loader } from 'lucide-react';

const NFTVerification = ({ isVerified, setIsVerified, publicKey }) => {
  const { connection } = useConnection();
  const [isLoading, setIsLoading] = useState(false);
  const [nftCounts, setNftCounts] = useState({ collection1: 0, collection2: 0 });
  
  // Replace these with your actual collection addresses
  const COLLECTION_1_ADDRESS = "J7ZoA72tbHffX1T6hmJbwZZZvT7SU144k3bDfKxHkhKF";
  const COLLECTION_2_ADDRESS = "8gFdLpbWGMX1KnsLwnNcQehxshLsDP5exYSAihtvJN15";

  useEffect(() => {
    if (publicKey) {
      const savedVerification = localStorage.getItem(`verified_${publicKey.toString()}`);
      if (savedVerification) {
        setIsVerified(JSON.parse(savedVerification));
      }
    }
  }, [publicKey, setIsVerified]);

  const verifyNFTs = async () => {
    if (!publicKey || !connection) return;
    
    setIsLoading(true);
    
    try {
      // Simulate NFT verification - replace with actual Metaplex logic
      // This is a placeholder that randomly determines verification
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate finding NFTs (replace with actual verification logic)
      const hasCollection1 = Math.random() > 0.5;
      const hasCollection2 = Math.random() > 0.5;
      const collection1Count = hasCollection1 ? Math.floor(Math.random() * 5) + 1 : 0;
      const collection2Count = hasCollection2 ? Math.floor(Math.random() * 3) + 1 : 0;
      
      setNftCounts({ collection1: collection1Count, collection2: collection2Count });
      
      const verified = collection1Count > 0 || collection2Count > 0;
      setIsVerified(verified);
      
      // Save verification status
      localStorage.setItem(`verified_${publicKey.toString()}`, JSON.stringify(verified));
      localStorage.setItem(`nft_counts_${publicKey.toString()}`, JSON.stringify({ collection1: collection1Count, collection2: collection2Count }));
      
    } catch (error) {
      console.error('Error verifying NFTs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
      <div className="flex items-center space-x-3 mb-4">
        <Shield className="w-8 h-8 text-neon-purple" />
        <h2 className="text-2xl font-bold text-white">NFT Verification</h2>
      </div>
      
      {!isVerified ? (
        <div className="text-center">
          <p className="text-purple-200 mb-4">
            Verify your NFT holdings to start earning Teto rewards
          </p>
          <button
            onClick={verifyNFTs}
            disabled={isLoading}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center space-x-2 mx-auto"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                <span>Verify NFTs</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-green-400 mb-2">Verified!</h3>
          <div className="space-y-2 text-sm text-purple-200">
            <p>Collection 1: {nftCounts.collection1} NFTs</p>
            <p>Collection 2: {nftCounts.collection2} NFTs</p>
          </div>
          <p className="text-purple-200 mt-4">
            You can now earn hourly Teto rewards!
          </p>
        </div>
      )}
    </div>
  );
};

export default NFTVerification;
