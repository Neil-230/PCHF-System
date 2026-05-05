import * as React from "react";

export function useMediaQuery(maxWidth: number) {
  const [matches, setMatches] = React.useState<boolean>(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${maxWidth}px)`);

    const onChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Initial check
    setMatches(mql.matches);

    // Subscribe to changes
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [maxWidth]);

  return matches;
}

// Example usage:
export function useIsMobile() {
  return useMediaQuery(768); // same behavior as before, but not Tailwind-specific
}
