import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return minutes.toString();
}
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

export function getTimeAgo(startTimeSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - startTimeSeconds;

  if (diff < 0) {
    const hours = Math.floor(Math.abs(diff) / 3600);
    const minutes = Math.floor((Math.abs(diff) % 3600) / 60);
    return `Starts in ${hours}h ${minutes}m`;
  }

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  return `Started ${hours}h ${minutes}m ago`;
}
export function getContestPhaseDisplay(phase: string): string {
  switch (phase) {
    case "BEFORE":
      return "Not Started";
    case "CODING":
      return "Running";
    case "PENDING_SYSTEM_TEST":
      return "Pending System Test";
    case "SYSTEM_TEST":
      return "System Test";
    case "FINISHED":
      return "Finished";
    default:
      return phase;
  }
}
