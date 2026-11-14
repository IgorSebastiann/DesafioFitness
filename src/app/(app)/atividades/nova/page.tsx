import type { Metadata } from "next";
import { ActivityForm } from "@/components/activity-form";
import { NoChallenge } from "@/components/no-challenge";
import { PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/data/viewer";
import { getChallengeCategories, pointsUsedOn } from "@/lib/data/queries";
import { nowHourMinute, todayIso } from "@/lib/time";

export const metadata: Metadata = { title: "Registrar atividade" };

export default async function NewActivityPage() {
  const viewer = await getViewer();
  if (!viewer.challenge) return <NoChallenge />;

  const today = todayIso();
  const [categories, used] = await Promise.all([
    getChallengeCategories(viewer.userId, viewer.challenge.id),
    pointsUsedOn(viewer.userId, viewer.challenge.id, viewer.userId, today),
  ]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title="Registrar atividade" subtitle="Envie a comprovação para o(a) parceiro(a) validar." />
      <ActivityForm
        categories={categories}
        userId={viewer.user.id}
        today={today}
        nowTime={nowHourMinute()}
        dailyLimit={viewer.challenge.daily_point_limit}
        pointsUsedToday={used}
      />
    </div>
  );
}
