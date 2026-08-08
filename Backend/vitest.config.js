import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globalSetup: "./tests/setup.js",
        fileParallelism: false,
        testTimeout: 20000,
    }
});
