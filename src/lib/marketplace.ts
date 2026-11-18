import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';
export type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Product = Row<'products'> & { product_images: {url:string}[]; seller_stores: Pick<Row<'seller_stores'>,'name'|'slug'|'is_demo'|'area'|'status'> | null };
export type Catalog = { products: Product[]; categories: Row<'categories'>[]; stores: Row<'seller_stores'>[]; areas: Row<'delivery_areas'>[]; unavailable?: boolean };
export type CartLine = {id:string; quantity:number};
export const money = (n:number) => '৳'+Number(n).toLocaleString('bn-BD');
export const deliverySchema = z.object({ recipient:z.string().trim().min(2).max(100), phone:z.string().regex(/^01[3-9][0-9]{8}$/), area:z.string().min(2).max(60), address:z.string().trim().min(5).max(300), note:z.string().max(500).default('') });
export function safeImageUrl(value:string) {
 if(value==='' || /^\/images\/products\/[a-z-]+\.(jpg|svg)$/.test(value)) return true;
 try { const url=new URL(value); const host=url.hostname.toLowerCase(); return url.protocol==='https:' && !url.username && !url.password && !url.port && host.includes('.') && !host.endsWith('.local') && !host.endsWith('.localhost') && !host.endsWith('.internal') && !/^[\d.]+$/.test(host) && !host.includes(':'); } catch { return false; }
}
export const categorySchema=z.object({id:z.string().uuid().optional(),name_bn:z.string().trim().min(2).max(80),name_en:z.string().trim().min(2).max(80),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),sort_order:z.coerce.number().int().min(0).max(1000)});
export const productSchema = z.object({id:z.string().uuid().optional(), store_id:z.string().uuid(), title_bn:z.string().trim().min(2).max(120), title_en:z.string().max(120).default(''), description:z.string().max(3000).default(''), price:z.coerce.number().positive().max(9999999), stock:z.coerce.number().int().min(0).max(100000), category_id:z.string().uuid(), status:z.enum(['active','draft','hidden']), image:z.string().refine(safeImageUrl,'Use a secure public image URL') });
export const applicationSchema = z.object({store_name:z.string().trim().min(2).max(80),owner_name:z.string().trim().min(2).max(100),phone:z.string().regex(/^01[3-9][0-9]{8}$/),area:z.string().min(2).max(60),address:z.string().trim().min(5).max(300),description:z.string().max(1000).default('')});
export const transitions = {pending:['confirmed','cancelled'],confirmed:['shipped','cancelled'],shipped:['delivered'],delivered:[],cancelled:[]} as const;
export type Status = keyof typeof transitions;
export const statusName:Record<Status,string> = {pending:'অপেক্ষমাণ',confirmed:'নিশ্চিত',shipped:'পথে আছে',delivered:'ডেলিভারি সম্পন্ন',cancelled:'বাতিল'};
export function cartTotal(lines:CartLine[],products:Product[],fee:number) { return lines.reduce((sum,line)=>sum+(products.find(p=>p.id===line.id)?.price??0)*line.quantity,0)+fee; }
export function validQuantity(quantity:number,stock:number) { return Number.isInteger(quantity)&&quantity>=1&&quantity<=Math.min(99,stock); }
export function canTransition(from:Status,to:Status) { return (transitions[from] as readonly string[]).includes(to); }
export function realOrderAllowed(products:Product[]) {return products.length>0 && products.every(p=>p.seller_stores?.is_demo===false);}
export function metadata(title:string,description:string) { return {meta:[{title:`${title} | ALLIFY`},{name:'description',content:description},{property:'og:title',content:`${title} | ALLIFY`},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}; }
export const imagePlaceholder='/images/products/placeholder.svg';
export function productImage(p:Product) {const url=p.product_images[0]?.url;return url&&safeImageUrl(url)?url:imagePlaceholder;}