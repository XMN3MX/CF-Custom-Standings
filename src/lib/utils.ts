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

export function formatDurationHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  let str = "";
  if (h > 0) str += `${h}h `;
  if (m > 0 || h > 0) str += `${m}m `;
  str += `${s}s`;
  return str.trim();
}

export function getContestStatusAndTime(
  startTimeSeconds: number,
  durationSeconds: number
): string {
  const now = Math.floor(Date.now() / 1000);
  const endTime = startTimeSeconds + durationSeconds;
  if (now < startTimeSeconds) {
    // Before contest
    const diff = startTimeSeconds - now;
    return `Starting in ${formatDurationHMS(diff)}`;
  } else if (now >= startTimeSeconds && now < endTime) {
    // During contest
    const left = endTime - now;
    return `Running, ${formatDurationHMS(left)} left`;
  } else {
    // After contest
    return "Ended";
  }
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
