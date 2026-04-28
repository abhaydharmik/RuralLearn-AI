import { cn } from "@/lib/utils";
import { avatarThemes } from "@/services/profileService";

export function Avatar({ name, className, theme = "emerald", imageSrc }) {
  const initials = name
    ?.split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br font-semibold",
        avatarThemes[theme] || avatarThemes.emerald,
        className,
      )}
    >
      {imageSrc ? (
        <img
          alt={name || "Profile avatar"}
          className="h-full w-full object-cover"
          src={imageSrc}
        />
      ) : (
        initials || "ST"
      )}
    </div>
  );
}
