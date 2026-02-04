import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register service worker for offline support
const updateSW = registerSW({
  onNeedRefresh() {
    // When a new service worker is available, show a prompt to refresh
    if (confirm("New version available! Reload to update?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App is ready for offline use");
  },
  onRegistered(registration) {
    console.log("Service worker registered:", registration);
  },
  onRegisterError(error) {
    console.error("Service worker registration failed:", error);
  },
});

createRoot(document.getElementById("root")!).render(<App />);
