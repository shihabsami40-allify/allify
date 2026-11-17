import {Link,useNavigate} from '@tanstack/react-router';
import {useSuspenseQuery} from '@tanstack/react-query';
import {useState} from 'react';
import {CheckCircle2,Truck} from 'lucide-react';
import {toast} from 'sonner';
import {catalogOptions} from '@/lib/catalog-query';
import {deliverySchema,money,cartTotal,realOrderAllowed,validQuantity} from '@/lib/marketplace';
import {useMarket} from '@/components/market-provider';
import {supabase} from '@/integrations/supabase/client';
import {PageTitle,Empty} from '@/components/market-shell';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';

export function CheckoutView(){
 const {data}=useSuspenseQuery(catalogOptions);
 const {cart,clearCart,user,authReady}=useMarket();
 const navigate=useNavigate();
 const [area,setArea]=useState('');
 const [busy,setBusy]=useState(false);
 const selected=data.areas.find(a=>a.name_bn===area);
 const fee=selected?.fee??0;
 const total=cartTotal(cart,data.products,fee);
 const lines=cart.map(l=>data.products.find(p=>p.id===l.id));
 const productsAvailable=cart.length>0&&lines.every(Boolean)&&cart.every((l,i)=>validQuantity(l.quantity,lines[i]!.stock));
 const realProducts=productsAvailable&&realOrderAllowed(lines as NonNullable<(typeof lines)[number]>[]);
 if(!authReady)return <main className="page-wrap py-9">অ্যাকাউন্ট যাচাই হচ্ছে…</main>;
 if(!user)return <main className="page-wrap py-9"><Empty title="অর্ডার করতে লগইন করুন"><p className="mb-4 text-sm text-muted-foreground">আপনার অর্ডার ও ডেলিভারির তথ্য নিরাপদে সংরক্ষণের জন্য অ্যাকাউন্টে প্রবেশ করতে হবে।</p><Button asChild><Link to="/auth">লগইন / নিবন্ধন</Link></Button></Empty></main>;
 if(!cart.length)return <main className="page-wrap py-9"><Empty title="আপনার বাজারের ব্যাগ খালি"><Button asChild><Link to="/cart">ব্যাগ দেখুন</Link></Button></Empty></main>;
 if(!productsAvailable||!realProducts)return <main className="page-wrap py-9"><Empty title="এই ব্যাগ থেকে বাস্তব অর্ডার করা যাচ্ছে না"><p className="mb-4 text-sm text-muted-foreground">ডেমো পণ্য, অনুপলব্ধ পণ্য অথবা স্টকের বেশি পরিমাণ থাকলে অর্ডার করা যাবে না।</p><Button asChild><Link to="/cart">ব্যাগ ঠিক করুন</Link></Button></Empty></main>;
 return <main className="page-wrap py-9">
  <PageTitle eyebrow="SECURE CHECKOUT" title="অর্ডার নিশ্চিত করুন"/>
  <p className="notice mb-8">এটি বাস্তব ক্যাশ অন ডেলিভারি অর্ডার। অর্ডার নিশ্চিত হলে পণ্যের স্টক ডেটাবেসে স্বয়ংক্রিয়ভাবে কমবে।</p>
  <form className="grid gap-10 lg:grid-cols-[1fr_360px]" onSubmit={async e=>{
   e.preventDefault();
   if(busy||!selected)return;
   const fd=new FormData(e.currentTarget);
   const parsed=deliverySchema.safeParse({recipient:fd.get('recipient'),phone:fd.get('phone'),area:selected.name_en,address:fd.get('address'),note:fd.get('note')||''});
   if(!parsed.success){toast.error('নাম, ফোন নম্বর, এলাকা ও ঠিকানা সঠিকভাবে পূরণ করুন');return;}
   setBusy(true);
   try{
    const {data:orderNo,error}=await supabase.rpc('place_order',{
     p_items:cart.map(line=>({product_id:line.id,quantity:line.quantity})),
     p_recipient:parsed.data.recipient,
     p_phone:parsed.data.phone,
     p_area:parsed.data.area,
     p_address:parsed.data.address,
     p_note:parsed.data.note||null,
     p_save_address:false
    });
    if(error)throw error;
    if(!orderNo)throw new Error('অর্ডার নম্বর পাওয়া যায়নি');
    clearCart();
    toast.success('অর্ডার সফলভাবে নিশ্চিত হয়েছে: '+orderNo);
    await navigate({to:'/orders'});
   }catch(error){
    toast.error(error instanceof Error?error.message:'অর্ডার সম্পন্ন হয়নি। আবার চেষ্টা করুন।');
   }finally{setBusy(false);}
  }}>
   <section className="space-y-5">
    <h2 className="font-display text-2xl">ডেলিভারির তথ্য</h2>
    <label className="field-label">গ্রাহকের নাম<Input name="recipient" autoComplete="name" required minLength={2} maxLength={100}/></label>
    <label className="field-label">মোবাইল নম্বর<Input name="phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="01XXXXXXXXX" pattern="01[3-9][0-9]{8}" required/></label>
    <label className="field-label">ডেলিভারি এলাকা<select required aria-label="ডেলিভারি এলাকা" value={area} onChange={e=>setArea(e.target.value)}><option value="">এলাকা নির্বাচন করুন</option>{data.areas.map(a=><option key={a.id} value={a.name_bn}>{a.name_bn}</option>)}</select></label>
    <label className="field-label">সম্পূর্ণ ঠিকানা<Input name="address" autoComplete="street-address" required minLength={5} maxLength={300} placeholder="বাসা/রোড, এলাকা, থানা"/></label>
    <label className="field-label">অতিরিক্ত নির্দেশনা (ঐচ্ছিক)<Textarea name="note" maxLength={500} placeholder="ডেলিভারি সম্পর্কে কোনো নির্দেশনা থাকলে লিখুন"/></label>
    <div className="border-y py-5"><h2 className="mb-3 font-display text-xl">পেমেন্ট পদ্ধতি</h2><label className="flex items-center gap-3"><input type="radio" name="payment" value="cod" checked readOnly/><Truck size={20}/>ক্যাশ অন ডেলিভারি</label></div>
   </section>
   <aside className="border-y py-6">
    <h2 className="mb-4 font-display text-2xl">অর্ডারের সারাংশ</h2>
    {cart.map(l=>{const p=data.products.find(p=>p.id===l.id);return <div key={l.id} className="mb-3 flex justify-between gap-4 text-sm"><span>{p?.title_bn} × {l.quantity}</span><span className="shrink-0">{money((p?.price??0)*l.quantity)}</span></div>;})}
    <div className="flex justify-between border-t pt-4 text-sm"><span>ডেলিভারি চার্জ</span><span>{money(fee)}</span></div>
    <div className="my-5 flex justify-between text-xl font-semibold"><span>সর্বমোট</span><span>{money(total)}</span></div>
    <Button type="submit" disabled={busy||!selected} className="h-12 w-full"><CheckCircle2/>{busy?'অর্ডার নিশ্চিত হচ্ছে…':'অর্ডার নিশ্চিত করুন'}</Button>
    <p className="mt-3 text-center text-xs text-muted-foreground">অর্ডার নিশ্চিত করার আগে পণ্যের দাম ও স্টক আবার যাচাই করা হবে।</p>
   </aside>
  </form>
 </main>;
}
