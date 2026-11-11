import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/$page")({ component: MarketplacePage });

type Product = {
  id: string; slug: string; title_bn: string; title_en?: string | null;
  description?: string | null; price: number; compare_price?: number | null;
  stock: number; category_id?: string | null;
  product_images?: { url: string }[]; seller_stores?: { id?: string; name: string; slug?: string; area?: string };
};
type Area = { name_bn: string; name_en: string; fee: number; zone: string };
type CartLine = { product: Product; quantity: number };

const money = (n: number) => "৳" + Number(n || 0).toLocaleString("bn-BD");
const queryValue = (key: string) => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get(key) || "";
const panel = "rounded-2xl border bg-card p-4 shadow-sm";
const field = "w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary";
const primary = "rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50";
const secondary = "rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted";
const linkClass = "text-primary underline-offset-4 hover:underline";

function MarketplacePage() {
  const { page } = Route.useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("customer");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string,string>>({});
  const [store, setStore] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [myStore, setMyStore] = useState<any>(null);
  const [productImage, setProductImage] = useState<File | null>(null);

  const set = (key: string, value: string) => setForm(v => ({...v, [key]: value}));
  const refreshCart = () => {
    try {
      const raw = localStorage.getItem("allify-cart");
      const parsed = raw ? JSON.parse(raw) : [];
      setCart(Array.isArray(parsed) ? parsed : []);
    } catch { setCart([]); }
  };
  const saveCart = (next: CartLine[]) => {
    setCart(next);
    localStorage.setItem("allify-cart", JSON.stringify(next));
  };
  const addToCart = (p: Product) => {
    const next = [...cart];
    const found = next.find(x => x.product.id === p.id);
    if (found) found.quantity = Math.min(99, found.quantity + 1);
    else next.push({product:p, quantity:1});
    saveCart(next);
    setMessage("পণ্যটি কার্টে যোগ হয়েছে।");
  };
  const changeQty = (id: string, quantity: number) => {
    saveCart(cart.map(x => x.product.id === id ? {...x, quantity:Math.max(1,Math.min(99,quantity))} : x));
  };
  const removeLine = (id: string) => saveCart(cart.filter(x => x.product.id !== id));
  const subtotal = cart.reduce((n,x) => n + Number(x.product.price)*x.quantity, 0);

  useEffect(() => {
    refreshCart();
    let alive = true;
    (async () => {
      try {
        // Fetch only what this page needs. Avoid four database round-trips on every route.
        const needsProducts = ["market", "search", "category", "product"].includes(page);
        const needsCategories = ["market", "search", "category", "seller", "seller-dashboard"].includes(page);
        const needsAreas = page === "checkout";
        const [session, cats, productRows, areaRows] = await Promise.all([
          supabase.auth.getSession(),
          needsCategories
            ? supabase.from("categories").select("id,slug,name_bn,name_en,sort_order").order("sort_order")
            : Promise.resolve({ data: [] as any[] }),
          needsProducts
            ? supabase.from("products").select("id,slug,title_bn,title_en,description,price,compare_price,stock,category_id,product_images(url),seller_stores(id,name,slug,area)").eq("status","active").order("sold_count",{ascending:false}).limit(48)
            : Promise.resolve({ data: [] as any[] }),
          needsAreas
            ? supabase.from("delivery_areas").select("name_bn,name_en,fee,zone").eq("active",true).order("sort_order")
            : Promise.resolve({ data: [] as any[] })
        ]);
        if (!alive) return;
        setUser(session.data.session?.user ?? null);
        setCategories(cats.data ?? []);
        setProducts((productRows.data ?? []) as Product[]);
        setAreas((areaRows.data ?? []) as Area[]);
        if (session.data.session?.user) {
          const uid = session.data.session.user.id;
          const roleRows = await supabase.from("user_roles").select("role").eq("user_id",uid);
          const roles = roleRows.data?.map(x => x.role) ?? [];
          setRole(roles.includes("admin") ? "admin" : roles.includes("seller") ? "seller" : "customer");
          const [storeRow, orderRows] = await Promise.all([
            supabase.from("seller_stores").select("*").eq("owner_id",uid).maybeSingle(),
            supabase.from("orders").select("*,order_items(*)").eq("customer_id",uid).order("created_at",{ascending:false}).limit(30)
          ]);
          const appRows = roles.includes("admin")
            ? await supabase.from("seller_applications").select("*").order("created_at",{ascending:false}).limit(100)
            : await supabase.from("seller_applications").select("*").eq("user_id",uid).order("created_at",{ascending:false}).limit(10);
          setMyStore(storeRow.data);
          setOrders(orderRows.data ?? []);
          if (storeRow.data) {
            const sellerOrderRows = await supabase.from("order_items").select("id,order_id,product_id,title,unit_price,quantity,status,orders(order_no,created_at,recipient,phone,area,address_line,note,total,payment_method)").eq("store_id",storeRow.data.id).limit(100);
            setSellerOrders(sellerOrderRows.data ?? []);
          }
          setApplications(appRows.data ?? []);
        }
        const slug = queryValue("slug");
        if (page === "store" && slug) {
          const found = await supabase.from("seller_stores").select("*,products(id,slug,title_bn,price,stock,product_images(url))").eq("slug",slug).maybeSingle();
          setStore(found.data);
        }
      } catch (e:any) {
        if (alive) setError(e.message || "তথ্য লোড করা যায়নি।");
      } finally { if (alive) setLoading(false); }
    })();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [page]);

  const selected = useMemo(() => {
    const slug = queryValue("slug");
    if (page === "product") return products.find(p => p.slug === slug);
    return undefined;
  }, [page, products]);

  const filtered = useMemo(() => {
    const q = queryValue("q").toLowerCase();
    const cat = queryValue("category");
    return products.filter(p => (!q || (p.title_bn + " " + (p.title_en || "")).toLowerCase().includes(q)) &&
      (!cat || p.category_id === cat || categories.find(c => c.id === p.category_id)?.slug === cat));
  }, [products,categories,page]);

  const submitAuth = async (e: FormEvent, mode: "login"|"register") => {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "login") {
        const {error} = await supabase.auth.signInWithPassword({email:form.email||"",password:form.password||""});
        if (error) throw error;
        setMessage("লগইন সফল হয়েছে।"); navigate({to: "/account" as any});
      } else {
        const {error} = await supabase.auth.signUp({email:form.email||"",password:form.password||"",options:{data:{full_name:form.name||""}}});
        if (error) throw error;
        setMessage("রেজিস্ট্রেশন সফল। ইমেইল যাচাই করতে হতে পারে।");
      }
    } catch(e:any) { setError(e.message || "অনুরোধটি সম্পন্ন হয়নি।"); }
    finally { setBusy(false); }
  };

  const submitSeller = async (e: FormEvent) => {
    e.preventDefault(); if (!user) { navigate({to: "/login" as any}); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const {error} = await supabase.from("seller_applications").insert({
        user_id:user.id, store_name:form.store_name, owner_name:form.owner_name,
        phone:form.phone, area:form.area, address:form.address,
        category_hint:form.category_hint||null, description:form.description||null
      });
      if (error) throw error;
      setMessage("বিক্রেতা আবেদন জমা হয়েছে। অ্যাডমিন অনুমোদনের পর দোকান চালু হবে।");
    } catch(e:any) { setError(e.message || "আবেদন জমা হয়নি।"); }
    finally { setBusy(false); }
  };

  const submitProduct = async (e: FormEvent) => {
    e.preventDefault(); if (!myStore) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const slug = (form.product_slug || "product-"+Date.now()).toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-");
      const {data,error} = await supabase.from("products").insert({
        store_id:myStore.id, category_id:form.category_id||null, slug,
        title_bn:form.title_bn, title_en:form.title_en||null, description:form.description||null,
        price:Number(form.price), compare_price:form.compare_price?Number(form.compare_price):null,
        stock:Number(form.stock||0), status:"active"
      }).select("id").single();
      if (error) throw error;
      if (productImage) {
        if (!["image/jpeg","image/png","image/webp"].includes(productImage.type)) throw new Error("শুধু JPG, PNG বা WebP ছবি আপলোড করা যাবে।");
        if (productImage.size > 5 * 1024 * 1024) throw new Error("ছবির আকার সর্বোচ্চ ৫ MB হতে পারবে।");
        const extension = productImage.type === "image/png" ? "png" : productImage.type === "image/webp" ? "webp" : "jpg";
        const path = user.id + "/" + myStore.id + "/" + data.id + "-" + Date.now() + "." + extension;
        const uploaded = await supabase.storage.from("product-images").upload(path,productImage,{contentType:productImage.type,upsert:false});
        if (uploaded.error) throw uploaded.error;
        const imageUrl = supabase.storage.from("product-images").getPublicUrl(uploaded.data.path).data.publicUrl;
        const image = await supabase.from("product_images").insert({product_id:data.id,url:imageUrl});
        if (image.error) throw image.error;
      } else if (form.image_url) {
        const image = await supabase.from("product_images").insert({product_id:data.id,url:form.image_url});
        if (image.error) throw image.error;
      }
      setMessage("পণ্য যোগ হয়েছে।"); setForm({}); setProductImage(null);
    } catch(e:any) { setError(e.message || "পণ্য যোগ করা যায়নি।"); }
    finally { setBusy(false); }
  };

  const reviewApplication = async (id:string, approve:boolean) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const {error} = await supabase.rpc("review_seller_application",{p_app_id:id,p_approve:approve,p_note:null});
      if (error) throw error;
      setApplications(rows=>rows.map(a=>a.id===id?{...a,status:approve?"approved":"rejected"}:a));
      setMessage(approve?"বিক্রেতার আবেদন অনুমোদিত হয়েছে।":"আবেদনটি বাতিল করা হয়েছে।");
    } catch(e:any) { setError(e.message || "আবেদন আপডেট করা যায়নি।"); }
    finally { setBusy(false); }
  };

  const updateSellerOrderStatus = async (itemId:string, status:string) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const {error} = await supabase.from("order_items").update({status}).eq("id",itemId);
      if (error) throw error;
      setSellerOrders(rows=>rows.map(row=>row.id===itemId?{...row,status}:row));
      setMessage("অর্ডারের অবস্থা আপডেট হয়েছে।");
    } catch(e:any) { setError(e.message || "অর্ডার আপডেট করা যায়নি।"); }
    finally { setBusy(false); }
  };

  const checkout = async (e: FormEvent) => {
    e.preventDefault(); if (!user) { navigate({to: "/login" as any}); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const {data,error} = await supabase.rpc("place_order", {
        p_items:cart.map(x=>({product_id:x.product.id,quantity:x.quantity})),
        p_recipient:form.recipient||"", p_phone:form.phone||"", p_area:form.area||"",
        p_address:form.address||"", p_note:form.note||null, p_save_address:form.save_address==="yes"
      });
      if (error) throw error;
      saveCart([]);
      setMessage("অর্ডার সফলভাবে জমা হয়েছে। অর্ডার নম্বর: "+data);
      navigate({to: "/account" as any});
    } catch(e:any) { setError(e.message || "অর্ডার সম্পন্ন হয়নি।"); }
    finally { setBusy(false); }
  };

  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setRole("customer"); navigate({to:"/"}); };
  const productCard = (p:Product) => <article key={p.id} className="overflow-hidden rounded-xl border bg-card">
    <Link to={"/product" as any} search={{slug:p.slug} as any}>
      <img src={p.product_images?.[0]?.url || "/images/products/panjabi.jpg"} alt={p.title_bn} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} className="aspect-square w-full bg-muted object-cover"/>
    </Link>
    <div className="p-3"><Link to={"/product" as any} search={{slug:p.slug} as any} className="line-clamp-2 text-sm font-semibold hover:text-primary">{p.title_bn}</Link>
      <p className="mt-1 text-xs text-muted-foreground">{p.seller_stores?.name || "স্থানীয় দোকান"}</p>
      <p className="mt-1 font-bold text-primary">{money(p.price)} {p.compare_price ? <s className="text-xs font-normal text-muted-foreground">{money(p.compare_price)}</s> : null}</p>
      <p className="text-xs text-muted-foreground">স্টক: {p.stock.toLocaleString("bn-BD")}</p>
      <button className={primary+" mt-3 w-full"} onClick={()=>addToCart(p)} disabled={p.stock<1}>কার্টে যোগ করুন</button>
    </div></article>;

  const shell = (title:string, children:any) => <div className="mx-auto max-w-6xl px-4 py-7"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground"><Link to="/">ALLIFY</Link> / {title}</p><h1 className="mt-1 text-2xl font-bold">{title}</h1></div><Link to={"/cart" as any} className={secondary}>কার্ট ({cart.reduce((n,x)=>n+x.quantity,0).toLocaleString("bn-BD")})</Link></div>{message&&<p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}{error&&<p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{children}</div>;

  if (loading) return <div className="mx-auto max-w-6xl p-8 text-center text-muted-foreground">ALLIFY লোড হচ্ছে…</div>;

  let body:any;
  if (page === "search" || page === "category" || page === "market") {
    const title = page==="search" ? "পণ্য খুঁজুন" : page==="category" ? "ক্যাটাগরি অনুযায়ী পণ্য" : "সব পণ্য";
    body = shell(title,<><form className="mb-5 flex gap-2" onSubmit={e=>{e.preventDefault();navigate({to: "/search" as any,search:{q:form.q||""} as any});}}><input className={field} placeholder="পণ্যের নাম লিখুন…" value={form.q??queryValue("q")} onChange={e=>set("q",e.target.value)}/><button className={primary}>খুঁজুন</button></form><div className="mb-5 flex flex-wrap gap-2">{categories.map(c=><Link key={c.id} to={"/category" as any} search={{category:c.slug} as any} className={secondary}>{c.name_bn}</Link>)}</div><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{filtered.map(productCard)}</div>{!filtered.length&&<p className={panel}>এই অনুসন্ধানে কোনো পণ্য পাওয়া যায়নি।</p>}</>);
  } else if (page === "product") {
    const p = selected;
    body = shell("পণ্যের বিবরণ",p ? <div className="grid gap-6 md:grid-cols-2"><img src={p.product_images?.[0]?.url||"/images/products/panjabi.jpg"} onError={(e) => { e.currentTarget.style.display = "none"; }} className="w-full rounded-2xl border bg-muted object-cover" alt={p.title_bn}/><div><h1 className="text-2xl font-bold">{p.title_bn}</h1><p className="mt-2 text-sm text-muted-foreground">{p.seller_stores?.name}</p><p className="mt-4 text-2xl font-bold text-primary">{money(p.price)}</p>{p.compare_price&&<s className="text-muted-foreground">{money(p.compare_price)}</s>}<p className="mt-4 whitespace-pre-wrap text-sm leading-7">{p.description||"বিস্তারিত তথ্য শিগগিরই যোগ করা হবে।"}</p><p className="mt-3 text-sm">স্টক: {p.stock.toLocaleString("bn-BD")}</p><button className={primary+" mt-5"} disabled={!p.stock} onClick={()=>addToCart(p)}>কার্টে যোগ করুন</button><p className="mt-4 text-xs text-muted-foreground">পেমেন্ট: ক্যাশ অন ডেলিভারি</p></div></div>:<p className={panel}>পণ্যটি পাওয়া যায়নি। <Link to={"/market" as any} className={linkClass}>সব পণ্য দেখুন</Link></p>);
  } else if (page === "store") {
    body = shell("দোকান",store?<><div className={panel}><h2 className="text-xl font-bold">{store.name}</h2><p className="text-sm text-muted-foreground">{store.area} · {store.address}</p><p className="mt-3">{store.description}</p></div><div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">{(store.products||[]).map((p:any)=>productCard(p))}</div></>:<p className={panel}>দোকানটি পাওয়া যায়নি।</p>);
  } else if (page === "cart") {
    body = shell("আমার কার্ট",cart.length?<><div className="space-y-3">{cart.map(x=><div key={x.product.id} className={panel+" flex flex-wrap items-center gap-3"}><img src={x.product.product_images?.[0]?.url||"/images/products/panjabi.jpg"} onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-20 w-20 rounded-lg bg-muted object-cover" alt=""/><div className="min-w-0 flex-1"><p className="font-semibold">{x.product.title_bn}</p><p className="text-sm text-primary">{money(x.product.price)}</p></div><input aria-label="পরিমাণ" type="number" min="1" max="99" value={x.quantity} onChange={e=>changeQty(x.product.id,Number(e.target.value))} className="w-20 rounded border bg-background p-2"/><button className={secondary} onClick={()=>removeLine(x.product.id)}>বাদ দিন</button></div>)}</div><div className={panel+" mt-5"}><p className="flex justify-between font-bold"><span>পণ্যের মোট</span><span>{money(subtotal)}</span></p><p className="mt-2 text-xs text-muted-foreground">ডেলিভারি চার্জ ঠিকানা অনুযায়ী চেকআউটে যোগ হবে।</p><Link to={"/checkout" as any} className={primary+" mt-4 inline-block"}>অর্ডার সম্পন্ন করুন</Link></div></>:<div className={panel}>তোমার কার্ট খালি। <Link to={"/market" as any} className={linkClass}>পণ্য দেখুন</Link></div>);
  } else if (page === "checkout") {
    body = shell("চেকআউট",<>{!cart.length?<p className={panel}>কার্ট খালি। <Link to={"/market" as any} className={linkClass}>পণ্য দেখুন</Link></p>:<form onSubmit={checkout} className={panel+" max-w-2xl space-y-3"}><p className="font-semibold">ডেলিভারির তথ্য</p><input required className={field} placeholder="গ্রাহকের নাম" value={form.recipient||""} onChange={e=>set("recipient",e.target.value)}/><input required pattern="01[3-9][0-9]{8}" className={field} placeholder="মোবাইল নম্বর (01XXXXXXXXX)" value={form.phone||""} onChange={e=>set("phone",e.target.value)}/><select required className={field} value={form.area||""} onChange={e=>set("area",e.target.value)}><option value="">এলাকা নির্বাচন করুন</option>{areas.map(a=><option key={a.name_en} value={a.name_en}>{a.name_bn} — {money(a.fee)}</option>)}</select><textarea required minLength={5} className={field} placeholder="সম্পূর্ণ ঠিকানা" value={form.address||""} onChange={e=>set("address",e.target.value)}/><textarea className={field} placeholder="অতিরিক্ত নির্দেশনা (ঐচ্ছিক)" value={form.note||""} onChange={e=>set("note",e.target.value)}/><label className="flex gap-2 text-sm"><input type="checkbox" checked={form.save_address==="yes"} onChange={e=>set("save_address",e.target.checked?"yes":"no")}/> ঠিকানাটি সংরক্ষণ করুন</label><div className="border-t pt-3 text-sm"><p>পণ্যের মোট: {money(subtotal)}</p><p className="mt-1">ডেলিভারি চার্জ: {form.area?money(areas.find(a=>a.name_en===form.area)?.fee||0):"এলাকা বাছাই করুন"}</p><p className="mt-2 text-lg font-bold">মোট: {money(subtotal+(areas.find(a=>a.name_en===form.area)?.fee||0))}</p></div><p className="text-xs text-muted-foreground">পেমেন্ট পদ্ধতি: ক্যাশ অন ডেলিভারি (COD)।</p><button disabled={busy} className={primary+" w-full"}>{busy?"অপেক্ষা করুন…":"অর্ডার নিশ্চিত করুন"}</button></form>}</>);
  } else if (page === "login" || page === "register") {
    const reg = page==="register";
    body = shell(reg?"নতুন অ্যাকাউন্ট":"লগইন",<form onSubmit={e=>submitAuth(e,reg?"register":"login")} className={panel+" max-w-md space-y-3"}>{reg&&<input required className={field} placeholder="তোমার নাম" value={form.name||""} onChange={e=>set("name",e.target.value)}/>}<input required type="email" className={field} placeholder="ইমেইল" value={form.email||""} onChange={e=>set("email",e.target.value)}/><input required minLength={6} type="password" className={field} placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)" value={form.password||""} onChange={e=>set("password",e.target.value)}/><button disabled={busy} className={primary+" w-full"}>{busy?"অপেক্ষা করুন…":reg?"অ্যাকাউন্ট তৈরি করুন":"লগইন"}</button><p className="text-sm text-muted-foreground">{reg?"আগে অ্যাকাউন্ট আছে? ":"অ্যাকাউন্ট নেই? "}<Link className={linkClass} to={(reg?"/login":"/register") as any}>{reg?"লগইন করুন":"রেজিস্ট্রেশন করুন"}</Link></p></form>);
  } else if (page === "seller") {
    body = shell("বিক্রেতা হোন",myStore?<div className={panel}>তোমার দোকান চালু আছে: <b>{myStore.name}</b> <Link to={"/seller-dashboard" as any} className={linkClass}>ড্যাশবোর্ড খুলুন</Link></div>:<form onSubmit={submitSeller} className={panel+" max-w-2xl space-y-3"}><p className="text-sm text-muted-foreground">চট্টগ্রামের দোকানদাররা বিনামূল্যে আবেদন করতে পারবেন। অনুমোদনের পর দোকান ও পণ্য যোগ করা যাবে।</p><input required className={field} placeholder="দোকানের নাম" value={form.store_name||""} onChange={e=>set("store_name",e.target.value)}/><input required className={field} placeholder="মালিকের নাম" value={form.owner_name||""} onChange={e=>set("owner_name",e.target.value)}/><input required pattern="01[3-9][0-9]{8}" className={field} placeholder="মোবাইল নম্বর" value={form.phone||""} onChange={e=>set("phone",e.target.value)}/><select required className={field} value={form.area||""} onChange={e=>set("area",e.target.value)}><option value="">দোকানের এলাকা</option>{areas.map(a=><option key={a.name_en} value={a.name_en}>{a.name_bn}</option>)}</select><input required minLength={5} className={field} placeholder="দোকানের ঠিকানা" value={form.address||""} onChange={e=>set("address",e.target.value)}/><input className={field} placeholder="পণ্যের ধরন" value={form.category_hint||""} onChange={e=>set("category_hint",e.target.value)}/><textarea className={field} placeholder="দোকান সম্পর্কে" value={form.description||""} onChange={e=>set("description",e.target.value)}/><button disabled={busy} className={primary}>{busy?"জমা হচ্ছে…":"বিনামূল্যে আবেদন জমা দিন"}</button>{!user&&<p className="text-xs text-muted-foreground">আবেদন করতে আগে <Link to={"/login" as any} className={linkClass}>লগইন</Link> করতে হবে।</p>}</form>);
  } else if (page === "seller-dashboard") {
    body = shell("বিক্রেতা ড্যাশবোর্ড",myStore?<><div className={panel}><h2 className="font-bold">{myStore.name}</h2><p className="text-sm text-muted-foreground">{myStore.area} · {myStore.status}</p></div><div className={panel+" mt-4"}><h3 className="font-bold">দোকানের অর্ডার</h3>{sellerOrders.length?sellerOrders.map(item=>{const o=item.orders||{};return <div key={item.id} className="mt-3 rounded-xl border p-3"><div className="flex flex-wrap justify-between gap-2"><b>{o.order_no||"অর্ডার"}</b><b>{money(Number(item.unit_price)*Number(item.quantity))}</b></div><p className="mt-1 text-sm">{item.title} × {Number(item.quantity).toLocaleString("bn-BD")}</p><p className="mt-1 text-xs text-muted-foreground">{o.recipient} · {o.phone} · {o.area}</p><p className="mt-1 text-xs text-muted-foreground">{o.address_line}</p><div className="mt-3 flex gap-2"><select aria-label="অর্ডারের অবস্থা" className={field+" max-w-48"} value={item.status} disabled={busy||["delivered","cancelled"].includes(item.status)} onChange={e=>updateSellerOrderStatus(item.id,e.target.value)}><option value="pending">নতুন অর্ডার</option><option value="confirmed">নিশ্চিত</option><option value="shipped">পাঠানো হয়েছে</option><option value="delivered">ডেলিভারি সম্পন্ন</option><option value="cancelled">বাতিল</option></select></div></div>}) : <p className="mt-3 text-sm text-muted-foreground">এখনো কোনো অর্ডার আসেনি।</p>}</div><form onSubmit={submitProduct} className={panel+" mt-4 max-w-2xl space-y-3"}><h3 className="font-bold">নতুন পণ্য যোগ করুন</h3><input required className={field} placeholder="পণ্যের বাংলা নাম" value={form.title_bn||""} onChange={e=>set("title_bn",e.target.value)}/><input className={field} placeholder="English title (optional)" value={form.title_en||""} onChange={e=>set("title_en",e.target.value)}/><input required className={field} placeholder="পণ্যের URL slug (যেমন cotton-panjabi)" value={form.product_slug||""} onChange={e=>set("product_slug",e.target.value)}/><select className={field} value={form.category_id||""} onChange={e=>set("category_id",e.target.value)}><option value="">ক্যাটাগরি</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name_bn}</option>)}</select><textarea className={field} placeholder="পণ্যের বিবরণ" value={form.description||""} onChange={e=>set("description",e.target.value)}/><input required type="number" min="1" className={field} placeholder="বিক্রয় মূল্য" value={form.price||""} onChange={e=>set("price",e.target.value)}/><input type="number" min="0" className={field} placeholder="আগের মূল্য (ঐচ্ছিক)" value={form.compare_price||""} onChange={e=>set("compare_price",e.target.value)}/><input required type="number" min="0" className={field} placeholder="স্টক" value={form.stock||""} onChange={e=>set("stock",e.target.value)}/><label className="block text-sm font-medium">পণ্যের ছবি (JPG, PNG বা WebP; সর্বোচ্চ ৫ MB)<input type="file" accept="image/jpeg,image/png,image/webp" className={field+" mt-1"} onChange={e=>setProductImage(e.target.files?.[0]||null)}/></label><input type="url" className={field} placeholder="অথবা ছবির URL (ঐচ্ছিক)" value={form.image_url||""} onChange={e=>set("image_url",e.target.value)}/><button disabled={busy} className={primary}>পণ্য প্রকাশ করুন</button></form></>:<div className={panel}>বিক্রেতা ড্যাশবোর্ড ব্যবহারের জন্য অনুমোদিত বিক্রেতা অ্যাকাউন্ট প্রয়োজন। <Link to={"/seller" as any} className={linkClass}>বিক্রেতা আবেদন করুন</Link></div>);
  } else if (page === "account") {
    body = shell("আমার অ্যাকাউন্ট",user?<><div className={panel}><p>{user.email}</p><p className="mt-1 text-sm text-muted-foreground">অ্যাকাউন্টের ধরন: {role==="admin"?"অ্যাডমিন":role==="seller"?"বিক্রেতা":"ক্রেতা"}</p><div className="mt-3 flex flex-wrap gap-2"><button className={secondary} onClick={signOut}>লগআউট</button>{role==="seller"&&<Link to={"/seller-dashboard" as any} className={primary}>বিক্রেতা ড্যাশবোর্ড</Link>}{role==="admin"&&<Link to={"/admin" as any} className={primary}>অ্যাডমিন প্যানেল</Link>}</div></div><h2 className="mb-3 mt-6 font-bold">আমার অর্ডার</h2>{orders.length?orders.map(o=><div key={o.id} className={panel+" mb-3"}><div className="flex justify-between gap-2"><b>{o.order_no}</b><span className="text-sm">{o.status}</span></div><p className="mt-1 text-sm">মোট: {money(o.total)} · {o.area}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("bn-BD")}</p></div>):<p className={panel}>এখনো কোনো অর্ডার নেই।</p>}</>:<div className={panel}>অ্যাকাউন্ট দেখতে <Link to={"/login" as any} className={linkClass}>লগইন</Link> করুন।</div>);
  } else if (page === "admin") {
    body = shell("অ্যাডমিন প্যানেল",role==="admin"?<><div className={panel}><p>বিক্রেতা আবেদন: {applications.length.toLocaleString("bn-BD")}</p><p className="text-xs text-muted-foreground">এই অ্যাকাউন্টে অ্যাডমিন ভূমিকা থাকলে ডাটাবেস নীতিমালা অনুযায়ী তথ্য দেখা যাবে।</p></div><div className="mt-4 space-y-3">{applications.map(a=><div className={panel} key={a.id}><b>{a.store_name}</b><p className="text-sm">{a.owner_name} · {a.phone} · {a.area}</p><p className="text-xs text-muted-foreground">স্ট্যাটাস: {a.status}</p>{a.status==="pending"&&<div className="mt-3 flex gap-2"><button disabled={busy} className={primary} onClick={()=>reviewApplication(a.id,true)}>অনুমোদন</button><button disabled={busy} className={secondary} onClick={()=>reviewApplication(a.id,false)}>বাতিল</button></div>}</div>)}</div></>:<div className={panel}>এই পৃষ্ঠাটি শুধু অনুমোদিত অ্যাডমিনদের জন্য।</div>);
  } else {
    body = shell("পৃষ্ঠাটি পাওয়া যায়নি",<div className={panel}>এই পৃষ্ঠাটি এখনো তৈরি হয়নি। <Link to={"/market" as any} className={linkClass}>বাজারে ফিরে যান</Link></div>);
  }

  return <div className="min-h-screen bg-background text-foreground"><header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur"><div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3"><Link to="/" className="text-2xl font-extrabold tracking-tight text-primary">ALLIFY</Link><span className="hidden text-xs text-muted-foreground sm:inline">চট্টগ্রামের ডিজিটাল বাজার</span><nav className="ml-auto flex flex-wrap items-center gap-3 text-sm"><Link to={"/market" as any}>সব পণ্য</Link><Link to={"/seller" as any}>বিক্রেতা হোন</Link><Link to={"/account" as any}>অ্যাকাউন্ট</Link><Link to={"/cart" as any}>কার্ট ({cart.reduce((n,x)=>n+x.quantity,0).toLocaleString("bn-BD")})</Link></nav></div></header>{body}<footer className="mt-10 border-t bg-card px-4 py-6 text-center text-xs text-muted-foreground">ALLIFY · চট্টগ্রাম জেলা · ক্যাশ অন ডেলিভারি · বিক্রেতা নিবন্ধন বিনামূল্যে</footer></div>;
}
