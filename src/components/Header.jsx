import React, { useState, useMemo, useEffect } from "react"
import { useAccount, useConnect, useDisconnect, useChainId, useChains, useSwitchChain } from "wagmi"

function Header() {
	const [showWalletOptions, setShowWalletOptions] = useState(false)
	const [showWalletPopup, setShowWalletPopup] = useState(false)
	const [connectionError, setConnectionError] = useState(null)
	const [isDisconnecting, setIsDisconnecting] = useState(false)
	const [isInitialized, setIsInitialized] = useState(false)

	// Wagmi hooks
	const { address, isConnected, connector, status } = useAccount()
	const { connect, connectors, isPending, error } = useConnect()
	const { disconnect } = useDisconnect()
	const chainId = useChainId()
	const chains = useChains()
	const { switchChain } = useSwitchChain()

	// Wait for Wagmi to initialize properly
	useEffect(() => {
		const timer = setTimeout(() => {
			setIsInitialized(true)
		}, 500)
		return () => clearTimeout(timer)
	}, [])

	useEffect(() => {
		if (connectors && connectors.length > 0) {
			setIsInitialized(true)
		}
	}, [connectors])

	// Force close popups when disconnected and clear disconnecting state
	useEffect(() => {
		if (!isConnected || status === 'disconnected') {
			setShowWalletPopup(false)
			setShowWalletOptions(false)
			setIsDisconnecting(false)
			setConnectionError(null)
		}
	}, [isConnected, status])

	// Clear connection error when successfully connected
	useEffect(() => {
		if (isConnected && status === 'connected') {
			setConnectionError(null)
			setShowWalletOptions(false)
			setIsDisconnecting(false)
		}
	}, [isConnected, status])

	// Deduplicate connectors
	const uniqueConnectors = useMemo(() => {
		const seen = new Set()
		return connectors.filter((connector) => {
			const key = connector.name?.toLowerCase() || connector.id

			if (seen.has(key)) {
				return false
			}

			if (connector.type === "injected") {
				if (connectors.some((c) => c.name === "MetaMask" && c !== connector)) {
					return false
				}
				if (connectors.some((c) => c.name === "Coinbase Wallet" && c !== connector)) {
					return false
				}
				if (!window?.ethereum) {
					return false
				}
			}

			seen.add(key)
			return true
		})
	}, [connectors])

	const currentChain = chains.find((chain) => chain.id === chainId)

	const formatAddress = (addr) => {
		if (!addr) return ""
		return `${addr.slice(0, 6)}...${addr.slice(-4)}`
	}

	const getConnectorIcon = (connectorName, connectorId) => {
		const name = connectorName?.toLowerCase()
		const id = connectorId?.toLowerCase()

		if (name?.includes("metamask") || id?.includes("metamask")) return "🦊"
		if (name?.includes("coinbase") || id?.includes("coinbase")) return "🔵"
		if (name?.includes("walletconnect") || id?.includes("walletconnect")) return "🔗"
		if (name?.includes("phantom") || id?.includes("phantom")) return "👻"
		if (name?.includes("injected") || id?.includes("injected")) return "💼"
		return "💼"
	}

	const handleConnect = async (connector) => {
		try {
			setConnectionError(null)
			
			// Wait for initialization if not ready
			if (!isInitialized) {
				console.log("Waiting for Wagmi initialization...")
				await new Promise(resolve => {
					const checkInit = () => {
						if (isInitialized || (connectors && connectors.length > 0)) {
							resolve()
						} else {
							setTimeout(checkInit, 100)
						}
					}
					checkInit()
				})
			}
			
			// SOLUTION 1: Check if this specific connector is already connected
			if (isConnected && connector?.uid === connector?.uid) {
				console.log("Same connector already connected, disconnecting first...")
				await handleDisconnect()
				// Wait longer for state to clear
				await new Promise(resolve => setTimeout(resolve, 1000))
			}
			
			// SOLUTION 2: Always wait for disconnected state before connecting
			if (status !== 'disconnected') {
				console.log("Waiting for disconnected state...")
				await new Promise((resolve) => {
					const checkDisconnected = () => {
						if (status === 'disconnected' && !isConnected) {
							resolve()
						} else {
							setTimeout(checkDisconnected, 100)
						}
					}
					checkDisconnected()
				})
			}
			
			// Find fresh connector instance
			const freshConnector = connectors.find(c => 
				c.name === connector.name && 
				c.type === connector.type
			)
			
			if (!freshConnector) {
				throw new Error("Connector no longer available")
			}
			
			console.log("Attempting to connect with:", freshConnector.name)
			
			// SOLUTION 3: Use the connect function with proper error handling
			await new Promise((resolve, reject) => {
				connect(
					{ connector: freshConnector },
					{
						onError: (error) => {
							console.error("Connection error:", error)
							
							// Handle specific "already connected" error
							if (error.message?.includes('already connected') || 
								error.message?.includes('Connector already connected')) {
								console.log("Handling 'already connected' error, forcing disconnect...")
								
								// Force disconnect and retry
								disconnect(undefined, {
									onSuccess: () => {
										setTimeout(() => {
											// Retry connection after disconnect
											connect({ connector: freshConnector })
										}, 1000)
									}
								})
								return
							}
							
							setShowWalletOptions(false)
							setConnectionError(error)
							
							setTimeout(() => {
								setConnectionError(null)
							}, 5000)
							
							reject(error)
						},
						onSuccess: () => {
							console.log("Connection successful")
							setShowWalletOptions(false)
							setConnectionError(null)
							setIsDisconnecting(false)
							resolve()
						},
					}
				)
			})
			
		} catch (error) {
			console.error("Connect handler error:", error)
			setConnectionError(error)
			setShowWalletOptions(false)
		}
	}

	const handleDisconnect = async () => {
		try {
			setIsDisconnecting(true)
			setShowWalletPopup(false)
			setConnectionError(null)
			
			// SOLUTION 4: Ensure complete disconnection
			await new Promise((resolve) => {
				disconnect(undefined, {
					onSuccess: () => {
						console.log("Disconnect successful")
						resolve()
					},
					onError: (error) => {
						console.error("Disconnect error:", error)
						// Still resolve to continue
						resolve()
					}
				})
				
				// Fallback timeout
				setTimeout(() => {
					console.log("Disconnect timeout fallback")
					resolve()
				}, 2000)
			})
			
			// SOLUTION 5: Wait for state to propagate completely
			await new Promise(resolve => setTimeout(resolve, 500))
			
		} catch (error) {
			console.error("Disconnect handler error:", error)
		} finally {
			setTimeout(() => {
				setIsDisconnecting(false)
			}, 500)
		}
	}

	const actuallyConnected = isConnected && status === 'connected' && address && !isDisconnecting

	// Show disconnecting state
	if (isDisconnecting && !actuallyConnected) {
		return (
			<div>
				<header className="app-header">
					<div className="header-container">
						<div className="header-left">
							<div className="app-title">DeFi Lottery</div>
							<span className="app-subtitle">Secure and Transparent Lottery System</span>
						</div>
						<div className="wallet-connection">
							<div className="connecting-status">
								<div className="loading-spinner"></div>
								<span className="connecting-text">Disconnecting...</span>
							</div>
						</div>
					</div>
				</header>
			</div>
		)
	}

	return (
		<div>
			<header className="app-header">
				<div className="header-container">
					<div className="header-left">
						<div className="app-title">DeFi Lottery</div>
						<span className="app-subtitle">Secure and Transparent Lottery System</span>
					</div>

					<div className="wallet-connection">
						{connectionError && (
							<div className="error-toast">
								<div className="error-toast-content">
									<span className="error-icon">⚠️</span>
									<span className="error-text">
										{connectionError.code === 4001
											? "Connection cancelled by user"
											: connectionError.code === -32002
												? "Connection request already pending"
												: connectionError.message?.includes('already connected')
													? "Please try again in a moment"
													: `Connection failed: ${connectionError.message}`}
									</span>
									<button
										onClick={() => setConnectionError(null)}
										className="error-close"
									>
										×
									</button>
								</div>
							</div>
						)}

						{!actuallyConnected ? (
							<div>
								{isPending ? (
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

								{showWalletOptions && !isPending && isInitialized && (
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
												{uniqueConnectors.length > 0 ? (
													uniqueConnectors.map((connector) => {
														const displayName =
															connector.name === "Injected"
																? "Browser Wallet"
																: connector.name

														return (
															<button
																key={connector.uid}
																onClick={() => handleConnect(connector)}
																className="wallet-option"
																// Disable if still disconnecting
																disabled={isDisconnecting}
															>
																<div className="wallet-icon">
																	{getConnectorIcon(
																		connector.name,
																		connector.id,
																	)}
																</div>
																<div className="wallet-info">
																	<span className="wallet-name">
																		{displayName}
																	</span>
																</div>
															</button>
														)
													})
												) : (
													<div style={{ 
														padding: '20px', 
														textAlign: 'center', 
														color: '#94a3b8' 
													}}>
														Loading wallets...
													</div>
												)}
											</div>
										</div>
									</div>
								)}
							</div>
						) : (
							<div style={{ position: "relative" }}>
								<div
									className="connected-wallet"
									onMouseEnter={() => setShowWalletPopup(true)}
									onMouseLeave={() => setShowWalletPopup(false)}
								>
									<div className="connection-indicator"></div>
									<span className="wallet-address">{formatAddress(address)}</span>
								</div>

								{showWalletPopup && (
									<div
										className="wallet-popup"
										onMouseEnter={() => setShowWalletPopup(true)}
										onMouseLeave={() => setShowWalletPopup(false)}
									>
										<div className="popup-header">
											<div className="popup-wallet-icon">
												{getConnectorIcon(connector?.name, connector?.id)}
											</div>
											<span className="popup-wallet-name">
												{connector?.name === "Injected"
													? "Browser Wallet"
													: connector?.name}
											</span>
										</div>

										<div className="popup-section">
											<div className="popup-label">Wallet Address</div>
											<div className="popup-address">{address}</div>
											<button
												onClick={() =>
													navigator.clipboard.writeText(address)
												}
												className="copy-button"
											>
												Copy
											</button>
										</div>

										{currentChain && (
											<div className="popup-section">
												<div className="popup-label">Network</div>
												<div className="popup-network">
													<div className="network-indicator"></div>
													<span>{currentChain.name}</span>
												</div>
											</div>
										)}

										<button
											onClick={handleDisconnect}
											className="disconnect-button"
											disabled={isDisconnecting}
										>
											{isDisconnecting ? "Disconnecting..." : "Disconnect Wallet"}
										</button>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</header>
		</div>
	)
}

export default Header