import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/600.css";
import "@fontsource/nunito-sans/700.css";
import "@fontsource/nunito-sans/800.css";
import App from "./ui/App";
import "./ui/styles.css";
import "./ui/themes.css";
import "./ui/fullscreen.css";
import "./ui/menus.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
