import { useEffect } from "react";
import { RouterProvider, useRouter } from "./lib/router";
import WindowChrome from "./components/WindowChrome";
import ControlDock from "./components/ControlDock";
import Register from "./components/Register";
import Firmament from "./views/Firmament";
import Specimen from "./views/Specimen";
import Effect from "./views/Effect";
import Category from "./views/Category";
import Taxonomy from "./views/Taxonomy";
import Diptych from "./views/Diptych";
import "./components/WindowChrome.css";

function Stage() {
  const { route, back, canBack } = useRouter();

  // Esc returns to the sky (unless the Register palette is open — it eats Esc itself)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && canBack && !document.querySelector(".register")) {
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back, canBack]);

  return (
    <>
      <WindowChrome />
      {route.view === "firmament" && <Firmament />}
      {route.view === "specimen" && <Specimen key={route.name} name={route.name} />}
      {route.view === "effect" && <Effect key={route.name} name={route.name} />}
      {route.view === "category" && <Category key={route.name} name={route.name} />}
      {route.view === "taxonomy" && <Taxonomy />}
      {route.view === "diptych" && <Diptych key={`${route.a}-${route.b}`} a={route.a} b={route.b} />}
      <ControlDock />
      <Register />
    </>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <Stage />
    </RouterProvider>
  );
}
