import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { deriveOrderStatus } from "@/lib/order-status";
import { canTransitionOrderItemStatus } from "@/lib/order-transitions";
import { validateSellerProductNumbers, validateSellerProductTitle } from "@/lib/product-input";
import {
  buildSellerProductImagePath,
  isProductDeletionConfirmed,
  validateSellerProductImage,
} from "@/lib/product-image-input";
import { getSellerApplicationSubmitError } from "@/lib/seller-application-error";
import { getPasswordResetFeedback } from "@/lib/password-reset-feedback";
import { sanitizeStoredCart } from "@/lib/cart-validation";
import { AdminCatalogControls } from "@/components/AdminCatalogControls";
import { SellerCategoryPicker } from "@/components/SellerCategoryPicker";

export const Route = createFileRoute("/$page")({ component: MarketplacePage });

type Product = {
  id: string; slug: string; title_bn: string; title_en?: string | null;
  description?: string | null; price: number; compare_price?: number | null;
  stock: number; category_id?: string | null;
  product_images?: { id?: string; url: string; sort_order?: number }[]; seller_stores?: { id?: string; name: string; slug?: string; area?: string; logo_url?: string | null; banner_url?: string | null; whatsapp_phone?: string | null; is_demo?: boolean; status?: string };
};
type Area = { name_bn: string; name_en: string };
type CartLine = { product: Product; quantity: number };

const money = (n: number) => "৳" + Number(n || 0).toLocaleString("bn-BD");
const queryValue = (key: string, searchStr: string) => new URLSearchParams(searchStr).get(key) || "";

const panel = "rounded-2xl border bg-card p-4 shadow-sm";
const field = "w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary";
const primary = "rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50";
const secondary = "rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted";
const linkClass = "text-primary underline-offset-4 hover:underline";

function MarketplacePage() {
  const { page } = Route.useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchStr = location.searchStr;
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("customer");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [buyNowMode, setBuyNowMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [form, setForm] = useState<Record<string,string>>({});
  const [store, setStore] = useState<any>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [reviewedOrderItemIds, setReviewedOrderItemIds] = useState<string[]>([]);
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [adminProducts, setAdminProducts] = useState<any[]>([]);
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [adminStores, setAdminStores] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState({ totalOrders: 0, completedOrders: 0, completedSales: 0, totalProducts: 0, activeStores: 0 });
  const [adminOrderSearch, setAdminOrderSearch] = useState("");
  const [adminOrderStatus, setAdminOrderStatus] = useState("all");
  const [applications, setApplications] = useState<any[]>([]);
  const [myStore, setMyStore] = useState<any>(null);
  const [storeLogoFile, setStoreLogoFile] = useState<File|null>(null);
  const [storeBannerFile, setStoreBannerFile] = useState<File|null>(null);
  const [storeLogoPreview, setStoreLogoPreview] = useState("");
  const [storeBannerPreview, setStoreBannerPreview] = useState("");
  const storeLogoInputRef = useRef<HTMLInputElement>(null);
  const storeBannerInputRef = useRef<HTMLInputElement>(null);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [productImagePreviews, setProductImagePreviews] = useState<string[]>([]);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const checkoutRequestRef = useRef<{fingerprint:string;id:string}|null>(null);
  const sellerApplicationSyncRef = useRef(new Set<string>());
  const set = (key: string, value: string) => setForm(v => ({...v, [key]: value}));
  const selectStoreImage = (file:File|null, kind:"logo"|"banner") => {
    if (!file) return;
    if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size>5*1024*1024) { setError("JPG, PNG বা WebP ছবি দিন; প্রতিটি ফাইল সর্বোচ্চ ৫ MB হতে পারবে।"); return; }
    const preview=URL.createObjectURL(file);
    if (kind==="logo") { if(storeLogoPreview) URL.revokeObjectURL(storeLogoPreview); setStoreLogoFile(file); setStoreLogoPreview(preview); }
    else { if(storeBannerPreview) URL.revokeObjectURL(storeBannerPreview); setStoreBannerFile(file); setStoreBannerPreview(preview); }
    setError("");
  };
  const refreshCart = () => {
    try {
      const raw = localStorage.getItem("allify-cart");
      const parsed = raw ? JSON.parse(raw) : [];
      const safeCart = sanitizeStoredCart(parsed);
      setCart(safeCart as unknown as CartLine[]);
      localStorage.setItem("allify-cart", JSON.stringify(safeCart));
    } catch { setCart([]); }
  };
  const saveCart = (next: CartLine[]) => {
    const safeCart = sanitizeStoredCart(next);
    setCart(safeCart as CartLine[]);
    localStorage.setItem("allify-cart", JSON.stringify(safeCart));
  };
  const addToCart = (p: Product) => {
    if (p.seller_stores?.is_demo) {
      setError("এটি নমুনা পণ্য; বাস্তব অর্ডার নেওয়া যাচ্ছে না।");
      return;
    }
    const stock = Math.max(0, Math.min(99, Number(p.stock) || 0));
    if (stock < 1) {
      setError("এই পণ্যটি বর্তমানে স্টকে নেই।");
      return;
    }
    const next = [...cart];
    const found = next.find(x => x.product.id === p.id);
    if (found) {
      if (found.quantity >= stock) {
        setError("স্টকে থাকা সর্বোচ্চ পরিমাণ কার্টে যোগ করা হয়েছে।");
        return;
      }
      found.quantity += 1;
    } else next.push({product:p, quantity:1});
    saveCart(next);
    setError("");
    setMessage("পণ্যটি কার্টে যোগ হয়েছে।");
  };
  const buyNow = (p: Product) => {
    if (p.seller_stores?.is_demo) { setError("এটি নমুনা পণ্য; বাস্তব অর্ডার নেওয়া যাচ্ছে না।"); return; }
    if (!Number.isFinite(Number(p.stock)) || Number(p.stock)<1) { setError("এই পণ্যটি বর্তমানে স্টকে নেই।"); return; }
    try {
      localStorage.setItem("allify-cart-before-buy-now", JSON.stringify(cart));
      localStorage.setItem("allify-buy-now-mode", "yes");
    } catch { setError("সরাসরি অর্ডারের জন্য কার্ট সংরক্ষণ করা যায়নি।"); return; }
    setBuyNowMode(true);
    saveCart([{product:p,quantity:1}]);
    setError(""); setMessage("");
    navigate({to:"/checkout" as any});
  };
  const restorePreviousCart = () => {
    try {
      const raw=localStorage.getItem("allify-cart-before-buy-now");
      const restored=sanitizeStoredCart(raw?JSON.parse(raw):[]);
      saveCart(restored as unknown as CartLine[]);
      localStorage.removeItem("allify-cart-before-buy-now");
      localStorage.removeItem("allify-buy-now-mode");
      setBuyNowMode(false);
      navigate({to:"/cart" as any});
    } catch { setError("আগের কার্ট ফিরিয়ে আনা যায়নি।"); }
  };
  const toggleWishlist = async (p: Product) => {
    if (!user) { navigate({to:"/login" as any}); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      if (wishlistIds.includes(p.id)) {
        const {error} = await supabase.from("wishlist_items").delete().eq("user_id",user.id).eq("product_id",p.id);
        if (error) throw error;
        setWishlistIds(ids=>ids.filter(id=>id!==p.id));
        setWishlistProducts(rows=>rows.filter(row=>row.id!==p.id));
        setMessage("পণ্যটি পছন্দের তালিকা থেকে সরানো হয়েছে।");
      } else {
        const {error} = await supabase.from("wishlist_items").insert({user_id:user.id,product_id:p.id});
        if (error) throw error;
        setWishlistIds(ids=>[...ids,p.id]);
        setWishlistProducts(rows=>[p,...rows.filter(row=>row.id!==p.id)]);
        setMessage("পণ্যটি পছন্দের তালিকায় যোগ হয়েছে।");
      }
    } catch(e:any) { setError(e.message || "পছন্দের তালিকা আপডেট করা যায়নি।"); }
    finally { setBusy(false); }
  };

  const changeQty = (id: string, quantity: number) => {
    const line = cart.find(x => x.product.id === id);
    if (!line) return;
    const stock = Math.max(0, Number(line.product.stock) || 0);
    if (stock < 1) { removeLine(id); return; }
    saveCart(cart.map(x => x.product.id === id ? {...x, quantity:Math.max(1,Math.min(99,stock,quantity))} : x));
  };
  const removeLine = (id: string) => saveCart(cart.filter(x => x.product.id !== id));
  const subtotal = cart.reduce((n,x) => n + Number(x.product.price)*x.quantity, 0);

  useEffect(() => {
    setLoading(true);
    setError("");
    refreshCart();
    if (page === "checkout" && localStorage.getItem("allify-buy-now-mode") === "yes") setBuyNowMode(true);

    let alive = true;
    const needsProducts = ["market", "search", "category"].includes(page);
    const needsCategories = ["market", "search", "category", "seller-dashboard", "seller"].includes(page);
    const needsAreas = ["checkout", "seller"].includes(page);
    const needsWishlist = ["market", "search", "category", "product", "store", "wishlist", "account"].includes(page);
    const needsRole = ["account", "admin", "seller-dashboard"].includes(page);
    const needsStore = ["account", "seller", "seller-dashboard"].includes(page);
    const needsOrders = ["account", "product"].includes(page);
    const needsAdminData = page === "admin";

    // Never leave a route on a blank/loading screen indefinitely if a network request stalls.
    const loadTimeout = window.setTimeout(() => {
      if (alive) {
        setError("তথ্য আনতে বেশি সময় লাগছে। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।");
        setLoading(false);
      }
    }, 15000);

    (async () => {
      try {
        const [session, cats, productRows, areaRows] = await Promise.all([
          supabase.auth.getSession(),
          needsCategories
            ? supabase.from("categories").select("id,slug,name_bn,name_en,sort_order,parent_id").order("sort_order")
            : Promise.resolve({ data: [] as any[] }),
          needsProducts
            ? supabase.from("products").select("id,slug,title_bn,title_en,description,price,compare_price,stock,category_id,product_images(id,url,sort_order),seller_stores!inner(id,name,slug,area,logo_url,banner_url,is_demo,status)").eq("status","active").eq("seller_stores.status","active").order("sold_count",{ascending:false}).limit(48)
            : Promise.resolve({ data: [] as any[] }),
          needsAreas
            ? supabase.from("delivery_areas").select("name_bn,name_en").eq("active",true).order("sort_order")
            : Promise.resolve({ data: [] as any[] })
        ]);
        if (!alive) return;

        const currentUser = session.data.session?.user ?? null;
        setUser(currentUser);
        let sellerApplicationSynced = false;
        if (currentUser) {
          try { sellerApplicationSynced = await syncPendingSellerApplication(currentUser); }
          catch (syncError: any) { if (alive) setError(syncError.message || "বিক্রেতা আবেদন জমা করা যায়নি।"); }
        }
        setCategories(cats.data ?? []);
        setProducts((productRows.data ?? []) as Product[]);
        setAreas((areaRows.data ?? []) as Area[]);

        if (!currentUser) {
          if (needsRole) setRole("customer");
          if (needsStore) setMyStore(null);
          if (needsOrders) setOrders([]);
          if (needsWishlist) setWishlistIds([]);
          if (page === "wishlist") setWishlistProducts([]);
          if (page === "seller" || page === "account" || page === "admin") setApplications([]);
        } else {
          const uid = currentUser.id;
          const [wishlistRows, roleRows, storeRow, orderRows] = await Promise.all([
            needsWishlist
              ? supabase.from("wishlist_items").select("product_id").eq("user_id",uid).order("created_at",{ascending:false})
              : Promise.resolve({ data: [] as any[] }),
            needsRole
              ? supabase.from("user_roles").select("role").eq("user_id",uid)
              : Promise.resolve({ data: [] as any[] }),
            needsStore
              ? supabase.from("seller_stores").select("*").eq("owner_id",uid).maybeSingle()
              : Promise.resolve({ data: null as any }),
            needsOrders
              ? supabase.from("orders").select("*,order_items(*)").eq("customer_id",uid).order("created_at",{ascending:false}).limit(30)
              : Promise.resolve({ data: [] as any[] })
          ]);
          if (!alive) return;
          if (wishlistRows.error) throw wishlistRows.error;
          if (roleRows.error) throw roleRows.error;
          if (storeRow.error) throw storeRow.error;
          if (orderRows.error) throw orderRows.error;

          const savedIds = (wishlistRows.data ?? []).map((row:any) => row.product_id);
          if (needsWishlist) setWishlistIds(savedIds);
          const roles = roleRows.data?.map((row:any) => row.role) ?? [];
          if (needsRole) setRole(roles.includes("admin") ? "admin" : roles.includes("seller") ? "seller" : "customer");
          if (needsStore) setMyStore(storeRow.data);
          if (sellerApplicationSynced && storeRow.data && roles.includes("seller")) {
            navigate({ to: "/seller-dashboard" as any });
            return;
          }
          if (needsOrders && !roles.includes("admin")) setOrders(orderRows.data ?? []);
          else if (needsOrders) setOrders([]);

          if (page === "wishlist") {
            if (savedIds.length) {
              const savedProducts = await supabase.from("products").select("id,slug,title_bn,title_en,description,price,compare_price,stock,category_id,product_images(url),seller_stores!inner(id,name,slug,area,logo_url,banner_url,is_demo,status)").in("id",savedIds).eq("status","active").eq("seller_stores.status","active");
              if (savedProducts.error) throw savedProducts.error;
              const order = new Map(savedIds.map((id:string,index:number)=>[id,index]));
              setWishlistProducts(((savedProducts.data ?? []) as Product[]).sort((a,b)=>(order.get(a.id)??0)-(order.get(b.id)??0)));
            } else setWishlistProducts([]);
          }

          if (page === "seller" || (page === "account" && !roles.includes("admin"))) {
            const appRows = await supabase.from("seller_applications").select("*").eq("user_id",uid).order("created_at",{ascending:false}).limit(10);
            if (appRows.error) throw appRows.error;
            if (alive) setApplications(appRows.data ?? []);
          }

          if (needsAdminData && roles.includes("admin")) {
            const [adminProductRows, adminOrderRows, appRows, storeRows, orderCount, completedCount, productCount, activeStoreCount] = await Promise.all([
              supabase.from("products").select("id,title_bn,price,stock,status,seller_stores!inner(id,name,is_demo)").order("created_at",{ascending:false}).limit(100),
              supabase.from("orders").select("id,order_no,is_demo,status,total,recipient,phone,area,created_at,order_items(id,title,unit_price,quantity,status)").order("created_at",{ascending:false}).limit(100),
              supabase.from("seller_applications").select("*").order("created_at",{ascending:false}).limit(100),
              supabase.from("seller_stores").select("id,name,slug,area,status,is_demo,created_at").order("created_at",{ascending:false}).limit(100),
              supabase.from("orders").select("id",{count:"exact",head:true}),
              supabase.from("orders").select("id",{count:"exact",head:true}).eq("status","delivered"),
              supabase.from("products").select("id",{count:"exact",head:true}),
              supabase.from("seller_stores").select("id",{count:"exact",head:true}).eq("status","active")
            ]);
            for (const result of [adminProductRows,adminOrderRows,appRows,storeRows,orderCount,completedCount,productCount,activeStoreCount]) if (result.error) throw result.error;
            let completedSales = 0;
            for (let offset = 0; ; offset += 1000) {
              const deliveredRows = await supabase.from("orders").select("total").eq("status","delivered").range(offset, offset + 999);
              if (deliveredRows.error) throw deliveredRows.error;
              const batch = deliveredRows.data ?? [];
              completedSales += batch.reduce((sum:number, order:any) => sum + Number(order.total || 0), 0);
              if (batch.length < 1000) break;
            }
            if (!alive) return;
            setAdminProducts(adminProductRows.data ?? []);
            setAdminOrders(adminOrderRows.data ?? []);
            setApplications(appRows.data ?? []);
            setAdminStores(storeRows.data ?? []);
            setAdminStats({ totalOrders: orderCount.count ?? 0, completedOrders: completedCount.count ?? 0, completedSales, totalProducts: productCount.count ?? 0, activeStores: activeStoreCount.count ?? 0 });
          }

          if (page === "seller-dashboard" && storeRow.data) {
            const [sellerProductRows, sellerOrderRows] = await Promise.all([
              supabase.from("products").select("id,slug,title_bn,title_en,description,price,compare_price,stock,status,category_id,product_images(id,url,sort_order)").eq("store_id",storeRow.data.id).order("created_at",{ascending:false}),
              supabase.from("order_items").select("id,order_id,product_id,title,unit_price,quantity,status,courier_shipments(id,provider,status,tracking_id,consignment_id),orders(order_no,created_at,recipient,phone,area,address_line,note,total,payment_method)").eq("store_id",storeRow.data.id).limit(100)
            ]);
            if (sellerProductRows.error) throw sellerProductRows.error;
            if (sellerOrderRows.error) throw sellerOrderRows.error;
            if (!alive) return;
            setSellerProducts(sellerProductRows.data ?? []);
            setSellerOrders(sellerOrderRows.data ?? []);
          }
        }

        const slug = queryValue("slug", searchStr);
        if (page === "product" && slug) {
          setDetailProduct(null);
          const found = await supabase.from("products")
            .select("id,slug,title_bn,title_en,description,price,compare_price,stock,category_id,product_images(url),seller_stores!inner(id,name,slug,area,logo_url,banner_url,whatsapp_phone,is_demo,status)")
            .eq("slug", slug).eq("status", "active").eq("seller_stores.status","active").maybeSingle();
          if (found.error) throw found.error;
          if (!alive) return;
          setDetailProduct(found.data as Product | null);
          setDetailImageIndex(0);
          if (found.data) {
            const {data:reviewRows,error:reviewError}=await supabase.from("product_reviews").select("id,rating,review_text,created_at").eq("product_id",found.data.id).eq("status","approved").order("created_at",{ascending:false}).limit(30);
            if (reviewError) throw reviewError;
            if (!alive) return;
            setProductReviews(reviewRows||[]);
            if (currentUser) {
              const {data:ownRows,error:ownError}=await supabase.from("product_reviews").select("order_item_id").eq("product_id",found.data.id).eq("user_id",currentUser.id);
              if (ownError) throw ownError;
              if (!alive) return;
              setReviewedOrderItemIds((ownRows||[]).map(row=>row.order_item_id));
            } else setReviewedOrderItemIds([]);
          } else { setProductReviews([]); setReviewedOrderItemIds([]); }
        } else if (page === "store" && slug) {
          const found = await supabase.from("seller_stores").select("*,products(id,slug,title_bn,title_en,description,price,compare_price,stock,category_id,product_images(id,url,sort_order),seller_stores(id,name,slug,area,logo_url,banner_url,is_demo))").eq("slug",slug).eq("status","active").maybeSingle();
          if (found.error) throw found.error;
          if (!alive) return;
          setStore(found.data);
        }
      } catch (e:any) {
        if (alive) setError(e.message || "তথ্য লোড করা যায়নি।");
      } finally {
        window.clearTimeout(loadTimeout);
        if (alive) setLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
        navigate({ to: "/reset-password" as any });
      } else if (event === "SIGNED_OUT") setIsPasswordRecovery(false);
      setUser(session?.user ?? null);
      if (!session?.user) {
        setRole("customer");
        setAdminProducts([]);
        setAdminOrders([]);
        setApplications([]);
        return;
      }
      window.setTimeout(() => {
        void (async () => {
          try { await syncPendingSellerApplication(session.user); }
          catch (syncError: any) { if (alive) setError(syncError.message || "বিক্রেতা আবেদন জমা করা যায়নি।"); }
          if (!needsRole) return;
          const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
          if (error) {
            if (alive) setError("অ্যাকাউন্টের অনুমতি যাচাই করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করুন।");
            return;
          }
          if (!alive) return;
          const roles = data?.map((row) => row.role) ?? [];
          const isAdmin = roles.includes("admin");
          setRole(isAdmin ? "admin" : roles.includes("seller") ? "seller" : "customer");
          if (isAdmin && page === "admin") {
            const [productResult, orderResult, applicationResult] = await Promise.all([
              supabase.from("products").select("id,title_bn,price,stock,status,seller_stores(name,is_demo)").order("created_at", { ascending: false }).limit(100),
              supabase.from("orders").select("id,order_no,is_demo,status,total,recipient,phone,area,created_at,order_items(id,title,unit_price,quantity,status)").order("created_at", { ascending: false }).limit(100),
              supabase.from("seller_applications").select("*").order("created_at", { ascending: false }).limit(100)
            ]);
            if (!alive) return;
            setAdminProducts(productResult.data ?? []);
            setAdminOrders(orderResult.data ?? []);
            setApplications(applicationResult.data ?? []);
          }
        })();
      }, 0);
    });
    return () => {
      alive = false;
      window.clearTimeout(loadTimeout);
      listener.subscription.unsubscribe();
    };
  }, [page, searchStr]);

  useEffect(() => {
    const previewUrls = productImages.map((file) => URL.createObjectURL(file));
    setProductImagePreviews(previewUrls);
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [productImages]);

  const selected = useMemo(() => page === "product" ? detailProduct : undefined, [page, detailProduct]);

  const filtered = useMemo(() => {
    const q = queryValue("q", searchStr).toLowerCase();
    const cat = queryValue("category", searchStr);
    const selectedCategory = categories.find(c => c.slug === cat);
    const collectDescendants = (parentId: string): string[] =>
      categories.filter(c => c.parent_id === parentId).flatMap(child => [child.id, ...collectDescendants(child.id)]);
    const matchingCategoryIds = selectedCategory
      ? [selectedCategory.id, ...collectDescendants(selectedCategory.id)]
      : [];
    return products.filter(p => (!q || (p.title_bn + " " + (p.title_en || "")).toLowerCase().includes(q)) &&
      (!cat || matchingCategoryIds.includes(p.category_id || "")));
  }, [products,categories,page,searchStr]);

  const syncPendingSellerApplication = async (authUser: any) => {
    const draft = authUser?.user_metadata?.pending_seller_application;
    const userId = authUser?.id;
    if (!draft || typeof draft !== "object" || !userId || sellerApplicationSyncRef.current.has(userId)) return false;
    sellerApplicationSyncRef.current.add(userId);
    try {
      const { data: existing, error: lookupError } = await supabase
        .from("seller_applications")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "pending")
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!existing) {
        const { error } = await supabase.from("seller_applications").insert({
          user_id: userId,
          store_name: draft.store_name,
          owner_name: draft.owner_name,
          phone: draft.phone,
          area: draft.store_location,
          address: draft.store_location,
          category_hint: draft.category_hint || null,
          description: draft.description || null,
        });
        if (error) throw error;
      }
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { pending_seller_application: null },
      });
      if (metadataError) throw metadataError;
      return true;
    } finally {
      sellerApplicationSyncRef.current.delete(userId);
    }
  };

  const submitAuth = async (e: FormEvent, mode: "login"|"register") => {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "login") {
        const {error} = await supabase.auth.signInWithPassword({email:form.email||"",password:form.password||""});
        if (error) throw error;
        setMessage("লগইন সফল হয়েছে।"); navigate({to: "/account" as any});
      } else {
        let pendingSellerApplication: Record<string, string> | null = null;
        try {
          const rawDraft = localStorage.getItem("allify-pending-seller-application") || sessionStorage.getItem("allify-pending-seller-application");
          if (rawDraft) pendingSellerApplication = JSON.parse(rawDraft);
        } catch { pendingSellerApplication = null; }
        const { data, error } = await supabase.auth.signUp({
          email: form.email || "",
          password: form.password || "",
          options: {
            data: {
              full_name: form.name || "",
              ...(pendingSellerApplication ? { pending_seller_application: pendingSellerApplication } : {}),
            },
            emailRedirectTo: "https://allify-chattogram.vercel.app/account",
          },
        });
        if (error) throw error;
        if (pendingSellerApplication) {
          localStorage.removeItem("allify-pending-seller-application");
          sessionStorage.removeItem("allify-pending-seller-application");
          if (data.session?.user) {
            setMessage("অ্যাকাউন্ট তৈরি হয়েছে। বিক্রেতা আবেদন জমা হচ্ছে…");
            navigate({ to: "/account" as any });
          } else {
            setMessage("অ্যাকাউন্ট তৈরি হয়েছে। ইমেইল যাচাই সম্পন্ন হলে আপনার বিক্রেতা আবেদন স্বয়ংক্রিয়ভাবে জমা হবে।");
          }
        } else {
          setMessage("রেজিস্ট্রেশন সফল। ইমেইল যাচাই করতে হতে পারে।");
        }
      }
    } catch(e:any) { setError(e.message || "অনুরোধটি সম্পন্ন হয়নি।"); }
    finally { setBusy(false); }
  };

  const resendVerification = async () => {
    const email = (form.email || "").trim();
    if (!email) { setError("আগে ইমেইল ঠিকানাটি লিখুন।"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: "https://allify-chattogram.vercel.app/account" }
      });
      if (error) throw error;
      setMessage("ভেরিফিকেশন ইমেইল পাঠানোর অনুরোধ করা হয়েছে। ইনবক্স ও Spam ফোল্ডার দেখুন।");
    } catch (e: any) { setError(e.message || "ইমেইল পাঠানো যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।"); }
    finally { setBusy(false); }
  };

  const requestPasswordReset = async (e: FormEvent) => {
    e.preventDefault();
    const email = (form.email || "").trim().toLowerCase();
    if (!email) { setError("আগে আপনার ইমেইল ঠিকানাটি লিখুন।"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setMessage(getPasswordResetFeedback(error));
    } catch (requestError: unknown) {
      setMessage(getPasswordResetFeedback(requestError));
    } finally { setBusy(false); }
  };

  const submitNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setMessage("");
    const password = form.new_password || "";
    if (!isPasswordRecovery || !user) {
      setError("পাসওয়ার্ড পরিবর্তনের লিংকটি মেয়াদোত্তীর্ণ বা অবৈধ। নতুন রিসেট লিংক নিন।");
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}/.test(password)) {
      setError("কমপক্ষে ৮ অক্ষর এবং ইংরেজি বড় হাতের, ছোট হাতের অক্ষর, সংখ্যা ও চিহ্ন ব্যবহার করুন।");
      return;
    }
    if (password !== (form.confirm_new_password || "")) {
      setError("দুটি পাসওয়ার্ড মিলছে না। আবার যাচাই করুন।");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setIsPasswordRecovery(false);
      await supabase.auth.signOut();
      setForm({});
      setMessage("পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে। নতুন পাসওয়ার্ড দিয়ে লগইন করুন।");
      navigate({ to: "/login" as any });
    } catch (e: any) {
      setError(e.message || "পাসওয়ার্ড পরিবর্তন করা যায়নি। রিসেট লিংকটি আবার ব্যবহার করুন।");
    } finally { setBusy(false); }
  };

  const submitSeller = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      try {
        localStorage.setItem("allify-pending-seller-application", JSON.stringify({
          store_name: String(form.store_name || "").trim(),
          owner_name: String(form.owner_name || "").trim(),
          phone: String(form.phone || "").trim(),
          store_location: String(form.store_location || "").trim(),
          category_hint: String(form.category_hint || "").trim(),
          description: String(form.description || "").trim(),
        }));
        setError("");
        setMessage("আপনার দেওয়া দোকানের তথ্য সংরক্ষণ করা হয়েছে। এখন অ্যাকাউন্ট তৈরি করুন; তথ্যগুলো হারাবে না।");
        navigate({ to: "/register" as any });
      } catch {
        setError("আবেদনের তথ্য সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।");
      }
      return;
    }
    if (applications.some((application) => application.status === "pending")) {
      setError("তোমার একটি আবেদন ইতিমধ্যে পর্যালোচনার অপেক্ষায় আছে।");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const {data,error} = await supabase.from("seller_applications").insert({
        user_id:user.id, store_name:form.store_name, owner_name:form.owner_name,
        phone:form.phone, area:form.store_location, address:form.store_location,
        category_hint:form.category_hint||null, description:form.description||null
      }).select("id,user_id,store_name,owner_name,phone,area,address,category_hint,description,status,created_at").single();
      if (error) throw error;
      if (!data) throw new Error("আবেদন জমা হয়েছে কি না নিশ্চিত করা যায়নি; তালিকা হালনাগাদ করে দেখুন।");
      setApplications(rows=>[data,...rows.filter(application=>application.id!==data.id)]);
      setMessage("বিক্রেতা আবেদন জমা হয়েছে। অ্যাডমিন অনুমোদনের পর দোকান চালু হবে।");
    } catch(e:any) { setError(getSellerApplicationSubmitError(e)); }
    finally { setBusy(false); }
  };

  const submitProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!myStore || !user) {
      setError("দোকানের তথ্য বা লগইন পাওয়া যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    let phase = "পণ্যের তথ্য যাচাই";
    let createdProductId: string | null = null;
    const uploadedImagePaths: string[] = [];
    try {
      if (productImages.length > 8) throw new Error("একটি পণ্যে সর্বোচ্চ ৮টি ছবি যোগ করা যাবে।");
      if (!productImages.length && !form.image_url) throw new Error("পণ্যের অন্তত একটি ছবি যোগ করুন।");
      for (const file of productImages) {
        const imageValidation = validateSellerProductImage(file);
        if (!imageValidation.ok) throw new Error(file.name + ": " + imageValidation.error);
      }
      if (!productImages.length && form.image_url) {
        const imageUrl = new URL(form.image_url);
        if (imageUrl.protocol !== "https:") throw new Error("ছবির URL অবশ্যই HTTPS হতে হবে।");
      }
      const productTitle = validateSellerProductTitle(form.title_bn);
      if (!productTitle.ok) throw new Error(productTitle.error);
      if ((form.title_en || "").length > 120) throw new Error("ইংরেজি নাম সর্বোচ্চ ১২০ অক্ষরের হতে হবে।");
      if ((form.description || "").length > 3000) throw new Error("পণ্যের বিবরণ সর্বোচ্চ ৩০০০ অক্ষরের হতে হবে।");
      const productNumbers = validateSellerProductNumbers(form.price, form.stock || 0, form.compare_price);
      if (!productNumbers.ok) throw new Error(productNumbers.error);
      const slug = ("product-" + Date.now()).toLowerCase();
      phase = "পণ্যের তথ্য সংরক্ষণ";
      setMessage("পণ্যের তথ্য সংরক্ষণ হচ্ছে…");
      const {data,error} = await supabase.from("products").insert({
        store_id:myStore.id, category_id:form.category_id||null, slug,
        title_bn:productTitle.value, title_en:form.title_en?.trim()||null, description:form.description?.trim()||null,
        price:productNumbers.value.price, compare_price:productNumbers.value.comparePrice,
        stock:productNumbers.value.stock, status:"active"
      }).select("id,slug,title_bn,price,stock,status,category_id").single();
      if (error) throw error;
      if (!data?.id) throw new Error("পণ্যের রেকর্ড তৈরি হয়েছে কি না নিশ্চিত করা যায়নি।");
      createdProductId = data.id;

      const imageRows: { product_id: string; url: string; sort_order: number }[] = [];
      if (productImages.length) {
        for (let index = 0; index < productImages.length; index++) {
          const file = productImages[index];
          phase = "ছবি আপলোড (" + (index + 1) + "/" + productImages.length + ")";
          setMessage("ছবি আপলোড হচ্ছে… " + (index + 1) + "/" + productImages.length);
          const path = buildSellerProductImagePath(user.id, myStore.id, data.id, file.type, Date.now() + index);
          if (!path) throw new Error("ছবির ফাইলের তথ্য সঠিক নয়: " + file.name);
          const uploaded = await supabase.storage.from("product-images").upload(path, file, {
            contentType: file.type,
            upsert: false,
          });
          if (uploaded.error) throw new Error("ছবি আপলোড ব্যর্থ (" + file.name + "): " + uploaded.error.message);
          uploadedImagePaths.push(uploaded.data.path);
          const imageUrl = supabase.storage.from("product-images").getPublicUrl(uploaded.data.path).data.publicUrl;
          imageRows.push({ product_id: data.id, url: imageUrl, sort_order: index });
        }
      } else if (form.image_url) {
        imageRows.push({ product_id: data.id, url: form.image_url, sort_order: 0 });
      }

      if (imageRows.length) {
        phase = "ছবির তথ্য সংরক্ষণ";
        const imageResult = await supabase.from("product_images").insert(imageRows);
        if (imageResult.error) throw new Error("ছবির তথ্য সংরক্ষণ হয়নি: " + imageResult.error.message);
      }

      setSellerProducts((rows) => [{...data}, ...rows]);
      setMessage("পণ্য সফলভাবে প্রকাশ হয়েছে। " + imageRows.length + "টি ছবি যোগ হয়েছে।");
      setError("");
      setForm({});
      setProductImages([]);
      if (productImageInputRef.current) productImageInputRef.current.value = "";
    } catch(e:any) {
      const originalMessage = e?.message || "অজানা কারণে পণ্য যোগ করা যায়নি।";
      let cleanupWarning = "";
      if (createdProductId) {
        try {
          const cleanup = await supabase.from("products")
            .delete().eq("id", createdProductId).eq("store_id", myStore.id).select("id").maybeSingle();
          if (!isProductDeletionConfirmed(cleanup)) {
            cleanupWarning = " তৈরি হওয়া পণ্যের রেকর্ড মুছে ফেলা নিশ্চিত হয়নি।";
          }
        } catch {
          cleanupWarning = " তৈরি হওয়া পণ্যের রেকর্ড পরিষ্কারের অবস্থা নিশ্চিত হয়নি।";
        }
      }
      if (uploadedImagePaths.length) {
        try {
          const removal = await supabase.storage.from("product-images").remove(uploadedImagePaths);
          if (removal.error) cleanupWarning += " আপলোড হওয়া কিছু ছবি পরিষ্কার করা যায়নি।";
        } catch {
          cleanupWarning += " আপলোড হওয়া ছবিগুলোর পরিষ্কারের অবস্থা নিশ্চিত হয়নি।";
        }
      }
      setError(phase + " ধাপে সমস্যা: " + originalMessage + cleanupWarning);
      setMessage("");
    } finally {
      setBusy(false);
    }
  };

  const addSellerProductImages = async (productId:string, files:File[]) => {
    if (!myStore?.id || !user?.id || !productId || !files.length) return;
    setError(""); setMessage("");
    for (const file of files) {
      const validation = validateSellerProductImage(file);
      if (!validation.ok) { setError(file.name + ": " + validation.error); return; }
    }
    setBusy(true);
    const uploadedPaths:string[] = [];
    try {
      const {data:existing,error:existingError} = await supabase.from("product_images")
        .select("id,url,sort_order").eq("product_id",productId).order("sort_order",{ascending:true});
      if (existingError) throw existingError;
      const currentImages = existing || [];
      if (currentImages.length + files.length > 8) {
        throw new Error("একটি পণ্যে সর্বোচ্চ ৮টি ছবি রাখা যাবে। বর্তমানে " + currentImages.length + "টি আছে।");
      }
      const rows:{product_id:string;url:string;sort_order:number}[] = [];
      for (let index=0; index<files.length; index++) {
        const file=files[index];
        const path=buildSellerProductImagePath(user.id,myStore.id,productId,file.type,Date.now()+index);
        if (!path) throw new Error("ছবির ফাইলের তথ্য সঠিক নয়: " + file.name);
        const upload=await supabase.storage.from("product-images").upload(path,file,{contentType:file.type,upsert:false});
        if (upload.error) throw new Error("ছবি আপলোড ব্যর্থ ("+file.name+"): "+upload.error.message);
        uploadedPaths.push(upload.data.path);
        const url=supabase.storage.from("product-images").getPublicUrl(upload.data.path).data.publicUrl;
        rows.push({product_id:productId,url,sort_order:currentImages.length+index});
      }
      const {data:inserted,error:insertError}=await supabase.from("product_images").insert(rows).select("id,url,sort_order");
      if (insertError) throw new Error("ছবির তথ্য সংরক্ষণ হয়নি: "+insertError.message);
      if (!inserted || inserted.length!==rows.length) throw new Error("সব ছবির তথ্য সংরক্ষণ নিশ্চিত করা যায়নি।");
      setSellerProducts(items=>items.map(product=>product.id===productId
        ? {...product,product_images:[...(product.product_images||[]),...inserted].sort((a:any,b:any)=>a.sort_order-b.sort_order)}
        : product));
      setMessage(files.length.toLocaleString("bn-BD")+"টি নতুন ছবি পণ্যে যোগ হয়েছে।");
    } catch(e:any) {
      if (uploadedPaths.length) {
        const removal=await supabase.storage.from("product-images").remove(uploadedPaths);
        if (removal.error) setError((e.message||"ছবি যোগ করা যায়নি।")+" আপলোড হওয়া ছবির কিছু ফাইল পরিষ্কার করা যায়নি।");
        else setError(e.message||"ছবি যোগ করা যায়নি।");
      } else setError(e.message||"ছবি যোগ করা যায়নি।");
    } finally { setBusy(false); }
  };

  const updateSellerProduct = async (id:string, values:Record<string,any>) => {
    setError(""); setMessage("");
    if (!myStore?.id || !id) { setError("দোকান বা পণ্যের তথ্য পাওয়া যায়নি।"); return; }
    const allowed = new Set(["title_bn","title_en","description","category_id","price","compare_price","stock","status"]);
    const keys = Object.keys(values);
    if (!keys.length || keys.some(key=>!allowed.has(key))) { setError("এই পণ্যের তথ্য পরিবর্তনের অনুমতি নেই।"); return; }
    const safeValues:Record<string,any> = {};
    if ("title_bn" in values) {
      const productTitle = validateSellerProductTitle(values.title_bn);
      if (!productTitle.ok) { setError(productTitle.error); return; }
      safeValues.title_bn=productTitle.value;
    }
    if ("title_en" in values) {
      const titleEn=String(values.title_en??"").trim();
      if(titleEn.length>120){setError("ইংরেজি নাম সর্বোচ্চ ১২০ অক্ষরের হতে হবে।");return;}
      safeValues.title_en=titleEn||null;
    }
    if ("description" in values) {
      const description=String(values.description??"").trim();
      if(description.length>3000){setError("পণ্যের বিবরণ সর্বোচ্চ ৩০০০ অক্ষরের হতে হবে।");return;}
      safeValues.description=description||null;
    }
    if ("category_id" in values) safeValues.category_id=values.category_id||null;
    if ("price" in values || "stock" in values || "compare_price" in values) {
      const productNumbers = validateSellerProductNumbers(
        "price" in values ? values.price : (sellerProducts.find(p=>p.id===id)?.price ?? 1),
        "stock" in values ? values.stock : (sellerProducts.find(p=>p.id===id)?.stock ?? 0),
        "compare_price" in values ? values.compare_price : (sellerProducts.find(p=>p.id===id)?.compare_price ?? null),
      );
      if (!productNumbers.ok) { setError(productNumbers.error); return; }
      if ("price" in values) safeValues.price=productNumbers.value.price;
      if ("stock" in values) safeValues.stock=productNumbers.value.stock;
      if ("compare_price" in values) safeValues.compare_price=productNumbers.value.comparePrice;
    }
    if ("status" in values) {
      if (!["active","hidden","draft"].includes(values.status)) { setError("পণ্যের প্রকাশ-অবস্থা সঠিক নয়।"); return; }
      safeValues.status=values.status;
    }
    setBusy(true);
    try {
      const {data,error} = await supabase.from("products").update(safeValues).eq("id",id).eq("store_id",myStore.id).select("id").maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("পণ্যটি পাওয়া যায়নি বা পরিবর্তনের অনুমতি নেই।");
      setSellerProducts(rows=>rows.map(p=>p.id===id?{...p,...safeValues}:p));
      setMessage("পণ্যের সব তথ্য আপডেট হয়েছে।");
    } catch(e:any) { setError(e.message || "পণ্য আপডেট করা যায়নি।"); }
    finally { setBusy(false); }
  };

  const saveSellerImageOrder = async (productId:string, images:any[]) => {
    setBusy(true);setError("");setMessage("");
    try{
      for(let i=0;i<images.length;i++){
        const {data,error}=await supabase.from("product_images").update({sort_order:1000+i}).eq("id",images[i].id).eq("product_id",productId).select("id").maybeSingle();
        if(error)throw error;
        if(!data)throw new Error("ছবির ক্রম বদলানোর অনুমতি পাওয়া যায়নি। আবার লগইন করে চেষ্টা করুন।");
      }
      for(let i=0;i<images.length;i++){
        const {data,error}=await supabase.from("product_images").update({sort_order:i}).eq("id",images[i].id).eq("product_id",productId).select("id").maybeSingle();
        if(error)throw error;
        if(!data)throw new Error("ছবির ক্রম সংরক্ষণ হয়নি।");
      }
      setSellerProducts(rows=>rows.map(p=>p.id===productId?{...p,product_images:images.map((image:any,i)=>({...image,sort_order:i}))}:p));
      setMessage("মূল ছবি ও ছবির ক্রম সংরক্ষণ হয়েছে।");
    }catch(e:any){setError(e.message||"ছবির ক্রম পরিবর্তন করা যায়নি।");}
    finally{setBusy(false);}
  };

  const reorderSellerProductImages = async (productId:string, imageId:string, direction:-1|1) => {
    const product=sellerProducts.find(p=>p.id===productId);
    const images=[...(product?.product_images||[])].sort((a:any,b:any)=>a.sort_order-b.sort_order);
    const index=images.findIndex((image:any)=>image.id===imageId);
    const target=index+direction;
    if(index<0||target<0||target>=images.length)return;
    [images[index],images[target]]=[images[target],images[index]];
    await saveSellerImageOrder(productId,images);
  };

  const setSellerProductMainImage = async (productId:string, imageId:string) => {
    const product=sellerProducts.find(p=>p.id===productId);
    const images=[...(product?.product_images||[])].sort((a:any,b:any)=>a.sort_order-b.sort_order);
    const index=images.findIndex((image:any)=>image.id===imageId);
    if(index<0)return;
    const [chosen]=images.splice(index,1);
    await saveSellerImageOrder(productId,[chosen,...images]);
  };

  const removeSellerProductImage = async (productId:string, image:any) => {
    const product=sellerProducts.find(p=>p.id===productId);
    if(!product||!image?.id)return;
    if((product.product_images||[]).length<=1){setError("প্রতিটি পণ্যে অন্তত একটি ছবি রাখতে হবে।");return;}
    setBusy(true);setError("");setMessage("");
    try{
      const {data,error}=await supabase.from("product_images").delete().eq("id",image.id).eq("product_id",productId).select("id").maybeSingle();
      if(error)throw error;
      if(!data)throw new Error("ছবিটি মুছে ফেলার অনুমতি পাওয়া যায়নি।");
      const remaining=(product.product_images||[]).filter((row:any)=>row.id!==image.id).sort((a:any,b:any)=>a.sort_order-b.sort_order);
      for(let i=0;i<remaining.length;i++){
        const {error:orderError}=await supabase.from("product_images").update({sort_order:100+i}).eq("id",remaining[i].id).eq("product_id",productId);
        if(orderError)throw orderError;
      }
      for(let i=0;i<remaining.length;i++){
        const {error:orderError}=await supabase.from("product_images").update({sort_order:i}).eq("id",remaining[i].id).eq("product_id",productId);
        if(orderError)throw orderError;
      }
      const path=String(image.url||"").split("/product-images/")[1]?.split("?")[0];
      if(path) await supabase.storage.from("product-images").remove([decodeURIComponent(path)]);
      setSellerProducts(rows=>rows.map(p=>p.id===productId?{...p,product_images:remaining.map((row:any,i)=>({...row,sort_order:i}))}:p));
      setMessage("ছবিটি সরানো হয়েছে।");
    }catch(e:any){setError(e.message||"ছবি সরানো যায়নি।");}
    finally{setBusy(false);}
  };

  const saveStoreProfile = async (e:FormEvent) => {
    e.preventDefault();
    if (!user || !myStore?.id) return;
    const name=String(form.store_name??myStore.name??"").trim();
    const location=String(form.store_location??myStore.area??myStore.address??"").trim();
    const description=String(form.store_description??myStore.description??"").trim();
    const phone=String(form.store_phone??myStore.phone??"").trim();
    const whatsappPhone=String(form.store_whatsapp_phone??myStore.whatsapp_phone??"").trim();
    const logoUrl=String(form.store_logo_url??myStore.logo_url??"").trim();
    const bannerUrl=String(form.store_banner_url??myStore.banner_url??"").trim();
    if (name.length<2 || name.length>80 || location.length<5 || location.length>300 || description.length>1000 || (phone&&!/^01[3-9][0-9]{8}$/.test(phone)) || (whatsappPhone&&!/^01[3-9][0-9]{8}$/.test(whatsappPhone))) { setError("দোকানের নাম, এলাকা, ঠিকানা, ফোন বা WhatsApp নম্বর সঠিকভাবে পূরণ করুন।"); return; }
    for (const url of [logoUrl,bannerUrl]) { if (url) { try { const parsed=new URL(url); if (parsed.protocol!=="https:") throw new Error(); } catch { setError("লোগো ও ব্যানারের জন্য বৈধ HTTPS ছবির URL দিন।"); return; } } }
    setBusy(true); setError(""); setMessage("");
    const uploadedPaths:string[]=[];
    try {
      const uploadStoreImage=async(file:File,kind:"logo"|"banner")=>{
        const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
        const path=user.id+"/"+myStore.id+"/"+kind+"-"+Date.now()+"-"+Math.random().toString(36).slice(2,8)+"."+ext;
        const {error:uploadError}=await supabase.storage.from("store-media").upload(path,file,{contentType:file.type,upsert:false});
        if(uploadError) throw uploadError;
        uploadedPaths.push(path);
        return supabase.storage.from("store-media").getPublicUrl(path).data.publicUrl;
      };
      const finalLogoUrl=storeLogoFile?await uploadStoreImage(storeLogoFile,"logo"):logoUrl;
      const finalBannerUrl=storeBannerFile?await uploadStoreImage(storeBannerFile,"banner"):bannerUrl;
      const values={name,name_en:null,area:location,address:location,description:description||null,phone:phone||null,whatsapp_phone:whatsappPhone||null,logo_url:finalLogoUrl||null,banner_url:finalBannerUrl||null};
      const {data,error}=await supabase.from("seller_stores").update(values).eq("id",myStore.id).eq("owner_id",user.id).select("*").single();
      if (error) throw error;
      setMyStore(data); setStoreLogoFile(null); setStoreBannerFile(null);
      if(storeLogoPreview) URL.revokeObjectURL(storeLogoPreview); if(storeBannerPreview) URL.revokeObjectURL(storeBannerPreview);
      setStoreLogoPreview(""); setStoreBannerPreview("");
      setMessage("দোকানের তথ্য ও ছবি আপডেট হয়েছে।");
    } catch(e:any) {
      if(uploadedPaths.length) await supabase.storage.from("store-media").remove(uploadedPaths);
      setError(e.message||"দোকানের তথ্য আপডেট করা যায়নি।");
    }
    finally { setBusy(false); }
  };

  const removeAdminStore = async (id:string) => {
    const target = adminStores.find(store => store.id === id);
    if (!target) return;
    if (target.is_demo) { setError("নমুনা দোকান রিমুভ করা যাবে না।"); return; }
    const confirmation = window.confirm("“" + target.name + "” দোকানটি সম্পূর্ণ রিমুভ করবেন? দোকান, পণ্য, আবেদন এবং সেলারের লগইন অ্যাকাউন্ট স্থায়ীভাবে মুছে যাবে। পুরোনো অর্ডার ও কুরিয়ার ইতিহাস থাকবে। এই কাজ ফেরত নেওয়া যাবে না।");
    if (!confirmation) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const {data,error} = await supabase.functions.invoke("admin-remove-seller-store",{body:{storeId:id}});
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "দোকানটি সম্পূর্ণ রিমুভ করা যায়নি।");
      const removedOwnerId = data.ownerId as string;
      setAdminStores(rows=>rows.filter(store=>store.id!==id));
      setAdminProducts(rows=>rows.filter(product=>product.seller_stores?.id!==id));
      setApplications(rows=>rows.filter(app=>app.user_id!==removedOwnerId));
      setAdminStats(stats=>({...stats,activeStores:Math.max(0,stats.activeStores-(target.status==="active"?1:0))}));
      setProducts(rows=>rows.filter(product=>product.seller_stores?.id!==id));
      setWishlistProducts(rows=>rows.filter(product=>product.seller_stores?.id!==id));
      setDetailProduct(product=>product?.seller_stores?.id===id?null:product);
      setStore(current=>current?.id===id?null:current);
      setCart(rows=>{ const next=rows.filter(line=>line.product.seller_stores?.id!==id); try { localStorage.setItem("allify-cart",JSON.stringify(next)); } catch {} return next; });
      setMessage(data.storageCleanupPending
        ? "দোকান, পণ্য, আবেদন ও সেলার অ্যাকাউন্ট রিমুভ হয়েছে। অর্ডার ও কুরিয়ার ইতিহাস সংরক্ষিত আছে; কিছু পুরোনো ছবি পরিষ্কারের কাজ বাকি আছে।"
        : "দোকান, পণ্য, আবেদন ও সেলার অ্যাকাউন্ট সম্পূর্ণ রিমুভ হয়েছে। পুরোনো অর্ডার ও কুরিয়ার ইতিহাস সংরক্ষিত আছে।");
    } catch(e:any) { setError(e.message || "দোকানটি সম্পূর্ণ রিমুভ করা যায়নি।"); }
    finally { setBusy(false); }
  };

  const updateAdminStoreStatus = async (id:string, status:"active"|"suspended") => {
    const target = adminStores.find(store => store.id === id);
    if (!target) return;
    if (target.is_demo) { setError("নমুনা দোকানের অবস্থা পরিবর্তন করা যাবে না।"); return; }
    const action = status === "suspended" ? "বন্ধ" : "আবার চালু";
    if (!window.confirm(`“${target.name}” দোকানটি ${action} করতে চান?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const {data,error} = await supabase.from("seller_stores").update({status}).eq("id",id).select("id,status").maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("দোকানটি পাওয়া যায়নি বা পরিবর্তনের অনুমতি নেই।");
      setAdminStores(rows=>rows.map(store=>store.id===id?{...store,status}:store));
      setAdminStats(stats=>({...stats,activeStores:Math.max(0,stats.activeStores+(target.status===status?0:status==="active"?1:-1))}));
      if (status === "suspended") {
        // Immediately remove this store's products from every already-mounted customer view.
        setProducts(rows=>rows.filter(product=>product.seller_stores?.id!==id));
        setWishlistProducts(rows=>rows.filter(product=>product.seller_stores?.id!==id));
        setDetailProduct(product=>product?.seller_stores?.id===id?null:product);
        setStore(current=>current?.id===id?null:current);
        setCart(rows=>{
          const next=rows.filter(line=>line.product.seller_stores?.id!==id);
          try { localStorage.setItem("allify-cart",JSON.stringify(next)); } catch {}
          return next;
        });
        setMessage("দোকানটি বন্ধ হয়েছে। হোমপেজসহ খোলা সব পৃষ্ঠা থেকে পণ্যগুলো সঙ্গে সঙ্গেই সরানো হয়েছে।");
      } else {
        // Re-fetch products when reopening so they reappear without a page reload.
        const {data:restoredProducts,error:productsError}=await supabase.from("products")
          .select("id,slug,title_bn,title_en,description,price,compare_price,stock,category_id,product_images(id,url,sort_order),seller_stores!inner(id,name,slug,area,logo_url,banner_url,is_demo,status)")
          .eq("store_id",id).eq("status","active").eq("seller_stores.status","active");
        if (productsError) throw productsError;
        setProducts(rows=>{
          const byId=new Map(rows.map(product=>[product.id,product]));
          for (const product of (restoredProducts??[]) as Product[]) byId.set(product.id,product);
          return Array.from(byId.values()).sort((a,b)=>Number((b as any).sold_count||0)-Number((a as any).sold_count||0)).slice(0,48);
        });
        setMessage("দোকানটি আবার চালু হয়েছে। পণ্যগুলো হোমপেজে ফিরিয়ে আনা হয়েছে।");
      }
    } catch(e:any) { setError(e.message || "দোকানের অবস্থা পরিবর্তন করা যায়নি।"); }
    finally { setBusy(false); }
  };

  const updateAdminProduct = async (id:string, status:string) => {
    if (adminProducts.find(product => product.id === id)?.seller_stores?.is_demo) {
      setError("নমুনা পণ্যের প্রকাশ-অবস্থা পরিবর্তন করা যাবে না।");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const {data,error} = await supabase.from("products").update({status}).eq("id",id).select("id").maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("পণ্যটি পাওয়া যায়নি বা প্রকাশ-অবস্থা পরিবর্তন করা যায়নি।");
      setAdminProducts(rows=>rows.map(p=>p.id===id?{...p,status}:p));
      setMessage("পণ্যের প্রকাশ-অবস্থা আপডেট হয়েছে।");
    } catch(e:any) { setError(e.message || "পণ্য আপডেট করা যায়নি।"); }
    finally { setBusy(false); }
  };

  const updateAdminOrderItemStatus = async (itemId:string, orderId:string, status:string) => {
    const order = adminOrders.find(order => order.id === orderId);
    const item = order?.order_items?.find((row:any)=>row.id===itemId);
    if (order?.is_demo) { setError("নমুনা অর্ডারের অবস্থা পরিবর্তন করা যাবে না।"); return; }
    if (!item || !canTransitionOrderItemStatus(item.status, status)) {
      setError("এই অর্ডারের বর্তমান অবস্থা থেকে নির্বাচিত পরিবর্তনটি অনুমোদিত নয়।");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      if (status === "cancelled") {
        const {data,error} = await supabase.rpc("cancel_order_item",{p_item_id:itemId});
        if (error) throw error;
        if (data !== true) throw new Error("অর্ডারটি বাতিল করা যায়নি; আবার তথ্য হালনাগাদ করে চেষ্টা করুন।");
      } else {
        const {data,error} = await supabase.from("order_items").update({status}).eq("id",itemId).eq("status",item.status).select("id").maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("অর্ডারের অবস্থা ইতিমধ্যে পরিবর্তিত হয়েছে; তথ্য হালনাগাদ করে আবার চেষ্টা করুন।");
      }
      setAdminOrders(rows=>rows.map(order=>{
        if(order.id!==orderId) return order;
        const order_items=(order.order_items||[]).map((item:any)=>item.id===itemId?{...item,status}:item);
        return {...order,order_items,status:deriveOrderStatus(order_items)};
      }));
      setMessage("অর্ডারের অবস্থা আপডেট হয়েছে।");
    } catch(e:any) { setError(e.message || "অর্ডার আপডেট করা যায়নি।"); }
    finally { setBusy(false); }
  };

  const reviewApplication = async (id:string, approve:boolean) => {
    const application = applications.find(item => item.id === id);
    if (approve && !application?.user_id) {
      setError("নমুনা আবেদন অনুমোদন করা যাবে না।");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const {data,error} = await supabase.rpc("review_seller_application",{p_app_id:id,p_approve:approve,p_note:null});
      if (error) throw error;
      if (approve && (typeof data !== "string" || !data)) {
        throw new Error("দোকান তৈরি নিশ্চিত করা যায়নি; আবেদন তালিকা হালনাগাদ করে আবার যাচাই করুন।");
      }
      setApplications(rows=>rows.map(a=>a.id===id?{...a,status:approve?"approved":"rejected"}:a));
      setMessage(approve?"বিক্রেতার আবেদন অনুমোদিত হয়েছে।":"আবেদনটি বাতিল করা হয়েছে।");
    } catch(e:any) { setError(e.message || "আবেদন আপডেট করা যায়নি।"); }
    finally { setBusy(false); }
  };

  const submitProductReview = async (productId:string) => {
    if (!user) { navigate({to:"/login" as any}); return; }
    const deliveredItem=orders.flatMap(order=>(order.order_items||[]).map((item:any)=>({...item,customer_id:order.customer_id,is_demo:order.is_demo}))).find((item:any)=>item.product_id===productId&&item.status==="delivered"&&!item.is_demo&&!reviewedOrderItemIds.includes(item.id));
    if (!deliveredItem) { setError("রিভিউ দিতে হলে এই পণ্যটি আগে ডেলিভারি সম্পন্ন হতে হবে।"); return; }
    const rating=Number(form.review_rating||5);
    const reviewText=String(form.review_text||"").trim();
    if (!Number.isInteger(rating)||rating<1||rating>5||reviewText.length>1200) { setError("রেটিং ১–৫ এবং রিভিউ সর্বোচ্চ ১২০০ অক্ষরের হতে হবে।"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const {data,error}=await supabase.from("product_reviews").insert({product_id:productId,order_item_id:deliveredItem.id,user_id:user.id,rating,review_text:reviewText}).select("id,rating,review_text,created_at").single();
      if (error) throw error;
      setProductReviews(rows=>[data,...rows]);
      setReviewedOrderItemIds(ids=>[...ids,deliveredItem.id]);
      set("review_text","");
      setMessage("তোমার যাচাইকৃত রিভিউ প্রকাশিত হয়েছে। ধন্যবাদ!");
    } catch(e:any) { setError(e.message||"রিভিউ জমা দেওয়া যায়নি।"); }
    finally { setBusy(false); }
  };

  const cancelBuyerOrderItem = async (itemId:string, orderId:string) => {
    if (!window.confirm("এই পণ্যের অর্ডারটি বাতিল করতে চাও?")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const {data,error} = await supabase.rpc("cancel_order_item",{p_item_id:itemId});
      if (error) throw error;
      if (data !== true) throw new Error("অর্ডারটি বাতিল করা যায়নি; তথ্য হালনাগাদ করে আবার চেষ্টা করুন।");
      setOrders(rows=>rows.map(order=>{
        if(order.id!==orderId) return order;
        const order_items=(order.order_items||[]).map((item:any)=>item.id===itemId?{...item,status:"cancelled"}:item);
        return {...order,order_items,status:deriveOrderStatus(order_items)};
      }));
      setMessage("অর্ডার বাতিল হয়েছে; পণ্যের স্টক পুনরায় যুক্ত হয়েছে।");
    } catch(e:any) { setError(e.message || "অর্ডার বাতিল করা যায়নি।"); }
    finally { setBusy(false); }
  };

  const updateSellerOrderStatus = async (itemId:string, status:string) => {
    const item = sellerOrders.find(row=>row.id===itemId);
    if (!item || !canTransitionOrderItemStatus(item.status, status)) {
      setError("এই অর্ডারের বর্তমান অবস্থা থেকে নির্বাচিত পরিবর্তনটি অনুমোদিত নয়।");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      if (status === "cancelled") {
        const {data,error} = await supabase.rpc("cancel_order_item",{p_item_id:itemId});
        if (error) throw error;
        if (data !== true) throw new Error("অর্ডারটি বাতিল করা যায়নি; তথ্য হালনাগাদ করে আবার চেষ্টা করুন।");
      } else {
        const {data,error} = await supabase.from("order_items").update({status})
          .eq("id",itemId).eq("store_id",myStore?.id).eq("status",item.status)
          .select("id").maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("অর্ডারের অবস্থা ইতিমধ্যে পরিবর্তিত হয়েছে; তথ্য হালনাগাদ করে আবার চেষ্টা করুন।");
      }
      setSellerOrders(rows=>rows.map(row=>row.id===itemId?{...row,status}:row));
      setMessage("অর্ডারের অবস্থা আপডেট হয়েছে।");
    } catch(e:any) { setError(e.message || "অর্ডার আপডেট করা যায়নি।"); }
    finally { setBusy(false); }
  };

  const copyCourierOrderDetails = async (itemId:string) => {
    const item=sellerOrders.find(row=>row.id===itemId);
    if (!item) return;
    const order=Array.isArray(item.orders)?item.orders[0]:item.orders;
    const details=[
      "ALLIFY অর্ডার: "+(order?.order_no||""),
      "গ্রাহক: "+(order?.recipient||""),
      "মোবাইল: "+(order?.phone||""),
      "এলাকা: "+(order?.area||""),
      "ঠিকানা: "+(order?.address_line||""),
      "পণ্য: "+item.title,
      "পরিমাণ: "+item.quantity,
      "পণ্যের মোট মূল্য: ৳"+(Number(item.unit_price)*Number(item.quantity)).toFixed(2),
      order?.note?"নির্দেশনা: "+order.note:""
    ].filter(Boolean).join("\n");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(details);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      setMessage("অর্ডারের তথ্য কপি হয়েছে। Courier Merchant Panel-এ পেস্ট করে বুকিং করুন।");
      setError("");
    } catch {
      // Fallback for Android browsers/WebViews where Clipboard API is unavailable.
      const textarea = document.createElement("textarea");
      textarea.value = details;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (copied) {
        setMessage("অর্ডারের তথ্য কপি হয়েছে। Courier Merchant Panel-এ পেস্ট করে বুকিং করুন।");
        setError("");
      } else {
        setError("স্বয়ংক্রিয়ভাবে কপি করা যায়নি। নিচের অর্ডারের তথ্য নির্বাচন করে কপি করুন।");
      }
    }
  };

  const saveManualTrackingId = async (itemId:string) => {
    const item=sellerOrders.find(row=>row.id===itemId);
    const shipment=item?.courier_shipments?.[0];
    const trackingId=String(form[`tracking_${itemId}`]||"").trim();
    if (!item || !shipment?.id || !myStore?.id || !trackingId || trackingId.length>100) {
      setError("Courier থেকে পাওয়া সঠিক Tracking ID লিখুন।");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const {data,error}=await supabase.from("courier_shipments").update({
        tracking_id:trackingId,
        status:"booked",
        booked_at:new Date().toISOString(),
        booking_error:null
      }).eq("id",shipment.id).eq("store_id",myStore.id)
        .select("id,provider,status,tracking_id,consignment_id").maybeSingle();
      if(error) throw error;
      if(!data) throw new Error("Tracking ID সংরক্ষণ করা যায়নি। পৃষ্ঠাটি রিফ্রেশ করে আবার চেষ্টা করুন।");
      setSellerOrders(rows=>rows.map(row=>row.id===itemId?{...row,courier_shipments:[data]}:row));
      setMessage("Tracking ID ALLIFY-তে সংরক্ষিত হয়েছে।");
    } catch(e:any) { setError(e.message||"Tracking ID সংরক্ষণ করা যায়নি।"); }
    finally { setBusy(false); }
  };

  const saveCourierPreference = async (itemId:string) => {
    const item=sellerOrders.find(row=>row.id===itemId);
    const provider=String(form[`courier_${itemId}`]||item?.courier_shipments?.[0]?.provider||"");
    if (!item || !myStore?.id || !["pathao","steadfast"].includes(provider)) {
      setError("Pathao অথবা Steadfast নির্বাচন করুন।");
      return;
    }
    if (!["confirmed","shipped"].includes(item.status)) {
      setError("কুরিয়ার বুকিংয়ের আগে অর্ডারটি নিশ্চিত করতে হবে।");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const {data,error}=await supabase.from("courier_shipments").upsert({
        order_item_id:item.id,
        order_id:item.order_id,
        store_id:myStore.id,
        provider,
        status:"draft",
        booking_error:null
      },{onConflict:"order_item_id"}).select("id,provider,status,tracking_id,consignment_id").single();
      if(error) throw error;
      setSellerOrders(rows=>rows.map(row=>row.id===itemId?{...row,courier_shipments:[data]}:row));
      setMessage("কুরিয়ার নির্বাচন সংরক্ষিত হয়েছে। API সংযোগ সম্পন্ন হলে এখান থেকেই বুকিং করা যাবে।");
    } catch(e:any) {
      setError(e.message||"কুরিয়ার নির্বাচন সংরক্ষণ করা যায়নি।");
    } finally { setBusy(false); }
  };

  const checkout = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!user) { navigate({to: "/login" as any}); return; }
    const recipient=String(form.recipient||"").trim();
    const phone=String(form.phone||"").trim();
    const area=String(form.area||"");
    const address=String(form.address||"").trim();
    const note=String(form.note||"").trim();
    if (cart.length===0 || cart.length>50 || cart.some(x=>!x.product.id || !Number.isInteger(x.quantity) || x.quantity<1 || x.quantity>99)) {
      setError("কার্টের পণ্যের তালিকা বা পরিমাণ সঠিক নয়। কার্ট ঠিক করে আবার চেষ্টা করুন.");
      return;
    }
    if (new Set(cart.map(x=>x.product.id)).size!==cart.length) {
      setError("কার্টে একই পণ্য একাধিকবার রয়েছে। কার্ট আপডেট করে আবার চেষ্টা করুন।");
      return;
    }
    if (cart.some(x => x.product.seller_stores?.is_demo)) {
      setError("কার্টে নমুনা পণ্য রয়েছে। নমুনা পণ্যের অর্ডার নেওয়া হচ্ছে না।");
      return;
    }
    if (recipient.length<2 || recipient.length>100) { setError("গ্রাহকের নাম ২ থেকে ১০০ অক্ষরের মধ্যে লিখুন।"); return; }
    if (!/^01[3-9][0-9]{8}$/.test(phone)) { setError("সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর লিখুন।"); return; }
    if (!areas.some(a=>a.name_en===area)) { setError("ডেলিভারির এলাকা নির্বাচন করুন।"); return; }
    if (address.length<5 || address.length>300) { setError("সম্পূর্ণ ঠিকানা ৫ থেকে ৩০০ অক্ষরের মধ্যে লিখুন।"); return; }
    if (note.length>500) { setError("অতিরিক্ত নির্দেশনা সর্বোচ্চ ৫০০ অক্ষরের হতে পারবে।"); return; }
    const requestFingerprint=JSON.stringify({user:user.id,items:cart.map(x=>({product_id:x.product.id,quantity:x.quantity})),recipient,phone,area,address,note,save:form.save_address==="yes"});
    if (!checkoutRequestRef.current || checkoutRequestRef.current.fingerprint!==requestFingerprint) {
      checkoutRequestRef.current={fingerprint:requestFingerprint,id:crypto.randomUUID()};
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const {data,error} = await supabase.rpc("place_order", {
        p_items:cart.map(x=>({product_id:x.product.id,quantity:x.quantity})),
        p_recipient:recipient, p_phone:phone, p_area:area,
        p_address:address, p_request_id:checkoutRequestRef.current.id,
        p_note:note||null, p_save_address:form.save_address==="yes"
      });
      if (error) throw error;
      checkoutRequestRef.current=null;
      if (buyNowMode) {
        const raw=localStorage.getItem("allify-cart-before-buy-now");
        const restored=sanitizeStoredCart(raw?JSON.parse(raw):[]);
        saveCart(restored as unknown as CartLine[]);
        localStorage.removeItem("allify-cart-before-buy-now");
        localStorage.removeItem("allify-buy-now-mode");
        setBuyNowMode(false);
      } else saveCart([]);
      setMessage("অর্ডার সফলভাবে জমা হয়েছে। অর্ডার নম্বর: "+data);
      navigate({to: "/account" as any});
    } catch(e:any) { setError(e.message || "অর্ডার সম্পন্ন হয়নি।"); }
    finally { setBusy(false); }
  };

  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setRole("customer"); navigate({to:"/"}); };
  const productCard = (p:Product) => <article key={p.id} className="overflow-hidden rounded-xl border bg-card">
    <Link to={"/product" as any} search={{slug:p.slug} as any} className="block">
      <div className="grid aspect-square w-full place-items-center overflow-hidden bg-muted p-3">
        <img src={p.product_images?.[0]?.url || "/images/products/placeholder.svg"} alt={p.title_bn} loading="lazy" onError={(e) => { const img = e.currentTarget; if (img.dataset.fallback !== "1") { img.dataset.fallback = "1"; img.src = "/images/products/placeholder.svg"; } else { img.style.display = "none"; } }} className="h-full w-full object-contain"/>
      </div>
    </Link>
    <div className="p-3"><Link to={"/product" as any} search={{slug:p.slug} as any} className="line-clamp-2 min-h-10 text-sm font-semibold hover:text-primary">{p.title_bn}</Link>
      <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
        <p className="shrink-0 text-sm font-bold text-primary">{money(p.price)}</p>
        <Link to={p.seller_stores?.slug?("/store" as any):("/market" as any)} search={p.seller_stores?.slug?({slug:p.seller_stores.slug} as any):undefined} className="flex min-w-0 items-center justify-end gap-1.5 text-right text-[10px] text-muted-foreground hover:text-primary">{p.seller_stores?.logo_url?<img src={p.seller_stores.logo_url} alt="" loading="lazy" className="h-5 w-5 shrink-0 rounded-full border object-cover" onError={e=>{e.currentTarget.style.display="none";}}/>:<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border bg-muted text-[9px] font-bold">{(p.seller_stores?.name||"দ").slice(0,1)}</span>}<span className="min-w-0 truncate">{p.seller_stores?.name || "স্থানীয় দোকান"}</span></Link>
      </div>
      {p.compare_price ? <s className="mt-0.5 block text-xs text-muted-foreground">{money(p.compare_price)}</s> : null}
      <p className="mt-1 text-xs text-muted-foreground">স্টক: {p.stock.toLocaleString("bn-BD")}</p>
      <div className="mt-3 grid grid-cols-2 gap-2"><button className={secondary+" text-xs px-2"} onClick={()=>addToCart(p)} disabled={p.stock<1 || !!p.seller_stores?.is_demo}>কার্টে যোগ করুন</button><button className={primary+" text-xs px-2"} onClick={()=>buyNow(p)} disabled={p.stock<1 || !!p.seller_stores?.is_demo}>এখনই অর্ডার</button></div><button type="button" className="mt-2 w-full rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-muted" onClick={()=>toggleWishlist(p)}>{wishlistIds.includes(p.id)?"♥ পছন্দের তালিকা থেকে সরান":"♡ পছন্দের তালিকায় রাখুন"}</button>
    </div></article>;

  const shell = (title:string, children:any) => <div className={"mx-auto "+(title==="অ্যাডমিন প্যানেল"?"w-full max-w-[1600px] px-3 sm:px-5 lg:px-8":"max-w-6xl px-4")+" py-7"}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground"><Link to="/" className="font-black tracking-wide" style={{color:"#123b32"}}>ALLI<span style={{color:"#9bbd31"}}>F</span>Y</Link> / {title}</p><h1 className="mt-1 text-2xl font-bold">{title}</h1></div><Link to={"/cart" as any} className={secondary}>কার্ট ({cart.reduce((n,x)=>n+x.quantity,0).toLocaleString("bn-BD")})</Link></div>{message&&<p role="status" aria-live="polite" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}{error&&<p role="alert" aria-live="assertive" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{children}</div>;

  if (loading) return <div role="status" aria-live="polite" className="mx-auto max-w-6xl p-8 text-center text-muted-foreground">ALLIFY লোড হচ্ছে…</div>;

  let body:any;
  if (page === "search" || page === "category" || page === "market") {
    const title = page==="search" ? "পণ্য খুঁজুন" : page==="category" ? "ক্যাটাগরি অনুযায়ী পণ্য" : "সব পণ্য";
    body = shell(title,<><form className="mb-5 flex gap-2" onSubmit={e=>{e.preventDefault();navigate({to: "/search" as any,search:{q:form.q||""} as any});}}><input className={field} placeholder="পণ্যের নাম লিখুন…" value={form.q??queryValue("q", searchStr)} onChange={e=>set("q",e.target.value)}/><button className={primary}>খুঁজুন</button></form>{page === "search" && !queryValue("q", searchStr).trim() && (<div className="mb-5 flex flex-wrap gap-2">{categories.filter(c=>!c.parent_id).map(c=><div key={c.id} className="flex min-w-40 flex-col items-start gap-2 rounded-xl border p-3"><Link to={"/category" as any} search={{category:c.slug} as any} className={secondary+" font-semibold"}>{c.name_bn}</Link><div className="flex w-full flex-col gap-2">{categories.filter(child=>child.parent_id===c.id).map(child=><div key={child.id} className="flex flex-col items-start gap-1"><Link to={"/category" as any} search={{category:child.slug} as any} className={secondary+" text-xs"}>{child.name_bn}</Link><div className="flex flex-wrap gap-2 pl-3">{categories.filter(grand=>grand.parent_id===child.id).map(grand=><Link key={grand.id} to={"/category" as any} search={{category:grand.slug} as any} className={secondary+" text-xs"}>{grand.name_bn}</Link>)}</div></div>)}</div></div>)}</div>)}<div className="grid grid-cols-2 gap-3 md:grid-cols-4">{filtered.map(productCard)}</div>{!filtered.length&&<p className={panel}>এই অনুসন্ধানে কোনো পণ্য পাওয়া যায়নি।</p>}</>);
  } else if (page === "product") {
    const p = selected;
    body = shell("পণ্যের বিবরণ",p ? <div className="grid items-start gap-6 md:grid-cols-2"><section className="space-y-3"><div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border bg-muted p-3"><img src={p.product_images?.[detailImageIndex]?.url||p.product_images?.[0]?.url||"/images/products/placeholder.svg"} onError={(e) => { const img = e.currentTarget; if (img.dataset.fallback !== "1") { img.dataset.fallback = "1"; img.src = "/images/products/placeholder.svg"; } else { img.style.display = "none"; } }} className="max-h-full w-full object-contain" alt={p.title_bn+" ছবি "+(detailImageIndex+1)}/>{(p.product_images||[]).length>1&&<><button type="button" aria-label="আগের ছবি" onClick={()=>setDetailImageIndex(i=>(i-1+(p.product_images||[]).length)%(p.product_images||[]).length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border bg-background/90 p-2 text-xl shadow">‹</button><button type="button" aria-label="পরের ছবি" onClick={()=>setDetailImageIndex(i=>(i+1)%(p.product_images||[]).length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border bg-background/90 p-2 text-xl shadow">›</button><span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">{(detailImageIndex+1).toLocaleString("bn-BD")} / {(p.product_images||[]).length.toLocaleString("bn-BD")}</span></>}</div>{(p.product_images||[]).length>1&&<div className="flex gap-2 overflow-x-auto pb-1">{p.product_images?.map((image,index)=><button type="button" key={image.url+index} aria-label={"ছবি "+(index+1)+" দেখুন"} aria-pressed={detailImageIndex===index} onClick={()=>setDetailImageIndex(index)} className={"h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-muted p-1 "+(detailImageIndex===index?"border-primary":"border-transparent")}><img src={image.url} alt={p.title_bn+" ছবি "+(index+1)} loading="lazy" className="h-full w-full object-contain"/></button>)}</div>}<p className="text-xs text-muted-foreground">পণ্যের আসল ছবি দেখে অর্ডার করুন।</p></section><section className="rounded-2xl border bg-card p-4 md:p-6"><p className="text-xs font-semibold"><span style={{color:"#123b32"}}>ALLI<span style={{color:"#9bbd31"}}>F</span>Y</span><span className="text-primary"> · চট্টগ্রামের বাজার</span></p><h1 className="mt-2 text-2xl font-bold leading-snug">{p.title_bn}</h1><div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">{p.seller_stores?.logo_url?<img src={p.seller_stores.logo_url} alt="" className="h-9 w-9 rounded-full border object-cover" onError={e=>{e.currentTarget.style.display="none";}}/>:<span className="flex h-9 w-9 items-center justify-center rounded-full border bg-muted text-xs font-bold">{(p.seller_stores?.name||"দোকান").slice(0,1)}</span>}<span>{p.seller_stores?.slug?<Link to={"/store" as any} search={{slug:p.seller_stores.slug} as any} className="font-semibold hover:text-primary">{p.seller_stores.name}</Link>:p.seller_stores?.name||"স্থানীয় দোকান"}{p.seller_stores?.area?" · "+p.seller_stores.area:""}{p.seller_stores?.is_demo?" · নমুনা দোকান":""}</span></div><div className="mt-5 flex flex-wrap items-baseline gap-3"><p className="text-3xl font-extrabold text-primary">{money(p.price)}</p>{p.compare_price&&<><s className="text-sm text-muted-foreground">{money(p.compare_price)}</s><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">সাশ্রয় {money(Math.max(0,p.compare_price-p.price))}</span></>}</div><div className="mt-4 rounded-xl bg-muted/60 p-3 text-sm"><p className="font-semibold">{p.stock>0?"স্টকে আছে":"স্টক শেষ"}</p><p className="mt-1 text-xs text-muted-foreground">{p.stock>0?"স্টক: "+p.stock.toLocaleString("bn-BD")+" টি":"এই পণ্যটি এখন অর্ডার করা যাচ্ছে না।"}</p></div><div className="mt-5 hidden grid-cols-2 gap-2 md:grid md:grid-cols-3"><button className={secondary} disabled={!p.stock || !!p.seller_stores?.is_demo} onClick={()=>addToCart(p)}>কার্টে যোগ করুন</button><button className={primary} disabled={!p.stock || !!p.seller_stores?.is_demo} onClick={()=>buyNow(p)}>এখনই অর্ডার করুন</button>{p.seller_stores?.whatsapp_phone&&!p.seller_stores?.is_demo&&<a href={`https://wa.me/${p.seller_stores.whatsapp_phone.replace(/\D/g,"").replace(/^0/,"880")}?text=${encodeURIComponent(`আসসালামু আলাইকুম, ALLIFY-তে ${p.title_bn} পণ্যটি দেখেছি। এ সম্পর্কে জানতে চাই।`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#15803D]"><span aria-hidden="true">☏</span> WhatsApp-এ যোগাযোগ</a>}</div><button type="button" className="mt-3 w-full rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted" onClick={()=>toggleWishlist(p)}>{wishlistIds.includes(p.id)?"♥ পছন্দের তালিকা থেকে সরান":"♡ পছন্দের তালিকায় রাখুন"}</button><div className="mt-4 flex flex-wrap gap-3 border-t pt-4 text-xs text-muted-foreground"><span>ক্যাশ অন ডেলিভারি</span><span>চট্টগ্রাম জেলা</span></div>{p.seller_stores?.slug&&<p className="mt-4 text-sm"><Link to={"/store" as any} search={{slug:p.seller_stores.slug} as any} className={linkClass}>এই দোকানের আরও পণ্য দেখুন</Link></p>}</section><section className="md:col-span-2 rounded-2xl border bg-card p-4 md:p-6"><h2 className="text-lg font-bold">পণ্যের বিবরণ</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">{p.description||"বিক্রেতা এখনো পণ্যের বিস্তারিত বিবরণ যোগ করেননি।"}</p></section><section className="md:col-span-2 rounded-2xl border bg-card p-4 md:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">ক্রেতাদের রিভিউ</h2><span className="text-sm text-muted-foreground">★ {Number(p.rating||0).toFixed(1)} / ৫ · {productReviews.length.toLocaleString("bn-BD")}টি রিভিউ</span></div>{productReviews.length?productReviews.map(review=><article key={review.id} className="border-t py-3"><p className="font-semibold text-amber-600">{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</p>{review.review_text&&<p className="mt-1 whitespace-pre-wrap text-sm">{review.review_text}</p>}<p className="mt-1 text-xs text-muted-foreground">যাচাইকৃত ক্রেতা · {new Date(review.created_at).toLocaleDateString("bn-BD")}</p></article>):<p className="mt-3 text-sm text-muted-foreground">এখনো কোনো রিভিউ নেই। পণ্যটি কেনা ও ডেলিভারি সম্পন্ন হলে প্রথম রিভিউ দিতে পারবে।</p>}{user&&orders.some(order=>(order.order_items||[]).some((item:any)=>item.product_id===p.id&&item.status==="delivered"&&!order.is_demo&&!reviewedOrderItemIds.includes(item.id)))&&<form className="mt-4 space-y-3 border-t pt-4" onSubmit={e=>{e.preventDefault();void submitProductReview(p.id);}}><h3 className="font-semibold">তোমার অভিজ্ঞতা জানাও</h3><label className="block text-sm">রেটিং<select className={field+" mt-1"} value={form.review_rating||"5"} onChange={e=>set("review_rating",e.target.value)}><option value="5">৫ — চমৎকার</option><option value="4">৪ — ভালো</option><option value="3">৩ — মোটামুটি</option><option value="2">২ — ভালো নয়</option><option value="1">১ — খারাপ</option></select></label><textarea className={field} rows={3} maxLength={1200} placeholder="পণ্যের মান ও অভিজ্ঞতা লিখুন (ঐচ্ছিক)" value={form.review_text||""} onChange={e=>set("review_text",e.target.value)}/><button disabled={busy} className={primary}>রিভিউ জমা দিন</button></form>}</section></div>:<p className={panel}>পণ্যটি পাওয়া যায়নি। <Link to={"/market" as any} className={linkClass}>সব পণ্য দেখুন</Link></p>);
  } else if (page === "store") {
    body = shell("দোকান",store?<><div className="overflow-hidden rounded-2xl border bg-card shadow-sm"><div className="w-full overflow-hidden bg-muted/30">{store.banner_url?<img src={store.banner_url} alt={store.name+" ব্যানার"} className="block h-auto w-full" onError={e=>{e.currentTarget.style.display="none";}}/>:<div className="min-h-28 w-full bg-gradient-to-r from-primary/15 via-muted to-primary/10" />}</div><div className="px-4 pb-5 pt-3 sm:px-6"><div className="flex min-w-0 items-start gap-3 sm:gap-4">{store.logo_url?<img src={store.logo_url} alt={store.name+" লোগো"} className="h-16 w-16 shrink-0 rounded-2xl border-4 border-card bg-card object-cover sm:h-20 sm:w-20" onError={e=>{e.currentTarget.style.display="none";}}/>:<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-4 border-card bg-muted text-2xl font-bold sm:h-20 sm:w-20">{(store.name||"দোকান").slice(0,1)}</div>}<div className="min-w-0 flex-1"><h2 className="break-words text-xl font-bold leading-snug sm:text-2xl">{store.name}</h2>{store.area&&<p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground"><span className="shrink-0">📍</span><span className="min-w-0 break-words">{store.area}</span></p>}</div></div>{store.phone&&<p className="mt-3 break-all text-sm text-muted-foreground">ফোন: {store.phone}</p>}{store.is_demo&&<p className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">নমুনা দোকান — বাস্তব বিক্রেতা নয়</p>}{store.description&&<div className="mt-4 border-t pt-3"><h3 className="text-sm font-semibold">দোকান সম্পর্কে</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{store.description}</p></div>}</div></div><h2 className="mt-6 mb-3 text-lg font-bold">এই দোকানের পণ্য</h2><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{(store.products||[]).map((p:any)=>productCard(p))}</div></>:<p className={panel}>দোকানটি পাওয়া যায়নি।</p>);
  } else if (page === "wishlist") {
    body = shell("আমার পছন্দের তালিকা",user?<><p className="mb-4 text-sm text-muted-foreground">পরে কেনার জন্য পছন্দের পণ্য এখানে জমা থাকবে।</p>{wishlistProducts.length?<div className="grid grid-cols-2 gap-3 md:grid-cols-4">{wishlistProducts.map(productCard)}</div>:<div className={panel}>এখনো কোনো পণ্য পছন্দের তালিকায় যোগ করা হয়নি। <Link to={"/market" as any} className={linkClass}>পণ্য দেখুন</Link></div>}</>:<div className={panel}>পছন্দের তালিকা দেখতে <Link to={"/login" as any} className={linkClass}>লগইন</Link> করুন।</div>);
  } else if (page === "cart") {
    body = shell("আমার কার্ট",cart.length?<><div className="space-y-3">{cart.map(x=><div key={x.product.id} className={panel+" flex flex-wrap items-center gap-3"}><img src={x.product.product_images?.[0]?.url||"/images/products/placeholder.svg"} onError={(e) => { const img = e.currentTarget; if (img.dataset.fallback !== "1") { img.dataset.fallback = "1"; img.src = "/images/products/placeholder.svg"; } else { img.style.display = "none"; } }} className="h-20 w-20 rounded-lg bg-muted object-cover" alt=""/><div className="min-w-0 flex-1"><p className="font-semibold">{x.product.title_bn}</p><p className="text-sm text-primary">{money(x.product.price)}</p></div><input aria-label="পরিমাণ" type="number" min="1" max="99" value={x.quantity} onChange={e=>changeQty(x.product.id,Number(e.target.value))} className="w-20 rounded border bg-background p-2"/><button className={secondary} onClick={()=>removeLine(x.product.id)}>বাদ দিন</button></div>)}</div><div className={panel+" mt-5"}><p className="flex justify-between font-bold"><span>পণ্যের মোট</span><span>{money(subtotal)}</span></p><p className="mt-2 text-xs text-muted-foreground">কুরিয়ারের ডেলিভারি চার্জ কুরিয়ার বুকিংয়ের সময় নির্ধারিত হবে।</p>{cart.some(x => x.product.seller_stores?.is_demo) ? <p className="mt-4 text-sm text-amber-700">নমুনা পণ্য কার্ট থেকে বাদ দিয়ে বাস্তব পণ্য যোগ করুন।</p> : <Link to={"/checkout" as any} className={primary+" mt-4 inline-block"}>অর্ডার সম্পন্ন করুন</Link>}</div></>:<div className={panel}>তোমার কার্ট খালি। <Link to={"/market" as any} className={linkClass}>পণ্য দেখুন</Link></div>);
  } else if (page === "checkout") {
    body = shell("চেকআউট",<>{buyNowMode&&<div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-muted/40 p-3 text-sm"><span>তুমি একটি পণ্য সরাসরি অর্ডার করছো।</span><button type="button" className={secondary+" text-xs"} onClick={restorePreviousCart}>আগের কার্ট ফিরিয়ে আনুন</button></div>}{!cart.length?<p className={panel}>কার্ট খালি। <Link to={"/market" as any} className={linkClass}>পণ্য দেখুন</Link></p>:<form onSubmit={checkout} className={panel+" max-w-2xl space-y-3"}><p className="font-semibold">ডেলিভারির তথ্য</p><input required minLength={2} maxLength={100} className={field} placeholder="গ্রাহকের নাম" aria-label="গ্রাহকের নাম" value={form.recipient||""} onChange={e=>set("recipient",e.target.value)}/><input required pattern="01[3-9][0-9]{8}" maxLength={11} inputMode="numeric" className={field} placeholder="মোবাইল নম্বর (01XXXXXXXXX)" aria-label="মোবাইল নম্বর" value={form.phone||""} onChange={e=>set("phone",e.target.value)}/><select required className={field} aria-label="ডেলিভারির এলাকা" value={form.area||""} onChange={e=>set("area",e.target.value)}><option value="">এলাকা নির্বাচন করুন</option>{areas.map(a=><option key={a.name_en} value={a.name_en}>{a.name_bn}</option>)}</select><textarea required minLength={5} maxLength={300} className={field} placeholder="সম্পূর্ণ ঠিকানা" aria-label="সম্পূর্ণ ডেলিভারি ঠিকানা" value={form.address||""} onChange={e=>set("address",e.target.value)}/><textarea maxLength={500} className={field} placeholder="অতিরিক্ত নির্দেশনা (ঐচ্ছিক)" aria-label="অতিরিক্ত নির্দেশনা (ঐচ্ছিক)" value={form.note||""} onChange={e=>set("note",e.target.value)}/><label className="flex gap-2 text-sm"><input type="checkbox" aria-label="ঠিকানাটি সংরক্ষণ করুন" checked={form.save_address==="yes"} onChange={e=>set("save_address",e.target.checked?"yes":"no")}/> ঠিকানাটি সংরক্ষণ করুন</label><div className="border-t pt-3 text-sm"><p>পণ্যের মোট: {money(subtotal)}</p><p className="mt-2 text-lg font-bold">সর্বমোট পণ্যমূল্য: {money(subtotal)}</p><p className="mt-2 text-xs text-muted-foreground">ডেলিভারি চার্জ ALLIFY-তে যোগ হয় না। কুরিয়ার মার্চেন্ট প্যানেলে বুকিংয়ের সময় নির্ধারিত হবে।</p></div><p className="text-xs text-muted-foreground">পেমেন্ট পদ্ধতি: ক্যাশ অন ডেলিভারি (COD)।</p><button disabled={busy || cart.some(x => x.product.seller_stores?.is_demo)} className={primary+" w-full"}>{cart.some(x => x.product.seller_stores?.is_demo)?"নমুনা পণ্য সরান":busy?"অপেক্ষা করুন…":"অর্ডার নিশ্চিত করুন"}</button></form>}</>);
  } else if (page === "login" || page === "register") {
    const reg = page==="register";
    body = shell(reg?"নতুন অ্যাকাউন্ট":"লগইন",<form onSubmit={e=>submitAuth(e,reg?"register":"login")} className={panel+" max-w-md space-y-3"}>{reg&&<input required className={field} placeholder="তোমার নাম" value={form.name||""} onChange={e=>set("name",e.target.value)}/>}<input required type="email" className={field} placeholder="ইমেইল" value={form.email||""} onChange={e=>set("email",e.target.value)}/><input required minLength={reg?8:1} pattern={reg?"(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}":undefined} title={reg?"কমপক্ষে ৮ অক্ষর এবং ইংরেজি বড় হাতের, ছোট হাতের অক্ষর, সংখ্যা ও চিহ্ন ব্যবহার করুন।":undefined} type="password" autoComplete={reg?"new-password":"current-password"} className={field} placeholder={reg?"পাসওয়ার্ড (৮+ অক্ষর; বড়-ছোট অক্ষর, সংখ্যা ও চিহ্ন)":"পাসওয়ার্ড"} value={form.password||""} onChange={e=>set("password",e.target.value)}/><button disabled={busy} className={primary+" w-full"}>{busy?"অপেক্ষা করুন…":reg?"অ্যাকাউন্ট তৈরি করুন":"লগইন"}</button>{!reg&&<p className="text-sm text-right"><Link className={linkClass} to={"/forgot-password" as any}>পাসওয়ার্ড ভুলে গেছেন?</Link></p>}{reg&&<button type="button" disabled={busy} onClick={resendVerification} className={secondary+" w-full"}>ভেরিফিকেশন ইমেইল আবার পাঠান</button>}<p className="text-sm text-muted-foreground">{reg?"আগে অ্যাকাউন্ট আছে? ":"অ্যাকাউন্ট নেই? "}<Link className={linkClass} to={(reg?"/login":"/register") as any}>{reg?"লগইন করুন":"রেজিস্ট্রেশন করুন"}</Link></p></form>);
  } else if (page === "forgot-password") {
    body = shell("পাসওয়ার্ড রিসেট",<form onSubmit={requestPasswordReset} className={panel+" max-w-md space-y-3"}><p className="text-sm text-muted-foreground">আপনার ALLIFY অ্যাকাউন্টে ব্যবহৃত ইমেইল ঠিকানাটি লিখুন। পাসওয়ার্ড পরিবর্তনের নিরাপদ লিংক পাঠানো হবে।</p><input required type="email" autoComplete="email" className={field} placeholder="ইমেইল ঠিকানা" value={form.email||""} onChange={e=>set("email",e.target.value)}/><button disabled={busy} className={primary+" w-full"}>{busy?"পাঠানো হচ্ছে…":"রিসেট লিংক পাঠান"}</button><p className="text-sm"><Link className={linkClass} to={"/login" as any}>লগইনে ফিরে যান</Link></p></form>);
  } else if (page === "reset-password") {
    body = shell("নতুন পাসওয়ার্ড তৈরি করুন",isPasswordRecovery&&user?<form onSubmit={submitNewPassword} className={panel+" max-w-md space-y-3"}><p className="text-sm text-muted-foreground">আপনার ALLIFY অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড দিন। কমপক্ষে ৮ অক্ষর, বড়-ছোট ইংরেজি অক্ষর, সংখ্যা ও চিহ্ন ব্যবহার করুন।</p><input required minLength={8} type="password" autoComplete="new-password" className={field} placeholder="নতুন পাসওয়ার্ড" value={form.new_password||""} onChange={e=>set("new_password",e.target.value)}/><input required minLength={8} type="password" autoComplete="new-password" className={field} placeholder="নতুন পাসওয়ার্ড আবার লিখুন" value={form.confirm_new_password||""} onChange={e=>set("confirm_new_password",e.target.value)}/><button disabled={busy} className={primary+" w-full"}>{busy?"পরিবর্তন হচ্ছে…":"নতুন পাসওয়ার্ড সংরক্ষণ করুন"}</button></form>:<div className={panel+" max-w-md space-y-3"}><p className="text-sm text-muted-foreground">এই পেজটি ব্যবহার করতে আপনার ইমেইলে পাঠানো বৈধ ও মেয়াদ থাকা রিসেট লিংক দিয়ে আসুন।</p><Link className={primary+" inline-block"} to={"/forgot-password" as any}>নতুন রিসেট লিংক নিন</Link></div>);
  } else if (page === "seller") {
    const pendingApplication = applications.find(application=>application.status==="pending");
    body = shell("বিক্রেতা হোন",myStore?<div className={panel}>তোমার দোকান চালু আছে: <b>{myStore.name}</b> <Link to={"/seller-dashboard" as any} className={linkClass}>ড্যাশবোর্ড খুলুন</Link></div>:pendingApplication?<div className={panel+" max-w-2xl space-y-2"}><b>তোমার বিক্রেতা আবেদন পর্যালোচনার অপেক্ষায় আছে।</b><p className="text-sm text-muted-foreground">দোকান: {pendingApplication.store_name}</p><p className="text-sm text-muted-foreground">আবেদনের অবস্থা: {pendingApplication.status==="pending"?"পর্যালোচনাধীন":pendingApplication.status}</p><p className="text-sm">অ্যাডমিন সিদ্ধান্ত না দেওয়া পর্যন্ত নতুন আবেদন জমা দেওয়ার প্রয়োজন নেই।</p></div>:<form onSubmit={submitSeller} className={panel+" max-w-2xl space-y-3"}><p className="text-sm text-muted-foreground">চট্টগ্রামের দোকানদাররা বিনামূল্যে আবেদন করতে পারবেন। অনুমোদনের পর দোকান ও পণ্য যোগ করা যাবে।</p><input required minLength={2} maxLength={80} className={field} placeholder="দোকানের নাম" value={form.store_name||""} onChange={e=>set("store_name",e.target.value)}/><input required minLength={2} maxLength={100} className={field} placeholder="মালিকের নাম" value={form.owner_name||""} onChange={e=>set("owner_name",e.target.value)}/><input required type="tel" inputMode="numeric" minLength={11} maxLength={11} pattern="01[3-9][0-9]{8}" className={field} placeholder="মোবাইল নম্বর" value={form.phone||""} onChange={e=>set("phone",e.target.value)}/><select required className={field} aria-label="দোকানের লোকেশন" value={form.store_location||""} onChange={e=>set("store_location",e.target.value)}><option value="">দোকানের লোকেশন নির্বাচন করুন</option>{areas.map(a=><option key={a.name_en} value={a.name_bn}>{a.name_bn}</option>)}</select><label className="block space-y-1 text-sm font-medium">দোকানে কী ধরনের পণ্য বিক্রি করবেন? (নিজে লিখুন)<input maxLength={1000} className={field} placeholder="যেমন: পোশাক, জুতা, ঘড়ি, ব্যাগ" value={form.category_hint||""} onChange={e=>set("category_hint",e.target.value)}/></label><textarea maxLength={1000} className={field} placeholder="দোকান সম্পর্কে" value={form.description||""} onChange={e=>set("description",e.target.value)}/><button disabled={busy} className={primary}>{busy?"জমা হচ্ছে…":"বিনামূল্যে আবেদন জমা দিন"}</button>{!user&&<p className="text-xs text-muted-foreground">প্রথমবার আবেদন করলে Submit চাপার পর অ্যাকাউন্ট তৈরি করতে পারবেন। আগে অ্যাকাউন্ট থাকলে <Link to={"/login" as any} className={linkClass}>লগইন</Link> করুন।</p>}</form>);
  } else if (page === "seller-dashboard") {
    const deliveredSales=sellerOrders.filter(item=>item.status==="delivered").reduce((sum,item)=>sum+Number(item.unit_price)*Number(item.quantity),0);
    const pendingCount=sellerOrders.filter(item=>item.status==="pending").length;
    const activeCount=sellerOrders.filter(item=>["confirmed","shipped"].includes(item.status)).length;
    const deliveredCount=new Set(sellerOrders.filter(item=>item.status==="delivered").map(item=>item.order_id)).size;
    const deliveredUnits=sellerOrders.filter(item=>item.status==="delivered").reduce((sum,item)=>sum+Number(item.quantity),0);
    const topProducts=Object.values(sellerOrders.filter(item=>item.status==="delivered").reduce((acc:any,item:any)=>{const key=item.product_id||item.title;acc[key]??={title:item.title,units:0,revenue:0};acc[key].units+=Number(item.quantity);acc[key].revenue+=Number(item.unit_price)*Number(item.quantity);return acc;},{})).sort((a:any,b:any)=>b.revenue-a.revenue).slice(0,5);
    body = shell("বিক্রেতা ড্যাশবোর্ড",myStore?<><div className={panel}><h2 className="font-bold">{myStore.name}</h2><p className="text-sm text-muted-foreground">{myStore.area} · {myStore.status}</p></div><details className={panel+" mt-3"}><summary className="cursor-pointer list-none flex items-center justify-between gap-3 font-semibold"><span>দোকানের প্রোফাইল সম্পাদনা</span><span className="text-xs text-muted-foreground">ঠিকানা · ফোন · ছবি</span></summary><form onSubmit={saveStoreProfile} className="mt-4 grid gap-4 md:grid-cols-2"><label className="block space-y-1 text-sm md:col-span-2">দোকানের নাম * <span className="font-normal text-muted-foreground">(বাংলা অথবা ইংরেজি—যেকোনো একটি)</span><input className={field} required minLength={2} maxLength={80} defaultValue={myStore.name||""} placeholder="আপনার দোকানের নাম লিখুন" onChange={e=>set("store_name",e.target.value)}/></label><label className="block space-y-1 text-sm md:col-span-2">দোকানের লোকেশন / ঠিকানা *<input className={field} required minLength={5} maxLength={300} defaultValue={myStore.area||myStore.address||""} placeholder="যেমন: চকবাজার, চট্টগ্রাম" onChange={e=>set("store_location",e.target.value)}/></label><label className="block space-y-1 text-sm">মোবাইল নম্বর<input className={field} inputMode="numeric" maxLength={11} placeholder="01XXXXXXXXX" defaultValue={myStore.phone||""} onChange={e=>set("store_phone",e.target.value)}/></label><label className="block space-y-1 text-sm">WhatsApp নম্বর (ক্রেতাদের যোগাযোগের জন্য)<input className={field} inputMode="numeric" maxLength={11} placeholder="01XXXXXXXXX" defaultValue={myStore.whatsapp_phone||""} onChange={e=>set("store_whatsapp_phone",e.target.value)}/><span className="text-xs text-muted-foreground">আলাদা নম্বর দিতে পারেন। ফাঁকা রাখলে পণ্যের পেজে WhatsApp বাটন দেখাবে না।</span></label><label className="block space-y-1 text-sm">দোকানের বিবরণ<textarea className={field} rows={3} maxLength={1000} defaultValue={myStore.description||""} onChange={e=>set("store_description",e.target.value)}/></label><div className="space-y-2 rounded-xl border p-3"><div className="flex items-center justify-between"><span className="text-sm font-medium">দোকানের লোগো</span><span className="text-xs text-muted-foreground">JPG / PNG / WebP · ৫ MB</span></div><div className="flex items-center gap-3"><div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-muted">{(storeLogoPreview||myStore.logo_url)?<img src={storeLogoPreview||myStore.logo_url} alt="দোকানের লোগো প্রিভিউ" className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center text-xs text-muted-foreground">লোগো নেই</div>}</div><div className="min-w-0 flex-1"><input ref={storeLogoInputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={e=>{selectStoreImage(e.currentTarget.files?.[0]||null,"logo");e.currentTarget.value="";}}/><button type="button" className={secondary+" text-xs"} onClick={()=>storeLogoInputRef.current?.click()}>ফাইল বেছে নিন</button>{storeLogoFile&&<button type="button" className="ml-2 text-xs text-destructive underline" onClick={()=>{setStoreLogoFile(null);if(storeLogoPreview)URL.revokeObjectURL(storeLogoPreview);setStoreLogoPreview("");}}>নির্বাচিত ছবি বাদ</button>}</div></div><label className="block space-y-1 text-xs text-muted-foreground">অথবা ছবির URL<input className={field} type="url" placeholder="https://..." value={form.store_logo_url??myStore.logo_url??""} onChange={e=>set("store_logo_url",e.target.value)}/></label></div><div className="space-y-2 rounded-xl border p-3"><div className="flex items-center justify-between"><span className="text-sm font-medium">দোকানের কভার / ব্যানার</span><span className="text-xs text-muted-foreground">JPG / PNG / WebP · ৫ MB</span></div><div className="w-full overflow-hidden rounded-lg border bg-muted">{(storeBannerPreview||myStore.banner_url)?<img src={storeBannerPreview||myStore.banner_url} alt="দোকানের ব্যানার প্রিভিউ" className="block h-auto w-full"/>:<div className="grid min-h-28 place-items-center text-xs text-muted-foreground">ব্যানার নেই</div>}</div><p className="text-xs text-muted-foreground">ব্যানারের আসল অনুপাত অনুযায়ী ছবিটি দেখানো হবে—কোনো অংশ কাটা বা পাশে ফাঁকা রাখা হবে না।</p><input ref={storeBannerInputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={e=>{selectStoreImage(e.currentTarget.files?.[0]||null,"banner");e.currentTarget.value="";}}/><button type="button" className={secondary+" text-xs"} onClick={()=>storeBannerInputRef.current?.click()}>ফোন / কম্পিউটার থেকে ছবি বেছে নিন</button>{storeBannerFile&&<button type="button" className="ml-2 text-xs text-destructive underline" onClick={()=>{setStoreBannerFile(null);if(storeBannerPreview)URL.revokeObjectURL(storeBannerPreview);setStoreBannerPreview("");}}>নির্বাচিত ছবি বাদ</button>}<label className="block space-y-1 text-xs text-muted-foreground">অথবা ছবির URL<input className={field} type="url" placeholder="https://..." value={form.store_banner_url??myStore.banner_url??""} onChange={e=>set("store_banner_url",e.target.value)}/></label></div><button disabled={busy} className={primary+" md:col-span-2"}>{busy?"সংরক্ষণ হচ্ছে…":"দোকানের তথ্য সংরক্ষণ করুন"}</button></form></details><details className={panel+" mt-3"}><summary className="cursor-pointer list-none flex items-center justify-between gap-3 font-semibold"><span>বিক্রির সারসংক্ষেপ</span><span className="text-xs text-muted-foreground">রিপোর্ট দেখুন</span></summary><div className="mt-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">বিক্রির সারসংক্ষেপ</h3><span className="text-xs text-muted-foreground">সর্বশেষ ১০০টি অর্ডার আইটেম</span></div><div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">সম্পন্ন বিক্রি</p><p className="mt-1 text-lg font-bold text-primary">{money(deliveredSales)}</p></div><div className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">ডেলিভারি সম্পন্ন অর্ডার</p><p className="mt-1 text-lg font-bold">{deliveredCount.toLocaleString("bn-BD")}</p></div><div className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">বিক্রি হওয়া পিস</p><p className="mt-1 text-lg font-bold">{deliveredUnits.toLocaleString("bn-BD")}</p></div><div className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">অপেক্ষমাণ / চলমান</p><p className="mt-1 text-lg font-bold">{pendingCount.toLocaleString("bn-BD")} / {activeCount.toLocaleString("bn-BD")}</p></div></div>{topProducts.length>0&&<div className="mt-4"><h4 className="text-sm font-semibold">সেরা বিক্রিত পণ্য</h4>{topProducts.map((item:any,index)=><div key={item.title} className="flex items-center justify-between gap-3 border-t py-2 text-sm"><span className="min-w-0 flex-1 truncate">{(index+1).toLocaleString("bn-BD")}. {item.title} · {item.units.toLocaleString("bn-BD")} পিস</span><b>{money(item.revenue)}</b></div>)}</div>}<p className="mt-3 text-xs text-muted-foreground">এখানে কেবল ডেলিভারি সম্পন্ন পণ্যের বিক্রি গণনা করা হয়েছে; পেমেন্ট নিষ্পত্তি বা লাভের হিসাব নয়।</p></div></details><details className={panel+" mt-3"}><summary className="cursor-pointer list-none flex items-center justify-between gap-3 font-semibold"><span>দোকানের অর্ডার</span><span className="text-xs text-muted-foreground">{sellerOrders.length.toLocaleString("bn-BD")}টি আইটেম</span></summary><div className="mt-4">{sellerOrders.length?sellerOrders.map(item=>{const o=item.orders||{};return <div key={item.id} className="mt-3 rounded-xl border p-3"><div className="flex flex-wrap justify-between gap-2"><b>{o.order_no||"অর্ডার"}</b><b>{money(Number(item.unit_price)*Number(item.quantity))}</b></div><p className="mt-1 text-sm">{item.title} × {Number(item.quantity).toLocaleString("bn-BD")}</p><p className="mt-1 text-xs text-muted-foreground">{o.recipient} · {o.phone} · {o.area}</p><p className="mt-1 text-xs text-muted-foreground">{o.address_line}</p><div className="mt-3 flex flex-wrap gap-2"><select aria-label="অর্ডারের অবস্থা" className={field+" max-w-48"} value={item.status} disabled={busy||["delivered","cancelled"].includes(item.status)} onChange={e=>updateSellerOrderStatus(item.id,e.target.value)}>{(item.status==="pending"?["pending","confirmed","cancelled"]:item.status==="confirmed"?["confirmed","shipped","cancelled"]:item.status==="shipped"?["shipped","delivered"]:[item.status]).map((status:string)=><option key={status} value={status}>{({pending:"নতুন অর্ডার",confirmed:"নিশ্চিত",shipped:"পাঠানো হয়েছে",delivered:"ডেলিভারি সম্পন্ন",cancelled:"বাতিল"} as Record<string,string>)[status]}</option>)}</select></div><div className="mt-3 rounded-lg border bg-muted/20 p-3"><p className="text-sm font-medium">কুরিয়ার সার্ভিস</p><div className="mt-2 flex flex-wrap items-center gap-2"><select aria-label="কুরিয়ার নির্বাচন" className={field+" max-w-48"} value={form[`courier_${item.id}`]??item.courier_shipments?.[0]?.provider??""} disabled={busy||!["confirmed","shipped"].includes(item.status)} onChange={e=>set(`courier_${item.id}`,e.target.value)}><option value="">কুরিয়ার বেছে নিন</option><option value="pathao">Pathao</option><option value="steadfast">Steadfast</option></select><button type="button" className={secondary} disabled={busy||!["confirmed","shipped"].includes(item.status)||!((form[`courier_${item.id}`]??item.courier_shipments?.[0]?.provider))} onClick={()=>saveCourierPreference(item.id)}>নির্বাচন সংরক্ষণ</button></div>{item.courier_shipments?.[0]&&<p className="mt-2 text-xs text-muted-foreground">নির্বাচিত: {item.courier_shipments[0].provider==="pathao"?"Pathao":"Steadfast"} · {item.courier_shipments[0].tracking_id?"ট্র্যাকিং: "+item.courier_shipments[0].tracking_id:"এখনো বুকিং হয়নি"}</p>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" className={secondary} onClick={()=>copyCourierOrderDetails(item.id)}>অর্ডারের তথ্য কপি</button><a className={secondary+" inline-flex items-center"} href="https://merchant.pathao.com/" target="_blank" rel="noopener noreferrer">Pathao Merchant Panel ↗</a><a className={secondary+" inline-flex items-center"} href="https://steadfast.com.bd/index.php/login" target="_blank" rel="noopener noreferrer">Steadfast Merchant Panel ↗</a></div>{item.courier_shipments?.[0]&&!item.courier_shipments[0].tracking_id&&<div className="mt-3 flex flex-wrap gap-2"><input aria-label="Courier Tracking ID" className={field+" min-w-0 flex-1"} placeholder="Courier থেকে পাওয়া Tracking ID" value={form[`tracking_${item.id}`]??""} onChange={e=>set(`tracking_${item.id}`,e.target.value)}/><button type="button" className={primary} disabled={busy||!String(form[`tracking_${item.id}`]||"").trim()} onClick={()=>saveManualTrackingId(item.id)}>Tracking ID সংরক্ষণ</button></div>}<p className="mt-2 text-xs text-muted-foreground">এখন বিক্রেতা নিজের Merchant Panel-এ অর্ডার বুক করবেন। তারপর Tracking ID এখানে সংরক্ষণ করবেন। কোনো স্বয়ংক্রিয় বুকিং হচ্ছে না।</p></div></div>}) : <p className="mt-3 text-sm text-muted-foreground">এখনো কোনো অর্ডার আসেনি।</p>}</div></details><details className={panel+" mt-3"}><summary className="cursor-pointer list-none flex items-center justify-between gap-3 font-semibold"><span>আমার পণ্য ও স্টক</span><span className="text-xs text-muted-foreground">{sellerProducts.length.toLocaleString("bn-BD")}টি পণ্য</span></summary><div className="mt-4"><p className="mt-1 text-xs text-muted-foreground">প্রকাশিত পণ্যের পাশে “ছবি যোগ করুন” চাপলে একই পণ্যে আরও ছবি যোগ হবে। সর্বোচ্চ ৮টি ছবি; একবারে একাধিক অথবা ধাপে ধাপে যোগ করা যাবে।</p>{sellerProducts.length?sellerProducts.map(p=><div key={p.id} className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3"><div className="min-w-0 flex-1 space-y-2"><input aria-label={p.title_bn+" নাম"} type="text" minLength={2} maxLength={120} defaultValue={p.title_bn} className="w-full max-w-xs rounded border bg-background p-2 text-sm font-semibold" onBlur={e=>{const title=e.target.value.trim();if(title&&title!==p.title_bn)updateSellerProduct(p.id,{title_bn:title});else if(!title)e.target.value=p.title_bn;}}/><div className="flex flex-wrap items-center gap-2"><label className="text-xs text-muted-foreground">মূল্য <input aria-label={p.title_bn+" মূল্য"} type="number" min="0.01" max="9999999.99" step="0.01" defaultValue={p.price} className="ml-1 w-28 rounded border bg-background p-2 text-sm text-foreground" onBlur={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>0&&n<10000000){if(n!==Number(p.price))updateSellerProduct(p.id,{price:n});}else e.target.value=String(p.price);}}/></label><span className="text-xs text-muted-foreground">{p.status==="active"?"প্রকাশিত":p.status==="hidden"?"লুকানো":"খসড়া"} · ছবি {(p.product_images||[]).length.toLocaleString("bn-BD")}/৮</span></div></div><label className="text-xs">স্টক<input aria-label={p.title_bn+" স্টক"} type="number" min="0" max="100000" defaultValue={p.stock} className="ml-2 w-20 rounded border bg-background p-2" onBlur={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=0&&n<=100000){if(n!==p.stock)updateSellerProduct(p.id,{stock:n});}else e.target.value=String(p.stock);}}/></label><details className="mt-2 w-full rounded-lg border p-3"><summary className="cursor-pointer text-sm font-semibold">সম্পূর্ণ পণ্য সম্পাদনা · বিবরণ, ক্যাটাগরি, মূল্য</summary><form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();const fd=new FormData(e.currentTarget);void updateSellerProduct(p.id,{title_bn:String(fd.get("title_bn")||""),title_en:String(fd.get("title_en")||""),description:String(fd.get("description")||""),category_id:String(fd.get("category_id")||""),price:String(fd.get("price")||""),compare_price:String(fd.get("compare_price")||""),stock:String(fd.get("stock")||"")});}}><label className="text-xs">পণ্যের নাম<input name="title_bn" required minLength={2} maxLength={120} defaultValue={p.title_bn} className={field}/></label><label className="text-xs">English name<input name="title_en" maxLength={120} defaultValue={p.title_en||""} className={field}/></label><SellerCategoryPicker categories={categories} name="category_id" value={p.category_id||""} labelClassName="block space-y-1 text-xs" /><label className="text-xs">বিক্রয় মূল্য (৳)<input name="price" required type="number" min="0.01" max="9999999.99" step="0.01" defaultValue={p.price} className={field}/></label><label className="text-xs">আগের মূল্য (৳)<input name="compare_price" type="number" min="0" max="99999999.99" step="0.01" defaultValue={p.compare_price??""} className={field}/></label><label className="text-xs">স্টক<input name="stock" required type="number" min="0" max="100000" step="1" defaultValue={p.stock} className={field}/></label><label className="text-xs sm:col-span-2">পণ্যের বিস্তারিত বিবরণ<textarea name="description" rows={4} maxLength={3000} defaultValue={p.description||""} className={field}/></label><button type="submit" disabled={busy} className={primary+" sm:col-span-2"}>পরিবর্তন সংরক্ষণ করুন</button></form></details><div className="mt-3 w-full rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm">পণ্যের ছবিসমূহ</b><span className="text-xs text-muted-foreground">প্রথম ছবিই হোমপেজের কভার</span></div><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{(p.product_images||[]).slice().sort((a:any,b:any)=>a.sort_order-b.sort_order).map((image:any,index:number)=><div key={image.id} className="rounded-lg border p-2"><img src={image.url} alt={p.title_bn+" ছবি "+(index+1)} className="aspect-square w-full rounded object-contain bg-muted"/><p className="mt-1 text-xs">{index===0?"মূল ছবি":"ছবি "+(index+1)}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={busy||index===0} className="text-xs text-primary underline disabled:opacity-40" onClick={()=>void setSellerProductMainImage(p.id,image.id)}>মূল ছবি করুন</button><button type="button" disabled={busy||index===((p.product_images||[]).length-1)} className="text-xs underline" onClick={()=>void reorderSellerProductImages(p.id,image.id,1)}>পরে</button><button type="button" disabled={busy||(p.product_images||[]).length<=1} className="text-xs text-destructive underline" onClick={()=>void removeSellerProductImage(p.id,image)}>মুছুন</button></div></div>)}</div><p className="mt-2 text-xs text-muted-foreground">সর্বোচ্চ ৮টি ছবি। প্রথম ছবিটি পণ্যের প্রধান ছবি এবং হোমপেজ/পণ্যের তালিকার কভার হিসেবে ব্যবহৃত হবে।</p></div><label className={secondary+" cursor-pointer text-xs"}>ছবি যোগ করুন<input type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="sr-only" disabled={busy} onChange={e=>{const files=Array.from(e.currentTarget.files||[]);e.currentTarget.value="";if(files.length)void addSellerProductImages(p.id,files);}}/></label><button disabled={busy} className={secondary+" text-xs"} onClick={()=>updateSellerProduct(p.id,{status:p.status==="active"?"hidden":"active"})}>{p.status==="active"?"লুকান":"প্রকাশ করুন"}</button></div>):<p className="mt-2 text-sm text-muted-foreground">এখনো কোনো পণ্য যোগ করা হয়নি।</p>}</div></details><details className={panel+" mt-3 max-w-3xl"}><summary className="cursor-pointer list-none font-semibold">নতুন পণ্য যোগ করুন</summary><form onSubmit={submitProduct} className="mt-4 space-y-4"><div><h3 className="text-lg font-bold">পণ্যের তথ্য পূরণ করুন</h3><p className="mt-1 text-sm text-muted-foreground">সহজে তথ্য দিন—তারপর পণ্যটি ALLIFY বাজারে প্রকাশ হবে। (*) চিহ্নিত ঘরগুলো পূরণ করুন।</p></div><section className="space-y-3"><h4 className="font-semibold">১. পণ্যের পরিচিতি</h4><label className="block space-y-1 text-sm font-medium">পণ্যের নাম *<input required minLength={2} maxLength={120} className={field} placeholder="যেমন: মেয়েদের কটন থ্রি-পিস" value={form.title_bn||""} onChange={e=>set("title_bn",e.target.value)}/></label><SellerCategoryPicker categories={categories} value={form.category_id||""} onChange={value=>set("category_id",value)} /><label className="block space-y-1 text-sm font-medium">পণ্যের বিবরণ<textarea maxLength={3000} rows={4} className={field} placeholder="রং, উপাদান, সাইজ, ব্যবহার ও পণ্যের বিশেষ তথ্য লিখুন।" value={form.description||""} onChange={e=>set("description",e.target.value)}/><span className="text-xs font-normal text-muted-foreground">সর্বোচ্চ ৩০০০ অক্ষর। সহজ ও সত্য তথ্য লিখুন।</span></label><label className="block space-y-1 text-sm font-medium">English name (ঐচ্ছিক)<input maxLength={120} className={field} placeholder="Product name in English" value={form.title_en||""} onChange={e=>set("title_en",e.target.value)}/></label></section><section className="space-y-3 rounded-xl border p-3"><h4 className="font-semibold">২. পণ্যের ছবি *</h4><p className="text-sm text-muted-foreground">একসঙ্গে একাধিক ছবি নির্বাচন করুন। সর্বোচ্চ ৮টি ছবি; প্রতিটি JPG, PNG বা WebP এবং সর্বোচ্চ ৫ MB। প্রথম ছবিটি মূল ছবি হিসেবে দেখানো হবে।</p><input ref={productImageInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="sr-only" aria-label="একাধিক পণ্যের ছবি নির্বাচন" onChange={e=>{const files=Array.from(e.currentTarget.files||[]);e.currentTarget.value="";if(!files.length)return;for(const file of files){const validation=validateSellerProductImage(file);if(!validation.ok){setError(file.name+": "+validation.error);return;}}const next=[...productImages,...files.filter(file=>!productImages.some(existing=>existing.name===file.name&&existing.size===file.size&&existing.lastModified===file.lastModified))];if(next.length>8){setError("একটি পণ্যে সর্বোচ্চ ৮টি ছবি যোগ করা যাবে।");return;}setProductImages(next);setError("");}}/><div className="flex flex-wrap items-center gap-3"><button type="button" className={secondary} onClick={()=>productImageInputRef.current?.click()}>গ্যালারি থেকে ছবি বেছে নিন</button>{productImages.length>0&&<button type="button" className="text-sm text-destructive underline" onClick={()=>setProductImages([])}>সব ছবি বাদ দিন</button>}<span className="text-xs text-muted-foreground">{productImages.length.toLocaleString("bn-BD")}/৮টি ছবি নির্বাচিত</span></div>{productImages.length>0&&<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{productImages.map((file,index)=><div key={file.name+"-"+file.lastModified+"-"+index} className="overflow-hidden rounded-lg border bg-muted p-2"><div className="relative aspect-square overflow-hidden rounded-md bg-background"><img src={productImagePreviews[index]} alt={"পণ্যের ছবি "+(index+1)} className="h-full w-full object-contain"/>{index===0&&<span className="absolute bottom-1 left-1 rounded bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">মূল ছবি</span>}</div><p className="mt-1 truncate text-xs" title={file.name}>{file.name}</p><p className="text-[11px] text-muted-foreground">{(file.size/1024/1024).toFixed(2)} MB</p><div className="mt-2 flex flex-wrap gap-2">{index>0&&<button type="button" className="text-xs text-primary underline" onClick={()=>setProductImages(current=>[current[index],...current.filter((_,i)=>i!==index)])}>মূল ছবি করুন</button>}<button type="button" className="text-xs text-destructive underline" onClick={()=>setProductImages(current=>current.filter((_,i)=>i!==index))}>বাদ দিন</button></div></div>)}</div>}<label className="block space-y-1 text-xs text-muted-foreground">ছবির URL (ঐচ্ছিক বিকল্প; গ্যালারির ছবি না দিলে ব্যবহার করুন)<input type="url" className={field} placeholder="https://..." value={form.image_url||""} onChange={e=>set("image_url",e.target.value)}/></label></section><section className="space-y-3"><h4 className="font-semibold">৩. মূল্য ও স্টক</h4><label className="block space-y-1 text-sm font-medium">বিক্রয় মূল্য (৳) *<input required type="text" inputMode="decimal" pattern="[0-9০-৯٠-٩]+([.٫][0-9০-৯٠-٩]{1,2})?" className={field} placeholder="যেমন: ৮৫০" value={form.price||""} onChange={e=>set("price",e.target.value)}/></label><label className="block space-y-1 text-sm font-medium">আগের মূল্য (৳) — ঐচ্ছিক<input type="text" inputMode="decimal" pattern="[0-9০-৯٠-٩]+([.٫][0-9০-৯٠-٩]{1,2})?" className={field} placeholder="ডিসকাউন্ট দেখাতে চাইলে লিখুন" value={form.compare_price||""} onChange={e=>set("compare_price",e.target.value)}/></label><label className="block space-y-1 text-sm font-medium">স্টকে কতটি আছে? *<input required type="text" inputMode="numeric" pattern="[0-9০-৯٠-٩]+" className={field} placeholder="যেমন: ১০" value={form.stock||""} onChange={e=>set("stock",e.target.value)}/></label></section><button type="submit" disabled={busy} className={primary+" w-full"}>{busy?"পণ্য যোগ হচ্ছে…":"পণ্য প্রকাশ করুন"}</button></form></details></>:<div className={panel}>বিক্রেতা ড্যাশবোর্ড ব্যবহারের জন্য অনুমোদিত বিক্রেতা অ্যাকাউন্ট প্রয়োজন। <Link to={"/seller" as any} className={linkClass}>বিক্রেতা আবেদন করুন</Link></div>);
  } else if (page === "account") {
    const pendingApplication = role === "admin" ? undefined : applications.find(application => application.status === "pending");
    body = shell("আমার অ্যাকাউন্ট",user?<><div className={panel}><p>{user.email}</p><p className="mt-1 text-sm text-muted-foreground">একই অ্যাকাউন্টে ক্রেতা হিসেবে কেনাকাটা সবসময় করা যাবে। {myStore?(role==="admin"?"অ্যাডমিন ও বিক্রেতা—দুই সুবিধাই চালু আছে।":"বিক্রেতা সুবিধাও চালু আছে।"):role==="admin"?"অ্যাডমিন সুবিধা চালু আছে।":"বিক্রেতা হতে চাইলে এখান থেকেই আবেদন করতে পারবে।"}</p><div className="mt-3 flex flex-wrap gap-2"><Link to={"/market" as any} className={primary}>ক্রেতা হিসেবে কেনাকাটা</Link><Link to={"/wishlist" as any} className={secondary}>পছন্দের তালিকা ({wishlistIds.length.toLocaleString("bn-BD")})</Link>{myStore&&<Link to={"/seller-dashboard" as any} className={secondary}>বিক্রেতা ড্যাশবোর্ড</Link>}{myStore?.slug&&<Link to={"/store" as any} search={{slug:myStore.slug} as any} className={secondary}>আমার দোকান দেখুন</Link>}{role==="admin"&&<Link to={"/admin" as any} className={secondary}>অ্যাডমিন প্যানেল</Link>}{role!=="seller"&&role!=="admin"&&pendingApplication&&<span className="rounded-lg border px-3 py-2 text-sm">বিক্রেতা আবেদন: পর্যালোচনাধীন</span>}{!myStore&&role!=="admin"&&!pendingApplication&&<Link to={"/seller" as any} className={secondary}>বিক্রেতা হতে আবেদন</Link>}<button className={secondary} onClick={signOut}>লগআউট</button></div>{pendingApplication&&<p className="mt-3 text-sm text-muted-foreground">দোকান: {pendingApplication.store_name} · অ্যাডমিন অনুমোদনের অপেক্ষায়। একই অ্যাকাউন্টই ব্যবহার হবে; নতুন করে রেজিস্ট্রেশন বা Login লাগবে না।</p>}</div><h2 className="mb-3 mt-6 font-bold">আমার অর্ডার</h2>{orders.length?orders.map(o=><div key={o.id} className={panel+" mb-3"}><div className="flex justify-between gap-2"><b>{o.order_no}</b><span className="text-sm">{({pending:"নতুন অর্ডার",confirmed:"নিশ্চিত",shipped:"পাঠানো হয়েছে",delivered:"ডেলিভারি সম্পন্ন",cancelled:"বাতিল"} as Record<string,string>)[o.status]||"অবস্থা অজানা"}</span></div><p className="mt-1 text-sm">মোট: {money(o.total)} · {o.area}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("bn-BD")}</p>{(o.order_items||[]).map((item:any)=><div key={item.id} className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t pt-2 text-xs"><span>{item.title} × {Number(item.quantity).toLocaleString("bn-BD")}</span><span className="flex items-center gap-2">{item.status==="pending"?"নতুন অর্ডার":item.status==="confirmed"?"নিশ্চিত":item.status==="shipped"?"পাঠানো হয়েছে":item.status==="delivered"?"ডেলিভারি সম্পন্ন":"বাতিল"}{item.status==="pending"&&!o.is_demo&&<button type="button" disabled={busy} className={secondary+" px-2 py-1 text-xs"} onClick={()=>cancelBuyerOrderItem(item.id,o.id)}>অর্ডার বাতিল</button>}</span></div>)}</div>):<p className={panel}>এখনো কোনো অর্ডার নেই।</p>}</>:<div className={panel}>অ্যাকাউন্ট দেখতে <Link to={"/login" as any} className={linkClass}>লগইন</Link> করুন।</div>);
  } else if (page === "admin") {
    const pendingApplications = applications.filter(a => a.status === "pending").length;
    const pendingOrders = adminOrders.filter(o => (o.order_items || []).some((item:any) => item.status === "pending")).length;
    const filteredAdminOrders = adminOrders.filter(o => {
      const q = adminOrderSearch.trim().toLowerCase();
      const matchesSearch = !q || [o.order_no,o.recipient,o.phone,o.area,...(o.order_items || []).map((item:any)=>item.title)].some(value => String(value || "").toLowerCase().includes(q));
      const matchesStatus = adminOrderStatus === "all" || o.status === adminOrderStatus || (o.order_items || []).some((item:any)=>item.status === adminOrderStatus);
      return matchesSearch && matchesStatus;
    });
    body = shell("অ্যাডমিন প্যানেল", role === "admin" ? (
      <div className="min-w-0 space-y-5">
        <section className="rounded-2xl border bg-[#123b32] p-3 text-white shadow-sm sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[10px] font-semibold tracking-[0.2em] text-white/60">ALLIFY ADMIN</p><p className="mt-1 text-base font-bold">ম্যানেজমেন্ট</p></div>
            <Link to={"/market" as any} className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10">ওয়েবসাইট দেখুন ↗</Link>
          </div>
          <nav aria-label="অ্যাডমিন মেনু" className="mt-3 flex flex-nowrap gap-2 overflow-x-auto border-t border-white/15 pt-3 pb-1">
            <a href="#admin-overview" className="rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/20">⌂ ওভারভিউ</a>
            <a href="#admin-orders" className="shrink-0 rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/10">▣ অর্ডার</a>
            <a href="#admin-stores" className="shrink-0 rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/10">🏪 দোকান</a>
            <a href="#admin-applications" className="shrink-0 rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/10">♙ আবেদন</a>
            <a href="#admin-products" className="shrink-0 rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/10">▧ পণ্য</a>
            <a href="#admin-catalog" className="shrink-0 rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/10">▦ ক্যাটাগরি</a>
          </nav>
        </section>

        <main className="min-w-0 space-y-5">
          <section id="admin-overview" className="scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-semibold tracking-wide text-muted-foreground">ALLIFY CONTROL CENTER</p><h2 className="mt-1 text-2xl font-bold tracking-tight">ড্যাশবোর্ড</h2><p className="mt-1 text-sm text-muted-foreground">আজকের গুরুত্বপূর্ণ কাজ ও মার্কেটপ্লেসের অবস্থা এক নজরে দেখুন।</p></div>
              <Link to={"/market" as any} className={secondary+" text-xs"}>মার্কেটপ্লেস দেখুন ↗</Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">মোট অর্ডার</p><p className="mt-2 text-2xl font-bold tabular-nums">{adminStats.totalOrders.toLocaleString("bn-BD")}</p><p className="mt-1 text-[11px] text-muted-foreground">সব সময়ের অর্ডার</p></div>
              <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">সম্পন্ন অর্ডার</p><p className="mt-2 text-2xl font-bold tabular-nums">{adminStats.completedOrders.toLocaleString("bn-BD")}</p><p className="mt-1 text-[11px] text-muted-foreground">ডেলিভারি সম্পন্ন</p></div>
              <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">সম্পন্ন বিক্রির পরিমাণ</p><p className="mt-2 text-xl font-bold tabular-nums">{money(adminStats.completedSales)}</p><p className="mt-1 text-[11px] text-muted-foreground">শুধু delivered অর্ডার</p></div>
              <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">সক্রিয় দোকান</p><p className="mt-2 text-2xl font-bold tabular-nums">{adminStats.activeStores.toLocaleString("bn-BD")}</p><p className="mt-1 text-[11px] text-muted-foreground">অনুমোদিত দোকান</p></div>
              <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">মোট পণ্য</p><p className="mt-2 text-2xl font-bold tabular-nums">{adminStats.totalProducts.toLocaleString("bn-BD")}</p><p className="mt-1 text-[11px] text-muted-foreground">সব পণ্য</p></div>
              <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">নতুন অর্ডার</p><p className="mt-2 text-2xl font-bold tabular-nums">{pendingOrders.toLocaleString("bn-BD")}</p><p className="mt-1 text-[11px] text-muted-foreground">সাম্প্রতিক তালিকায়</p></div>
              <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">অপেক্ষমাণ আবেদন</p><p className="mt-2 text-2xl font-bold tabular-nums">{pendingApplications.toLocaleString("bn-BD")}</p><p className="mt-1 text-[11px] text-muted-foreground">যাচাই প্রয়োজন</p></div>
            </div>
            <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">বিক্রির পরিমাণে শুধু ডেলিভারি সম্পন্ন অর্ডার ধরা হয়েছে; এটি ALLIFY-এর কমিশন বা লাভ নয়।</p>
          </section>

          <section id="admin-orders" className="scroll-mt-24 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-lg font-bold">অর্ডার ম্যানেজমেন্ট</h3><p className="text-xs text-muted-foreground">নতুন অর্ডার আগে দেখুন এবং প্রয়োজনমতো স্ট্যাটাস আপডেট করুন।</p></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{adminOrders.length.toLocaleString("bn-BD")}টি অর্ডার</span></div>
            <div className="grid gap-2 sm:grid-cols-[1fr_190px]">
              <input aria-label="অর্ডার খুঁজুন" className={field} placeholder="অর্ডার নম্বর, ক্রেতা বা ফোন দিয়ে খুঁজুন" value={adminOrderSearch} onChange={e=>setAdminOrderSearch(e.target.value)} />
              <select aria-label="অর্ডারের অবস্থা ফিল্টার" className={field} value={adminOrderStatus} onChange={e=>setAdminOrderStatus(e.target.value)}>
                <option value="all">সব অবস্থা</option><option value="pending">নতুন</option><option value="confirmed">নিশ্চিত</option><option value="shipped">পাঠানো</option><option value="delivered">সম্পন্ন</option><option value="cancelled">বাতিল</option>
              </select>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card">
              {filteredAdminOrders.length ? <div className="divide-y">{filteredAdminOrders.map(o => (
                <article key={o.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b className="text-sm">{o.order_no}</b>{o.is_demo&&<span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800">নমুনা</span>}</div><p className="mt-1 text-xs text-muted-foreground">{o.recipient} · {o.phone}</p><p className="text-xs text-muted-foreground">{o.area}</p></div>
                    <div className="text-right"><b className="text-sm">{money(Number(o.total))}</b><p className="mt-1 text-[11px] text-muted-foreground">{o.status}</p></div>
                  </div>
                  <div className="mt-3 space-y-2">{(o.order_items||[]).map((item:any) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-xs">
                      <span className="min-w-0 flex-1">{item.title} × {Number(item.quantity).toLocaleString("bn-BD")} · {money(Number(item.unit_price)*Number(item.quantity))}</span>
                      <select aria-label="অর্ডারের অবস্থা" className="max-w-full rounded-lg border bg-background px-2 py-2 text-xs" value={item.status} disabled={busy||o.is_demo||["delivered","cancelled"].includes(item.status)} onChange={e=>updateAdminOrderItemStatus(item.id,o.id,e.target.value)}>{(item.status==="pending"?["pending","confirmed","cancelled"]:item.status==="confirmed"?["confirmed","shipped","cancelled"]:item.status==="shipped"?["shipped","delivered"]:[item.status]).map((status:string)=><option key={status} value={status}>{({pending:"নতুন",confirmed:"নিশ্চিত",shipped:"পাঠানো",delivered:"সম্পন্ন",cancelled:"বাতিল"} as Record<string,string>)[status]}</option>)}</select>
                    </div>
                  ))}</div>
                </article>
              ))}</div> : <p className="p-6 text-center text-sm text-muted-foreground">এখনো কোনো অর্ডার পাওয়া যায়নি।</p>}
            </div>
            <p className="text-[11px] text-muted-foreground">সাম্প্রতিক ১০০টি অর্ডার দেখানো হচ্ছে। ড্যাশবোর্ডের মোট অর্ডার ও সম্পন্ন বিক্রির হিসাব সম্পূর্ণ ডাটাবেস থেকে গণনা করা।</p>
          </section>

          <section id="admin-stores" className="scroll-mt-24 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-lg font-bold">দোকান ও বিক্রেতা</h3><p className="text-xs text-muted-foreground">মার্কেটপ্লেসে যুক্ত দোকানগুলোর অবস্থা দেখুন।</p></div><span className="text-xs text-muted-foreground">{adminStats.activeStores.toLocaleString("bn-BD")}টি সক্রিয়</span></div>
            <div className="overflow-hidden rounded-xl border bg-card">
              {adminStores.length ? <div className="divide-y">{adminStores.map(store => <div key={store.id} className="flex items-center gap-3 p-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-xl">🏪</span>
                <div className="min-w-0 flex-1"><b className="block truncate text-sm">{store.name}</b><p className="mt-0.5 text-xs text-muted-foreground">{store.area || "এলাকা উল্লেখ নেই"}</p></div>
                <div className="flex shrink-0 flex-col items-end gap-2"><span className={"rounded-full px-2.5 py-1 text-[10px] font-semibold "+(store.status==="active"?"bg-emerald-50 text-emerald-800":store.status==="pending"?"bg-amber-50 text-amber-800":"bg-muted text-muted-foreground")}>{store.status==="active"?"সক্রিয়":store.status==="pending"?"অপেক্ষমাণ":"বন্ধ"}</span><button type="button" disabled={busy||store.is_demo||store.status==="pending"} className={secondary+" px-3 py-2 text-xs"} onClick={()=>updateAdminStoreStatus(store.id,store.status==="active"?"suspended":"active")}>{store.status==="active"?"দোকান বন্ধ করুন":store.status==="suspended"?"আবার চালু করুন":"অপেক্ষমাণ"}</button><button type="button" disabled={busy||store.is_demo} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50" onClick={()=>removeAdminStore(store.id)}>রিমুভ করুন</button></div>
              </div>)}</div> : <p className="p-6 text-center text-sm text-muted-foreground">এখনো কোনো দোকান পাওয়া যায়নি।</p>}
            </div>
          </section>

          <section id="admin-applications" className="scroll-mt-24 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-lg font-bold">বিক্রেতা আবেদন</h3><p className="text-xs text-muted-foreground">নতুন দোকানের আবেদন যাচাই ও সিদ্ধান্ত নিন।</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">{pendingApplications.toLocaleString("bn-BD")} অপেক্ষমাণ</span></div>
            {applications.length ? <div className="grid gap-3 xl:grid-cols-2">{applications.map(a => (
              <article className="rounded-xl border bg-card p-4" key={a.id}>
                <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><b className="block truncate text-sm">{a.store_name}</b><p className="mt-1 text-xs text-muted-foreground">{a.owner_name} · {a.phone}</p><p className="text-xs text-muted-foreground">{a.area}</p></div><span className={"shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium "+(a.status==="pending"?"bg-amber-50 text-amber-800":a.status==="approved"?"bg-emerald-50 text-emerald-800":"bg-muted text-muted-foreground")}>{a.status==="pending"?"অপেক্ষমাণ":a.status==="approved"?"অনুমোদিত":"বাতিল"}</span></div>
                {!a.user_id&&<p className="mt-2 text-[11px] text-amber-700">নমুনা আবেদন</p>}
                {a.status==="pending"&&<div className="mt-3 flex flex-wrap gap-2 border-t pt-3">{a.user_id&&<button disabled={busy} className={primary} onClick={()=>reviewApplication(a.id,true)}>অনুমোদন করুন</button>}<button disabled={busy} className={secondary} onClick={()=>reviewApplication(a.id,false)}>বাতিল করুন</button></div>}
              </article>
            ))}</div> : <div className={panel+" text-center text-sm text-muted-foreground"}>এখনো কোনো বিক্রেতা আবেদন জমা পড়েনি।</div>}
          </section>

          <section id="admin-products" className="scroll-mt-24 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-lg font-bold">পণ্য নিয়ন্ত্রণ</h3><p className="text-xs text-muted-foreground">পণ্যের প্রকাশনা ও স্টক এক নজরে দেখুন।</p></div><span className="text-xs text-muted-foreground">মোট {adminProducts.length.toLocaleString("bn-BD")}টি</span></div>
            <div className="overflow-hidden rounded-xl border bg-card">
              {adminProducts.length ? <div className="divide-y">{adminProducts.map(p => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 p-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">▧</div>
                  <div className="min-w-0 flex-1"><b className="block truncate text-sm">{p.title_bn}</b><p className="mt-0.5 text-xs text-muted-foreground">{p.seller_stores?.name||"দোকান"} · {money(Number(p.price))} · স্টক {Number(p.stock).toLocaleString("bn-BD")}</p>{p.seller_stores?.is_demo&&<span className="text-[10px] text-amber-700">নমুনা পণ্য</span>}</div>
                  <span className={"rounded-full px-2.5 py-1 text-[11px] font-medium "+(p.status==="active"?"bg-emerald-50 text-emerald-800":"bg-muted text-muted-foreground")}>{p.status==="active"?"প্রকাশিত":"লুকানো"}</span>
                  <button disabled={busy||p.seller_stores?.is_demo} className={secondary+" px-3 py-2 text-xs"} onClick={()=>updateAdminProduct(p.id,p.status==="active"?"hidden":"active")}>{p.status==="active"?"লুকান":"প্রকাশ করুন"}</button>
                </div>
              ))}</div> : <p className="p-6 text-center text-sm text-muted-foreground">কোনো পণ্য পাওয়া যায়নি।</p>}
            </div>
          </section>

          <section id="admin-catalog" className="scroll-mt-24 space-y-3">
            <div><h3 className="text-lg font-bold">ক্যাটাগরি ও ক্যাটালগ</h3><p className="text-xs text-muted-foreground">মার্কেটপ্লেসের পণ্যের বিভাগ পরিচালনা করুন।</p></div>
            <div className="rounded-xl border bg-card p-4"><AdminCatalogControls /></div>
          </section>
          <p className="pb-2 text-center text-[11px] text-muted-foreground">অ্যাডমিনের কাজ ও তথ্য ডাটাবেসের অনুমতি অনুযায়ী নিয়ন্ত্রিত।</p>
        </main>
      </div>
    ) : <div className={panel}>এই পৃষ্ঠাটি শুধু অনুমোদিত অ্যাডমিনদের জন্য।</div>);
  } else {
    body = shell("পৃষ্ঠাটি পাওয়া যায়নি",<div className={panel}>এই পৃষ্ঠাটি এখনো তৈরি হয়নি। <Link to={"/market" as any} className={linkClass}>বাজারে ফিরে যান</Link></div>);
  }

  return <div className={"min-h-screen bg-background text-foreground "+(page==="product"?"pb-32 sm:pb-0":"pb-20 sm:pb-0")}><header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur"><div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3"><Link to="/" className="shrink-0 font-black tracking-wide leading-none" style={{color:"#123b32",fontSize:25}}>ALLI<span style={{color:"#9bbd31"}}>F</span>Y<span className="mt-1 block text-[9px] font-medium tracking-[.18em]" style={{color:"#687571"}}>YOUR LOCAL MARKETPLACE</span></Link><Link to={"/seller" as any} className="ml-auto rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground sm:hidden">বিক্রেতা হোন</Link><nav className="ml-auto hidden flex-wrap items-center gap-3 text-sm sm:flex"><Link to={"/market" as any}>সব পণ্য</Link><Link to={"/seller" as any}>বিক্রেতা হোন</Link><Link to={"/account" as any}>অ্যাকাউন্ট</Link><Link to={"/wishlist" as any}>পছন্দের তালিকা</Link><Link to={"/cart" as any}>কার্ট ({cart.reduce((n,x)=>n+x.quantity,0).toLocaleString("bn-BD")})</Link></nav></div></header>{body}<footer className="mt-10 border-t bg-card px-4 py-6 text-center text-xs text-muted-foreground"><span className="font-black tracking-wide" style={{color:"#123b32"}}>ALLI<span style={{color:"#9bbd31"}}>F</span>Y</span> · চট্টগ্রাম জেলা · ক্যাশ অন ডেলিভারি · বিক্রেতা নিবন্ধন বিনামূল্যে</footer><nav aria-label="মোবাইল নেভিগেশন" className={"fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden "+(page==="product"?"hidden":"")}><Link to={"/market" as any} className={"flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] "+(page==="market"||page==="search"||page==="category"||page==="product"?"font-bold text-primary":"text-muted-foreground")}><span aria-hidden="true" className="text-lg leading-5">⌂</span><span>হোম</span></Link><Link to={"/category" as any} className={"flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] "+(page==="category"?"font-bold text-primary":"text-muted-foreground")}><span aria-hidden="true" className="text-lg leading-5">▦</span><span>ক্যাটাগরি</span></Link><Link to={"/cart" as any} className={"relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] "+(page==="cart"?"font-bold text-primary":"text-muted-foreground")}><span aria-hidden="true" className="text-lg leading-5">🛒</span><span>কার্ট ({cart.reduce((n,x)=>n+x.quantity,0).toLocaleString("bn-BD")})</span></Link><Link to={"/account" as any} className={"flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] "+(page==="account"||page==="login"?"font-bold text-primary":"text-muted-foreground")}><span aria-hidden="true" className="text-lg leading-5">♙</span><span>অ্যাকাউন্ট</span></Link></nav>{page==="product"&&selected&&<div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e5ece8] bg-white/95 px-2.5 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)] shadow-[0_-10px_34px_rgba(15,45,35,0.13)] backdrop-blur-xl sm:hidden"><div className="mx-auto grid max-w-xl grid-cols-4 items-stretch gap-1.5">
{selected.seller_stores?.slug?<Link to={"/store" as any} search={{slug:selected.seller_stores.slug} as any} aria-label="দোকান দেখুন" className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-md border border-[#dce7e1] bg-[#f5f8f6] px-1 text-[10px] font-bold text-[#244b3b] transition active:scale-[0.97]"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v10h14V10M9 20v-6h6v6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></svg><span>দোকান</span></Link>:<span aria-disabled="true" className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-md border border-[#dce7e1] bg-[#f5f8f6] px-1 text-[10px] font-bold text-[#244b3b] opacity-45"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v10h14V10"/></svg><span>দোকান</span></span>}
<a aria-label="WhatsApp-এ বিক্রেতাকে মেসেজ করুন" href={selected.seller_stores?.whatsapp_phone&&!selected.seller_stores?.is_demo?"https://wa.me/"+selected.seller_stores.whatsapp_phone.replace(/\D/g,"").replace(/^0/,"880")+"?text="+encodeURIComponent("আসসালামু আলাইকুম, ALLIFY-তে "+selected.title_bn+" পণ্যটি দেখেছি। এ সম্পর্কে জানতে চাই।"):undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!selected.seller_stores?.whatsapp_phone||!!selected.seller_stores?.is_demo} className={"flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-md border border-[#b8dfc6] bg-[#effaf2] px-1 text-[10px] font-bold text-[#137a43] shadow-[0_2px_7px_rgba(20,120,65,0.06)] transition active:scale-[0.97] "+(!selected.seller_stores?.whatsapp_phone||!!selected.seller_stores?.is_demo?"pointer-events-none opacity-45":"")}><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12.04 2a9.85 9.85 0 0 0-8.46 14.9L2.2 22l5.25-1.37A9.9 9.9 0 1 0 12.04 2Zm0 17.9a8.02 8.02 0 0 1-4.08-1.12l-.29-.17-3.11.81.83-3.03-.19-.31A8.04 8.04 0 1 1 12.04 19.9Zm4.42-6.02c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.46-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.15 1.51.09.46-.07 1.43-.58 1.63-1.14.2-.56.14-1.04.08-1.14-.06-.1-.22-.16-.46-.28Z"/></svg><span>মেসেজ</span></a>
<button type="button" disabled={!selected.stock||!!selected.seller_stores?.is_demo} onClick={()=>addToCart(selected)} className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-md border-2 border-[#f28b24] bg-white px-1 text-[10px] font-extrabold text-[#bd650e] shadow-[0_2px_7px_rgba(242,139,36,0.08)] transition hover:bg-[#fff8ef] active:scale-[0.97] disabled:opacity-45"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="19" cy="20" r="1"/></svg><span>কার্টে যোগ</span></button>
<button type="button" disabled={!selected.stock||!!selected.seller_stores?.is_demo} onClick={()=>buyNow(selected)} className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-md bg-[#f07820] px-1 text-[10px] font-extrabold text-white shadow-[0_4px_10px_rgba(240,120,32,0.22)] transition hover:bg-[#df6815] active:scale-[0.97] disabled:opacity-45"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg><span>অর্ডার করুন</span></button>
</div></div>};
}
