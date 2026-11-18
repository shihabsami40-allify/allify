import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';
export type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Product = Row<'products'> & { product_images: {url:string}[]; seller_stores: (Pick<Row<'seller_stores'>,'name'|'slug'|'is_demo'|'area'|'address'> & Partial<Pick<Row<'seller_stores'>,'status'>>) | null };
export type PublicStore = Pick<Row<'seller_stores'>,'id'|'name'|'name_en'|'slug'|'description'|'area'|'address'|'rating'|'is_demo'|'logo_url'|'banner_url'|'created_at'|'status'>;
export type Catalog = { products: Product[]; categories: Row<'categories'>[]; stores: PublicStore[]; areas: Row<'delivery_areas'>[]; unavailable?: boolean };
export type CartLine = {id:string; quantity:number};
export const money = (n:number) => '৳'+Number(n).toLocaleString('bn-BD');
export const deliverySchema = z.object({ recipient:z.string().trim().min(2).max(100), phone:z.string().regex(/^01[3-9][0-9]{8}$/), area:z.string().trim().min(2).max(60), address:z.string().trim().min(5).max(300), note:z.string().max(500).default('') });
export function safeImageUrl(value:string) {
 if(value==='' || value==='/images/products/placeholder.svg') return true;
 if(value.startsWith('/')) return false;
 try { const url=new URL(value); const host=url.hostname.toLowerCase(); return url.protocol==='https:' && !url.username && !url.password && !url.port && host.includes('.') && !host.endsWith('.local') && !host.endsWith('.localhost') && !host.endsWith('.internal') && !/^[\d.]+$/.test(host) && !host.includes(':'); } catch { return false; }
}
export function productImageStoragePath(value:string, publicBaseUrl:string, ownerId:string, storeId:string):string|null {
 try {
  const base=new URL(publicBaseUrl); const url=new URL(value);
  if(url.origin!==base.origin || !base.pathname.endsWith('/') || !url.pathname.startsWith(base.pathname)) return null;
  const path=decodeURIComponent(url.pathname.slice(base.pathname.length)); const parts=path.split('/'); const filename=parts[2];
  if(parts.length!==3 || parts[0]!==ownerId || parts[1]!==storeId || !filename || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(filename)) return null;
  return path;
 } catch { return null; }
}
export const categorySchema=z.object({id:z.string().uuid().optional(),name_bn:z.string().trim().min(2).max(80),name_en:z.string().trim().min(2).max(80),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),sort_order:z.coerce.number().int().min(0).max(1000)});
export const productSchema = z.object({id:z.string().uuid().optional(), store_id:z.string().uuid(), title_bn:z.string().trim().min(2).max(120), title_en:z.string().max(120).default(''), description:z.string().max(3000).default(''), price:z.coerce.number().positive().max(9999999), stock:z.coerce.number().int().min(0).max(100000), category_id:z.string().uuid(), status:z.enum(['active','draft','hidden']), image:z.string().refine(safeImageUrl,'Use a secure public image URL') });
export const applicationSchema = z.object({store_name:z.string().trim().min(2).max(80),owner_name:z.string().trim().min(2).max(100),phone:z.string().regex(/^01[3-9][0-9]{8}$/),area:z.string().trim().min(2).max(60),address:z.string().trim().min(5).max(300),description:z.string().max(1000).default('')});
export const transitions = {pending:['confirmed','cancelled'],confirmed:['shipped','cancelled'],shipped:['delivered'],delivered:[],cancelled:[]} as const;
export type Status = keyof typeof transitions;
export const statusName:Record<Status,string> = {pending:'অপেক্ষমাণ',confirmed:'নিশ্চিত',shipped:'পথে আছে',delivered:'ডেলিভারি সম্পন্ন',cancelled:'বাতিল'};
export function checkoutErrorMessage(error:unknown) {
 const message=error instanceof Error?error.message:typeof error==='object'&&error!==null&&'message' in error&&typeof error.message==='string'?error.message:'';
 if(message.includes('Please sign in')) return 'অর্ডার করতে আবার লগইন করুন।';
 if(message.includes('Cart is empty')||message.includes('Invalid quantity')) return 'আপনার বাজারের ব্যাগে পণ্যের পরিমাণ যাচাই করে আবার চেষ্টা করুন।';
 if(message.includes('Invalid name')||message.includes('Invalid phone number')||message.includes('Invalid address')||message.includes('Note too long')) return 'নাম, মোবাইল নম্বর ও ঠিকানা সঠিকভাবে পূরণ করুন।';
 if(message.includes('Delivery not available')) return 'নির্বাচিত এলাকায় এখন ডেলিভারি দেওয়া যাচ্ছে না। অন্য এলাকা নির্বাচন করুন।';
 if(message.includes('A product is no longer available')) return 'আপনার ব্যাগের একটি পণ্য আর পাওয়া যাচ্ছে না। ব্যাগে ফিরে পণ্যটি সরিয়ে আবার চেষ্টা করুন।';
 if(message.includes('Not enough stock')) return 'একটি পণ্যের পর্যাপ্ত স্টক নেই। পরিমাণ কমিয়ে আবার চেষ্টা করুন।';
 return 'অর্ডার সম্পন্ন হয়নি। আপনার ব্যাগ অক্ষত আছে; কিছুক্ষণ পর আবার চেষ্টা করুন।';
}
export function cartTotal(lines:CartLine[],products:Product[],fee:number) { return lines.reduce((sum,line)=>sum+(products.find(p=>p.id===line.id)?.price??0)*line.quantity,0)+fee; }
export function validQuantity(quantity:number,stock:number) { return Number.isInteger(quantity)&&quantity>=1&&quantity<=Math.min(99,stock); }
export function canTransition(from:Status,to:Status) { return (transitions[from] as readonly string[]).includes(to); }
export function orderReportTotals(orders:Pick<Row<'orders'>,'is_demo'|'status'|'total'>[]) { const real=orders.filter(order=>!order.is_demo); const revenue=real.filter(order=>order.status!=='cancelled'); return {orderCount:real.length,orderValue:revenue.reduce((sum,order)=>sum+order.total,0),deliveredValue:revenue.filter(order=>order.status==='delivered').reduce((sum,order)=>sum+order.total,0)}; }
export function realOrderAllowed(products:Product[]) {return products.length>0 && products.every(p=>p.seller_stores?.is_demo===false);}
export function metadata(title:string,description:string) { return {meta:[{title:`${title} | ALLIFY`},{name:'description',content:description},{property:'og:title',content:`${title} | ALLIFY`},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}; }
export const imagePlaceholder='/images/products/placeholder.svg';
export function productImage(p:Product) {const url=p.product_images[0]?.url;return url&&safeImageUrl(url)?url:imagePlaceholder;}