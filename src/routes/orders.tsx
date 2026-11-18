import {createFileRoute,Link} from '@tanstack/react-router';
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';
import {metadata,money,statusName,type Status} from '@/lib/marketplace';
import {useMarket} from '@/components/market-provider';
import {supabase} from '@/integrations/supabase/client';
import {PageTitle,Empty} from '@/components/market-shell';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

export const Route=createFileRoute('/orders')({head:()=>metadata('আমার অর্ডার','ALLIFY-তে আপনার বাস্তব অর্ডারের অবস্থা ও বিবরণ।'),component:Orders});
const fulfillmentSteps:Status[]=['pending','confirmed','shipped','delivered'];
function Orders(){
 const {user,authReady}=useMarket();
 const [search,setSearch]=useState('');
 const [statusFilter,setStatusFilter]=useState('all');
 const q=useQuery({
  queryKey:['customer-orders',user?.id],
  enabled:!!user,
  queryFn:async()=>{
   if(!user) return [];
   const {data:orders,error}=await supabase.from('orders').select('*').eq('customer_id',user.id).order('created_at',{ascending:false});
   if(error)throw error;
   if(!orders.length)return [];
   const {data:items,error:itemError}=await supabase.from('order_items').select('*').in('order_id',orders.map(o=>o.id));
   if(itemError)throw itemError;
   return orders.map(order=>({...order,items:(items??[]).filter(item=>item.order_id===order.id)}));
  }
 });
 const visibleOrders=(q.data??[]).filter(order=>(statusFilter==='all'||order.status===statusFilter)&&[order.order_no,order.area,order.recipient,order.phone,order.address_line,order.note,...order.items.map(item=>item.title)].some(value=>(value||'').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
 if(!authReady)return <main className="page-wrap py-9">অ্যাকাউন্ট যাচাই হচ্ছে…</main>;
 if(!user)return <main className="page-wrap py-9"><Empty title="আপনার অর্ডার দেখতে লগইন করুন"><Button asChild><Link to="/auth">লগইন করুন</Link></Button></Empty></main>;
 if(q.isPending)return <main className="page-wrap py-9">আপনার অর্ডার লোড হচ্ছে…</main>;
 if(q.isError)return <main className="page-wrap py-9"><Empty title="অর্ডার লোড করা যায়নি"><Button variant="outline" onClick={()=>q.refetch()}>আবার চেষ্টা করুন</Button></Empty></main>;
 return <main className="page-wrap py-9">
  <PageTitle eyebrow="ORDER HISTORY" title="আমার অর্ডার"><Button variant="outline" disabled={q.isFetching} onClick={()=>q.refetch()}>{q.isFetching?'হালনাগাদ হচ্ছে…':'অর্ডার হালনাগাদ করুন'}</Button></PageTitle>
  {q.data.length>0&&<div className="mb-5 grid gap-3 sm:grid-cols-[1fr_220px]"><Input aria-label="অর্ডার খুঁজুন" placeholder="অর্ডার নম্বর, পণ্য, ফোন, ঠিকানা বা নির্দেশনা খুঁজুন" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="অর্ডারের অবস্থা" className="h-10 rounded-md border bg-background px-3 text-sm" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">সব অর্ডার</option><option value="pending">অপেক্ষমাণ</option><option value="confirmed">নিশ্চিত</option><option value="shipped">পাঠানো হয়েছে</option><option value="delivered">ডেলিভারি সম্পন্ন</option><option value="cancelled">বাতিল</option></select></div>}
  {visibleOrders.length?<div className="space-y-5">{visibleOrders.map(order=><article key={order.id} className="rounded-lg border bg-card p-5">
   <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{order.order_no}</h2><p className="text-sm text-muted-foreground">{order.area} • {new Date(order.created_at).toLocaleString('bn-BD')}</p></div><span className="text-sm text-primary">{statusName[order.status as Status]}</span></div>
   {order.status==='cancelled'?<p className="my-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">এই অর্ডারটি বাতিল করা হয়েছে।</p>:<ol aria-label="অর্ডারের অগ্রগতি" className="my-4 grid grid-cols-4 gap-2 border-y py-4">{fulfillmentSteps.map((step,index)=>{const current=fulfillmentSteps.indexOf(order.status as Status);const reached=index<=current;return <li key={step} aria-current={index===current?'step':undefined} className="min-w-0 text-center"><span className={`mx-auto mb-2 flex size-7 items-center justify-center rounded-full text-xs font-semibold ${reached?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground'}`}>{reached?'✓':index+1}</span><span className={`text-xs ${reached?'font-semibold text-foreground':'text-muted-foreground'}`}>{statusName[step]}</span></li>;})}</ol>}
   <div className="my-4 border-b pb-3">{order.items.map(item=><p key={item.id} className="flex justify-between gap-4 py-1 text-sm"><span>{item.title} × {item.quantity}</span><span>{money(item.unit_price*item.quantity)}</span></p>)}</div>
   <p className="text-sm text-muted-foreground">প্রাপক: {order.recipient} • {order.phone}</p><p className="mt-1 text-sm text-muted-foreground">{order.address_line}</p>{order.note&&<p className="mt-2 rounded-md bg-muted/60 px-3 py-2 text-sm"><span className="font-medium">আপনার নির্দেশনা:</span> {order.note}</p>}
   <div className="mt-4 space-y-2 border-t pt-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">পণ্যের মূল্য</span><span>{money(order.subtotal)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">ডেলিভারি চার্জ</span><span>{money(order.delivery_fee)}</span></div><div className="flex justify-between border-t pt-2"><strong>সর্বমোট</strong><strong>{money(order.total)}</strong></div><p className="text-xs text-muted-foreground">পেমেন্ট: {order.payment_method==='cod'?'ক্যাশ অন ডেলিভারি':order.payment_method}</p></div>
  </article>)}</div>:q.data.length>0?<Empty title="কোনো অর্ডার মেলেনি"><Button variant="outline" onClick={()=>{setSearch('');setStatusFilter('all');}}>ফিল্টার মুছুন</Button></Empty>:<Empty title="এখনো কোনো অর্ডার করেননি"><Button asChild><Link to="/browse" search={{q:'',category:'',sort:'popular'}}>পণ্য দেখুন</Link></Button></Empty>}
 </main>;
}
