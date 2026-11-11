import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import hero from "@/assets/hero-bazaar.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ALLIFY — চট্টগ্রামের ডিজিটাল বাজার" },
      { name: "description", content: "চট্টগ্রামের স্থানীয় দোকান থেকে পোশাক, জুতা, ঘড়ি, ব্যাগ ও নিত্যপ্রয়োজনীয় পণ্য কিনুন। ক্যাশ অন ডেলিভারি।" },
      { property: "og:title", content: "ALLIFY — চট্টগ্রামের ডিজিটাল বাজার" },
      { property: "og:description", content: "স্থানীয় বিক্রেতা, ফ্রি স্টোর, ক্যাশ অন ডেলিভারি।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const bdt = (n: number) => "৳" + Number(n).toLocaleString("bn-BD");

function Index() {
  const cats = useQuery({ queryKey: ["cats"], queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [] });
  const prods = useQuery({
    queryKey: ["popular"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,slug,title_bn,price,compare_price,product_images(url),seller_stores(name)").order("sold_count", { ascending: false }).limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <span className="font-display text-2xl font-bold tracking-tight text-primary">ALLIFY</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">ডেমো মোড</span>
          <span className="ml-auto text-sm text-muted-foreground">📍 চট্টগ্রাম জেলা</span>
        </div>
      </header>
      <section className="relative">
        <img src={hero} alt="চট্টগ্রামের বাজার" width={1600} height={912} className="h-64 w-full object-cover md:h-96" />
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-foreground/70 to-transparent">
          <div className="mx-auto w-full max-w-6xl px-4 pb-6 text-background">
            <h1 className="font-display text-3xl font-bold md:text-5xl">চট্টগ্রামের ডিজিটাল বাজার</h1>
            <p className="mt-2 max-w-xl">স্থানীয় দোকান, ন্যায্য দাম, ক্যাশ অন ডেলিভারি। বিক্রেতাদের জন্য রেজিস্ট্রেশন সম্পূর্ণ ফ্রি।</p>
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="font-display text-xl font-semibold">ক্যাটাগরি</h2>
        <div className="mt-3 grid grid-cols-4 gap-2 md:grid-cols-8">
          {cats.data?.map((c) => (
            <div key={c.id} className="rounded-lg border bg-card p-3 text-center text-sm">{c.name_bn}</div>
          ))}
        </div>
        <h2 className="mt-8 font-display text-xl font-semibold">জনপ্রিয় পণ্য</h2>
        {prods.isLoading && <p className="mt-3 text-muted-foreground">লোড হচ্ছে…</p>}
        {prods.error && <p className="mt-3 text-destructive">পণ্য লোড করা যায়নি।</p>}
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {prods.data?.map((p: any) => (
            <article key={p.id} className="overflow-hidden rounded-xl border bg-card">
              <img src={p.product_images?.[0]?.url} alt={p.title_bn} loading="lazy" className="aspect-square w-full object-cover" />
              <div className="p-3">
                <h3 className="line-clamp-2 text-sm font-medium">{p.title_bn}</h3>
                <p className="text-xs text-muted-foreground">{p.seller_stores?.name}</p>
                <p className="mt-1 font-semibold text-primary">{bdt(p.price)} {p.compare_price && <s className="text-xs text-muted-foreground">{bdt(p.compare_price)}</s>}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-8 rounded-lg border bg-muted p-4 text-sm text-muted-foreground">পেমেন্ট: শুধুমাত্র ক্যাশ অন ডেলিভারি। অনলাইন পেমেন্ট ও কুরিয়ার ইন্টিগ্রেশন এখনো চালু হয়নি।</p>
      </main>
    </div>
  );
}