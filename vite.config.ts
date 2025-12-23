import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { resolve } from "path";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import minimist from "minimist";

// 需要调整为本地的配置
const PLUGIN_NAME = "siyuan-pledger";
const SIYUAN_WORKSPACE = "C:/Users/liyun/Documents/SiYuan";
const BASRE_URL = "http://127.0.0.1:6806/";

const args = minimist(process.argv.slice(2));
const isDev = args.d || false;
const distDir = isDev
  ? `${SIYUAN_WORKSPACE}/data/plugins/${PLUGIN_NAME}`
  : "dist";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("calendar-"),
        },
      },
    }),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: "./README*.md",
          dest: "./",
        },
        {
          src: "./plugin.json",
          dest: "./",
        },
        {
          src: "./icon.png",
          dest: "./",
        },
      ],
    }),
  ],
  build: {
    outDir: distDir,
    sourcemap: isDev ? "inline" : false,
    minify: !isDev,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      fileName: () => "index.js",
      formats: ["cjs"],
    },
    watch: {
      include: "src/**", // 监控 src 目录下的文件变化
      exclude: ["node_modules/**", "dist/**"], // 排除 node_modules 目录
    },
    rollupOptions: {
      external: ["siyuan", "process"],
      output: {
        entryFileNames: "[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "siyuan-pledger.css") {
            return "index.css";
          }
          return String(assetInfo.name);
        },
      },
      plugins: [
        {
          name: "code-watch",
          buildStart() {
            console.log("Watching for file changes...");
          },
          async writeBundle() {
            // 重启插件
            pluginStateHandler(false).then(() => {
              pluginStateHandler(true);
            });
          },
        },
      ],
    },
  }
});

/**
 * 控制插件启用状态
 * @param state
 */
async function pluginStateHandler(state: boolean) {
  await fetch(BASRE_URL + "api/petal/setPetalEnabled", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      packageName: "siyuan-pledger",
      enabled: state,
      frontend: "desktop",
    }),
  });
}
