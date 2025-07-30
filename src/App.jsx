// App.js
import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '../wagmi.config';
import Header from './components/Header';
import LotteryEntrance from './components/LotteryEntrance';

// Create a query client for TanStack Query
const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="App">
          <Header />
          <LotteryEntrance></LotteryEntrance>
          {/* Your other components */}
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;

// If you want to add reconnection functionality
// Create a separate component for auto-reconnection
import { useEffect } from 'react';
import { useAccount, useReconnect } from 'wagmi';

export function AutoReconnect() {
  const { isConnected } = useAccount();
  const { reconnect } = useReconnect();

  useEffect(() => {
    // Auto-reconnect on app load if there was a previous connection
    if (!isConnected) {
      reconnect();
    }
  }, [isConnected, reconnect]);

  return null;
}

// Then use it in your App:
function AppWithAutoReconnect() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="App">
          <AutoReconnect />
          <Header />
          {/* Your other components */}
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}