import React, { useState, useEffect } from 'react';

function Header() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null);

  // Network configuration
  const networks = {
    '0x1': 'Ethereum Mainnet',
    '0x89': 'Polygon',
    '0x38': 'BSC',
    '0xa': 'Optimism',
    '0xa4b1': 'Arbitrum',
    '0xaa36a7': 'Sepolia Testnet',
    '0x5': 'Goerli Testnet'
  };

  const getNetworkInfo = async (provider) => {
    try {
      const chainId = await provider.request({ method: 'eth_chainId' });
      return {
        chainId,
        name: networks[chainId] || `Unknown Network (${chainId})`
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      return null;
    }
  };

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
    setShowWalletOptions(false); // Close wallet selection modal first

    try {
      let account = null;
      
      switch (walletId) {
        case 'metamask':
          if (window.ethereum && window.ethereum.isMetaMask) {
            try {
              // First, disconnect any existing connections to force account selection
              await window.ethereum.request({
                method: 'wallet_revokePermissions',
                params: [{ eth_accounts: {} }]
              });
            } catch (error) {
              // Ignore if revokePermissions fails (older MetaMask versions)
              console.log('Could not revoke permissions:', error);
            }
            
            // This will now force MetaMask's account selection popup
            const accounts = await window.ethereum.request({
              method: 'eth_requestAccounts'
            });
            
            if (accounts.length > 0) {
              // Use the account(s) selected by user in MetaMask popup
              account = accounts[0]; // MetaMask returns the selected account first
              const networkInfo = await getNetworkInfo(window.ethereum);
              setCurrentNetwork(networkInfo);
            }
          } else {
            throw new Error('MetaMask not found. Please install MetaMask.');
          }
          break;
          
        case 'walletconnect':
          throw new Error('WalletConnect needs proper SDK integration.');
          break;
          
        case 'coinbase':
          if (window.ethereum && window.ethereum.isCoinbaseWallet) {
            // This will trigger Coinbase Wallet's confirmation popup
            const accounts = await window.ethereum.request({
              method: 'eth_requestAccounts'
            });
            if (accounts.length > 0) {
              account = accounts[0];
              const networkInfo = await getNetworkInfo(window.ethereum);
              setCurrentNetwork(networkInfo);
            }
          } else {
            throw new Error('Coinbase Wallet not found. Please install it.');
          }
          break;
          
        case 'phantom':
          if (window.solana && window.solana.isPhantom) {
            // This will trigger Phantom's confirmation popup
            const response = await window.solana.connect();
            if (response.publicKey) {
              account = response.publicKey.toString();
              setCurrentNetwork({ chainId: 'solana', name: 'Solana Mainnet' });
            }
          } else {
            throw new Error('Phantom wallet not found. Please install it.');
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
      // Show user-friendly error messages
      if (error.code === 4001) {
        alert('Connection request was rejected by user.');
      } else if (error.code === -32002) {
        alert('Connection request is already pending. Please check your wallet.');
      } else {
        alert(`Failed to connect: ${error.message}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setConnectedWallet(null);
    setCurrentNetwork(null);
  };

  // Listen for network changes
  useEffect(() => {
    if (isConnected && connectedWallet) {
      const handleNetworkChange = async (chainId) => {
        const networkInfo = {
          chainId,
          name: networks[chainId] || `Unknown Network (${chainId})`
        };
        setCurrentNetwork(networkInfo);
      };

      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        }
      };

      if (window.ethereum && (connectedWallet.id === 'metamask' || connectedWallet.id === 'coinbase')) {
        window.ethereum.on('chainChanged', handleNetworkChange);
        window.ethereum.on('accountsChanged', handleAccountsChanged);

        return () => {
          if (window.ethereum.removeListener) {
            window.ethereum.removeListener('chainChanged', handleNetworkChange);
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          }
        };
      }
    }
  }, [isConnected, connectedWallet]);

  const refreshNetworkInfo = async () => {
    if (isConnected && connectedWallet) {
      try {
        if (connectedWallet.id === 'metamask' || connectedWallet.id === 'coinbase') {
          const networkInfo = await getNetworkInfo(window.ethereum);
          setCurrentNetwork(networkInfo);
        }
      } catch (error) {
        console.error('Failed to refresh network info:', error);
      }
    }
  };

  return (
    <div>
      {!isConnected ? (
        <div>
          <button onClick={() => setShowWalletOptions(!showWalletOptions)}>
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>

          {/* Wallet Selection Modal */}
          {showWalletOptions && !isConnecting && (
            <div className="modal-overlay" onClick={() => setShowWalletOptions(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setShowWalletOptions(false)} className="modal-close">
                  ×
                </button>

                <h2 className="modal-title">Connect your wallet</h2>

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
          <span> | Account: {connectedWallet?.account?.slice(0, 6)}...{connectedWallet?.account?.slice(-4)}</span>
          {currentNetwork && (
            <span> | Network: {currentNetwork.name}</span>
          )}
          <button onClick={refreshNetworkInfo}>🔄</button>
          <button onClick={disconnectWallet}>Disconnect</button>
        </div>
      )}
    </div>
  );
}

export default Header;