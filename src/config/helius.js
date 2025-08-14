// Helius RPC configuration for faster Solana performance
export const HELIUS_API_KEY = '6e2b3a8b-d410-46b1-9cc9-53d9dec76d02';

// Helius RPC endpoints
export const HELIUS_RPC_URLS = {
  mainnet: `https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`,
  devnet: `https://rpc-devnet.helius.xyz/?api-key=${HELIUS_API_KEY}`,
};

// Enhanced RPC configuration with Helius optimizations
export const HELIUS_CONNECTION_CONFIG = {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
  disableRetryOnRateLimit: false,
  httpHeaders: {
    'Content-Type': 'application/json',
  },
};

// Network configuration
export const NETWORK = 'mainnet'; // Change to 'devnet' for testing

export const getRPCUrl = () => HELIUS_RPC_URLS[NETWORK];
