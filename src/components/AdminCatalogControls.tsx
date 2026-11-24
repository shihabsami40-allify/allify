import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

type Category = { id: string; slug: string; name_bn: string; name_en: string; sort_order: number };
type DeliveryArea = { id: string; name_bn: string; name_en: string; zone: string; fee: number; active: boolean; sort_order: number };

const field = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
const button = "rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";
const secondary = "rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50";

export function AdminCatalogControls() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [categoryForm, setCategoryForm] = useState({ slug: "", name_bn: "", name_en: "", sort_order: "0" });
  const [areaForm, setAreaForm] = useState({ name_bn: "", name_en: "", zone: "city", fee: "60", sort_order: "0" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const [categoryResult, areaResult] = await Promise.all([
      supabase.from("categories").select("id,slug,name_bn,name_en,sort_order").order("sort_order"),
      supabase.from("delivery_areas").select("id,name_bn,name_en,zone,fee,active,sort_order").order("sort_order"),
    ]);
    if (categoryResult.error) throw categoryResult.error;
    if (areaResult.error) throw areaResult.error;
    setCategories((categoryResult.data ?? []) as Category[]);
    setAreas((areaResult.data ?? []) as DeliveryArea[]);
  };

  useEffect(() => {
    void load().catch((e: unknown) => setError(e instanceof Error ? e.message : "তথ্য লোড করা যায়নি।"));
  }, []);

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    const slug = categoryForm.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (!slug || !categoryForm.name_bn.trim() || !categoryForm.name_en.trim()) {
      setError("ক্যাটাগরির স্লাগ এবং বাংলা ও ইংরেজি নাম দিতে হবে।");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: insertError } = await supabase.from("categories").insert({
        slug, name_bn: categoryForm.name_bn.trim(), name_en: categoryForm.name_en.trim(),
        sort_order: Number(categoryForm.sort_order) || 0,
      });
      if (insertError) throw insertError;
      setCategoryForm({ slug: "", name_bn: "", name_en: "", sort_order: "0" });
      await load();
      setMessage("নতুন ক্যাটাগরি যোগ হয়েছে।");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "ক্যাটাগরি যোগ করা যায়নি।"); }
    finally { setBusy(false); }
  };

  const renameCategory = async (category: Category) => {
    const name_bn = window.prompt("ক্যাটাগরির বাংলা নাম", category.name_bn);
    if (name_bn === null) return;
    const name_en = window.prompt("ক্যাটাগরির ইংরেজি নাম", category.name_en);
    if (name_en === null) return;
    if (!name_bn.trim() || !name_en.trim()) { setError("ক্যাটাগরির নাম খালি রাখা যাবে না।"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: updateError } = await supabase.from("categories").update({ name_bn: name_bn.trim(), name_en: name_en.trim() }).eq("id", category.id);
      if (updateError) throw updateError;
      await load(); setMessage("ক্যাটাগরি আপডেট হয়েছে।");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "ক্যাটাগরি আপডেট করা যায়নি।"); }
    finally { setBusy(false); }
  };

  const saveArea = async (event: FormEvent) => {
    event.preventDefault();
    const fee = Number(areaForm.fee);
    if (!areaForm.name_bn.trim() || !areaForm.name_en.trim() || !areaForm.zone.trim() || !Number.isFinite(fee) || fee < 0 || fee > 100000) {
      setError("ডেলিভারি এলাকার নাম, জোন এবং সঠিক চার্জ দিতে হবে।");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: insertError } = await supabase.from("delivery_areas").insert({
        name_bn: areaForm.name_bn.trim(), name_en: areaForm.name_en.trim(), zone: areaForm.zone.trim(),
        fee, active: true, sort_order: Number(areaForm.sort_order) || 0,
      });
      if (insertError) throw insertError;
      setAreaForm({ name_bn: "", name_en: "", zone: "চট্টগ্রাম", fee: "60", sort_order: "0" });
      await load(); setMessage("নতুন ডেলিভারি এলাকা যোগ হয়েছে।");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "এলাকা যোগ করা যায়নি।"); }
    finally { setBusy(false); }
  };

  const editArea = async (area: DeliveryArea) => {
    const feeText = window.prompt("ডেলিভারি চার্জ (টাকা)", String(area.fee));
    if (feeText === null) return;
    const fee = Number(feeText);
    if (!Number.isFinite(fee) || fee < 0 || fee > 100000) { setError("সঠিক ডেলিভারি চার্জ লিখুন।"); return; }
    const active = window.confirm("এই এলাকা সক্রিয় রাখতে OK চাপুন। নিষ্ক্রিয় করতে Cancel চাপুন।");
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: updateError } = await supabase.from("delivery_areas").update({ fee, active }).eq("id", area.id);
      if (updateError) throw updateError;
      await load(); setMessage("ডেলিভারি এলাকার চার্জ ও অবস্থা আপডেট হয়েছে।");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "এলাকা আপডেট করা যায়নি।"); }
    finally { setBusy(false); }
  };

  return <section className="mt-5 space-y-4">
    {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">{error}</p>}
    {message && <p role="status" className="rounded-lg border p-3 text-sm">{message}</p>}
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <h2 className="font-bold">ক্যাটাগরি ব্যবস্থাপনা</h2>
      <p className="mt-1 text-xs text-muted-foreground">নতুন ক্যাটাগরি যোগ করুন অথবা নাম পরিবর্তন করুন। ব্যবহৃত ক্যাটাগরি মুছে ফেলা হয় না।</p>
      <form onSubmit={saveCategory} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input className={field} placeholder="Slug (যেমন fashion)" value={categoryForm.slug} onChange={e=>setCategoryForm(v=>({...v,slug:e.target.value}))} required />
        <input className={field} placeholder="বাংলা নাম" value={categoryForm.name_bn} onChange={e=>setCategoryForm(v=>({...v,name_bn:e.target.value}))} required />
        <input className={field} placeholder="English name" value={categoryForm.name_en} onChange={e=>setCategoryForm(v=>({...v,name_en:e.target.value}))} required />
        <input className={field} type="number" placeholder="ক্রম" value={categoryForm.sort_order} onChange={e=>setCategoryForm(v=>({...v,sort_order:e.target.value}))} />
        <button className={button} disabled={busy}>ক্যাটাগরি যোগ করুন</button>
      </form>
      <div className="mt-3 divide-y">{categories.map(category=><div key={category.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
        <span><b>{category.name_bn}</b> <span className="text-muted-foreground">({category.name_en}) · {category.slug}</span></span>
        <button type="button" className={secondary} disabled={busy} onClick={()=>void renameCategory(category)}>নাম পরিবর্তন</button>
      </div>)}</div>
    </div>
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <h2 className="font-bold">ডেলিভারি এলাকা ও চার্জ</h2>
      <p className="mt-1 text-xs text-muted-foreground">এলাকা যোগ করুন, চার্জ পরিবর্তন করুন অথবা সাময়িকভাবে নিষ্ক্রিয় করুন।</p>
      <form onSubmit={saveArea} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input className={field} placeholder="বাংলা এলাকার নাম" value={areaForm.name_bn} onChange={e=>setAreaForm(v=>({...v,name_bn:e.target.value}))} required />
        <input className={field} placeholder="English area name" value={areaForm.name_en} onChange={e=>setAreaForm(v=>({...v,name_en:e.target.value}))} required />
        <select className={field} aria-label="ডেলিভারি জোন" value={areaForm.zone} onChange={e=>setAreaForm(v=>({...v,zone:e.target.value}))} required><option value="city">সিটি এলাকা</option><option value="upazila">উপজেলা এলাকা</option></select>
        <input className={field} type="number" min="0" max="100000" step="1" placeholder="ডেলিভারি চার্জ" value={areaForm.fee} onChange={e=>setAreaForm(v=>({...v,fee:e.target.value}))} required />
        <input className={field} type="number" placeholder="ক্রম" value={areaForm.sort_order} onChange={e=>setAreaForm(v=>({...v,sort_order:e.target.value}))} />
        <button className={button} disabled={busy}>এলাকা যোগ করুন</button>
      </form>
      <div className="mt-3 divide-y">{areas.map(area=><div key={area.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
        <span><b>{area.name_bn}</b> <span className="text-muted-foreground">({area.name_en}) · {area.zone} · ৳{Number(area.fee).toLocaleString("bn-BD")} · {area.active?"সক্রিয়":"নিষ্ক্রিয়"}</span></span>
        <button type="button" className={secondary} disabled={busy} onClick={()=>void editArea(area)}>চার্জ/অবস্থা</button>
      </div>)}</div>
    </div>
  </section>;
}
