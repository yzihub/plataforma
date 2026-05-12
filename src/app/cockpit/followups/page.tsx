import FollowupsClient from "@/components/yzihub/FollowupsClient";

export const dynamic = "force-dynamic";

export default function FollowupsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          Follow-ups
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Cockpit operacional da Follow-up Engine
        </p>
      </div>
      <FollowupsClient />
    </div>
  );
}
