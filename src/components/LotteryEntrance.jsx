import React, { useState, useEffect, useRef } from "react"
import {
	useAccount,
	useReadContract,
	useWriteContract,
	useWaitForTransactionReceipt,
	useBalance,
	useWatchContractEvent,
} from "wagmi"
import { formatEther } from "viem"
import abi from "../abi/Raffle.json"

const LOTTERY_ABI = abi.abi
const CONTRACT_ADDRESS = "0x67c768ab102c7f458dfa8c5c60743a9ec58c6255"

// Winner Popup Component
const WinnerPopup = ({ winner, isVisible, onClose, prizeAmount }) => {
	const formatAddress = (addr) => {
		if (!addr || addr === "0x0000000000000000000000000000000000000000") return "None"
		return `${addr.slice(0, 6)}...${addr.slice(-4)}`
	}

	if (!isVisible) return null

	return (
		<div className="popup-overlay" onClick={onClose}>
			<div className="winner-popup" onClick={(e) => e.stopPropagation()}>
				<div className="popup-header">
					<h2>🎉 We Have a Winner! 🎉</h2>
					<button className="close-button" onClick={onClose}>×</button>
				</div>
				<div className="popup-content">
					<div className="winner-trophy">🏆</div>
					<div className="winner-info">
						<div className="winner-label">Winner Address:</div>
						<div className="winner-address-large">{formatAddress(winner)}</div>
					</div>
					{prizeAmount && (
						<div className="prize-info">
							<div className="prize-label">Prize Amount:</div>
							<div className="prize-amount">{formatEther(prizeAmount)} ETH</div>
						</div>
					)}
					<div className="congratulations">
						Congratulations to the winner! 🎊
					</div>
				</div>
				<div className="popup-footer">
					<button className="celebrate-button" onClick={onClose}>
						Celebrate! 🎉
					</button>
				</div>
			</div>
		</div>
	)
}

function LotteryEntrance() {
	const [numberOfEntries, setNumberOfEntries] = useState(1)
	const [transactionStatus, setTransactionStatus] = useState(null)
	const [error, setError] = useState(null)
	
	// Winner popup state
	const [showWinnerPopup, setShowWinnerPopup] = useState(false)
	const [newWinner, setNewWinner] = useState(null)
	const [prizeAmount, setPrizeAmount] = useState(null)
	
	// Ref to track if we've seen a winner event during this session
	const hasSeenWinnerEvent = useRef(false)
	const previousWinner = useRef(null)

	const { address, isConnected } = useAccount()
	const {
		writeContract,
		data: hash,
		isPending: isWritePending,
		error: writeError,
	} = useWriteContract()

	// Wait for transaction confirmation
	const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
		hash,
	})

	// Get user's ETH balance
	const { data: balance, refetch: refetchBalance } = useBalance({
		address: address,
	})

	// Read contract data with polling enabled for real-time updates
	const { data: entranceFee, isLoading: feeLoading } = useReadContract({
		address: CONTRACT_ADDRESS,
		abi: LOTTERY_ABI,
		functionName: "getEntranceFee",
	})

	const {
		data: playersLength,
		isLoading: playersLoading,
		refetch: refetchPlayers,
	} = useReadContract({
		address: CONTRACT_ADDRESS,
		abi: LOTTERY_ABI,
		functionName: "getNumberOfPlayers",
		query: {
			refetchInterval: 5000, // Refetch every 5 seconds
		},
	})

	const { data: recentWinner, refetch: refetchWinner } = useReadContract({
		address: CONTRACT_ADDRESS,
		abi: LOTTERY_ABI,
		functionName: "getRecentWinner",
		query: {
			refetchInterval: 10000, // Refetch every 10 seconds
		},
	})

	const { data: lotteryState, refetch: refetchState } = useReadContract({
		address: CONTRACT_ADDRESS,
		abi: LOTTERY_ABI,
		functionName: "getRaffleState",
		query: {
			refetchInterval: 3000, // Refetch every 3 seconds for faster state updates
		},
	})

	// Watch for contract events to trigger immediate updates
	useWatchContractEvent({
		address: CONTRACT_ADDRESS,
		abi: LOTTERY_ABI,
		eventName: "RaffleEnter",
		onLogs(logs) {
			console.log("New raffle entry detected!", logs)
			// Immediately refetch relevant data
			refetchPlayers()
			refetchState()
		},
	})

	useWatchContractEvent({
		address: CONTRACT_ADDRESS,
		abi: LOTTERY_ABI,
		eventName: "RequestedRaffleWinner",
		onLogs(logs) {
			console.log("Winner calculation started! Request ID:", logs[0]?.args?.requestId)
			// State should change to "Calculating Winner"
			refetchState()
		},
	})

	useWatchContractEvent({
		address: CONTRACT_ADDRESS,
		abi: LOTTERY_ABI,
		eventName: "WinnerPicked",
		onLogs(logs) {
			console.log("Winner picked!", logs[0]?.args?.winner)
			
			// Mark that we've seen a winner event during this session
			hasSeenWinnerEvent.current = true
			
			const winner = logs[0]?.args?.winner
			if (winner) {
				setNewWinner(winner)
				
				// Calculate prize amount (total entries * entrance fee)
				if (playersLength && entranceFee) {
					setPrizeAmount(BigInt(entranceFee) * BigInt(playersLength))
				}
				
				// Show the popup
				setShowWinnerPopup(true)
			}
			
			// Refetch all data when winner is picked
			refetchState()
			refetchWinner()
			refetchPlayers()
			refetchBalance()
		},
	})

	// Additional polling for lottery state when it's in "Calculating Winner" mode
	useEffect(() => {
		let intervalId

		if (Number(lotteryState) === 1) {
			// If calculating winner
			console.log("Lottery is calculating winner, polling more frequently...")
			// Poll every 2 seconds when calculating winner
			intervalId = setInterval(() => {
				refetchState()
				refetchWinner()
				refetchPlayers()
			}, 2000)
		}

		return () => {
			if (intervalId) {
				clearInterval(intervalId)
			}
		}
	}, [lotteryState, refetchState, refetchWinner, refetchPlayers])

	// Track winner changes to avoid showing popup on initial load/refresh
	useEffect(() => {
		if (recentWinner && recentWinner !== "0x0000000000000000000000000000000000000000") {
			// If this is the first time we're seeing this winner data (on page load)
			if (previousWinner.current === null) {
				// Store it but don't show popup (this is initial load)
				previousWinner.current = recentWinner
			} else if (previousWinner.current !== recentWinner && hasSeenWinnerEvent.current) {
				// Winner changed and we've seen a WinnerPicked event - this is a new winner
				previousWinner.current = recentWinner
				// Popup is already shown by the event handler
			}
		}
	}, [recentWinner])

	// Calculate total entry cost
	const totalCost = entranceFee ? BigInt(entranceFee) * BigInt(numberOfEntries) : BigInt(0)

	// Check if user has enough balance
	const hasEnoughBalance = balance ? balance.value >= totalCost : false

	// Get lottery state text
	const getLotteryStateText = (state) => {
		switch (Number(state)) {
			case 0:
				return "Open"
			case 1:
				return "Calculating"
			default:
				return "Unknown"
		}
	}

	// Handle entering lottery
	const handleEnterLottery = async () => {
		if (!isConnected) {
			setError("Please connect your wallet first")
			return
		}

		if (!hasEnoughBalance) {
			setError("Insufficient balance to enter lottery")
			return
		}

		if (Number(lotteryState) !== 0) {
			setError("Lottery is not currently open for entries")
			return
		}

		setError(null)
		setTransactionStatus("pending")

		try {
			writeContract({
				address: CONTRACT_ADDRESS,
				abi: LOTTERY_ABI,
				functionName: "enterRaffle",
				value: totalCost,
			})
		} catch (err) {
			console.error("Transaction failed:", err)
			setError(err.message || "Transaction failed")
			setTransactionStatus(null)
		}
	}

	// Handle closing winner popup
	const closeWinnerPopup = () => {
		setShowWinnerPopup(false)
		setNewWinner(null)
		setPrizeAmount(null)
	}

	// Handle transaction status updates
	useEffect(() => {
		if (isWritePending) {
			setTransactionStatus("pending")
		} else if (isConfirming) {
			setTransactionStatus("confirming")
		} else if (isConfirmed) {
			setTransactionStatus("success")
			// Refetch contract data
			refetchPlayers()
			refetchState()
			refetchWinner()
			refetchBalance()

			// Clear status after 3 seconds
			setTimeout(() => setTransactionStatus(null), 3000)
		} else if (writeError) {
			setError(writeError.message)
			setTransactionStatus(null)
		}
	}, [
		isWritePending,
		isConfirming,
		isConfirmed,
		writeError,
		refetchPlayers,
		refetchState,
		refetchWinner,
		refetchBalance,
	])

	// Format address for display
	const formatAddress = (addr) => {
		if (!addr || addr === "0x0000000000000000000000000000000000000000") return "None"
		return `${addr.slice(0, 6)}...${addr.slice(-4)}`
	}

	if (!isConnected) {
		return (
			<div className="lottery-entrance">
				<div className="lottery-card">
					<h2>DeFi Lottery</h2>
					<p>Please connect your wallet to participate in the lottery</p>
				</div>
			</div>
		)
	}

	return (
		<>
			<div className="lottery-entrance">
				<div className="lottery-card">
					<div className="lottery-header">
						<h2>DeFi Lottery</h2>
						<div className="lottery-status">
							<span
								className={`status-badge ${Number(lotteryState) == 0 ? "open" : "closed"}`}
							>
								{getLotteryStateText(lotteryState)}
								{Number(lotteryState) === 1 && (
									<span className="calculating-indicator">
										<span className="loading-spinner"></span>
									</span>
								)}
							</span>
						</div>
					</div>

					{/* Lottery Stats */}
					<div className="lottery-stats">
						<div className="stat-item">
							<div className="stat-label">Entry Fee</div>
							<div className="stat-value">
								{feeLoading
									? "Loading..."
									: entranceFee
										? `${formatEther(entranceFee)} ETH`
										: "N/A"}
							</div>
						</div>

						<div className="stat-item">
							<div className="stat-label">Total Players</div>
							<div className="stat-value">
								{playersLoading ? "Loading..." : playersLength}
							</div>
						</div>

						<div className="stat-item">
							<div className="stat-label">Prize Pool</div>
							<div className="stat-value">
								{playersLoading || feeLoading
									? "Loading..."
									: playersLength && entranceFee
										? `${formatEther(BigInt(entranceFee) * BigInt(playersLength))} ETH`
										: "0 ETH"}
							</div>
						</div>
					</div>

					{/* Recent Winner */}
					{recentWinner && recentWinner !== "0x0000000000000000000000000000000000000000" && (
						<div className="recent-winner">
							<div className="winner-label">🏆 Recent Winner</div>
							<div className="winner-address">{formatAddress(recentWinner)}</div>
						</div>
					)}

					{/* Entry Form */}
					<div className="entry-form">
						<div className="form-group">
							<label htmlFor="entries">Select Number of Entries</label>
							<input
								id="entries"
								type="number"
								min="1"
								max="10"
								value={numberOfEntries}
								onChange={(e) => setNumberOfEntries(e.target.value)}
								onBlur={(e) => {
									const val = parseInt(e.target.value)
									if (isNaN(val)) {
										setNumberOfEntries("1")
									} else {
										const clamped = Math.max(1, Math.min(10, val))
										setNumberOfEntries(clamped.toString())
									}
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										const val = parseInt(e.target.value)
										const clamped = isNaN(val) ? 1 : Math.max(1, Math.min(10, val))
										setNumberOfEntries(clamped.toString())
										handleEnterLottery(clamped)
									}
								}}
								className="entry-input"
							/>
						</div>

						<div className="cost-summary">
							<div className="cost-item">
								<span>Total Cost:</span>
								<span className="cost-value">
									{entranceFee ? `${formatEther(totalCost)} ETH` : "Loading..."}
								</span>
							</div>
							<div className="cost-item">
								<span>Your Balance:</span>
								<span className="cost-value">
									{balance ? `${formatEther(balance.value)} ETH` : "Loading..."}
								</span>
							</div>
						</div>

						{/* Error Display */}
						{error && (
							<div className="error-message">
								{error}
							</div>
						)}

						{/* Transaction Status */}
						{transactionStatus && (
							<div className={`transaction-status ${transactionStatus}`}>
								{transactionStatus === "pending" && (
									<>
										<div className="loading-spinner"></div>
										<span>Confirm transaction in wallet...</span>
									</>
								)}
								{transactionStatus === "confirming" && (
									<>
										<div className="loading-spinner"></div>
										<span>Transaction confirming...</span>
									</>
								)}
								{transactionStatus === "success" && (
									<>
										<span className="success-icon">✅</span>
										<span>Successfully entered lottery!</span>
									</>
								)}
							</div>
						)}

						{/* Enter Button */}
						<button
							className="enter-button"
							onClick={handleEnterLottery}
							disabled={
								isWritePending ||
								isConfirming ||
								!hasEnoughBalance ||
								Number(lotteryState) !== 0 ||
								feeLoading
							}
						>
							{isWritePending || isConfirming
								? "Processing..."
								: Number(lotteryState) !== 0
									? "Lottery Closed"
									: !hasEnoughBalance
										? "Insufficient Balance"
										: `Enter Lottery (${numberOfEntries} ${numberOfEntries === 1 ? "entry" : "entries"})`}
						</button>
					</div>

					{/* Winner Calculation Status */}
					{Number(lotteryState) === 1 && (
						<div className="winner-calculation-status">
							<div className="calculation-note">
								This may take a few minutes. The winner will be selected randomly and
								fairly.
							</div>
						</div>
					)}

					{/* Transaction Hash */}
					{hash && (
						<div className="transaction-hash">
							<span>Transaction: </span>
							<a
								href={`https://sepolia.etherscan.io//tx/${hash}`}
								target="_blank"
								rel="noopener noreferrer"
								className="hash-link"
							>
								{formatAddress(hash)}
							</a>
						</div>
					)}
				</div>
			</div>

			{/* Winner Popup */}
			<WinnerPopup 
				winner={newWinner}
				isVisible={showWinnerPopup}
				onClose={closeWinnerPopup}
				prizeAmount={prizeAmount}
			/>
		</>
	)
}

export default LotteryEntrance