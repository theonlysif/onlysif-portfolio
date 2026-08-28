import fs from "node:fs";
import path from "node:path";

/** Vite is an SPA by default, so /den/after-school/ falls through to the
 *  root portfolio index.html. Serve nested public/*.html as real pages. */
function publicHtml() {
  return {
    name: "public-html-indexes",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") return next();
        const raw = (req.url || "").split("?")[0];
        const urlPath = decodeURIComponent(raw);
        const root = server.config.root;
        const candidates = [];
        if (urlPath.endsWith("/")) {
          candidates.push(path.join(root, "public", urlPath, "index.html"));
        } else if (!path.extname(urlPath)) {
          candidates.push(path.join(root, "public", urlPath, "index.html"));
          candidates.push(path.join(root, "public", urlPath + ".html"));
        }
        for (const file of candidates) {
          if (fs.existsSync(file)) {
            req.url = file
              .slice(path.join(root, "public").length)
              .replaceAll("\\", "/");
            break;
          }
        }
        next();
      });
    },
  };
}

export default {
  appType: "mpa",
  plugins: [publicHtml()],
  server: {
    open: "/den/after-school/",
    port: 5173,
  },
};
