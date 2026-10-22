const LOOPBACK_HOSTS=new Set(['127.0.0.1','localhost','[::1]']);

export function loopbackTestUrl(value='http://127.0.0.1:4177/'){
  const url=new URL(value);
  if(url.protocol!=='http:'||!LOOPBACK_HOSTS.has(url.hostname)||url.username||url.password){
    throw new Error('Browser verification only accepts unauthenticated loopback HTTP URLs.');
  }
  return url.href;
}
