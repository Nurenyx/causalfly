"use client";
import { createContext, useContext } from "react";
const DiagnosticVisibility = createContext(false);
export const DiagnosticVisibilityProvider = DiagnosticVisibility.Provider;
export function useDeveloperDiagnostics() { return useContext(DiagnosticVisibility); }
