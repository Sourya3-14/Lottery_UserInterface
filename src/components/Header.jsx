import React, { useState, useMemo, useEffect } from "react"
import { useAccount, useConnect, useDisconnect, useChainId, useChains, useSwitchChain } from "wagmi"

function Header() {
	const [showWalletOptions, setShowWalletOptions] = useState(false)
	const [showWalletPopup, setShowWalletPopup] = useState(false)
	const [connectionError, setConnectionError] = useState(null)
	const [isDisconnecting, setIsDisconnecting] = useState(false)

	// Wagmi hooks
	const { address, isConnected, connector } = useAccount()
	const { connect, connectors, isPending, error } = useConnect()
	const { disconnect } = useDisconnect()
	const chainId = useChainId()
	const chains = useChains()
	const { switchChain } = useSwitchChain()

	// Force close popup when disconnected
	useEffect(() => {
		if (!isConnected) {
			setShowWalletPopup(false)
		}
	}, [isConnected])

	// Deduplicate connectors to avoid showing MetaMask twice
	const uniqueConnectors = useMemo(() => {
		const seen = new Set()
		return connectors.filter((connector) => {
			// Create a unique key based on connector type and provider
			const key = connector.name?.toLowerCase() || connector.id

			// Skip if we've already seen this connector type
			if (seen.has(key)) {
				return false
			}

			// For injected connectors, check if they're actually available
			if (connector.type === "injected") {
				// Skip if MetaMask or Coinbase specific connectors are already available
				if (connectors.some((c) => c.name === "MetaMask" && c !== connector)) {
					return false
				}
				if (connectors.some((c) => c.name === "Coinbase Wallet" && c !== connector)) {
					return false
				}
				// Only show if there's actually an ethereum provider
				if (!window?.ethereum) {
					return false
				}
			}

			seen.add(key)
			return true
		})
	}, [connectors])

	// Get current chain info
	const currentChain = chains.find((chain) => chain.id === chainId)

	// Format address for display
	const formatAddress = (addr) => {
		if (!addr) return ""
		return `${addr.slice(0, 6)}...${addr.slice(-4)}`
	}

	// Get connector icon
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

	const handleConnect = (connector) => {
		setConnectionError(null) // Clear any previous errors
		connect(
			{ connector },
			{
				onError: (error) => {
					console.error("Connection error:", error)
					setShowWalletOptions(false) // Close the modal
					setConnectionError(error) // Set the error to show

					// Auto-clear error after 5 seconds
					setTimeout(() => {
						setConnectionError(null)
					}, 5000)
				},
				onSuccess: () => {
					setShowWalletOptions(false)
					setConnectionError(null)
				},
			},
		)
	}

	const handleDisconnect = async () => {
		try {
			setIsDisconnecting(true)
			setShowWalletPopup(false)
			
			// Call disconnect
			await disconnect()
			
			// Optional: Add a small delay to ensure state propagation
			setTimeout(() => {
				setIsDisconnecting(false)
			}, 200)
			
		} catch (error) {
			console.error("Disconnect error:", error)
			setIsDisconnecting(false)
		}
	}

	// Show disconnecting state
	if (isDisconnecting) {
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
			{/* Header */}
			<header className="app-header">
				<div className="header-container">
					{/* Left side - App branding */}
					<div className="header-left">
						<div className="app-title">DeFi Lottery</div>
						<span className="app-subtitle">Secure and Transparent Lottery System</span>
					</div>

					{/* Right side - Wallet connection */}
					<div className="wallet-connection">
						{/* Error Toast */}
						{connectionError && (
							<div className="error-toast">
								<div className="error-toast-content">
									<span className="error-icon">⚠️</span>
									<span className="error-text">
										{connectionError.code === 4001
											? "Connection cancelled by user"
											: connectionError.code === -32002
												? "Connection request already pending"
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

						{!isConnected ? (
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

								{/* Wallet Selection Modal */}
								{showWalletOptions && !isPending && (
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
												{uniqueConnectors.map((connector) => {
													const displayName =
														connector.name === "Injected"
															? "Browser Wallet"
															: connector.name

													return (
														<button
															key={connector.uid}
															onClick={() => handleConnect(connector)}
															className="wallet-option"
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
												})}
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

								{/* Wallet Info Popup */}
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