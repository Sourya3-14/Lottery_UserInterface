import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
	plugins: [react()]
	// base: './', // Use relative paths for IPFS
	// build: {
	//   outDir: 'dist',
	//   assetsDir: 'assets',
	//   sourcemap: false, // Optional: disable for smaller builds
	// }
})
