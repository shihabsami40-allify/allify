import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ALLIFY — Your Local Marketplace" },
      { name: "description", content: "চট্টগ্রামের স্থানীয় দোকান থেকে পোশাক, জুতা, ঘড়ি, ব্যাগ ও নিত্যপ্রয়োজনীয় পণ্য কিনুন।" },
      { property: "og:title", content: "ALLIFY — Your Local Marketplace" },
      { property: "og:description", content: "চট্টগ্রামের স্থানীয় ব্যবসার ডিজিটাল ঠিকানা।" },
      { property: "og:type", content: "website" },
      { name: "theme-color", content: "#123b32" },
    ],
  }),
  component: Index,
});

type StoreProduct = {
  id: string;
  slug: string;
  title_bn: string;
  price: number;
  compare_price?: number | null;
  stock: number;
  category_id?: string | null;
  product_images?: { url: string }[];
  seller_stores?: { name: string } | null;
};

const bdt = (n: number) => "৳ " + Number(n || 0).toLocaleString("bn-BD");
const categoryIcons: Record<string, string> = {
  "পোশাক": "👕", "জুতা": "👟", "ঘড়ি": "⌚", "ঘড়ি": "⌚",
  "ব্যাগ": "🎒", "বিউটি": "💄", "লাইফস্টাইল": "🏠",
};

function Index() {
  const [cartCount, setCartCount] = useState(0);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");

  const cats = useQuery({
    queryKey: ["cats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,slug,name_bn,name_en,sort_order")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
    gcTime: 300_000,
    retry: 1,
  });

  const prods = useQuery({
    queryKey: ["popular"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,slug,title_bn,price,compare_price,stock,category_id,product_images(url),seller_stores(name)")
        .eq("status", "active")
        .order("sold_count", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as StoreProduct[];
    },
    staleTime: 60_000,
    gcTime: 300_000,
    retry: 1,
  });

  useEffect(() => {
    const update = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("allify-cart") || "[]");
        setCartCount(Array.isArray(saved) ? saved.reduce((n: number, row: any) => n + Number(row.quantity || 0), 0) : 0);
      } catch {
        setCartCount(0);
      }
    };
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);

  const addToCart = (product: StoreProduct) => {
    try {
      const saved = JSON.parse(localStorage.getItem("allify-cart") || "[]");
      const next = Array.isArray(saved) ? [...saved] : [];
      const found = next.find((row: any) => row.product?.id === product.id);
      const stockLimit = Math.max(0, Math.min(99, Number(product.stock) || 0));
      if (stockLimit < 1) {
        setToast("এই পণ্যটি বর্তমানে স্টকে নেই");
        window.setTimeout(() => setToast(""), 2200);
        return;
      }
      if (found) {
        if (Number(found.quantity || 0) >= stockLimit) {
          setToast("স্টকে থাকা সর্বোচ্চ পরিমাণ কার্টে যোগ করা হয়েছে");
          window.setTimeout(() => setToast(""), 2200);
          return;
        }
        found.quantity = Number(found.quantity || 0) + 1;
      } else next.push({ product, quantity: 1 });
      localStorage.setItem("allify-cart", JSON.stringify(next));
      setCartCount(next.reduce((n: number, row: any) => n + Number(row.quantity || 0), 0));
      setToast("পণ্যটি কার্টে যোগ হয়েছে");
      window.setTimeout(() => setToast(""), 2200);
    } catch {
      setToast("কার্টে পণ্য যোগ করা যায়নি। আবার চেষ্টা করুন।");
      window.setTimeout(() => setToast(""), 2500);
    }
  };

  const categoryList = (cats.data ?? []).slice(0, 6);

  return (
    <div className="min-h-screen" style={{ background: "#f7f9f7", color: "#18211f" }}>
      <div className="px-3 py-2 text-center text-xs" style={{ background: "#123b32", color: "#e9f2ed" }}>
        চট্টগ্রামের ব্যবসা, চট্টগ্রামের মানুষের জন্য — স্থানীয় কেনাকাটার নতুন ঠিকানা
      </div>

      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur" style={{ borderColor: "#e8eeeb" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 md:gap-6 md:px-6">
          <a href="/" className="shrink-0 font-black tracking-wide" style={{ color: "#123b32", fontSize: 25 }}>
            ALLI<span style={{ color: "#9bbd31" }}>F</span>Y
            <span className="block -mt-1 text-[9px] font-medium tracking-[.18em]" style={{ color: "#687571" }}>YOUR LOCAL MARKETPLACE</span>
          </a>
          <form action="/search" className="order-3 flex w-full flex-1 rounded-xl border p-1 md:order-none md:min-w-0" style={{ background: "#f2f5f3", borderColor: "#e9efeb" }}>
            <input name="q" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="পণ্য খুঁজুন" placeholder="পণ্য, দোকান বা ক্যাটাগরি খুঁজুন..." className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" />
            <button className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: "#123b32" }}>খুঁজুন</button>
          </form>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <a href="/account" className="hidden sm:inline">অ্যাকাউন্ট</a>
            <a href="/cart" className="rounded-lg px-3 py-2 font-semibold" style={{ background: "#f0f5eb", color: "#123b32" }}>🛒 কার্ট ({cartCount.toLocaleString("bn-BD")})</a>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-5 overflow-x-auto whitespace-nowrap px-4 pb-3 text-xs md:px-6" style={{ color: "#52615b" }}>
          <a href="/market">সব পণ্য</a>
          <a href="#categories">ক্যাটাগরি</a>
          <a href="#local">স্থানীয় দোকান</a>
          <a href="#products">জনপ্রিয় পণ্য</a>
          <a href="/seller">বিক্রেতা হোন</a>
          <span>📍 চট্টগ্রাম জেলা</span>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-14 pt-5 md:px-6">
        <section className="grid min-h-[260px] overflow-hidden rounded-[22px] px-6 py-8 text-white md:grid-cols-[1.2fr_.8fr] md:items-center md:px-11 md:py-10" style={{ background: "linear-gradient(115deg,#123b32,#1d6650)" }}>
          <div>
            <p className="text-xs font-bold tracking-widest" style={{ color: "#d9f36a" }}>YOUR CITY. YOUR SHOPS. YOUR MARKETPLACE.</p>
            <h1 className="mt-3 max-w-xl text-3xl font-extrabold leading-tight md:text-5xl">চট্টগ্রামের কেনাকাটা, এখন এক ঠিকানায়</h1>
            <p className="mt-3 max-w-xl text-sm leading-7" style={{ color: "#d2e2db" }}>আপনার পরিচিত স্থানীয় দোকান থেকে পছন্দের পণ্য খুঁজুন। সহজ অর্ডার, ক্যাশ অন ডেলিভারি এবং স্থানীয় ব্যবসাকে এগিয়ে নেওয়ার নতুন সুযোগ।</p>
            <a href="/market" className="mt-4 inline-flex rounded-lg px-5 py-3 text-sm font-extrabold" style={{ background: "#d9f36a", color: "#1c2b20" }}>কেনাকাটা শুরু করুন →</a>
          </div>
          <div className="hidden items-center justify-center md:flex">
            <div className="relative grid h-56 w-56 place-items-center rounded-full border" style={{ borderColor: "#6d9787" }}>
              <div className="absolute inset-5 rounded-full border" style={{ borderColor: "#6d9787" }} />
              <div className="absolute inset-10 rounded-full border" style={{ borderColor: "#6d9787" }} />
              <div className="z-10 grid h-28 w-28 place-items-center rounded-2xl text-5xl font-black shadow-2xl" style={{ background: "#d9f36a", color: "#123b32" }}>A</div>
              <span className="absolute -right-4 top-7 rounded-lg bg-white px-3 py-2 text-xs font-bold shadow-lg" style={{ color: "#123b32" }}>স্থানীয় দোকান</span>
              <span className="absolute -bottom-2 -left-5 rounded-lg bg-white px-3 py-2 text-xs font-bold shadow-lg" style={{ color: "#123b32" }}>সহজ অনলাইন অর্ডার</span>
            </div>
          </div>
        </section>

        <div id="categories" className="mb-4 mt-9 flex items-end justify-between">
          <div><h2 className="text-xl font-bold">ক্যাটাগরি থেকে খুঁজুন</h2><p className="mt-1 text-xs" style={{ color: "#687571" }}>আপনার পছন্দের পণ্য এক জায়গায়</p></div>
          <a href="/market" className="text-xs font-extrabold" style={{ color: "#1b594a" }}>সব দেখুন →</a>
        </div>
        <section className="grid grid-cols-3 gap-2.5 md:grid-cols-6 md:gap-3">
          {cats.isLoading && <p className="col-span-full py-5 text-center text-sm" style={{ color: "#687571" }}>ক্যাটাগরি লোড হচ্ছে…</p>}
          {cats.error && <p className="col-span-full py-5 text-center text-sm text-red-600">ক্যাটাগরি লোড করা যায়নি।</p>}
          {categoryList.map((cat) => (
            <a key={cat.id} href={"/category?category=" + encodeURIComponent(cat.slug)} className="rounded-2xl border bg-white px-2 py-4 text-center transition hover:-translate-y-1 hover:shadow-lg" style={{ borderColor: "#e8eeeb" }}>
              <span className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl text-2xl" style={{ background: "#eff5e9" }}>{categoryIcons[cat.name_bn] || "🛍️"}</span>
              <b className="text-sm">{cat.name_bn}</b>
              <small className="mt-1 block text-[10px]" style={{ color: "#687571" }}>{cat.name_en || "পছন্দের পণ্য"}</small>
            </a>
          ))}
          {!cats.isLoading && !cats.error && categoryList.length === 0 && <p className="col-span-full rounded-xl bg-white p-5 text-center text-sm" style={{ color: "#687571" }}>ক্যাটাগরি শিগগিরই যোগ করা হবে।</p>}
        </section>

        <section id="local" className="mt-7 flex items-center justify-between gap-3 rounded-2xl border px-4 py-4 md:px-5" style={{ background: "#edf4e8", borderColor: "#e0ead8" }}>
          <div><strong className="text-sm md:text-base" style={{ color: "#123b32" }}>চট্টগ্রামের স্থানীয় ব্যবসাকে সমর্থন করুন</strong><span className="mt-1 block text-xs" style={{ color: "#637269" }}>স্থানীয় বিক্রেতাদের পণ্য আবিষ্কার করুন — এক প্ল্যাটফর্মে।</span></div>
          <span className="text-2xl">📍</span>
        </section>

        <div id="products" className="mb-4 mt-9 flex items-end justify-between">
          <div><h2 className="text-xl font-bold">জনপ্রিয় পণ্য</h2><p className="mt-1 text-xs" style={{ color: "#687571" }}>ALLIFY-তে যা যা খুঁজে পেতে পারেন</p></div>
          <a href="/market" className="text-xs font-extrabold" style={{ color: "#1b594a" }}>সব পণ্য →</a>
        </div>
        {prods.isLoading && <p className="py-6 text-center text-sm" style={{ color: "#687571" }}>পণ্য লোড হচ্ছে…</p>}
        {prods.error && <p className="rounded-xl bg-white p-5 text-sm text-red-600">পণ্য লোড করা যায়নি। অনুগ্রহ করে পরে আবার চেষ্টা করুন।</p>}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {prods.data?.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-1 hover:shadow-lg" style={{ borderColor: "#e8eeeb" }}>
              <a href={"/product?slug=" + encodeURIComponent(product.slug)} className="block">
                <div className="grid aspect-square place-items-center bg-gradient-to-br from-[#f0f3ef] to-[#e6ece7]">
                  {product.product_images?.[0]?.url
                    ? <img src={product.product_images[0].url} alt={product.title_bn} loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    : <span className="text-5xl">🛍️</span>}
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 text-sm font-bold">{product.title_bn}</h3>
                  <p className="mt-1 text-[10px]" style={{ color: "#687571" }}>{product.seller_stores?.name || "স্থানীয় দোকান"}</p>
                  <p className="mt-2 font-black" style={{ color: "#123b32" }}>{bdt(product.price)} {product.compare_price ? <s className="ml-1 text-[10px] font-normal text-gray-400">{bdt(product.compare_price)}</s> : null}</p>
                </div>
              </a>
              <div className="px-3 pb-3">
                <button type="button" disabled={product.stock < 1} onClick={() => addToCart(product)} className="w-full rounded-lg border py-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50" style={{ borderColor: "#cbd9d0", color: "#123b32" }}>কার্টে যোগ করুন</button>
              </div>
            </article>
          ))}
          {!prods.isLoading && !prods.error && (prods.data?.length ?? 0) === 0 && <p className="col-span-full rounded-xl border bg-white p-7 text-center text-sm" style={{ borderColor: "#e8eeeb", color: "#687571" }}>জনপ্রিয় পণ্য শিগগিরই এখানে দেখা যাবে।</p>}
        </section>

        <section id="seller" className="mt-9 flex flex-col items-start justify-between gap-4 rounded-2xl px-6 py-6 text-white md:flex-row md:items-center md:px-7" style={{ background: "#123b32" }}>
          <div><h2 className="text-xl font-extrabold">আপনি কি চট্টগ্রামের ব্যবসায়ী?</h2><p className="mt-2 text-xs leading-6" style={{ color: "#d2e2db" }}>ALLIFY-তে আপনার দোকান যুক্ত করুন। প্রাথমিক পর্যায়ে বিক্রেতা নিবন্ধন সম্পূর্ণ ফ্রি।</p></div>
          <a href="/seller" className="shrink-0 rounded-lg bg-white px-4 py-3 text-xs font-extrabold" style={{ color: "#123b32" }}>বিক্রেতা হিসেবে যুক্ত হোন →</a>
        </section>
      </main>

      <footer className="px-5 py-8 text-white" style={{ background: "#0e2e27" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-5">
          <div><b className="text-xl tracking-wider">ALLIFY</b><p className="mt-1 text-xs" style={{ color: "#a9c0b5" }}>Your Local Marketplace</p></div>
          <div className="text-xs leading-6" style={{ color: "#a9c0b5" }}>চট্টগ্রামের স্থানীয় ব্যবসার ডিজিটাল ঠিকানা।<br />© ALLIFY · চট্টগ্রাম জেলা · ক্যাশ অন ডেলিভারি</div>
        </div>
      </footer>

      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm text-white shadow-xl" style={{ background: "#0e2e27" }}>{toast}</div>}
    </div>
  );
}
