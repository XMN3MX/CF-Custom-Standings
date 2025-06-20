"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ModeToggle({
  showToggleThemeText = false,
  variant = "ghost",
  className,
  ...props
}: ButtonProps & {
  showToggleThemeText?: boolean;
}) {
  const { setTheme, theme } = useTheme();
  return (
    <Button
      variant={variant}
      size={showToggleThemeText ? "default" : "icon"}
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className={cn(className)}
      {...props}
    >
      <Sun
        className={cn(
          "hidden h-[1.5rem] w-[1.3rem] fill-yellow-500 text-yellow-500 dark:block",
          { "me-1": showToggleThemeText }
        )}
      />
      <Moon
        className={cn("h-5 w-5 fill-foreground dark:hidden", {
          "me-1": showToggleThemeText,
        })}
      />
      <span className={cn({ "sr-only": !showToggleThemeText })}>
        Toggle theme
      </span>
    </Button>
  );
}
