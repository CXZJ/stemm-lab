import type { Href } from "expo-router";

/** Typed routes only list static paths; dynamic segments need a loose cast. */
export function href(path: string): Href {
  return path as unknown as Href;
}
