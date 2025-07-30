// wagmi.config.js
import { http, createConfig } from "wagmi"
import { mainnet, polygon, sepolia } from "wagmi/chains"
import { metaMask, coinbaseWallet, walletConnect, injected } from "wagmi/connectors"

// WalletConnect project ID - get this from https://cloud.walletconnect.com
const projectId = "your-walletconnect-project-id"

export const config = createConfig({
	chains: [mainnet, polygon, sepolia],
	connectors: [
		metaMask({
			dappMetadata: {
				name: "DeFi Lottery",
			},
		}),
		coinbaseWallet({
			appName: "DeFi Lottery",
			appLogoUrl: "https://example.com/logo.png", // Optional
		}),
		walletConnect({
			projectId,
			metadata: {
				name: "DeFi Lottery",
				description: "Secure and Transparent Lottery System",
				url: "https://your-app-url.com",
				icons: ["https://example.com/logo.png"],
			},
		}),
		injected({
			target: () => {
				// Only show injected if it's not MetaMask or Coinbase
				if (window?.ethereum?.isMetaMask || window?.ethereum?.isCoinbaseWallet) {
					return null
				}
				return {
					id: "injected",
					name: "Browser Wallet",
					provider: window?.ethereum,
				}
			},
		}),
	],
	transports: {
		[mainnet.id]: http(),
		[polygon.id]: http(),
		[sepolia.id]: http(),
	},
})

// Optional: Create a separate config for different environments
export const getConfig = (environment = "production") => {
	const chains = environment === "development" ? [mainnet, polygon, sepolia] : [mainnet, polygon]

	return createConfig({
		chains,
		connectors: [
			metaMask(),
			coinbaseWallet({
				appName: "DeFi Lottery",
			}),
			walletConnect({ projectId }),
			injected(),
		],
		transports: Object.fromEntries(chains.map((chain) => [chain.id, http()])),
	})
}
