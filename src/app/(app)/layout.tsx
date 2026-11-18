import { LockOverlay, TakeoverAlert } from "@/components/app/alerts";
import { BottomNav, Sidebar } from "@/components/app/nav";
import { SessionBar } from "@/components/app/session-bar";
import { SessionGuard } from "@/components/app/session-guard";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <SessionBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:pb-12">{children}</main>
      </div>
      <BottomNav />
      <SessionGuard />
      <TakeoverAlert />
      <LockOverlay />
    </div>
  );
}
