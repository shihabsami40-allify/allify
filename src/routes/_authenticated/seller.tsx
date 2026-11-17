import {createFileRoute} from '@tanstack/react-router';
import {metadata} from '@/lib/marketplace';
import {SellerDashboard} from '@/components/marketplace/seller-dashboard';
export const Route=createFileRoute('/_authenticated/seller')({head:()=>metadata('বিক্রেতার দোকান পরিচালনা','ALLIFY নিজের দোকানের পণ্য, স্টক ও অর্ডার পরিচালনা।'),component:SellerDashboard});