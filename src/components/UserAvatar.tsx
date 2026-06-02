import { useState } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  src?: string | null;
  name?: string | null;
  email?: string;
  className?: string;
};

export default function UserAvatar({ src, name, email, className }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const label = name || email || "?";
  const initial = label.charAt(0).toUpperCase();

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn("rounded-full object-cover shrink-0 bg-muted", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground font-medium",
        className,
      )}
      aria-hidden
    >
      {initial !== "?" ? (
        <span className="text-sm">{initial}</span>
      ) : (
        <User className="w-1/2 h-1/2" />
      )}
    </div>
  );
}
