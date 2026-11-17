import {createFileRoute} from '@tanstack/react-router';
import {metadata} from '@/lib/marketplace';
import {AdminDashboard} from '@/components/marketplace/admin-dashboard';
export const Route=createFileRoute('/_authenticated/admin')({head:()=>metadata('প্রশাসক ব্যবস্থাপনা','ALLIFY বিক্রেতা, ক্যাটাগরি, পণ্য ও অর্ডারের অনুমোদিত ব্যবস্থাপনা।'),component:AdminDashboard});