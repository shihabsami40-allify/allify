export async function checkoutRequestStorageKey(userId:string,payload:unknown):Promise<string>{
 const serialized=JSON.stringify({userId,payload});
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(serialized));
 const fingerprint=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
 return `allify:checkout-request:v2:${fingerprint}`;
}
