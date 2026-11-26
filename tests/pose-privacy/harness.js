window.auditPose=async({imageBase64,delegate})=>{
 const bytes=Uint8Array.from(atob(imageBase64),c=>c.charCodeAt(0));
 const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/jpeg'}));
 const worker=new Worker(new URL('./pose-audit-worker.js',import.meta.url),{type:'module'});
 try{
  return await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Pose audit timed out')),145000);
   worker.onmessage=({data})=>{if(data.type==='audit-result'){clearTimeout(timer);resolve(data);}};
   worker.onerror=e=>{clearTimeout(timer);reject(new Error(e.message||'Pose audit worker failed'));};
   worker.postMessage({type:'audit',bitmap,delegate},[bitmap]);
  });
 }finally{worker.terminate();}
};
