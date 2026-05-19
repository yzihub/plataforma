import ReplayFrameList from "@/components/cockpit/ReplayFrameList";

export const dynamic = "force-dynamic";

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <ReplayFrameList conversationId={id} />
    </div>
  );
}
