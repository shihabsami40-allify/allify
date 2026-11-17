import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {useRouter} from '@tanstack/react-router';
import {useQueryClient} from '@tanstack/react-query';
import type {User} from '@supabase/supabase-js';
import {supabase} from '@/integrations/supabase/client';
import {validQuantity,type CartLine,type Product,type Status} from '@/lib/marketplace';
import {toast} from 'sonner';
export type DemoOrder={id:string;total:number;items:{title:string;quantity:number;price:number}[];status:Status;area:string};
type State={cart:CartLine[];setQuantity:(p:Product,n:number)=>void;clearCart:()=>void;user:User|null;authReady:boolean;lang:'bn'|'en';setLang:(l:'bn'|'en')=>void;t:(bn:string,en:string)=>string;demoOrders:DemoOrder[];addDemoOrder:(o:DemoOrder)=>void};
const Context=createContext<State|null>(null);
export function MarketProvider({children}:{children:ReactNode}){
 const [cart,setCart]=useState<CartLine[]>([]);const [demoOrders,setOrders]=useState<DemoOrder[]>([]);const [user,setUser]=useState<User|null>(null);const [authReady,setAuthReady]=useState(false);const [lang,setLanguage]=useState<'bn'|'en'>('bn');const [ready,setReady]=useState(false); const router=useRouter();const qc=useQueryClient();
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('allify-cart')||'[]'); if(Array.isArray(saved))setCart(saved.filter(x=>typeof x.id==='string'&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=99));const orders=JSON.parse(localStorage.getItem('allify-demo-orders')||'[]');if(Array.isArray(orders))setOrders(orders);if(localStorage.getItem('allify-lang')==='en')setLanguage('en');}catch{}setReady(true);
 const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{setUser(session?.user??null);setAuthReady(true);if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='USER_UPDATED'){void router.invalidate();if(event!=='SIGNED_OUT')void qc.invalidateQueries();}});
 void supabase.auth.getUser().then(({data})=>{setUser(data.user);setAuthReady(true);}).catch(()=>setAuthReady(true));return()=>subscription.unsubscribe();},[router,qc]);
 useEffect(()=>{if(ready){localStorage.setItem('allify-cart',JSON.stringify(cart));localStorage.setItem('allify-demo-orders',JSON.stringify(demoOrders));localStorage.setItem('allify-lang',lang);}document.documentElement.lang=lang;},[cart,demoOrders,lang,ready]);
 function setQuantity(p:Product,n:number){if(n!==0&&!validQuantity(n,p.stock)){toast.error('স্টকের সীমা অতিক্রম করেছে');return;}setCart(old=>n===0?old.filter(l=>l.id!==p.id):old.some(l=>l.id===p.id)?old.map(l=>l.id===p.id?{...l,quantity:n}:l):[...old,{id:p.id,quantity:n}]);}
 return <Context.Provider value={{cart,setQuantity,clearCart:()=>setCart([]),user,authReady,lang,setLang:setLanguage,t:(bn,en)=>lang==='bn'?bn:en,demoOrders,addDemoOrder:o=>setOrders(old=>[o,...old])}}>{children}</Context.Provider>;
}
export function useMarket(){const value=useContext(Context);if(!value)throw Error('Marketplace provider missing');return value;}