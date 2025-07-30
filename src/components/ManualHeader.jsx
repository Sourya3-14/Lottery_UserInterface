import React, { useState, useEffect } from 'react';

function Header() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [showWalletPopup, setShowWalletPopup] = useState(false);

  // Network configuration
  const networks = {
    '0x1': 'Ethereum Mainnet',
    '0x89': 'Polygon',
    // '0x38': 'BSC',
    // '0xa': 'Optimism',
    // '0xa4b1': 'Arbitrum',
    '0xaa36a7': 'Sepolia Testnet',
    // '0x5': 'Goerli Testnet'
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

  // Save connection to localStorage
  const saveConnection = (walletData, networkData) => {
    try {
      const connectionData = {
        wallet: walletData,
        network: networkData,
        timestamp: Date.now()
      };
      localStorage.setItem('walletConnection', JSON.stringify(connectionData));
    } catch (error) {
      console.error('Failed to save connection:', error);
    }
  };

  // Load connection from localStorage
  const loadConnection = () => {
    try {
      const saved = localStorage.getItem('walletConnection');
      if (saved) {
        const connectionData = JSON.parse(saved);
        // Check if connection is not older than 24 hours
        const isRecent = Date.now() - connectionData.timestamp < 24 * 60 * 60 * 1000;
        if (isRecent) {
          return connectionData;
        } else {
          // Remove old connection
          localStorage.removeItem('walletConnection');
        }
      }
    } catch (error) {
      console.error('Failed to load connection:', error);
      localStorage.removeItem('walletConnection');
    }
    return null;
  };

  // Clear saved connection
  const clearConnection = () => {
    try {
      localStorage.removeItem('walletConnection');
    } catch (error) {
      console.error('Failed to clear connection:', error);
    }
  };

  // Auto-reconnect on page load
  const autoReconnect = async (savedConnection) => {
    if (!savedConnection) return;

    const { wallet, network } = savedConnection;
    setIsConnecting(true);

    try {
      let currentAccount = null;
      
      switch (wallet.id) {
        case 'metamask':
          if (window.ethereum && window.ethereum.isMetaMask) {
            const accounts = await window.ethereum.request({
              method: 'eth_accounts'
            });
            if (accounts.length > 0 && accounts.includes(wallet.account)) {
              currentAccount = wallet.account;
              const networkInfo = await getNetworkInfo(window.ethereum);
              setCurrentNetwork(networkInfo);
            }
          }
          break;
          
        case 'coinbase':
          if (window.ethereum && window.ethereum.isCoinbaseWallet) {
            const accounts = await window.ethereum.request({
              method: 'eth_accounts'
            });
            if (accounts.length > 0 && accounts.includes(wallet.account)) {
              currentAccount = wallet.account;
              const networkInfo = await getNetworkInfo(window.ethereum);
              setCurrentNetwork(networkInfo);
            }
          }
          break;
          
        case 'phantom':
          if (window.solana && window.solana.isPhantom) {
            if (window.solana.isConnected && window.solana.publicKey) {
              const currentKey = window.solana.publicKey.toString();
              if (currentKey === wallet.account) {
                currentAccount = wallet.account;
                setCurrentNetwork({ chainId: 'solana', name: 'Solana Mainnet' });
              }
            }
          }
          break;
      }

      if (currentAccount) {
        setIsConnected(true);
        setConnectedWallet(wallet);
      } else {
        clearConnection();
      }
    } catch (error) {
      console.error('Auto-reconnect failed:', error);
      clearConnection();
    } finally {
      setIsConnecting(false);
    }
  };

  // Load and auto-reconnect on component mount
  useEffect(() => {
    const savedConnection = loadConnection();
    if (savedConnection) {
      autoReconnect(savedConnection);
    }
  }, []);

  const connectWallet = async (walletId) => {
    setIsConnecting(true);
    setShowWalletOptions(false);

    try {
      let account = null;
      
      switch (walletId) {
        case 'metamask':
          if (window.ethereum && window.ethereum.isMetaMask) {
            try {
              await window.ethereum.request({
                method: 'wallet_revokePermissions',
                params: [{ eth_accounts: {} }]
              });
            } catch (error) {
              console.log('Could not revoke permissions:', error);
            }
            
            const accounts = await window.ethereum.request({
              method: 'eth_requestAccounts'
            });
            
            if (accounts.length > 0) {
              account = accounts[0];
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
        const walletData = {
          id: walletId,
          name: walletProviders.find(w => w.id === walletId)?.name,
          account: account
        };
        
        setIsConnected(true);
        setConnectedWallet(walletData);
        saveConnection(walletData, currentNetwork);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
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
    setShowWalletPopup(false);
    clearConnection();
  };

  // Listen for network and account changes
  useEffect(() => {
    if (isConnected && connectedWallet) {
      const handleNetworkChange = async (chainId) => {
        const networkInfo = {
          chainId,
          name: networks[chainId] || `Unknown Network (${chainId})`
        };
        setCurrentNetwork(networkInfo);
        saveConnection(connectedWallet, networkInfo);
      };

      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== connectedWallet.account) {
          const updatedWallet = { ...connectedWallet, account: accounts[0] };
          setConnectedWallet(updatedWallet);
          saveConnection(updatedWallet, currentNetwork);
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
  }, [isConnected, connectedWallet, currentNetwork]);

  return (
    <div>
      {/* Header */}
      <header className="app-header">
        <div className="header-container">
          {/* Left side - App branding */}
          <div className="header-left">
            <div className="app-title">
              DeFi Connect
            </div>
            <span className="app-subtitle">
              Secure wallet connections
            </span>
          </div>

          {/* Right side - Wallet connection */}
          <div className="wallet-connection">
            {!isConnected ? (
              <div>
                {isConnecting ? (
                  <div className="connecting-status">
                    <div className="loading-spinner"></div>
                    <span className="connecting-text">Connecting...</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowWalletOptions(!showWalletOptions)}
                    className="connect-button"
                  >
                    Connect Wallet
                  </button>
                )}

                {/* Wallet Selection Modal */}
                {showWalletOptions && !isConnecting && (
                  <div className="modal-overlay">
                    <div className="modal-content">
                      <button
                        onClick={() => setShowWalletOptions(false)}
                        className="modal-close"
                      >
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
                            <div className="wallet-info">
                              <span className="wallet-name">{wallet.name}</span>
                              {!wallet.available && (
                                <span className="wallet-status">Not installed</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div
                  className="connected-wallet"
                  onMouseEnter={() => setShowWalletPopup(true)}
                  onMouseLeave={() => setShowWalletPopup(false)}
                >
                  <div className="connection-indicator"></div>
                  <span className="wallet-address">
                    {connectedWallet?.account?.slice(0, 6)}...{connectedWallet?.account?.slice(-4)}
                  </span>
                </div>

                {/* Wallet Info Popup */}
                {showWalletPopup && (
                  <div
                    className="wallet-popup"
                    onMouseEnter={() => setShowWalletPopup(true)}
                    onMouseLeave={() => setShowWalletPopup(false)}
                  >
                    <div className="popup-header">
                      <div className="popup-wallet-icon">
                        {connectedWallet?.id === 'metamask' && '🦊'}
                        {connectedWallet?.id === 'coinbase' && '🔵'}
                        {connectedWallet?.id === 'walletconnect' && '🔗'}
                        {connectedWallet?.id === 'phantom' && '👻'}
                      </div>
                      <span className="popup-wallet-name">{connectedWallet?.name}</span>
                    </div>
                    
                    <div className="popup-section">
                      <div className="popup-label">
                        Wallet Address
                      </div>
                      <div className="popup-address">
                        {connectedWallet?.account}
                      </div>
                    </div>

                    {currentNetwork && (
                      <div className="popup-section">
                        <div className="popup-label">
                          Network
                        </div>
                        <div className="popup-network">
                          <div className="network-indicator"></div>
                          <span>{currentNetwork.name}</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={disconnectWallet}
                      className="disconnect-button"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

    </div>
  );
}

export default Header;