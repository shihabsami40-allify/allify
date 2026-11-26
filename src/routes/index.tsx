import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { canPurchaseProduct, sanitizeStoredCart, type StoredCartLine } from "@/lib/cart-validation";

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
  seller_stores?: { id?: string; name: string; slug?: string; logo_url?: string | null; is_demo?: boolean } | null;
};

const bdt = (n: number) => "৳ " + Number(n || 0).toLocaleString("bn-BD");
const categoryIcons: Record<string, string> = {
  "পোশাক": "👕", "জুতা": "👟", "ঘড়ি": "⌚", "ঘড়ি": "⌚",
  "ব্যাগ": "🎒", "বিউটি": "💄", "লাইফস্টাইল": "🏠",
  "মোবাইল": "📱", "মোবাইল অ্যাকসেসরিজ": "🔌", "মোবাইল ও অ্যাকসেসরিজ": "📱", "খাবার ও পানীয়": "🍱",
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
        .select("id,slug,name_bn,name_en,sort_order,parent_id")
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
        .select("id,slug,title_bn,price,compare_price,stock,category_id,product_images(url,sort_order),seller_stores(id,name,slug,logo_url,is_demo)")
        .eq("status", "active")
        .order("sort_order", { referencedTable: "product_images", ascending: true })
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
        const safeCart = sanitizeStoredCart(saved);
        setCartCount(safeCart.reduce((n, row) => n + row.quantity, 0));
        localStorage.setItem("allify-cart", JSON.stringify(safeCart));
      } catch {
        setCartCount(0);
      }
    };
    update();
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);

  const addToCart = (product: StoreProduct) => {
    if (!canPurchaseProduct(product)) {
      setToast(product.seller_stores?.is_demo ? "নমুনা পণ্য — অর্ডার বন্ধ" : "এই পণ্যটি বর্তমানে স্টকে নেই");
      window.setTimeout(() => setToast(""), 2200);
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem("allify-cart") || "[]");
      const next = sanitizeStoredCart(saved);
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
      } else next.push({ product: product as StoredCartLine["product"], quantity: 1 });
      localStorage.setItem("allify-cart", JSON.stringify(next));
      setCartCount(next.reduce((n: number, row: any) => n + Number(row.quantity || 0), 0));
      setToast("পণ্যটি কার্টে যোগ হয়েছে");
      window.setTimeout(() => setToast(""), 2200);
    } catch {
      setToast("কার্টে পণ্য যোগ করা যায়নি। আবার চেষ্টা করুন।");
      window.setTimeout(() => setToast(""), 2500);
    }
  };

  const categoryList = (cats.data ?? []).filter((cat) => !cat.parent_id).slice(0, 10);

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
            <a href="/cart" className="hidden sm:inline-flex rounded-lg px-3 py-2 font-semibold" style={{ background: "#f0f5eb", color: "#123b32" }}>🛒 কার্ট ({cartCount.toLocaleString("bn-BD")})</a>
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
                <div className="grid aspect-square w-full place-items-center overflow-hidden bg-gradient-to-br from-[#f0f3ef] to-[#e6ece7] p-3">
                  {product.product_images?.[0]?.url
                    ? <img src={product.product_images[0].url} alt={product.title_bn} loading="lazy" className="h-full w-full object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    : <span className="text-5xl">🛍️</span>}
                </div>
              </a>
              <div className="p-3">
                <a href={"/product?slug=" + encodeURIComponent(product.slug)} className="block"><h3 className="line-clamp-2 min-h-10 text-sm font-bold">{product.title_bn}</h3></a>
                <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                  <p className="shrink-0 text-sm font-black" style={{ color: "#123b32" }}>{bdt(product.price)}</p>
                  <a href={product.seller_stores?.slug ? "/store?slug=" + encodeURIComponent(product.seller_stores.slug) : "/market"} className="flex min-w-0 items-center justify-end gap-1.5 text-right text-[10px] hover:underline" style={{ color: "#687571" }}>{product.seller_stores?.logo_url ? <img src={product.seller_stores.logo_url} alt="" loading="lazy" className="h-5 w-5 shrink-0 rounded-full border object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[9px] font-bold" style={{ background: "#eff5e9", color: "#123b32" }}>{(product.seller_stores?.name || "দ").slice(0,1)}</span>}<span className="min-w-0 truncate">{product.seller_stores?.name || "স্থানীয় দোকান"}</span></a>
                </div>
                {product.compare_price ? <s className="mt-0.5 block text-[10px] text-gray-400">{bdt(product.compare_price)}</s> : null}
              </div>
              <div className="px-3 pb-3">
                <button type="button" disabled={!canPurchaseProduct(product)} onClick={() => addToCart(product)} className="w-full rounded-lg border py-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50" style={{ borderColor: "#cbd9d0", color: "#123b32" }}>{product.seller_stores?.is_demo ? "নমুনা পণ্য — অর্ডার বন্ধ" : "কার্টে যোগ করুন"}</button>
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5">
          <div><b className="text-xl tracking-wider">ALLIFY</b><p className="mt-1 text-xs" style={{ color: "#a9c0b5" }}>Your Local Marketplace</p><p className="mt-2 text-xs" style={{ color: "#a9c0b5" }}>চট্টগ্রামের স্থানীয় ব্যবসার ডিজিটাল ঠিকানা।</p></div>
          <div className="flex flex-col items-start gap-2 text-xs sm:items-end">
            <a href="/help" className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 font-semibold text-white transition hover:bg-white/10"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><path d="M4 12H3a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2v-6Zm16 0h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2v-6Z"/><path d="M18 19a6 6 0 0 1-6 3h-1"/></svg>হেল্প ও সাপোর্ট</a>
            <span style={{ color: "#a9c0b5" }}>© ALLIFY · চট্টগ্রাম জেলা · ক্যাশ অন ডেলিভারি</span>
          </div>
        </div>
      </footer>

      <nav aria-label="মোবাইল নেভিগেশন" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
        <a href="/" aria-current="page" className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-bold" style={{ color: "#123b32" }}><span aria-hidden="true" className="text-lg leading-5">⌂</span><span>হোম</span></a>
        <a href="/category" className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]" style={{ color: "#687571" }}><span aria-hidden="true" className="text-lg leading-5">▦</span><span>ক্যাটাগরি</span></a>
        <a href="/cart" className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]" style={{ color: "#687571" }}><span aria-hidden="true" className="text-lg leading-5">🛒</span><span>কার্ট ({cartCount.toLocaleString("bn-BD")})</span></a>
        <a href="/account" className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]" style={{ color: "#687571" }}><span aria-hidden="true" className="text-lg leading-5">♙</span><span>অ্যাকাউন্ট</span></a>
      </nav>
      <a href="https://wa.me/8801862054563?text=Hello%20ALLIFY%20Support%2C%20I%20need%20assistance." target="_blank" rel="noopener noreferrer" aria-label="WhatsApp-এ ALLIFY সাপোর্টে যোগাযোগ করুন" title="WhatsApp Support" className="fixed bottom-[5.25rem] right-4 z-30 inline-flex items-center gap-2 rounded-full bg-[#16834b] py-3 pl-3 pr-4 text-sm font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] ring-2 ring-white transition hover:-translate-y-0.5 hover:bg-[#116b3d] sm:bottom-6 sm:right-6">
        <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6" fill="currentColor"><path d="M16.02 3.2A12.7 12.7 0 0 0 5.1 22.38L3.4 28.6l6.38-1.67A12.7 12.7 0 1 0 16.02 3.2Zm0 23.1a10.36 10.36 0 0 1-5.28-1.45l-.38-.22-3.79.99 1.01-3.69-.25-.4a10.4 10.4 0 1 1 8.69 4.77Zm5.7-7.78c-.31-.16-1.84-.91-2.13-1.02-.29-.1-.5-.16-.71.16-.21.31-.81 1.02-.99 1.23-.18.21-.36.23-.67.08-.31-.16-1.31-.48-2.49-1.52-.92-.82-1.54-1.83-1.72-2.14-.18-.31-.02-.48.14-.64.14-.14.31-.36.47-.54.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.54-.08-.16-.71-1.7-.97-2.33-.25-.61-.51-.52-.71-.53h-.6c-.21 0-.54.08-.83.39-.29.31-1.09 1.07-1.09 2.61s1.12 3.03 1.28 3.24c.16.21 2.2 3.36 5.33 4.71.74.32 1.32.51 1.77.65.74.24 1.41.21 1.94.13.59-.09 1.84-.75 2.1-1.48.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.6-.37Z"/></svg>
        <span>সাহায্য লাগবে?</span>
      </a>
      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm text-white shadow-xl" style={{ background: "#0e2e27" }}>{toast}</div>}
    </div>
  );
}
