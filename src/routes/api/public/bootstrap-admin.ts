import { createFileRoute } from "@tanstack/react-router";

// Idempotently creates the default admin account on first use.
// Safe to call any number of times; only creates the admin if none exists yet.
export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const { count, error: countErr } = await supabaseAdmin
          .from("admins")
          .select("*", { count: "exact", head: true });
        if (countErr) {
          return Response.json({ error: countErr.message }, { status: 500 });
        }
        if ((count ?? 0) > 0) {
          return Response.json({ ok: true, message: "already bootstrapped" });
        }

        const email = "admin@auction.local";
        const password = "admin123";

        const { data: created, error: createErr } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });
        let userId = created?.user?.id;
        if (createErr || !userId) {
          // Maybe user already exists — look it up
          const { data: list } = await supabaseAdmin.auth.admin.listUsers();
          userId = list?.users.find((u) => u.email === email)?.id;
          if (!userId) {
            return Response.json(
              { error: createErr?.message ?? "Could not create admin" },
              { status: 500 },
            );
          }
        }

        const { error: insertErr } = await supabaseAdmin
          .from("admins")
          .insert({ user_id: userId });
        if (insertErr && !insertErr.message.includes("duplicate")) {
          return Response.json({ error: insertErr.message }, { status: 500 });
        }

        return Response.json({ ok: true, message: "admin created" });
      },
    },
  },
});
