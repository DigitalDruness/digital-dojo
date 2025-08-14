<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Digital Dojo</title>
    <!-- Tailwind CSS from CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Font Imports */
        @import url('https://fonts.googleapis.com/css2?family=VT323&family=Noto+Sans+JP:wght@700&family=Zen+Antique&display=swap');
        .font-vt323 { font-family: 'VT323', monospace; }
        .font-noto-sans-jp { font-family: 'Noto Sans JP', sans-serif; }
        .font-zen-antique { font-family: 'Zen Antique', serif; }

        body {
            font-family: 'VT323', monospace;
        }

        /* Custom Styles for Phantom/Solflare Button */
        .wallet-connect-button {
            width: 100%;
            background: linear-gradient(to right, #dc2626, #b91c1c);
            border-width: 2px;
            border-color: #fca5a5;
            color: white;
            font-weight: bold;
            padding: 1rem 2rem;
            font-size: 1.125rem;
            border-radius: 0.75rem;
            transition-property: all;
            transition-duration: 300ms;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            cursor: pointer;
        }
        .wallet-connect-button:hover {
            background: linear-gradient(to right, #b91c1c, #991b1b);
            box-shadow: 0 20px 25px -5px rgba(239, 68, 68, 0.5), 0 10px 10px -5px rgba(239, 68, 68, 0.4);
        }
    </style>
</head>
<body class="bg-gray-900 text-white min-h-screen relative overflow-hidden font-vt323">

    <!-- Background Image and Overlay -->
    <div
        class="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style="
            background-image: url('dojo-bg.jpg');
            filter: brightness(0.4);
            background-size: cover;
            background-position: center;
        ">
    </div>
    <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>

    <!-- Digital-Dojo Red Banner -->
    <div class="relative z-10 bg-gradient-to-r from-red-600 via-red-500 to-red-600 border-b-4 border-red-400 shadow-lg">
        <div class="max-w-6xl mx-auto px-4 py-3">
            <div class="flex items-center justify-center space-x-3">
                <h1 class="text-3xl font-bold text-red-900 tracking-wider">
                    <span class="font-zen-antique text-4xl">⛩</span>
                    <span class="font-noto-sans-jp text-4xl">DIGITAL DOJO</span>
                    <span class="font-zen-antique text-4xl">⛩</span>
                </h1>
            </div>
        </div>
    </div>

    <!-- Main Content Container -->
    <div class="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)] p-4">
        <div class="text-center max-w-2xl">
            <!-- Content will be rendered here by JavaScript -->
            <div id="app-container" class="bg-black/60 backdrop-blur-lg rounded-3xl p-10 border-2 border-red-500/50 shadow-2xl">
                <!-- UI will be rendered by the script -->
            </div>
        </div>
    </div>
    
    <!-- Modal for Wallet Selection -->
    <div id="wallet-modal" class="fixed inset-0 bg-black/50 backdrop-blur-sm hidden items-center justify-center p-4">
        <div class="bg-black/80 p-6 rounded-lg shadow-xl max-w-sm w-full border-2 border-red-500/50">
            <h3 class="text-2xl font-bold text-red-900 mb-4">Connect Wallet</h3>
            <div id="wallet-options" class="space-y-4">
                <button class="wallet-option-btn w-full py-3 px-6 rounded-lg text-white font-bold bg-gray-800 hover:bg-gray-700 transition-colors" data-wallet="Phantom">
                    <img src="https://phantom.app/ul/v1/logo.svg" alt="Phantom" class="w-6 h-6 inline-block mr-2" />
                    Phantom
                </button>
                <button class="wallet-option-btn w-full py-3 px-6 rounded-lg text-white font-bold bg-gray-800 hover:bg-gray-700 transition-colors" data-wallet="Solflare">
                    <img src="https://solflare.com/logo.svg" alt="Solflare" class="w-6 h-6 inline-block mr-2" />
                    Solflare
                </button>
            </div>
            <button id="modal-close-btn" class="mt-4 w-full py-2 px-6 rounded-lg text-red-400 font-bold hover:text-red-300">
                Cancel
            </button>
        </div>
    </div>

    <script>
        // --- State Management and UI Logic ---
        let tetoBalance = 0;
        let isVerified = false;
        let lastClaimTime = null;
        let timeUntilNextClaim = 0;
        let timerInterval = null;
        let wallet = null;
        let publicKey = null;

        const appContainer = document.getElementById('app-container');
        const walletModal = document.getElementById('wallet-modal');
        const modalCloseBtn = document.getElementById('modal-close-btn');
        const walletOptionBtns = document.querySelectorAll('.wallet-option-btn');

        // Function to render the UI based on connection state
        function renderUI() {
            const connected = !!publicKey;

            if (!connected) {
                appContainer.innerHTML = `
                    <div class="mb-6">
                        <h3 class="text-3xl font-bold text-red-900 mb-4 font-noto-sans-jp">
                            TRUE DEGENS WELCOME
                        </h3>
                        <p class="text-red-200 text-lg leading-relaxed">
                            Connect your Solana wallet to verify your holder status and begin your training. Earn <span class="text-red-900 font-bold">Teto</span> rewards every hour and test your luck on the <span class="text-red-900 font-bold">Wheel</span>!
                        </p>
                    </div>
                    <div class="text-center mb-6">
                        <p class="mb-2 text-red-200 font-semibold flex items-center justify-center space-x-2">
                            <span class="text-red-900">⛩</span>
                            <span>Hourly Teto Rewards</span>
                        </p>
                        <p class="mb-2 text-red-200 font-semibold flex items-center justify-center space-x-2">
                            <span class="text-red-900">⛩</span>
                            <span>Lottery Wheel Gambling</span>
                        </p>
                        <p class="text-red-200 font-semibold flex items-center justify-center space-x-2">
                            <span class="text-red-900">⛩</span>
                            <span>Degen Duels</span>
                        </p>
                    </div>
                    <div class="relative">
                        <button id="connect-button" class="wallet-connect-button">Connect Wallet</button>
                        <div class="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-400 rounded-xl blur opacity-30 animate-pulse"></div>
                    </div>
                `;
                
                const connectButton = document.getElementById('connect-button');
                if (connectButton) {
                    connectButton.addEventListener('click', () => {
                        walletModal.style.display = 'flex';
                    });
                }
            } else {
                // Connected state UI
                appContainer.innerHTML = `
                    <header class="mb-8">
                        <div class="flex justify-between items-center">
                            <div>
                                <h2 class="text-3xl font-bold text-red-900">TETO REWARDS</h2>
                            </div>
                            <div class="flex items-center space-x-4">
                                <button id="disconnect-button" class="bg-gray-700 hover:bg-gray-800 text-red-900 font-bold py-2 px-4 rounded-xl transition-colors">
                                    Disconnect
                                </button>
                                <span class="text-red-900">Connected: ${truncatePublicKey(publicKey)}</span>
                            </div>
                        </div>
                    </header>
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div class="lg:col-span-1 space-y-6">
                            <div class="bg-black/60 backdrop-blur-lg rounded-3xl p-8 border-2 border-red-500/50 shadow-2xl">
                                <h3 class="text-2xl font-bold text-red-900 mb-4 font-vt323">NFT Verification</h3>
                                <p class="text-red-200 font-vt323">
                                    ${isVerified ? "You are a verified NFT warrior!" : "Verify your NFT to claim rewards."}
                                </p>
                            </div>
                            <div class="bg-black/60 backdrop-blur-lg rounded-3xl p-8 border-2 border-red-500/50 shadow-2xl">
                                <h3 class="text-2xl font-bold text-red-900 mb-4 font-vt323">Teto Rewards</h3>
                                <div class="flex items-center space-x-2 mt-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-yellow-400">
                                        <circle cx="8" cy="8" r="6" />
                                        <path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1.22a9 9 0 0 0 6.66 12.66" />
                                    </svg>
                                    <span class="text-4xl font-bold text-red-900 font-vt323">${tetoBalance} TETO</span>
                                </div>
                                <div class="mt-4">
                                    <div class="flex items-center justify-between text-red-200 font-vt323">
                                        <div class="flex items-center space-x-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-red-400">
                                                <circle cx="12" cy="12" r="10" />
                                                <polyline points="12 6 12 12 16 14" />
                                            </svg>
                                            <span>Next Claim:</span>
                                        </div>
                                        <span id="claim-timer" class="text-xl font-bold">
                                            ${isVerified ? formatTime(timeUntilNextClaim) : 'Not Verified'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    id="claim-reward-btn"
                                    class="w-full mt-6 py-3 px-6 rounded-xl font-bold transition-all duration-300 font-vt323 ${!isVerified || timeUntilNextClaim > 0 ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/50'}"
                                    ${!isVerified || timeUntilNextClaim > 0 ? 'disabled' : ''}
                                >
                                    Claim 10 TETO
                                </button>
                            </div>
                        </div>
                        <div class="lg:col-span-2">
                            <div class="bg-black/60 backdrop-blur-lg rounded-3xl p-8 border-2 border-red-500/50 shadow-2xl">
                                <h3 class="text-2xl font-bold text-red-900 mb-4 font-vt323">Lottery Wheel</h3>
                                <p class="text-red-200 font-vt323">
                                    The wheel of fortune is not yet implemented.
                                </p>
                            </div>
                        </div>
                    </div>
                `;

                const disconnectButton = document.getElementById('disconnect-button');
                if (disconnectButton) {
                    disconnectButton.addEventListener('click', () => {
                        wallet.disconnect();
                        publicKey = null;
                        renderUI();
                    });
                }

                const claimButton = document.getElementById('claim-reward-btn');
                if (claimButton) {
                    claimButton.addEventListener('click', claimHourlyReward);
                }
            }
        }

        // --- App Logic Functions ---
        async function connectWallet(walletName) {
            try {
                if (walletName === 'Phantom') {
                    if (!window.solana || !window.solana.isPhantom) {
                        alert('Phantom wallet not found. Please install it.');
                        return;
                    }
                    wallet = window.solana;
                } else if (walletName === 'Solflare') {
                    if (!window.solflare) {
                        alert('Solflare wallet not found. Please install it.');
                        return;
                    }
                    wallet = window.solflare;
                } else {
                    return;
                }

                const resp = await wallet.connect();
                publicKey = resp.publicKey;
                walletModal.style.display = 'none';
                loadState();
                renderUI();

            } catch (err) {
                console.error('Wallet connection failed:', err);
            }
        }

        function loadState() {
            if (publicKey) {
                const pubKey = publicKey.toString();
                const savedBalance = localStorage.getItem(`teto_balance_${pubKey}`);
                const savedLastClaim = localStorage.getItem(`last_claim_${pubKey}`);
                const savedVerification = localStorage.getItem(`verified_${pubKey}`);
                
                tetoBalance = savedBalance ? parseInt(savedBalance) : 0;
                lastClaimTime = savedLastClaim ? parseInt(savedLastClaim) : null;
                isVerified = savedVerification ? JSON.parse(savedVerification) : false;
            } else {
                 tetoBalance = 0;
                 isVerified = false;
                 lastClaimTime = null;
                 timeUntilNextClaim = 0;
            }
        }

        function claimHourlyReward() {
            if (!isVerified || !publicKey) return;
            
            const now = Date.now();
            const hourInMs = 60 * 60 * 1000;
            
            if (!lastClaimTime || (now - lastClaimTime) >= hourInMs) {
                const reward = 10;
                tetoBalance += reward;
                lastClaimTime = now;
                
                const pubKey = publicKey.toString();
                localStorage.setItem(`teto_balance_${pubKey}`, tetoBalance.toString());
                localStorage.setItem(`last_claim_${pubKey}`, now.toString());
                renderUI();
            }
        }
        
        function formatTime(ms) {
            const minutes = Math.floor(ms / (1000 * 60));
            const seconds = Math.floor((ms % (1000 * 60)) / 1000);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        function truncatePublicKey(key) {
            if (!key) return '';
            const keyStr = key.toString();
            return `${keyStr.substring(0, 4)}...${keyStr.slice(-4)}`;
        }

        // --- Event Listeners and Initial Setup ---
        window.addEventListener('load', () => {
            // Initial render
            loadState();
            renderUI();

            // Set up modal listeners
            modalCloseBtn.addEventListener('click', () => {
                walletModal.style.display = 'none';
            });

            walletOptionBtns.forEach(button => {
                button.addEventListener('click', (event) => {
                    const walletName = event.target.dataset.wallet;
                    connectWallet(walletName);
                });
            });

            // Start the timer
            timerInterval = setInterval(() => {
                if (lastClaimTime) {
                    const now = Date.now();
                    const hourInMs = 60 * 60 * 1000;
                    const timeSinceLastClaim = now - lastClaimTime;
                    const timeLeft = hourInMs - timeSinceLastClaim;
                    timeUntilNextClaim = timeLeft > 0 ? timeLeft : 0;
                    const timerEl = document.getElementById('claim-timer');
                    const claimBtn = document.getElementById('claim-reward-btn');
                    if (timerEl) {
                       timerEl.textContent = isVerified ? formatTime(timeUntilNextClaim) : 'Not Verified';
                    }
                    if (claimBtn) {
                       claimBtn.disabled = !isVerified || timeUntilNextClaim > 0;
                       claimBtn.classList.toggle('bg-gray-700', !isVerified || timeUntilNextClaim > 0);
                       claimBtn.classList.toggle('text-gray-400', !isVerified || timeUntilNextClaim > 0);
                       claimBtn.classList.toggle('bg-green-600', isVerified && timeUntilNextClaim === 0);
                       claimBtn.classList.toggle('hover:bg-green-700', isVerified && timeUntilNextClaim === 0);
                    }
                }
            }, 1000);
        });
    </script>
</body>
</html>
