// Which of the three ways to a hero to recommend (HeroRoutes.tsx). Pure, for
// scripts/test-hero-routes.mjs.

export type HeroRoute = "ready" | "library" | "build";

export type HeroRouteAdvice = {
  // The route marked on the screen.
  suggested: HeroRoute;
  // Whether ready-made heroes exist on this server at all.
  ready: boolean;
  // Whether the library holds a hero this seat may bring.
  library: boolean;
  // The ready-made list opens by itself (an empty library).
  openReady: boolean;
  // Names to show on the library card, limited to two plus a count.
  libraryNames: string[];
  libraryMoreCount: number;
};

export function heroRouteAdvice({ library, pregens }: { library: string[]; pregens: number }): HeroRouteAdvice {
  const ready = pregens > 0;
  const has = library.length > 0;
  return {
    // A player with heroes of their own most likely wants one of them; one
    // with none is quickest at the table with a ready-made one.
    suggested: has ? "library" : ready ? "ready" : "build",
    ready,
    library: has,
    openReady: !has && ready,
    libraryNames: library.slice(0, 2),
    libraryMoreCount: Math.max(0, library.length - 2),
  };
}
