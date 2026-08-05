import placeholder from "@/assets/tournament-placeholder.jpg";

export const TOURNAMENT_PLACEHOLDER = placeholder;

export function tournamentImage(t?: {
  banner_url?: string | null;
  logo_url?: string | null;
} | null) {
  return t?.banner_url || t?.logo_url || TOURNAMENT_PLACEHOLDER;
}
