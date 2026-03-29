import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      const isGlobalAdmin = user.user_metadata?.role === "global_admin";
      return NextResponse.redirect(`${origin}${isGlobalAdmin ? "/control" : "/cockpit"}`);
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth`);
}
