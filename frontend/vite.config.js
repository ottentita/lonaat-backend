import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
      manifest: {
        name: "Lonaat - Affiliate Marketing Platform",
        short_name: "Lonaat",
        description:
          "AI-powered affiliate marketing dashboard with AdBoost campaigns",
        theme_color: "#1e3a8a",
        background_color: "#0f172a",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^\/api\//i,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5174,
    strictPort: true,
    allowedHosts: true,
    hmr: false,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    // Output directory
    outDir: "dist",
    
    // Source maps in production (disabled for smaller bundle)
    sourcemap: process.env.NODE_ENV !== "production",
    
    // Minification
    minify: "terser",
    
    // Target environment
    target: "esnext",
    
    // Code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-charts": ["recharts"],
          "vendor-ui": ["lucide-react", "class-variance-authority"],
          "vendor-http": ["axios"],
        },
      },
    },
    
    // Terser minification options
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === "production",
      },
    },
    
    // CSS code split
    cssCodeSplit: true,
    
    // Report compressed size
    reportCompressedSize: true,
    
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "axios",
      "lucide-react",
      "recharts",
    ],
  },
});
