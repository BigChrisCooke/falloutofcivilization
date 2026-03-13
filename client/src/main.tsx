import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppRoot } from "./components/AppRoot.js";
import "./styles/global.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Client root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>
);
