import { useMoralis } from "react-moralis"

function Header() {
	const { enableWeb3 } = useMoralis()
	return (
		<>
			<div>Hello from Header....</div>
		</>
	)
}
export default Header
