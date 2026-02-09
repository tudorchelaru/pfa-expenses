import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
    output: "server", // Server-side rendering pentru API routes
    adapter: vercel({ mode: "serverless" }),
    integrations: [tailwind()],
    // In development, use "ignore" to allow both with and without trailing slash
    // In production, Vercel redirects handle trailing slashes via vercel.json
    trailingSlash: import.meta.env.DEV ? "ignore" : "never",
    build: {
        // Target modern browsers to reduce polyfills and bundle size
        // This reduces legacy JavaScript by ~19KB
        // Inline all CSS to eliminate render-blocking CSS and prevent FOUC
        // Astro automatically combines all CSS imports into a single <style> tag in <head>
        inlineStylesheets: "always",
    },
    vite: {
        build: {
            target: ["es2020", "edge90", "firefox88", "chrome90", "safari14"],
            cssTarget: ["es2020", "edge90", "firefox88", "chrome90", "safari14"],
            minify: "terser",
            terserOptions: {
                compress: {
                    drop_console: false,
                    passes: 2,
                },
                mangle: true,
                format: {
                    comments: false,
                },
            },
        },
    },
    image: {
        domains: [],
        remotePatterns: [],
        service: {
            entrypoint: "astro/assets/services/sharp",
            config: {
                limitInputPixels: false,
            },
        },
        experimentalObjectFit: "cover",
    },
});
