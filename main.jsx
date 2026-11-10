import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";
registerSW({ immediate: true });
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <main
          dir="rtl"
          style={{
            padding: 40,
            color: "#e2e8f0",
            background: "#020617",
            minHeight: "100vh",
          }}
        >
          <h1>تعذر بدء التطبيق</h1>
          <p>راجع إعدادات Firebase واتصال الشبكة، ثم أعد تحميل الصفحة.</p>
          <pre
            style={{ direction: "ltr", whiteSpace: "pre-wrap", fontSize: 12 }}
          >
            {this.state.error.message}
          </pre>
          <button onClick={() => window.location.reload()}>
            إعادة المحاولة
          </button>
        </main>
      );
    return this.props.children;
  }
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
