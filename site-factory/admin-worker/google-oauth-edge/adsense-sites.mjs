// Read-only site readiness. Never request a review or change ad settings.
export async function readAdSenseSites(read,account,relevant){
 const sites=[];let pageToken='';
 try{
  for(let page=0;page<10;page++){
   const url=new URL('https://adsense.googleapis.com/v2/'+account+'/sites');url.searchParams.set('pageSize','1000');if(pageToken)url.searchParams.set('pageToken',pageToken);
   const data=await read(url.toString());
   for(const row of data.sites||[]){
    if(typeof row.domain!=='string'||!relevant('https://'+row.domain+'/'))continue;
    sites.push({domain:row.domain,state:['REQUIRES_REVIEW','GETTING_READY','READY','NEEDS_ATTENTION'].includes(row.state)?row.state:'STATE_UNSPECIFIED',autoAdsEnabled:typeof row.autoAdsEnabled==='boolean'?row.autoAdsEnabled:null});
   }
   pageToken=data.nextPageToken||'';if(!pageToken)return {status:'ok',account,sites};
  }
  return {status:'incomplete',account,sites:[]};
 }catch{return {status:'query_failed',account,sites:[]};}
}
