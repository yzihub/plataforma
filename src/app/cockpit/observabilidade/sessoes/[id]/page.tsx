import SessionDetailPanel from "@/components/cockpit/SessionDetailPanel";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <SessionDetailPanel conversationId={id} />
    </div>
  );
}
