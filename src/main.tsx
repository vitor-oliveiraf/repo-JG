import "@fontsource/roboto-mono/latin-400.css";
import "@fontsource/roboto-mono/latin-500.css";
import "@fontsource/roboto-mono/latin-700.css";
import "./styles.css";
import "./styles/figma-review.css";

async function main() {
  // Fetch and evaluate route definitions while the network mocks initialize.
  // No requests or Socket.IO connections start until React mounts below.
  const appReady = import("./app");
  if (import.meta.env.VITE_MOCKS !== "false") {
    const { startMocks } = await import("./mocks/browser");
    await startMocks();
  }
  const { mountApp } = await appReady;
  mountApp();
}
void main().catch((error) => {
  document.getElementById("root")!.textContent =
    `Falha ao iniciar: ${error instanceof Error ? error.message : String(error)}`;
});
