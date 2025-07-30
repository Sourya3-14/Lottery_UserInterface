import React, { useState, useEffect } from "react"
import { 
  useAccount, 
  useReadContract, 
  useWriteContract, 
  useWaitForTransactionReceipt,
  useBalance 
} from "wagmi"
import { formatEther } from "viem"
import abi from '../abi/Raffle.json';

const LOTTERY_ABI = abi.abi;
// Replace with your deployed contract address
const CONTRACT_ADDRESS = "0x67c768ab102c7f458dfa8c5c60743a9ec58c6255" 

function LotteryEntrance() {
  const [numberOfEntries, setNumberOfEntries] = useState(1)
  const [transactionStatus, setTransactionStatus] = useState(null)
  const [error, setError] = useState(null)

  const { address, isConnected } = useAccount()
  const { writeContract, data: hash, isPending: isWritePending, error: writeError } = useWriteContract()

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Get user's ETH balance
  const { data: balance ,refetch: refetchBalance  } = useBalance({
    address: address,
  })

  // Read contract data
  const { data: entranceFee, isLoading: feeLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: LOTTERY_ABI,
    functionName: 'getEntranceFee',
  })

  const { data: playersLength, isLoading: playersLoading, refetch: refetchPlayers } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: LOTTERY_ABI,
    functionName: 'getNumberOfPlayers',
  })

  const { data: recentWinner, refetch: refetchWinner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: LOTTERY_ABI,
    functionName: 'getRecentWinner',
  })

  const { data: lotteryState, refetch: refetchState } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: LOTTERY_ABI,
    functionName: 'getRaffleState',
  })

  // const { data: playerEntries, refetch: refetchEntries } = useReadContract({
  //   address: CONTRACT_ADDRESS,
  //   abi: LOTTERY_ABI,
  //   functionName: 'getPlayerEntries',
  //   args: [address],
  //   enabled: !!address,
  // })
  // Calculate total entry cost
  const totalCost = entranceFee ? (BigInt(entranceFee) * BigInt(numberOfEntries)) : BigInt(0)

  // Check if user has enough balance
  const hasEnoughBalance = balance ? balance.value >= totalCost : false

  // Get lottery state text
  const getLotteryStateText = (state) => {

    switch(Number(state)) {
      case 0: return "Open"
      case 1: return "Calculating Winner"
      case 2: return "Closed"
      default: return "Unknown"
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
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: LOTTERY_ABI,
        functionName: 'enterRaffle',
        value: totalCost,
      })
    } catch (err) {
      console.error("Transaction failed:", err)
      setError(err.message || "Transaction failed")
      setTransactionStatus(null)
    }
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
      // refetchEntries()
      refetchState()
      refetchWinner()
      refetchBalance()      
      // Clear status after 3 seconds
      setTimeout(() => setTransactionStatus(null), 3000)
    } else if (writeError) {
      setError(writeError.message)
      setTransactionStatus(null)
    }
  }, [isWritePending, isConfirming, isConfirmed, writeError, refetchPlayers,/* refetchEntries,*/ refetchState, refetchWinner])

  // Format address for display
  const formatAddress = (addr) => {
    if (!addr || addr === "0x0000000000000000000000000000000000000000") return "None"
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (!isConnected) {
    return (
      <div className="lottery-entrance">
        <div className="lottery-card">
          <h2>🎰 DeFi Lottery</h2>
          <p>Please connect your wallet to participate in the lottery</p>
        </div>
      </div>
    )
  }

  return (
    <div className="lottery-entrance">
      <div className="lottery-card">
        <div className="lottery-header">
          <h2>DeFi Lottery</h2>
          <div className="lottery-status">
            <span className={`status-badge ${Number(lotteryState) == 0 ? 'open' : 'closed'}`}>
              {getLotteryStateText(lotteryState)}
            </span>
          </div>
        </div>

        {/* Lottery Stats */}
        <div className="lottery-stats">
          <div className="stat-item">
            <div className="stat-label">Entry Fee</div>
            <div className="stat-value">
              {feeLoading ? "Loading..." : entranceFee ? `${formatEther(entranceFee)} ETH` : "N/A"}
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-label">Total Players</div>
            <div className="stat-value">
              {playersLoading ? "Loading..." : playersLength }
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-label">Prize Pool</div>
            <div className="stat-value">
              {playersLoading || feeLoading ? "Loading..." : 
                (playersLength && entranceFee) ? 
                `${formatEther(BigInt(entranceFee) * BigInt(playersLength))} ETH` : "0 ETH"}
            </div>
          </div>

          {/* <div className="stat-item">
            <div className="stat-label">Your Entries</div>
            <div className="stat-value">
              {playerEntries ? Number(playerEntries) : 0}
            </div>
          </div> */}
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
            <label htmlFor="entries">Number of Entries</label>
            <div className="entry-input-group">
              <button 
                className="quantity-btn"
                onClick={() => setNumberOfEntries(Math.max(1, numberOfEntries - 1))}
                disabled={numberOfEntries <= 1}
              >
                -
              </button>
              <input
                id="entries"
                type="number"
                min="1"
                max="10"
                value={numberOfEntries}
                onChange={(e) => setNumberOfEntries(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="entry-input"
              />
              <button 
                className="quantity-btn"
                onClick={() => setNumberOfEntries(Math.min(10, numberOfEntries + 1))}
                disabled={numberOfEntries >= 10}
              >
                +
              </button>
            </div>
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
          {/* {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )} */}

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
                  : `Enter Lottery (${numberOfEntries} ${numberOfEntries === 1 ? 'entry' : 'entries'})`
            }
          </button>
        </div>

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
  )
}

export default LotteryEntrance