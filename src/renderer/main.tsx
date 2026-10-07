import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { UpdateMessagePreview } from "./UpdateMessagePreview";
import { MessageProvider } from "@/components/ui/message";
import "./styles.css";
import "./app.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MessageProvider>
      <App />
      {import.meta.env.DEV &&
        import.meta.env.VITE_UPDATE_MESSAGE_PREVIEW === "1" && (
          <UpdateMessagePreview />
        )}
    </MessageProvider>
  </React.StrictMode>,
);
