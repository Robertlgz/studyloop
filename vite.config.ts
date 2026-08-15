import { builtinModules } from "node:module";
import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const codemirrorExternals = [
    "@codemirror/autocomplete",
    "@codemirror/closebrackets",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/comment",
    "@codemirror/fold",
    "@codemirror/gutter",
    "@codemirror/highlight",
    "@codemirror/history",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/matchbrackets",
    "@codemirror/panel",
    "@codemirror/rangeset",
    "@codemirror/rectangular-selection",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/stream-parser",
    "@codemirror/text",
    "@codemirror/tooltip",
    "@codemirror/view",
];

const nodeBuiltins = [
    ...builtinModules,
    ...builtinModules.map((module) => `node:${module}`),
];

export default defineConfig(({ mode }) => {
    const production = mode === "production";

    return {
        plugins: [vue()],
        logLevel: "info",
        server: { hmr: false },
        define: {
            "process.env.NODE_ENV": JSON.stringify(
                production ? "production" : "development",
            ),
        },
        resolve: {
            alias: {
                "@": fileURLToPath(new URL("./src", import.meta.url)),
            },
        },
        build: {
            lib: {
                entry: "src/main.ts",
                formats: ["cjs"],
            },
            outDir: ".",
            emptyOutDir: false,
            copyPublicDir: false,
            target: "es2022",
            sourcemap: production ? false : "inline",
            minify: production ? "oxc" : false,
            cssMinify: false,
            cssCodeSplit: false,
            watch: production ? null : {},
            rollupOptions: {
                external: [
                    "obsidian",
                    "electron",
                    ...codemirrorExternals,
                    ...nodeBuiltins,
                ],
                treeshake: true,
                output: {
                    format: "cjs",
                    exports: "named",
                    codeSplitting: false,
                    entryFileNames: "main.js",
                    assetFileNames: (assetInfo) => {
                        if (assetInfo.name?.endsWith(".css")) {
                            return "styles.css";
                        }
                        return "[name][extname]";
                    },
                },
            },
        },
    };
});