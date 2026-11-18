import {createFileRoute,Link} from '@tanstack/react-router';
import {useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {hasRecoveryHash} from '@/lib/auth';
import {metadata} from '@/lib/marketplace';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

export const Route=createFileRoute('/reset-password')({
  head:()=>metadata('পাসওয়ার্ড পুনরুদ্ধার','ALLIFY অ্যাকাউন্টে নতুন পাসওয়ার্ড দিন।'),
  component:ResetPassword,
});

function ResetPassword(){
  const [recovery,setRecovery]=useState(false);
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    // Supabase's implicit recovery links carry type=recovery in the URL hash.
    // PASSWORD_RECOVERY also covers the auth event after a PKCE code is exchanged.
    if(hasRecoveryHash(window.location.hash))setRecovery(true);

    const {data:{subscription}}=supabase.auth.onAuthStateChange(event=>{
      if(event==='PASSWORD_RECOVERY')setRecovery(true);
    });

    return ()=>subscription.unsubscribe();
  },[]);

  return <main className="page-wrap py-12"><form className="mx-auto max-w-md space-y-5" onSubmit={async e=>{
    e.preventDefault();
    if(!recovery||password!==confirm){
      setMessage('পাসওয়ার্ড দুটি মিলতে হবে।');
      return;
    }
    setBusy(true);
    try{
      const {error}=await supabase.auth.updateUser({password});
      setMessage(error?'লিংকটি মেয়াদোত্তীর্ণ হতে পারে। নতুন লিংক নিন।':'পাসওয়ার্ড পরিবর্তন হয়েছে।');
    }catch{
      setMessage('সংযোগ পাওয়া যায়নি। আবার চেষ্টা করুন।');
    }finally{
      setBusy(false);
    }
  }}>
    <h1 className="font-display text-3xl">নতুন পাসওয়ার্ড</h1>
    {recovery?<>
      <label className="field-label">নতুন পাসওয়ার্ড<Input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <label className="field-label">আবার লিখুন<Input type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
      <Button disabled={busy} type="submit">{busy?'সংরক্ষণ হচ্ছে…':'পাসওয়ার্ড সংরক্ষণ'}</Button>
    </>:<p className="notice">ইমেইলে পাঠানো পাসওয়ার্ড পুনরুদ্ধারের লিংক দিয়ে এই পৃষ্ঠা খুলুন।</p>}
    {message&&<p role="status">{message}</p>}
    <Button asChild variant="link"><Link to="/auth">লগইন পৃষ্ঠায় ফিরুন</Link></Button>
  </form></main>;
}
