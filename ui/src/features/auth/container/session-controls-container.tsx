import { LogOut, UserRound } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { signOut } from "@/shared/auth/auth";
import { buildVoteEndSessionUrl } from "@/shared/auth/vote-logout";

interface SessionControlsContainerProps {
  isMockMode?: boolean;
  userName: string;
}

export function SessionControlsContainer({
  isMockMode = false,
  userName,
}: SessionControlsContainerProps) {
  return (
    <div className="flex items-center gap-2 border-l pl-3">
      <span className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground sm:flex">
        <UserRound className="size-4 shrink-0" aria-hidden="true" />
        <span className="max-w-40 truncate">{userName}</span>
      </span>
      {isMockMode ? null : (
        <form
          action={async () => {
            "use server";

            const endSessionUrl = buildVoteEndSessionUrl();
            await signOut({ redirect: false });
            redirect(endSessionUrl);
          }}
        >
          <Button type="submit" variant="ghost" size="sm">
            <LogOut aria-hidden="true" />
            로그아웃
          </Button>
        </form>
      )}
    </div>
  );
}
