import React from 'react';
import WalletContextProvider from './components/WalletProvider';
import RewardsApp from './components/RewardsApp';
import './index.css';

function App() {
  return (
    <WalletContextProvider>
      <RewardsApp />
    </WalletContextProvider>
  );
}

export default App;
