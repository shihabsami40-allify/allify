import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {useRouter} from '@tanstack/react-router';
import {useQueryClient} from '@tanstack/react-query';
import type {User} from '@supabase/supabase-js';
import {supabase} from '@/integrations/supabase/client';
import {validQuantity,type CartLine,type Product,type Status} from '@/lib/marketplace';
import {toast} from 'sonner';
import {readStoredJson,writeStoredJson} from '@/lib/browser-storage';
export type DemoOrder={id:string;total:number;items:{title:string;quantity:number;price:number}[];status:Status;area:string};
type State={cart:CartLine[];setQuantity:(p:Product,n:number)=>void;removeCartItem:(id:string)=>void;clearCart:()=>void;user:User|null;authReady:boolean;lang:'bn'|'en';setLang:(l:'bn'|'en')=>void;t:(bn:string,en:string)=>string;demoOrders:DemoOrder[];addDemoOrder:(o:DemoOrder)=>void};
const Context=createContext<State|null>(null);
const isCartLines=(value:unknown):value is CartLine[]=>Array.isArray(value)&&value.every(entry=>{if(!entry||typeof entry!=='object')return false;const line=entry as Record<string,unknown>;return typeof line['id']==='string'&&line['id'].length>0&&Number.isInteger(line['quantity'])&&Number(line['quantity'])>0&&Number(line['quantity'])<=99;});
const isDemoOrders=(value:unknown):value is DemoOrder[]=>Array.isArray(value)&&value.every(entry=>{if(!entry||typeof entry!=='object')return false;const order=entry as Record<string,unknown>;if(typeof order['id']!=='string'||!order['id']||typeof order['area']!=='string'||!Number.isFinite(order['total'])||Number(order['total'])<0||!['pending','confirmed','shipped','delivered','cancelled'].includes(String(order['status']))||!Array.isArray(order['items']))return false;return order['items'].every((rawItem:unknown)=>{if(!rawItem||typeof rawItem!=='object')return false;const item=rawItem as Record<string,unknown>;return typeof item['title']==='string'&&Number.isInteger(item['quantity'])&&Number(item['quantity'])>0&&Number.isFinite(item['price'])&&Number(item['price'])>=0;});});
export function MarketProvider({children}:{children:ReactNode}){
 const [cart,setCart]=useState<CartLine[]>([]);const [demoOrders,setOrders]=useState<DemoOrder[]>([]);const [user,setUser]=useState<User|null>(null);const [authReady,setAuthReady]=useState(false);const [lang,setLanguage]=useState<'bn'|'en'>('bn');const [ready,setReady]=useState(false); const router=useRouter();const qc=useQueryClient();const authEventReceived=useRef(false);
 useEffect(()=>{setCart(readStoredJson('allify-cart',[],isCartLines));setOrders(readStoredJson('allify-demo-orders',[],isDemoOrders));const savedLanguage=readStoredJson('allify-lang','bn',(value):value is 'bn'|'en'=>value==='bn'||value==='en');setLanguage(savedLanguage);setReady(true);
 const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{authEventReceived.current=true;setUser(session?.user??null);setAuthReady(true);if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='USER_UPDATED'){void router.invalidate();if(event!=='SIGNED_OUT')void qc.invalidateQueries();}});
 void supabase.auth.getUser().then(({data})=>{if(!authEventReceived.current)setUser(data.user);setAuthReady(true);}).catch(()=>setAuthReady(true));return()=>subscription.unsubscribe();},[router,qc]);
 useEffect(()=>{if(ready){writeStoredJson('allify-cart',cart);writeStoredJson('allify-demo-orders',demoOrders);writeStoredJson('allify-lang',lang);}document.documentElement.lang=lang;},[cart,demoOrders,lang,ready]);
 function setQuantity(p:Product,n:number){if(n!==0&&!validQuantity(n,p.stock)){toast.error('স্টকের সীমা অতিক্রম করেছে');return;}setCart(old=>n===0?old.filter(l=>l.id!==p.id):old.some(l=>l.id===p.id)?old.map(l=>l.id===p.id?{...l,quantity:n}:l):[...old,{id:p.id,quantity:n}]);}
 return <Context.Provider value={{cart,setQuantity,removeCartItem:(id:string)=>setCart(old=>old.filter(l=>l.id!==id)),clearCart:()=>setCart([]),user,authReady,lang,setLang:setLanguage,t:(bn,en)=>lang==='bn'?bn:en,demoOrders,addDemoOrder:o=>setOrders(old=>[o,...old])}}>{children}</Context.Provider>;
}
export function useMarket(){const value=useContext(Context);if(!value)throw Error('Marketplace provider missing');return value;}