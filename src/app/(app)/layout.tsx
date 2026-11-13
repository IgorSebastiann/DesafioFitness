import { AppNav } from "@/components/app-nav";
import { PushPrompt } from "@/components/push-prompt";
import { SetupRequired } from "@/components/setup-required";
import { getViewer } from "@/lib/data/viewer";
import { countUnreadNotifications } from "@/lib/data/queries";
import { isConfigured } from "@/lib/env";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isConfigured()) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-3xl items-center px-4 py-10">
        <SetupRequired />
      </main>
    );
  }

  const viewer = await getViewer();
  const unread = await countUnreadNotifications(viewer.userId);

  return (
    <div className="min-h-dvh lg:flex">
      <AppNav isAdmin={viewer.isAdmin} unread={unread} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 lg:px-10 lg:pb-12 lg:pt-10">
        <PushPrompt />
        {children}
      </main>
    </div>
  );
}
