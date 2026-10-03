import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { MessageProvider } from "@/components/ui/message";
import "./styles.css";
import "./app.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MessageProvider>
      <App />
    </MessageProvider>
  </React.StrictMode>,
);
