const ERROR_MESSAGES: Record<string, string> = {
  not_allowed: "That Slack account isn't on the approved list for this app.",
  invalid_state: "Login session expired — please try again.",
  slack_error: "Something went wrong signing in with Slack.",
  not_configured: "Slack sign-in isn't configured on the server yet.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">New Lead PH</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Sign in with your Atlas Capture Slack account to view Philippines
          leads.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {ERROR_MESSAGES[error] ?? "Sign-in failed."}
          </p>
        )}

        <a
          href="/api/auth/slack"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3.5 text-base font-medium text-white transition hover:bg-zinc-800"
        >
          Sign in with Slack
        </a>
      </div>
    </div>
  );
}
