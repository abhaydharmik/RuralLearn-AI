import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value) {
  return `${Math.round(value)}%`;
}

export function getDifficultyLabel(score) {
  if (score < 50) {
    return "Easy";
  }

  if (score <= 80) {
    return "Medium";
  }

  return "Hard";
}

export function normalizeDifficultyLabel(value) {
  if (!value) {
    return "Easy";
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized === "hard") {
    return "Hard";
  }

  if (normalized === "medium") {
    return "Medium";
  }

  return "Easy";
}
