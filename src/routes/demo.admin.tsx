import {createFileRoute} from '@tanstack/react-router';
import {catalogOptions} from '@/lib/catalog-query';
import {metadata} from '@/lib/marketplace';
import {DemoDashboard} from '@/components/marketplace/demo-dashboard';
export const Route=createFileRoute('/demo/admin')({head:()=>metadata('প্রশাসকের ডেমো','ALLIFY পরীক্ষামূলক দোকান অনুমোদন ও পণ্য পর্যালোচনা।'),loader:({context})=>context.queryClient.ensureQueryData(catalogOptions),component:()=> <DemoDashboard admin/>});