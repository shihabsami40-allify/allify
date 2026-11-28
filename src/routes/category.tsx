import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/category")({ component: CategoryPage });

type Category = { id: string; slug: string; name_bn: string; name_en?: string | null; parent_id?: string | null };
type Product = {
  id: string; slug: string; title_bn: string; price: number; compare_price?: number | null;
  stock: number; category_id?: string | null; product_images?: { url: string }[];
  seller_stores?: { name?: string; slug?: string; is_demo?: boolean } | null;
};

const groups = [
  { slug: "women-girls-fashion", name: "নারী ও মেয়েদের ফ্যাশন", en: "Women's & Girls' Fashion", icon: "👗", legacy: ["clothing", "shoes"] },
  { slug: "health-beauty", name: "স্বাস্থ্য ও সৌন্দর্য", en: "Health & Beauty", icon: "💄", legacy: ["beauty"] },
  { slug: "watches-bags-jewellery", name: "ঘড়ি, ব্যাগ ও জুয়েলারি", en: "Watches, Bags & Jewellery", icon: "⌚", legacy: ["watches", "bags"] },
  { slug: "men-boys-fashion", name: "পুরুষ ও ছেলেদের ফ্যাশন", en: "Men's & Boys' Fashion", icon: "👔", legacy: ["clothing", "shoes"] },
  { slug: "mother-baby", name: "মা ও শিশু", en: "Mother & Baby", icon: "🧸", legacy: [] },
  { slug: "electronics-device", name: "ইলেকট্রনিক ডিভাইস", en: "Electronics Device", icon: "📱", legacy: ["electronics"] },
  { slug: "tv-home-appliances", name: "টিভি ও হোম অ্যাপ্লায়েন্স", en: "TV & Home Appliances", icon: "📺", legacy: ["electronics-tv", "electronics-appliances"] },
  { slug: "electronic-accessories", name: "ইলেকট্রনিক অ্যাকসেসরিজ", en: "Electronic Accessories", icon: "🎧", legacy: ["electronics-audio", "mobile"] },
  { slug: "groceries-pets", name: "গ্রোসারি ও পোষা প্রাণী", en: "Groceries & Pets", icon: "🛒", legacy: ["daily", "food-drinks"] },
  { slug: "home-lifestyle", name: "হোম ও লাইফস্টাইল", en: "Home & Lifestyle", icon: "🏠", legacy: ["home"] },
  { slug: "sports-outdoors", name: "স্পোর্টস ও আউটডোর", en: "Sports & Outdoors", icon: "⚽", legacy: [] },
  { slug: "automotive-motorbike", name: "অটোমোটিভ ও মোটরবাইক", en: "Automotive & Motorbike", icon: "🚗", legacy: [] },
];

function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeSlug, setActiveSlug] = useState(groups[0].slug);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("darazCategory");
    if (requested && groups.some((group) => group.slug === requested)) setActiveSlug(requested);
    const legacy = params.get("category");
    if (legacy) {
      // Resolve legacy category links to the closest displayed group after categories load.
      setSelectedCategory(legacy);
    }
    (async () => {
      try {
        const [categoryResult, productResult] = await Promise.all([
          supabase.from("categories").select("id,slug,name_bn,name_en,parent_id,sort_order").order("sort_order"),
          supabase.from("products").select("id,slug,title_bn,price,compare_price,stock,category_id,product_images(url,sort_order),seller_stores!inner(name,slug,is_demo,status)").eq("status", "active").eq("seller_stores.status", "active").order("sold_count", { ascending: false }).limit(48),
        ]);
        if (categoryResult.error) throw categoryResult.error;
        if (productResult.error) throw productResult.error;
        if (!alive) return;
        const loadedCategories = (categoryResult.data ?? []) as Category[];
        setCategories(loadedCategories);
        setProducts(((productResult.data ?? []) as Product[]).map((product) => ({
          ...product,
          product_images: [...(product.product_images ?? [])].sort((a, b) => 0),
        })));
        if (legacy) {
          const match = groups.find((group) => group.legacy.includes(legacy));
          if (match) setActiveSlug(match.slug);
        }
      } catch (e: any) {
        if (alive) setError(e?.message || "ক্যাটাগরি লোড করা যায়নি। আবার চেষ্টা করুন।");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const activeGroup = groups.find((group) => group.slug === activeSlug) ?? groups[0];
  const rootIds = useMemo(() => categories.filter((category) => activeGroup.legacy.includes(category.slug)).map((category) => category.id), [categories, activeGroup]);
  const visibleIds = useMemo(() => {
    const seen = new Set<string>(rootIds);
    const queue = [...rootIds];
    while (queue.length) {
      const parentId = queue.shift()!;
      for (const category of categories) {
        if (category.parent_id === parentId && !seen.has(category.id)) {
          seen.add(category.id);
          queue.push(category.id);
        }
      }
    }
    return seen;
  }, [categories, rootIds]);
  const subcategories = categories.filter((category) =>
    activeGroup.legacy.includes(category.slug) || rootIds.includes(category.parent_id || "")
  );
  const filteredProducts = products.filter((product) => {
    if (!product.category_id || !visibleIds.has(product.category_id)) return false;
    if (!selectedCategory) return true;
    const selected = categories.find((category) => category.slug === selectedCategory);
    if (!selected) return true;
    const selectedIds = new Set<string>([selected.id]);
    const queue = [selected.id];
    while (queue.length) {
      const parentId = queue.shift()!;
      for (const category of categories) {
        if (category.parent_id === parentId && !selectedIds.has(category.id)) {
          selectedIds.add(category.id);
          queue.push(category.id);
        }
      }
    }
    return selectedIds.has(product.category_id);
  });

  const chooseGroup = (slug: string) => {
    setActiveSlug(slug);
    setSelectedCategory("");
    const params = new URLSearchParams(window.location.search);
    params.set("darazCategory", slug);
    params.delete("category");
    window.history.replaceState({}, "", "/category?" + params.toString());
  };
  const chooseSubcategory = (slug: string) => {
    setSelectedCategory(slug);
    const params = new URLSearchParams(window.location.search);
    params.set("category", slug);
    params.delete("darazCategory");
    window.history.replaceState({}, "", "/category?" + params.toString());
  };

  return (
    <div className="min-h-screen bg-[#f7f9f7] pb-8 text-[#18211f]">
      <header className="border-b border-[#e5ece7] bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <a href="/" className="font-black tracking-[.06em] text-2xl text-[#123b32]">ALLI<span className="text-[#9bbd31]">F</span>Y</a>
          <a href="/cart" className="rounded-lg border border-[#dce7df] px-3 py-2 text-xs font-bold text-[#123b32]">🛒 কার্ট</a>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4">
        <div className="mb-4 rounded-xl border border-[#e2ebe4] bg-gradient-to-r from-[#f2f7ed] to-white px-4 py-3">
          <p className="text-[10px] font-extrabold tracking-[.16em] text-[#6d8a72]">ALLIFY SHOPPING</p>
          <h1 className="mt-1 text-lg font-black tracking-tight text-[#123b32] sm:text-xl">ক্যাটাগরি ব্রাউজ করুন</h1>
          <p className="mt-1 text-xs text-[#687571]">বাম পাশ থেকে বিভাগ বেছে নিন, ডান পাশে উপ-বিভাগ দেখুন</p>
        </div>
        {loading ? <div className="rounded-xl border border-[#e5ece7] bg-white p-8 text-center text-sm text-[#687571]">ক্যাটাগরি লোড হচ্ছে…</div> :
          error ? <div role="alert" className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700">{error} <button onClick={() => window.location.reload()} className="ml-2 underline">আবার চেষ্টা করুন</button></div> :
          <div className="grid min-h-[520px] grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-xl border border-[#e5ece7] bg-white shadow-sm sm:grid-cols-[220px_minmax(0,1fr)] md:grid-cols-[250px_minmax(0,1fr)]">
            <aside aria-label="মূল ক্যাটাগরি" className="border-r border-[#e5ece7] bg-[#f5f7f4]">
              <div className="border-b border-[#e5ece7] px-2 py-3 text-[10px] font-extrabold text-[#52615b] sm:px-4 sm:text-xs">সব ক্যাটাগরি</div>
              <nav className="max-h-[70vh] overflow-y-auto">
                {groups.map((group) => {
                  const active = activeGroup.slug === group.slug;
                  return <button key={group.slug} type="button" onClick={() => chooseGroup(group.slug)} aria-pressed={active} className={"relative flex min-h-[68px] w-full items-center gap-2 border-b border-[#e9eee9] px-2 py-3 text-left transition sm:gap-3 sm:px-4 " + (active ? "bg-white font-extrabold" : "font-medium hover:bg-white/70")} style={{ color: active ? "#123b32" : "#52615b" }}>
                    {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[#9bbd31]" />}
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-lg sm:h-10 sm:w-10 sm:text-2xl">{group.icon}</span>
                    <span className="min-w-0 text-[10px] leading-4 sm:text-sm sm:leading-5">{group.name}</span>
                  </button>;
                })}
              </nav>
            </aside>
            <section className="min-w-0 p-3 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-2 border-b border-[#edf1ed] pb-3">
                <div className="min-w-0"><p className="text-[10px] font-bold text-[#789080]">নির্বাচিত বিভাগ</p><h2 className="mt-1 truncate text-sm font-black text-[#123b32] sm:text-lg">{activeGroup.name}</h2></div>
                <span className="shrink-0 rounded-full bg-[#edf4e8] px-2.5 py-1 text-[10px] font-bold text-[#356b50] sm:text-xs">{subcategories.length.toLocaleString("bn-BD")}টি উপ-বিভাগ</span>
              </div>
              {subcategories.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                {subcategories.map((category) => <button key={category.id} type="button" onClick={() => chooseSubcategory(category.slug)} className={"flex min-h-28 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-4 text-center shadow-sm transition " + (selectedCategory === category.slug ? "border-[#9bbd31] bg-[#f4f8ee]" : "border-[#e5ece7] bg-white hover:border-[#b8cdbf]")}>
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#f4f8ee] to-[#e5efdf] text-3xl">🛍️</span>
                  <span className="line-clamp-2 text-xs font-bold leading-5 text-[#24352e]">{category.name_bn}</span>
                  {category.name_en && <span className="line-clamp-1 text-[10px] text-[#687571]">{category.name_en}</span>}
                </button>)}
              </div> : <div className="rounded-xl border border-[#e5ece7] bg-[#fbfcfa] p-4 text-center text-xs text-[#687571]">এই বিভাগের উপ-বিভাগ এখনো যোগ করা হয়নি।</div>}
              <div className="mb-3 mt-6 flex items-end justify-between gap-2">
                <div><h3 className="text-sm font-extrabold text-[#123b32] sm:text-base">এই বিভাগের পণ্য</h3><p className="mt-1 text-[10px] text-[#687571] sm:text-xs">আপনার পছন্দের পণ্য বেছে নিন</p></div>
                <span className="shrink-0 text-[10px] text-[#687571] sm:text-xs">{filteredProducts.length.toLocaleString("bn-BD")}টি পণ্য</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => <article key={product.id} className="overflow-hidden rounded-xl border border-[#e5ece7] bg-white">
                  <a href={"/product?slug=" + encodeURIComponent(product.slug)} className="block">
                    <div className="grid aspect-square w-full place-items-center overflow-hidden bg-[#f2f5f1] p-3">
                      {product.product_images?.[0]?.url ? <img src={product.product_images[0].url} alt={product.title_bn} loading="lazy" className="h-full w-full object-contain" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span className="text-5xl">🛍️</span>}
                    </div>
                  </a>
                  <div className="p-3">
                    <a href={"/product?slug=" + encodeURIComponent(product.slug)} className="line-clamp-2 min-h-10 text-sm font-bold text-[#24352e]">{product.title_bn}</a>
                    <p className="mt-2 text-sm font-black text-[#123b32]">৳ {Number(product.price || 0).toLocaleString("bn-BD")}</p>
                    {product.compare_price ? <s className="text-[10px] text-[#89948e]">৳ {Number(product.compare_price).toLocaleString("bn-BD")}</s> : null}
                    <p className="mt-1 text-[10px] text-[#687571]">{product.seller_stores?.name || "স্থানীয় দোকান"}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <a href={"/product?slug=" + encodeURIComponent(product.slug)} className="rounded-lg border border-[#cbd9d0] px-2 py-2 text-center text-[10px] font-bold text-[#123b32]">বিস্তারিত</a>
                      <a href="/login" className="rounded-lg bg-[#123b32] px-2 py-2 text-center text-[10px] font-bold text-white">অর্ডার</a>
                    </div>
                  </div>
                </article>)}
              </div>
              {!filteredProducts.length && <p className="rounded-xl border border-[#e5ece7] bg-white p-5 text-center text-xs text-[#687571]">এই ক্যাটাগরিতে এখনো কোনো পণ্য যোগ করা হয়নি।</p>}
              {selectedCategory && <button type="button" onClick={() => { setSelectedCategory(""); const params = new URLSearchParams(window.location.search); params.delete("category"); window.history.replaceState({}, "", "/category" + (params.size ? "?" + params.toString() : "")); }} className="mt-4 text-xs font-bold text-[#356b50] underline">সব উপ-বিভাগের পণ্য দেখুন</button>}
            </section>
          </div>}
      </main>
    </div>
  );
}
