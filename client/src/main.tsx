import { createRoot } from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import App from "./App";
import "./index.css";

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;

createRoot(document.getElementById("root")!).render(
  <PrivyProvider
    appId={privyAppId}
    config={{
      loginMethods: ["email", "wallet", "google"],
      appearance: { theme: "light" },
    }}
  >
    <App />
  </PrivyProvider>
);
