import { createRoot } from "react-dom/client";
import { CommandService } from "../../../modules/ads-core/src/index.ts";
import { createBrowserServices, IndexedDbStore } from "../../../modules/browser-store/src/index.ts";
import { App } from "./app.tsx";
import { StudioController } from "./controller.ts";
import "./styles.css";
import "./reference-preview.css";
import "./ui-system.css";
import "./foundation-workspace.css";
import "./studio-chrome.css";
import "./foundation-blueprint.css";
import "./catalog-specimens.css";
import "./studio-slider.css";
import "./foundation-starters.css";
import "./component-authoring.css";

const root = document.getElementById("root");
if (!root) throw new Error("Studio root is missing.");
try {
  // Explicit test workspaces are isolated; the normal workspace has one stable name.
  const requested = new URL(location.href).searchParams.get("database");
  const database = requested && /^axiom-studio-test-[a-zA-Z0-9-]{1,80}$/.test(requested) ? requested : "axiom.studio.local";
  const services = createBrowserServices();
  const controller = new StudioController(new CommandService(new IndexedDbStore(database), services), services);
  createRoot(root).render(<App controller={controller} services={services} />);
} catch {
  root.setAttribute("role", "alert");
  root.textContent = "작업 공간을 열지 못했습니다. 브라우저 저장소 접근을 확인한 뒤 새로고침하세요. / Studio could not open. Check browser storage access and reload.";
}

import "./element-authoring.css";
import "./behavior-editor.css";
import "./foundation-policy.css";
