import { Bot, User } from "lucide-react";

import { cn } from "@/lib/utils";

export function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2 sm:gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary sm:h-11 sm:w-11">
          <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      ) : null}

      <div
        className={cn(
          "max-w-[calc(100%-3rem)] break-words rounded-[24px] px-4 py-3 text-sm leading-6 shadow-lg sm:max-w-3xl sm:rounded-[28px] sm:px-5 sm:py-4 sm:leading-7",
          isUser
            ? "bg-white text-slate-950"
            : "border border-white/10 bg-slate-900/80 text-slate-100",
        )}
      >
        {message.content}
      </div>

      {isUser ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/20 text-cyan-300 sm:h-11 sm:w-11">
          <User className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      ) : null}
    </div>
  );
}
