import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function envKeySet(name: string): Record<string, string> {
  const raw = Deno.env.get(name);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

async function listFilesRecursively(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const files: string[] = [];
  const visit = async (path: string): Promise<void> => {
    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(path, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;
      const entries = data ?? [];
      for (const entry of entries) {
        const fullPath = path ? path + "/" + entry.name : entry.name;
        if (entry.id) files.push(fullPath);
        else await visit(fullPath);
      }
      if (entries.length < 1000) break;
      offset += 1000;
    }
  };
  await visit(prefix);
  return files;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "অনুমতি নেই। আবার লগইন করুন।" }, 401);

    const publishableKeys = envKeySet("SUPABASE_PUBLISHABLE_KEYS");
    const secretKeys = envKeySet("SUPABASE_SECRET_KEYS");
    const publishableKey = publishableKeys.default
      ? Deno.env.get(publishableKeys.default)
      : Deno.env.get("SUPABASE_ANON_KEY");
    const secretKey = secretKeys.default
      ? Deno.env.get(secretKeys.default)
      : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl || !publishableKey || !secretKey) {
      throw new Error("সার্ভার কনফিগারেশন অসম্পূর্ণ।");
    }

    const token = authHeader.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "লগইন যাচাই করা যায়নি।" }, 401);
    const adminUser = authData.user;

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: adminRole, error: roleError } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) throw roleError;
    if (!adminRole) return json({ error: "শুধু অ্যাডমিন এই কাজ করতে পারবেন।" }, 403);

    const body = await req.json().catch(() => ({}));
    const storeId = typeof body.storeId === "string" ? body.storeId : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storeId)) {
      return json({ error: "দোকানের আইডি সঠিক নয়।" }, 400);
    }

    const { data: store, error: storeError } = await admin
      .from("seller_stores")
      .select("id,owner_id,is_demo")
      .eq("id", storeId)
      .maybeSingle();
    if (storeError) throw storeError;
    if (!store) return json({ error: "দোকানটি পাওয়া যায়নি।" }, 404);
    if (store.is_demo) return json({ error: "নমুনা দোকান রিমুভ করা যাবে না।" }, 400);
    if (!store.owner_id) return json({ error: "এই দোকানের মালিকের অ্যাকাউন্ট শনাক্ত করা যায়নি।" }, 400);

    const { data: ownerRoles, error: ownerRoleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", store.owner_id);
    if (ownerRoleError) throw ownerRoleError;
    if ((ownerRoles ?? []).some((row: { role: string }) => row.role === "admin")) {
      return json({ error: "অ্যাডমিন অ্যাকাউন্টকে সেলার হিসেবে রিমুভ করা যাবে না।" }, 400);
    }

    // Revoke the seller's active sessions before deleting their login identity.
    const { error: signOutError } = await admin.auth.admin.signOut(store.owner_id, "global");
    if (signOutError) throw signOutError;

    const { data: removalResult, error: removalError } = await admin.rpc("admin_remove_seller_store", {
      p_store_id: store.id,
      p_owner_id: store.owner_id,
      p_admin_user_id: adminUser.id,
    });
    if (removalError) throw removalError;
    if (!removalResult?.success) throw new Error("দোকানটি সম্পূর্ণ রিমুভ করা যায়নি।");

    let storageCleanupPending = false;
    const storageErrors: string[] = [];
    const prefix = store.owner_id + "/" + store.id;
    for (const bucket of ["product-images", "store-media"]) {
      try {
        const paths = await listFilesRecursively(admin, bucket, prefix);
        for (let index = 0; index < paths.length; index += 100) {
          const { error } = await admin.storage.from(bucket).remove(paths.slice(index, index + 100));
          if (error) throw error;
        }
      } catch (error) {
        storageCleanupPending = true;
        storageErrors.push(bucket + ": " + (error instanceof Error ? error.message : String(error)));
      }
    }
    if (storageErrors.length) console.error("Seller storage cleanup pending", storageErrors);

    return json({
      success: true,
      storeId: store.id,
      ownerId: store.owner_id,
      storageCleanupPending,
    });
  } catch (error) {
    console.error("admin-remove-seller-store failed", error);
    return json({
      error: error instanceof Error ? error.message : "সেলার রিমুভ করার সময় সমস্যা হয়েছে।",
    }, 500);
  }
});
