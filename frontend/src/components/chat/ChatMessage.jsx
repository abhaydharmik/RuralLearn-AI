import { Bot, User } from "lucide-react";

import { cn } from "@/lib/utils";

export function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Bot className="h-5 w-5" />
        </div>
      ) : null}

      <div
        className={cn(
          "max-w-3xl rounded-[28px] px-5 py-4 text-sm leading-7 shadow-lg",
          isUser
            ? "bg-white text-slate-950"
            : "border border-white/10 bg-slate-900/80 text-slate-100",
        )}
      >
        {message.content}
      </div>

      {isUser ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/20 text-cyan-300">
          <User className="h-5 w-5" />
        </div>
      ) : null}
    </div>
  );
}
