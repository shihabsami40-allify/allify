import {createFileRoute} from '@tanstack/react-router';
import {catalogOptions} from '@/lib/catalog-query';
import {metadata} from '@/lib/marketplace';
import {CheckoutView} from '@/components/marketplace/checkout-view';
export const Route=createFileRoute('/checkout')({head:()=>metadata('ডেমো চেকআউট','ALLIFY পরীক্ষামূলক COD অর্ডার; কোনো বাস্তব পেমেন্ট বা ডেলিভারি নয়।'),loader:({context})=>context.queryClient.ensureQueryData(catalogOptions),component:CheckoutView});