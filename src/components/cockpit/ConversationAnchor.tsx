import Link from "next/link";

export default function ConversationAnchor({
  conversationId,
}: {
  conversationId: string | null;
}) {
  if (!conversationId)
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
    );

  const short = conversationId.slice(0, 8) + "…";

  return (
    <Link
      href={`/cockpit/observabilidade/sessoes/${conversationId}`}
      className="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400"
      title={conversationId}
    >
      {short}
    </Link>
  );
}
