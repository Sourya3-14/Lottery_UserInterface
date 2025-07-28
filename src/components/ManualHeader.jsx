import React, { useState } from 'react';

function Header() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Wallet providers configuration
  const walletProviders = [
    {
      id: 'metamask',
      name: 'MetaMask',
      available: typeof window !== 'undefined' && window.ethereum?.isMetaMask
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      available: true
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      available: typeof window !== 'undefined' && window.ethereum?.isCoinbaseWallet
    },
    {
      id: 'phantom',
      name: 'Phantom',
      available: typeof window !== 'undefined' && window.solana?.isPhantom
    }
  ];

  const connectWallet = async (walletId) => {
    setIsConnecting(true);
    setShowWalletOptions(false);

    try {
      let account = null;
      
      switch (walletId) {
        case 'metamask':
          if (window.ethereum && window.ethereum.isMetaMask) {
            const accounts = await window.ethereum.request({
              method: 'eth_requestAccounts'
            });
            account = accounts[0];
          } else {
            throw new Error('MetaMask not found');
          }
          break;
          
        case 'walletconnect':
          // Simulate WalletConnect connection
          await new Promise(resolve => setTimeout(resolve, 2000));
          account = '0x' + Math.random().toString(16).substr(2, 40);
          break;
          
        case 'coinbase':
          if (window.ethereum && window.ethereum.isCoinbaseWallet) {
            const accounts = await window.ethereum.request({
              method: 'eth_requestAccounts'
            });
            account = accounts[0];
          } else {
            throw new Error('Coinbase Wallet not found');
          }
          break;
          
        case 'phantom':
          if (window.solana && window.solana.isPhantom) {
            const response = await window.solana.connect();
            account = response.publicKey.toString();
          } else {
            throw new Error('Phantom wallet not found');
          }
          break;
          
        default:
          throw new Error('Unsupported wallet');
      }

      if (account) {
        setIsConnected(true);
        setConnectedWallet({
          id: walletId,
          name: walletProviders.find(w => w.id === walletId)?.name,
          account: account
        });
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert(`Failed to connect to wallet: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setConnectedWallet(null);
  };

  return (
    <div>
      {!isConnected ? (
        <div>
          <button onClick={() => setShowWalletOptions(!showWalletOptions)}>
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>

          {showWalletOptions && !isConnecting && (
            <div className="modal-overlay" onClick={() => setShowWalletOptions(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setShowWalletOptions(false)} className="modal-close">
                  ×
                </button>

                <h2 className="modal-title">Connect your wallet</h2>

                {/* <div className="terms-container">
                  <input type="checkbox" id="terms" className="terms-checkbox" />
                  <label htmlFor="terms" className="terms-label">
                    I accept the Chainlink Foundation{' '}
                    <a href="#" className="terms-link">Terms of Service</a>
                  </label>
                </div> */}

                <div className="wallet-grid">
                  {walletProviders.map((wallet) => (
                    <button
                      key={wallet.id}
                      onClick={() => connectWallet(wallet.id)}
                      disabled={!wallet.available}
                      className={`wallet-option ${!wallet.available ? 'wallet-option-disabled' : ''}`}
                    >
                      <div className="wallet-icon">
                        {wallet.id === 'metamask' && '🦊'}
                        {wallet.id === 'coinbase' && '🔵'}
                        {wallet.id === 'walletconnect' && '🔗'}
                        {wallet.id === 'phantom' && '👻'}
                      </div>
                      <span className="wallet-name">{wallet.name}</span>
                      {!wallet.available && (
                        <span className="wallet-status">Not installed</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <span>Connected: {connectedWallet?.name}</span>
          <button onClick={disconnectWallet}>Disconnect</button>
        </div>
      )}
    </div>
  );
}

export default Header;