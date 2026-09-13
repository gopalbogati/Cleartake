(function(root){
  'use strict';
  const repo='gopalbogati/Cleartake';
  function assetUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='github.com'&&u.pathname.startsWith('/'+repo+'/releases/download/')&&!u.username&&!u.password?u.href:null;}catch{return null;}}
  function selectRelease(input){
    if(!Array.isArray(input))return null;
    const releases=input.filter(r=>r&&!r.draft&&/^v\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(r.tag_name)&&Array.isArray(r.assets))
      .sort((a,b)=>(Date.parse(b.published_at)||0)-(Date.parse(a.published_at)||0));
    for(const r of releases){const version=r.tag_name.slice(1),names={mac:`ClearTake-Mac-${version}-arm64.zip`,windows:`ClearTake-Windows-${version}-x64.zip`,dmg:`ClearTake-Mac-${version}-arm64.dmg`},assets={};
      for(const [key,name] of Object.entries(names)){const a=r.assets.find(a=>a.name===name&&a.state==='uploaded'&&a.size>0&&assetUrl(a.browser_download_url));if(a)assets[key]={url:assetUrl(a.browser_download_url),size:a.size,name:a.name};}
      if(assets.mac||assets.windows)return {version,tag:r.tag_name,preview:r.prerelease===true,url:`https://github.com/${repo}/releases/tag/${encodeURIComponent(r.tag_name)}`,assets};
    }
    return null;
  }
  const value={selectRelease,assetUrl};if(typeof module==='object'&&module.exports)module.exports=value;else root.ClearTakeReleases=value;
})(typeof window==='object'?window:this);
