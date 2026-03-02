import { createRoot } from "react-dom/client";
import { PrivyAuthProvider } from "@/components/privy-provider";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <PrivyAuthProvider>
    <App />
  </PrivyAuthProvider>
);
