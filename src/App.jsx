import Header from "./components/ManualHeader"
// import { MoralisProvider } from "react-moralis"
function App() {
  return (
    <>
      <head>
        <title>Smart Contract Lottery</title>
      </head>
      <body>
        <div>
          <h1>Welcome to the Smart Contract Lottery</h1>
          <p>Participate in the lottery by connecting your wallet.</p>
          <Header></Header>
        </div>
      </body>
    </>
  )
}

export default App
