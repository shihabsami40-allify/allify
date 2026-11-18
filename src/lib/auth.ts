export function hasRecoveryHash(hash:string):boolean{
  const value=hash.startsWith('#')?hash.slice(1):hash;
  return new URLSearchParams(value).get('type')==='recovery';
}
