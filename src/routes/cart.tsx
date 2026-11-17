import {createFileRoute} from '@tanstack/react-router';
import {catalogOptions} from '@/lib/catalog-query';
import {metadata} from '@/lib/marketplace';
import {CartView} from '@/components/marketplace/cart-view';
export const Route=createFileRoute('/cart')({head:()=>metadata('কেনাকাটার ব্যাগ','ALLIFY ব্যাগের পণ্য ও পরিমাণ দেখুন।'),loader:({context})=>context.queryClient.ensureQueryData(catalogOptions),component:CartView});