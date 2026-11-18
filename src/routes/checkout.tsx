import {createFileRoute} from '@tanstack/react-router';
import {catalogOptions} from '@/lib/catalog-query';
import {metadata} from '@/lib/marketplace';
import {CheckoutView} from '@/components/marketplace/checkout-view';
export const Route=createFileRoute('/checkout')({head:()=>metadata('ক্যাশ অন ডেলিভারি অর্ডার','ALLIFY-তে চট্টগ্রামের নির্বাচিত এলাকার বাস্তব ক্যাশ অন ডেলিভারি অর্ডার।'),loader:({context})=>context.queryClient.ensureQueryData(catalogOptions),component:CheckoutView});