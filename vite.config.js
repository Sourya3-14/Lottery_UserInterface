import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
	plugins: [react()],
	base: process.env.VITE_BASE_PATH || "/ottery_UserInterface",
	build: {
		outDir: "dist",
		assetsDir: "assets",
		sourcemap: false, // Optional: disable for smaller builds
	},
})
