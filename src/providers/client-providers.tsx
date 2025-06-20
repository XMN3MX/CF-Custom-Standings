import React, { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

export default ClientProviders;
