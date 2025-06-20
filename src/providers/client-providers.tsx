import React, { ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";

function ClientProviders({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

export default ClientProviders;
