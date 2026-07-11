"use client";
import { createContext, useContext } from "react";

export const UiContext = createContext(null);
export function useUi() {
  return useContext(UiContext);
}
