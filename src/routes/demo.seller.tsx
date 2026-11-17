import {createFileRoute} from '@tanstack/react-router';
import {catalogOptions} from '@/lib/catalog-query';
import {metadata} from '@/lib/marketplace';
import {DemoDashboard} from '@/components/marketplace/demo-dashboard';
export const Route=createFileRoute('/demo/seller')({head:()=>metadata('বিক্রেতার ডেমো','ALLIFY নিরাপদ নমুনা পণ্য, স্টক ও অর্ডার পরিচালনা।'),loader:({context})=>context.queryClient.ensureQueryData(catalogOptions),component:()=> <DemoDashboard/>});