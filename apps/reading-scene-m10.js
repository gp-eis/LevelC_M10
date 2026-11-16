/* Book-scene Reading activities. Source images/masks and exact models are
 * injected by the Month10 pack; this component imports no old curriculum. */
(() => {
  'use strict';
  const COLORS=[['Red','#ee655b'],['Orange','#f6a04d'],['Yellow','#f7d55e'],['Green','#75ba83'],['Blue','#65aade'],['Purple','#ac83cd'],['Pink','#ed9cb7'],['Brown','#8b5a2b'],['Black','#202020'],['White','#ffffff']];
  let mounted=null,serial=0;
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  const color=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
  const rgb=value=>[1,3,5].map(index=>parseInt(value.slice(index,index+2),16));
  const copy=value=>JSON.parse(JSON.stringify(value));
  function fitRect(width,height,ratio){
    if(!finite(width)||!finite(height)||!finite(ratio)||width<=0||height<=0||ratio<=0)return{width:0,height:0};
    const w=Math.min(width,height*ratio);return{width:w,height:w/ratio};
  }
  // Follow only the explicitly seeded white component. A white label, sky or
  // nearby animal is never collected merely because it shares a rectangle.
  function whiteRegion(pixels,width,height,seed,bounds={},options={}){
    if(!pixels||pixels.length!==width*height*4||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)return{ok:false,reason:'invalid-raster'};
    const threshold=options.threshold??242,minPixels=options.minPixels??16,channelRange=options.channelRange??12;
    const x0=Math.max(0,Math.floor((bounds.x??0)*width/100)),y0=Math.max(0,Math.floor((bounds.y??0)*height/100));
    const x1=Math.min(width-1,Math.ceil(((bounds.x??0)+(bounds.width??100))*width/100)-1),y1=Math.min(height-1,Math.ceil(((bounds.y??0)+(bounds.height??100))*height/100)-1);
    const sx=Math.floor(seed.x*width/100),sy=Math.floor(seed.y*height/100);
    if(sx<x0||sx>x1||sy<y0||sy>y1)return{ok:false,reason:'seed-outside-bounds'};
    const white=index=>{const p=index*4,r=pixels[p],g=pixels[p+1],b=pixels[p+2];return pixels[p+3]>200&&r>=threshold&&g>=threshold&&b>=threshold&&Math.max(r,g,b)-Math.min(r,g,b)<=channelRange;};
    const start=sy*width+sx;if(!white(start))return{ok:false,reason:'seed-not-white'};
    const visited=new Uint8Array(width*height),queue=new Int32Array(width*height);let head=0,tail=1,leaks=false;
    queue[0]=start;visited[start]=1;let left=sx,right=sx,top=sy,bottom=sy;
    while(head<tail){
      const index=queue[head++],x=index%width,y=Math.floor(index/width);
      if(x===x0||x===x1||y===y0||y===y1)leaks=true;
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      for(const next of [index-1,index+1,index-width,index+width]){
        const nx=next%width,ny=Math.floor(next/width);
        if(next<0||next>=width*height||nx<x0||nx>x1||ny<y0||ny>y1||Math.abs(nx-x)+Math.abs(ny-y)!==1||visited[next]||!white(next))continue;
        visited[next]=1;queue[tail++]=next;
      }
    }
    if(leaks)return{ok:false,reason:'open-component'};
    if(tail<minPixels)return{ok:false,reason:'tiny-component'};
    if(tail>width*height*.65)return{ok:false,reason:'background-component'};
    return{ok:true,pixels:queue.slice(0,tail),bounds:{left,top,right,bottom}};
  }
  function sourceSprite(source,width,height,indices,fill,outline=2){
    const owned=new Set(indices),edge=new Set(),amount=Math.max(0,Math.min(3,outline));
    let left=width,top=height,right=0,bottom=0;
    for(const index of indices){const x=index%width,y=Math.floor(index/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      if(owned.has(index-1)&&owned.has(index+1)&&owned.has(index-width)&&owned.has(index+width))continue;
      for(let dy=-amount;dy<=amount;dy++)for(let dx=-amount;dx<=amount;dx++){
        const xx=x+dx,yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=height)continue;const at=yy*width+xx,p=at*4;
        const r=source[p],g=source[p+1],b=source[p+2];
        if(!owned.has(at)&&source[p+3]>100&&Math.max(r,g,b)<100&&Math.max(r,g,b)-Math.min(r,g,b)<=24)edge.add(at);
      }
    }
    left=Math.max(0,left-amount);top=Math.max(0,top-amount);right=Math.min(width-1,right+amount);bottom=Math.min(height-1,bottom+amount);
    const w=right-left+1,h=bottom-top+1,result=new Uint8ClampedArray(w*h*4),paint=rgb(fill);
    for(const index of [...owned,...edge]){const x=index%width,y=Math.floor(index/width),to=((y-top)*w+x-left)*4,from=index*4;
      if(owned.has(index)){result[to]=paint[0];result[to+1]=paint[1];result[to+2]=paint[2];result[to+3]=255;}
      else{result[to]=source[from];result[to+1]=source[from+1];result[to+2]=source[from+2];result[to+3]=source[from+3];}
    }
    // Keep small enclosed white eye/highlight details unchanged. These are not
    // additional body masks or paint regions. Outside/context white pixels
    // (including a neighbouring animal) remain transparent in the sprite.
    const outside=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
    const add=(x,y)=>{const at=y*w+x;if(!outside[at]&&!result[at*4+3]){outside[at]=1;queue[tail++]=at;}};
    for(let x=0;x<w;x++){add(x,0);add(x,h-1);}for(let y=1;y<h-1;y++){add(0,y);add(w-1,y);}
    while(head<tail){const at=queue[head++],x=at%w,y=Math.floor(at/w);for(const[xx,yy]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(xx>=0&&xx<w&&yy>=0&&yy<h)add(xx,yy);}
    const detailSeen=new Set();let detailPixels=0;
    for(let at=0;at<w*h;at++){
      if(outside[at]||result[at*4+3]||detailSeen.has(at))continue;
      const pending=[at],part=[];detailSeen.add(at);
      while(pending.length){const n=pending.pop(),x=n%w,y=Math.floor(n/w),p=((y+top)*width+x+left)*4;
        if(source[p+3]<200||Math.min(source[p],source[p+1],source[p+2])<242||Math.max(source[p],source[p+1],source[p+2])-Math.min(source[p],source[p+1],source[p+2])>12)continue;
        part.push(n);for(const[xx,yy]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){const k=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&!outside[k]&&!result[k*4+3]&&!detailSeen.has(k)){detailSeen.add(k);pending.push(k);}}
      }
      if(part.length<=256)for(const n of part){const x=n%w,y=Math.floor(n/w),from=((y+top)*width+x+left)*4,to=n*4;result[to]=source[from];result[to+1]=source[from+1];result[to+2]=source[from+2];result[to+3]=source[from+3];detailPixels++;}
    }
    return{pixels:result,width:w,height:h,left,top,detailPixels};
  }
  // Rasterize authored closed source contours at pixel centres. Disconnected
  // parts belong to one object; explicit holes never become clickable paint.
  function polygonRegion(width,height,mask){
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)return{ok:false,reason:'invalid-raster'};
    const valid=ring=>Array.isArray(ring)&&ring.length>=3&&ring.length<=12000&&ring.every(p=>Array.isArray(p)&&p.length===2&&p.every(finite)&&p.every(n=>n>=0&&n<=100));
    if(!Array.isArray(mask?.polygons)||!mask.polygons.length||!mask.polygons.every(valid)||mask.holes&&!mask.holes.every(valid))return{ok:false,reason:'invalid-contour'};
    const owned=new Uint8Array(width*height);
    function draw(ring,value){const points=ring.map(([x,y])=>[x*width/100,y*height/100]);
      const low=Math.max(0,Math.ceil(Math.min(...points.map(p=>p[1]))-.5)),high=Math.min(height-1,Math.floor(Math.max(...points.map(p=>p[1]))-.5));
      for(let y=low;y<=high;y++){const cy=y+.5,hits=[];for(let j=0,k=points.length-1;j<points.length;k=j++){
        const a=points[k],b=points[j];if((a[1]<=cy&&b[1]>cy)||(b[1]<=cy&&a[1]>cy))hits.push(a[0]+(cy-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
        hits.sort((a,b)=>a-b);for(let j=0;j+1<hits.length;j+=2){const lo=Math.max(0,Math.ceil(hits[j]-.5)),hi=Math.min(width-1,Math.ceil(hits[j+1]-.5)-1);for(let x=lo;x<=hi;x++)owned[y*width+x]=value;}}
    }
    mask.polygons.forEach(p=>draw(p,1));(mask.holes||[]).forEach(p=>draw(p,0));
    const pixels=[];let left=width,top=height,right=0,bottom=0;
    for(let at=0;at<owned.length;at++)if(owned[at]){pixels.push(at);const x=at%width,y=Math.floor(at/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    if(pixels.length<16||pixels.length>width*height*.65)return{ok:false,reason:'unusable-contour-area'};
    return{ok:true,pixels,bounds:{left,top,right,bottom}};
  }
  function contourSprite(source,width,height,indices){
    let left=width,top=height,right=0,bottom=0;for(const at of indices){left=Math.min(left,at%width);right=Math.max(right,at%width);top=Math.min(top,Math.floor(at/width));bottom=Math.max(bottom,Math.floor(at/width));}
    const w=right-left+1,h=bottom-top+1,pixels=new Uint8ClampedArray(w*h*4);
    for(const at of indices){const to=((Math.floor(at/width)-top)*w+at%width-left)*4;pixels.set(source.subarray(at*4,at*4+4),to);}
    return{pixels,width:w,height:h,left,top};
  }
  function contourPaintIndices(source,width,height,indices,preserveInk=true){
    const owned=new Set(indices),dark=at=>{const p=at*4,r=source[p],g=source[p+1],b=source[p+2];return Math.max(r,g,b)<105&&Math.max(r,g,b)-Math.min(r,g,b)<=40;};
    // A solid black cave painting is a fillable shape, whereas facial/outline
    // ink within a coloured figure remains untouched.
    const keepInk=preserveInk&&indices.filter(dark).length/indices.length<.65;
    return indices.filter(at=>{const x=at%width,y=Math.floor(at/width);return x>0&&x<width-1&&y>0&&y<height-1&&owned.has(at-1)&&owned.has(at+1)&&owned.has(at-width)&&owned.has(at+width)&&!(keepInk&&dark(at));});
  }
  function mount({host,pack,img,say:speak,cancelSpeech=()=>{},onComplete=()=>{},onReady=()=>{}}={}){
    const text=(value,name)=>{if(typeof value!=='string'||!value.trim())throw new TypeError('Reading scene needs '+name+'.');return value.trim();};
    if(!host?.querySelectorAll||typeof img!=='function')throw new TypeError('Reading scene needs its host and image renderer.');
    if(!['A','B'].includes(pack?.level)||!Number.isInteger(pack.week)||pack.week<1||pack.week>4)throw new TypeError('Reading scene is available only for reviewed A/B weeks.');
    const config=copy(pack),scene=config.scene,items=config.items;
    text(config.title,'a title');text(scene?.imageKey,'a source picture');text(scene?.alt,'source picture description');
    if(!Number.isInteger(scene.width)||!Number.isInteger(scene.height)||scene.width<10||scene.height<10||scene.preparedForPlacement!==true)throw new TypeError('Reading requires exact prepared source dimensions.');
    if(!Array.isArray(items)||!items.length||items.length>12||new Set(items.map(i=>i.id)).size!==items.length)throw new TypeError('Reading needs distinct source objects.');
    const validPoint=p=>p&&finite(p.x)&&finite(p.y)&&p.x>=0&&p.x<100&&p.y>=0&&p.y<100;
    const validBox=b=>b&&finite(b.x)&&finite(b.y)&&finite(b.width)&&finite(b.height)&&b.x>=0&&b.y>=0&&b.width>0&&b.height>0&&b.x+b.width<=100&&b.y+b.height<=100;
    for(const item of items){text(item.id,'an object ID');text(item.label,'an object label');if(item.speech)text(item.speech,'its source model');
      if(item.mask){const contour=Array.isArray(item.mask.polygons);if(!validBox(item.mask.bounds)||!color(item.mask.fill)||contour&&!polygonRegion(scene.width,scene.height,item.mask).ok||!contour&&(!Array.isArray(item.mask.seeds)||!item.mask.seeds.length||!item.mask.seeds.every(validPoint)))throw new TypeError('Source objects need explicit closed contours or bounded seeds and a fill.');}
      else{const target=item.target;text(item.imageKey,'a transparent object picture');if(!target||!finite(target.x)||!finite(target.y)||!finite(target.width)||!finite(target.height)||target.width<=0||target.height<=0||target.x-target.width/2<0||target.y-target.height/2<0||target.x+target.width/2>100||target.y+target.height/2>100)throw new TypeError('Object target is outside the source scene.');}
    }
    const findTasks=config.findTasks||[];
    if(!Array.isArray(findTasks)||new Set(findTasks.map(t=>t.id)).size!==findTasks.length)throw new TypeError('Find tasks need distinct IDs.');
    for(const task of findTasks){text(task.id,'a find task ID');text(task.sourceText,'an exact book line');text(task.prompt,'a find instruction');if(!Array.isArray(task.targetIds)||!task.targetIds.length||new Set(task.targetIds).size!==task.targetIds.length||task.targetIds.some(id=>!items.some(i=>i.id===id)))throw new TypeError('Find targets must be distinct source objects.');}
    const coloring=config.coloring||{};
    const vector=Array.isArray(coloring.regions)&&coloring.regions.every(r=>r.path),declaredMasks=Array.isArray(coloring.regions)&&coloring.regions.length===items.length&&coloring.regions.every(r=>r.mask&&items.some(i=>i.id===r.id&&JSON.stringify(i.mask)===JSON.stringify(r.mask)));
    if(!vector&&coloring.useItemMasks!==true&&!declaredMasks)throw new TypeError('Coloring needs explicit closed source regions.');
    if(vector){if(!coloring.regions.length||coloring.width!==scene.width||coloring.height!==scene.height||new Set(coloring.regions.map(r=>r.id)).size!==coloring.regions.length)throw new TypeError('Coloring needs the same source dimensions and distinct regions.');
      for(const region of coloring.regions){text(region.id,'a color region ID');text(region.label,'a color region label');if(typeof region.path!=='string'||region.path.length>30000||!/^[MmLlHhVvCcSsQqTtAaZz0-9+.,\s-]+$/.test(region.path)||!/[zZ]\s*$/.test(region.path)||region.initialFill&&!color(region.initialFill))throw new TypeError('Color regions must be closed SVG paths.');}
    }else if(items.some(item=>!item.mask))throw new TypeError('Raster coloring requires explicit item masks.');
    const launchers=[...host.querySelectorAll('[data-reading-scene-open]')];if(!launchers.length)throw new TypeError('Reading scene needs its launcher.');
    const make=(tag,cls,content,parent)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)e.textContent=content;if(parent)parent.append(e);return e;};
    const button=(cls,content,parent,label)=>{const e=make('button',cls,content,parent);e.type='button';e.setAttribute('data-no-click-sound','');if(label)e.setAttribute('aria-label',label);return e;};
    const picture=(key,alt)=>{const box=make('div');box.innerHTML=img(key,alt);const e=box.querySelector('img');if(!e||!e.getAttribute('src'))throw new TypeError('Reading source picture is unavailable: '+key);e.alt=alt;e.draggable=false;e.decoding='async';return e;};
    const sourceImage=picture(scene.imageKey,scene.alt),directPictures=new Map(items.filter(i=>!i.mask).map(i=>[i.id,picture(i.imageKey,i.label).getAttribute('src')]));
    const outlineImage=coloring.outlineImageKey?picture(coloring.outlineImageKey,'Book picture outlines').getAttribute('src'):null;
    mounted?.();
    const modal=make('dialog','mrscene'),labelId='m10-reading-scene-'+(++serial);modal.setAttribute('aria-labelledby',labelId);modal.setAttribute('data-reading-scene','');modal.dataset.level=config.level.toLowerCase();
    const panel=make('section','mrscene__dialog',undefined,modal),head=make('header','mrscene__head',undefined,panel);
    make('h2','',config.title,head).id=labelId;const closeButton=button('mrscene__close','✕',head,'Close reading activity');
    const tabs=make('div','mrscene__tabs',undefined,panel);tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Reading activities');
    const modes=[['place','Place the pictures'],['color','Color the picture'],...(findTasks.length?[['find','Listen and Find']]:[])];
    const tabButtons=modes.map(([id,label])=>{const e=button('mrscene__tab',label,tabs);e.dataset.sceneMode=id;e.setAttribute('role','tab');return e;});
    const body=make('div','mrscene__body',undefined,panel);body.id=labelId+'-panel';body.setAttribute('role','tabpanel');for(let i=0;i<tabButtons.length;i++){tabButtons[i].id=labelId+'-tab-'+i;tabButtons[i].setAttribute('aria-controls',body.id);}document.body.append(modal);
    let disposed=false,ready=false,active=false,mode='place',epoch=0,renderEpoch=0,selected=null,drag=null,returnFocus=null,renderDispose=()=>{},resizeObserver=null;
    let sourcePixels=null,colorBasePixels=null,placementScene=null,sourceCanvas=null,coloredScene=null,maskLabels=null,colorFinished=false,selectedColor=0,erase=false,findIndex=0,abortLoad=null;
    const prepared=new Map(),placed=new Map(),painted=new Map(),history=[],findFound=new Map(),listeners=[],jobs=new Set();
    const listen=(e,name,handler)=>{e.addEventListener(name,handler);listeners.push(()=>e.removeEventListener(name,handler));};
    const live=()=>!disposed&&active&&modal.open&&!document.hidden&&host.isConnected;
    const q=s=>body.querySelector(s),all=s=>[...body.querySelectorAll(s)];
    const feedback=(message,kind='')=>{const e=q('[data-scene-feedback]');if(e){e.textContent=message;e.dataset.kind=kind;}};
    function stopSpeech(){epoch++;for(const job of jobs){job.control?.classList.remove('is-speaking');job.control?.removeAttribute('aria-busy');}jobs.clear();try{cancelSpeech();}catch{}}
    function say(message,control){if(!live()||!message)return;stopSpeech();const stamp=epoch,job={control};jobs.add(job);control?.classList.add('is-speaking');control?.setAttribute('aria-busy','true');
      const finish=()=>{if(!jobs.has(job))return;jobs.delete(job);control?.classList.remove('is-speaking');control?.removeAttribute('aria-busy');if(stamp!==epoch||!live())return;};
      try{if(typeof speak==='function')speak(message,finish);else finish();}catch{finish();}
    }
    function notify(){if(disposed)return;try{onComplete({placementComplete:placed.size===items.length,colorFinished,findComplete:findTasks.length>0&&findTasks.every(t=>findFound.get(t.id)?.size===t.targetIds.length)});}catch{}}
    function clearDrag(clearSelection=false){const old=drag;drag=null;if(old){old.ghost?.remove();old.button?.classList.remove('is-lifting');try{if(old.button.hasPointerCapture?.(old.pointer))old.button.releasePointerCapture(old.pointer);}catch{}}
      all('.is-over').forEach(e=>e.classList.remove('is-over'));if(clearSelection){selected=null;all('[data-scene-piece]').forEach(e=>e.setAttribute('aria-pressed','false'));}
    }
    function canvasOf(width,height,pixels){const canvas=make('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas is unavailable.');if(pixels){const image=ctx.createImageData(width,height);image.data.set(pixels);ctx.putImageData(image,0,0);}return canvas;}
    function paintPixels(fills,base=sourcePixels){const result=new Uint8ClampedArray(base);for(const[id,value]of fills){const item=prepared.get(id);if(!item?.indices)continue;const paint=rgb(value);for(const index of item.paintIndices||item.indices){const at=index*4;result[at]=paint[0];result[at+1]=paint[1];result[at+2]=paint[2];}}return result;}
    async function prepare(){
      if(disposed)return false;
      if(sourceImage.complete&&sourceImage.naturalWidth>0){}else await new Promise((resolve,reject)=>{abortLoad=()=>reject(new Error('Source picture preparation was cancelled.'));sourceImage.onload=()=>{abortLoad=null;resolve();};sourceImage.onerror=()=>{abortLoad=null;reject(new Error('Source picture did not load.'));};});
      if(disposed)return false;if(sourceImage.naturalWidth!==scene.width||sourceImage.naturalHeight!==scene.height)throw new Error('Source picture dimensions differ from the reviewed pack.');
      sourceCanvas=canvasOf(scene.width,scene.height);const ctx=sourceCanvas.getContext('2d');ctx.drawImage(sourceImage,0,0);sourcePixels=ctx.getImageData(0,0,scene.width,scene.height).data;
      maskLabels=new Int16Array(scene.width*scene.height);maskLabels.fill(-1);
      for(let number=0;number<items.length;number++){const item=items[number];
        if(number&&typeof window.requestAnimationFrame==='function')await new Promise(resolve=>window.requestAnimationFrame(resolve));
        if(disposed)return false;
        if(item.mask){const contour=Array.isArray(item.mask.polygons),indices=new Set();if(contour){const region=polygonRegion(scene.width,scene.height,item.mask);if(!region.ok)throw new Error('Unusable source contour '+item.id);for(const index of region.pixels)indices.add(index);}else for(const seed of item.mask.seeds){const region=whiteRegion(sourcePixels,scene.width,scene.height,seed,item.mask.bounds,item.mask);if(!region.ok)throw new Error('Unusable source mask '+item.id+': '+region.reason);for(const index of region.pixels)indices.add(index);}
          if(item.sourceComponentPixels!==undefined&&indices.size!==item.sourceComponentPixels)throw new Error('Source mask count differs from its reviewed component.');
          for(const index of indices){if(maskLabels[index]>=0)throw new Error('Two objects own the same white source region.');maskLabels[index]=number;}
          const list=[...indices],sprite=contour&&item.mask.spriteStyle!=='fill-white'?contourSprite(sourcePixels,scene.width,scene.height,list):sourceSprite(sourcePixels,scene.width,scene.height,list,item.mask.fill,item.mask.outlinePixels??2),canvas=canvasOf(sprite.width,sprite.height,sprite.pixels);
          prepared.set(item.id,{...item,indices:list,paintIndices:contour?contourPaintIndices(sourcePixels,scene.width,scene.height,list,item.mask.preserveInk!==false):list,url:canvas.toDataURL('image/png'),target:{x:(sprite.left+sprite.width/2)/scene.width*100,y:(sprite.top+sprite.height/2)/scene.height*100,width:sprite.width/scene.width*100,height:sprite.height/scene.height*100}});
        }else prepared.set(item.id,{...item,url:directPictures.get(item.id)});
      }
      colorBasePixels=paintPixels(new Map(items.filter(i=>i.mask?.polygons).map(i=>[i.id,'#ffffff'])));
      placementScene=items.some(i=>i.mask?.polygons)?canvasOf(scene.width,scene.height,colorBasePixels).toDataURL('image/png'):sourceImage.getAttribute('src');
      coloredScene=canvasOf(scene.width,scene.height,paintPixels(new Map(items.filter(i=>i.mask&&(!i.mask.polygons||i.mask.spriteStyle==='fill-white')).map(i=>[i.id,i.mask.fill])))).toDataURL('image/png');
      if(disposed)return false;ready=true;launchers.forEach(e=>{e.disabled=false;e.removeAttribute('disabled');e.removeAttribute('aria-disabled');});try{onReady(true);}catch{}return true;
    }
    const readyPromise=Promise.resolve().then(prepare).catch(error=>{if(!disposed){ready=false;try{onReady(false,error.message);}catch{}}return false;});
    function fit(viewport,surface){const r=viewport.getBoundingClientRect(),size=fitRect(r.width,r.height,scene.width/scene.height);if(size.width){surface.style.width=size.width+'px';surface.style.height=size.height+'px';}}
    function watch(viewport,surface){let prior='';const update=()=>{if(disposed||!surface.isConnected)return;const r=viewport.getBoundingClientRect(),now=r.width+':'+r.height;if(prior&&prior!==now)clearDrag();prior=now;fit(viewport,surface);};
      if(typeof ResizeObserver==='function'){resizeObserver=new ResizeObserver(update);resizeObserver.observe(viewport);}window.addEventListener('resize',update);update();return()=>{resizeObserver?.disconnect();resizeObserver=null;window.removeEventListener('resize',update);};
    }
    function common(title,instruction){
      const description=make('div','mrscene__instruction',undefined,body),heading=make('h3','',title,description);heading.tabIndex=-1;make('p','',instruction,description);
      const status=make('p','mrscene__feedback','',body);status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('data-scene-feedback','');return{description,status,heading};
    }
    function sceneFrame(parent,url,alt){const viewport=make('div','mrscene__viewport',undefined,parent),surface=make('div','mrscene__surface',undefined,viewport);viewport.style.setProperty('--scene-ratio',scene.width+'/'+scene.height);
      const image=make('img','mrscene__book',undefined,surface);image.src=url;image.alt=alt;image.draggable=false;surface.style.setProperty('--scene-ratio',scene.width+'/'+scene.height);return{viewport,surface,image,unwatch:watch(viewport,surface)};
    }
    function targetButton(item,parent,label){const target=item.target,e=button('mrscene__target','',parent,label);e.dataset.sceneTarget=item.id;e.style.left=(target.x-target.width/2)+'%';e.style.top=(target.y-target.height/2)+'%';e.style.width=target.width+'%';e.style.height=target.height+'%';
      const wash=make('span','mrscene__target-wash',undefined,e);wash.style.setProperty('--object-mask',`url("${item.url}")`);wash.setAttribute('aria-hidden','true');return e;
    }
    function scenePoint(event,surface){const r=surface.getBoundingClientRect();return{x:(event.clientX-r.left)/r.width*100,y:(event.clientY-r.top)/r.height*100,rect:r};}
    function targetAt(point){
      if(point.x<0||point.x>=100||point.y<0||point.y>=100)return null;
      const x=Math.floor(point.x*scene.width/100),y=Math.floor(point.y*scene.height/100),at=y*scene.width+x;
      if(maskLabels?.[at]>=0)return items[maskLabels[at]].id;
      // A small edge tolerance helps touch input, but overlapping semantic
      // candidates are rejected rather than silently selecting a neighbour.
      if(maskLabels){const reach=Math.min(40,Math.max(2,Math.round(8*scene.width/point.rect.width))),candidates=new Map();
        for(let dy=-reach;dy<=reach;dy++)for(let dx=-reach;dx<=reach;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=scene.width||yy<0||yy>=scene.height||dx*dx+dy*dy>reach*reach)continue;const owner=maskLabels[yy*scene.width+xx];if(owner>=0)candidates.set(owner,Math.min(candidates.get(owner)??Infinity,dx*dx+dy*dy));}
        if(candidates.size===1)return items[[...candidates.keys()][0]].id;if(candidates.size>1)return null;
      }
      const targets=[...prepared.values()].filter(i=>!i.mask&&Math.abs(point.x-i.target.x)<=i.target.width/2&&Math.abs(point.y-i.target.y)<=i.target.height/2);return targets.length===1?targets[0].id:null;
    }
    function renderPlace(){
      const stamp=renderEpoch,{heading}=common('Place the pictures','Pick up a picture and put it back into its empty space. You can also tap a picture, then its space.');
      const work=make('div','mrscene__workbench',undefined,body),frame=sceneFrame(work,placementScene,scene.alt),tray=make('div','mrscene__tray',undefined,work);tray.setAttribute('role','group');tray.setAttribute('aria-label','Pictures to place');
      const progress=make('strong','mrscene__progress','',body);progress.setAttribute('data-scene-progress','');progress.setAttribute('aria-live','polite');
      const tools=make('div','mrscene__tools',undefined,body),reset=button('mrscene__action','↻ Start again',tools),listenButton=button('mrscene__action','🔊 Listen',tools,'Listen to the selected picture');
      const targets=new Map(),pieces=new Map();
      const listenable=()=>selected?prepared.get(selected):[...prepared.values()].find(i=>!placed.has(i.id)&&i.speech)||[...prepared.values()].find(i=>i.speech);
      const update=()=>{progress.textContent=placed.size+' / '+items.length+' pictures placed';for(const[id,e]of pieces){e.disabled=[...placed.values()].includes(id);e.setAttribute('aria-pressed',String(selected===id));e.classList.toggle('is-placed',e.disabled);}for(const[id,e]of targets)e.classList.toggle('is-placed',placed.has(id));listenButton.disabled=!listenable()?.speech;};
      const restore=(targetId,itemId)=>{const object=prepared.get(itemId),target=prepared.get(targetId).target,image=make('img','mrscene__placed',undefined,frame.surface);image.src=object.url;image.alt=object.label+' placed';image.draggable=false;image.style.left=(target.x-target.width/2)+'%';image.style.top=(target.y-target.height/2)+'%';image.style.width=target.width+'%';image.style.height=target.height+'%';};
      function pick(id,control){if(!live()||stamp!==renderEpoch||[...placed.values()].includes(id))return;stopSpeech();selected=id;update();const object=prepared.get(id);feedback('Find the matching empty space for '+object.label+'.');say(object.speech,control);}
      function place(targetId,itemId=selected){if(!live()||stamp!==renderEpoch)return;if(!itemId){feedback('Choose a picture first.');return;}if(placed.has(targetId)){feedback('That picture is already in place.');return;}if([...placed.values()].includes(itemId))return;
        const object=prepared.get(itemId),target=prepared.get(targetId),match=itemId===targetId||object.group&&object.group===target.group;
        if(!match){targets.get(targetId)?.classList.add('is-wrong');feedback('Try another space. Match the picture and its outline.','try');return;}
        placed.set(targetId,itemId);selected=null;restore(targetId,itemId);targets.get(targetId)?.classList.remove('is-wrong');update();feedback(placed.size===items.length?'Wonderful! The book picture is complete.':object.speech||object.label+' is in place.','good');say(object.speech,targets.get(targetId));notify();
      }
      for(const item of prepared.values()){const target=targetButton(item,frame.surface,'Place a picture at '+item.label);targets.set(item.id,target);target.onclick=event=>{const id=event?.detail>0?targetAt(scenePoint(event,frame.surface)):item.id;if(id)place(id);else feedback('Tap inside the matching empty picture outline.');};target.onpointerdown=()=>all('.is-wrong').forEach(e=>e.classList.remove('is-wrong'));
        const piece=button('mrscene__piece','',tray,'Pick up '+item.label),image=make('img','',undefined,piece);image.src=item.url;image.alt=item.label;image.draggable=false;make('span','',item.label,piece);piece.dataset.scenePiece=item.id;pieces.set(item.id,piece);let suppressUntil=0;
        piece.onclick=event=>{if((event?.detail||0)>0&&performance.now()<suppressUntil)return;pick(item.id,piece);};
        piece.onpointerdown=event=>{if(event.button>0||event.isPrimary===false||!live()||piece.disabled||stamp!==renderEpoch)return;clearDrag();pick(item.id,piece);suppressUntil=performance.now()+450;drag={id:item.id,button:piece,pointer:event.pointerId,x:event.clientX,y:event.clientY,stamp,ghost:null};try{piece.setPointerCapture(event.pointerId);}catch{};};
        piece.onpointermove=event=>{if(!drag||drag.button!==piece||event.pointerId!==drag.pointer||!live()||drag.stamp!==renderEpoch)return;
          if(!drag.ghost&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>5){const box=targets.get(item.id).getBoundingClientRect(),ghost=make('div','mrscene__ghost',undefined,modal),clone=make('img','',undefined,ghost);clone.src=item.url;clone.alt='';ghost.setAttribute('aria-hidden','true');ghost.style.width=box.width+'px';ghost.style.height=box.height+'px';drag.ghost=ghost;piece.classList.add('is-lifting');}
          if(drag.ghost){event.preventDefault?.();drag.ghost.style.left=event.clientX+'px';drag.ghost.style.top=event.clientY+'px';all('.is-over').forEach(e=>e.classList.remove('is-over'));const id=targetAt(scenePoint(event,frame.surface));targets.get(id)?.classList.add('is-over');}
        };
        piece.onpointerup=event=>{if(!drag||drag.button!==piece||event.pointerId!==drag.pointer)return;const moved=!!drag.ghost;if(moved){suppressUntil=performance.now()+450;const id=targetAt(scenePoint(event,frame.surface));if(id)place(id,item.id);else feedback('Move the picture inside its matching empty space.','try');}clearDrag();};
        piece.onpointercancel=piece.onlostpointercapture=event=>{if(drag?.button===piece&&drag.pointer===event.pointerId)clearDrag(true);};
      }
      frame.surface.onpointerdown=event=>{if(event.button>0||event.isPrimary===false||event.target.closest?.('button'))return;const id=targetAt(scenePoint(event,frame.surface));if(id)place(id);};
      for(const[targetId,itemId]of placed)restore(targetId,itemId);update();
      reset.onclick=()=>{if(!live())return;stopSpeech();clearDrag(true);placed.clear();notify();render();};listenButton.onclick=()=>say(listenable()?.speech,listenButton);
      renderDispose=()=>{frame.unwatch();frame.surface.onpointerdown=null;for(const e of [...targets.values(),...pieces.values(),reset,listenButton])e.onclick=e.onpointerdown=e.onpointermove=e.onpointerup=e.onpointercancel=e.onlostpointercapture=null;};heading.focus({preventScroll:true});
    }
    function renderColor(){
      const stamp=renderEpoch,{heading}=common('Color the picture','Choose a color, then tap inside an outlined picture. You can change your colors.');
      const work=make('div','mrscene__colorbench',undefined,body),palette=make('div','mrscene__palette',undefined,work);palette.setAttribute('role','group');palette.setAttribute('aria-label','Choose a color');
      const frame=sceneFrame(work,sourceImage.getAttribute('src'),scene.alt),tools=make('div','mrscene__tools',undefined,body),undo=button('mrscene__action','↶ Undo',tools),eraser=button('mrscene__action','Eraser',tools),reset=button('mrscene__action','↻ Start again',tools),finish=button('mrscene__action mrscene__finish',"I'm finished! ★",tools);
      let canvas=null,svg=null;const regionNodes=new Map();
      if(vector){frame.image.hidden=true;svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${coloring.width} ${coloring.height}`);svg.classList.add('mrscene__color-svg');frame.surface.append(svg);
        for(const region of coloring.regions){const node=document.createElementNS('http://www.w3.org/2000/svg','path');node.setAttribute('d',region.path);node.setAttribute('stroke','#253b42');node.setAttribute('stroke-width',String(coloring.strokeWidth||3));node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label','Color '+region.label);node.dataset.colorRegion=region.id;svg.append(node);regionNodes.set(region.id,node);}
        if(outlineImage){const image=document.createElementNS('http://www.w3.org/2000/svg','image');image.setAttribute('href',outlineImage);image.setAttribute('width',String(coloring.width));image.setAttribute('height',String(coloring.height));image.setAttribute('pointer-events','none');svg.append(image);}
      }else{canvas=canvasOf(scene.width,scene.height);canvas.className='mrscene__color-canvas';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Color the objects in the book picture');frame.surface.append(canvas);frame.image.hidden=true;}
      const regionChoices=make('div','mrscene__region-choices is-keyboard-fallback',undefined,body);regionChoices.setAttribute('role','group');regionChoices.setAttribute('aria-label','Color a picture');
      const regions=vector?coloring.regions:items.map(i=>({id:i.id,label:i.label}));
      function draw(){if(canvas){const ctx=canvas.getContext('2d'),image=ctx.createImageData(scene.width,scene.height);image.data.set(paintPixels(painted,colorBasePixels));ctx.putImageData(image,0,0);}else for(const region of regions)regionNodes.get(region.id).setAttribute('fill',painted.get(region.id)||region.initialFill||'#ffffff');
        undo.disabled=!history.length;finish.disabled=!painted.size;eraser.setAttribute('aria-pressed',String(erase));all('[data-paint-color]').forEach(e=>e.setAttribute('aria-pressed',String(!erase&&+e.dataset.paintColor===selectedColor)));}
      function fill(id){if(!live()||stamp!==renderEpoch||!regions.some(r=>r.id===id))return;const value=erase?null:COLORS[selectedColor][1],prior=painted.get(id)??null;if(prior===value)return;history.push([id,prior]);if(value)painted.set(id,value);else painted.delete(id);colorFinished=false;draw();feedback(erase?'Color erased.':COLORS[selectedColor][0]+'! You can color another picture.','good');notify();}
      COLORS.forEach(([name,value],index)=>{const e=button('mrscene__swatch','',palette,name),dot=make('span','',undefined,e);dot.style.background=value;dot.setAttribute('aria-hidden','true');make('small','',name,e);e.dataset.paintColor=String(index);e.onclick=()=>{if(!live())return;selectedColor=index;erase=false;draw();feedback(name+' selected. Tap a picture.');};});
      for(const region of regions){const e=button('mrscene__region-choice',region.label,regionChoices,'Color '+region.label);e.dataset.paintRegion=region.id;e.onclick=()=>fill(region.id);if(vector){const node=regionNodes.get(region.id);node.onclick=()=>fill(region.id);node.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();fill(region.id);}};}}
      if(canvas)canvas.onpointerdown=event=>{if(event.button>0||event.isPrimary===false)return;const id=targetAt(scenePoint(event,frame.surface));if(id)fill(id);else feedback('Tap inside one of the outlined pictures.');};
      undo.onclick=()=>{if(!live()||!history.length)return;const[id,prior]=history.pop();if(prior)painted.set(id,prior);else painted.delete(id);colorFinished=false;draw();feedback('Last color undone.');notify();};
      eraser.onclick=()=>{if(!live())return;erase=!erase;draw();feedback(erase?'Eraser selected. Tap a picture to remove its color.':COLORS[selectedColor][0]+' selected.');};
      reset.onclick=()=>{if(!live())return;stopSpeech();painted.clear();history.length=0;colorFinished=false;erase=false;draw();feedback('Your picture is ready for new colors.');notify();};
      finish.onclick=()=>{if(!live()||!painted.size)return;colorFinished=true;feedback('Your colorful book picture is ready!','good');say('Your colorful picture is ready!',finish);notify();};
      draw();feedback(painted.size?'Your colors are still here. Keep coloring!':'Choose a color and tap an outlined picture.');
      renderDispose=()=>{frame.unwatch();if(canvas)canvas.onpointerdown=null;for(const node of regionNodes.values())node.onclick=node.onkeydown=null;all('button').forEach(e=>e.onclick=null);};heading.focus({preventScroll:true});
    }
    function renderFind(){
      const stamp=renderEpoch,task=findTasks[findIndex],found=findFound.get(task.id)||new Set();findFound.set(task.id,found);
      const{description,heading}=common(task.prompt,'Listen to the book words, then find the matching picture.');
      const phrase=make('p','mrscene__book-line',task.sourceText,description),listenButton=button('mrscene__action','🔊 Listen',description,'Listen to the book sentence');
      const work=make('div','mrscene__findbench',undefined,body),frame=sceneFrame(work,coloredScene,scene.alt),progress=make('strong','mrscene__progress','',body),tools=make('div','mrscene__tools',undefined,body),reset=button('mrscene__action','↻ Start again',tools),next=button('mrscene__action','Continue →',tools);
      progress.setAttribute('aria-live','polite');progress.setAttribute('data-find-progress','');const targets=new Map();
      const update=()=>{progress.textContent=found.size+' / '+task.targetIds.length+' found';next.hidden=found.size!==task.targetIds.length||findIndex===findTasks.length-1;for(const[id,e]of targets){e.classList.toggle('is-found',found.has(id));e.setAttribute('aria-pressed',String(found.has(id)));}};
      function find(id){if(!live()||stamp!==renderEpoch)return;if(!task.targetIds.includes(id)){targets.get(id)?.classList.add('is-wrong');feedback('Listen again. Find the matching picture.','try');return;}if(found.has(id)){feedback('You already found this picture. Find another one in the group.');return;}found.add(id);targets.get(id)?.classList.remove('is-wrong');update();feedback(found.size===task.targetIds.length?(findIndex===findTasks.length-1?'All pictures found! Wonderful reading.':task.sourceText):'Found! Keep looking for the rest of the group.','good');if(found.size===task.targetIds.length)say(task.sourceText,listenButton);notify();}
      for(const item of prepared.values()){const e=targetButton(item,frame.surface,'Find '+item.label);e.dataset.findTarget=item.id;e.onclick=event=>{const id=event?.detail>0?targetAt(scenePoint(event,frame.surface)):item.id;if(id)find(id);else feedback('Tap inside one picture.');};targets.set(item.id,e);}
      frame.surface.onpointerdown=event=>{if(event.button>0||event.isPrimary===false||event.target.closest?.('button'))return;const id=targetAt(scenePoint(event,frame.surface));if(id)find(id);else feedback('Tap inside one picture.');};
      listenButton.onclick=()=>say(task.sourceText,listenButton);reset.onclick=()=>{if(!live())return;stopSpeech();findFound.clear();findIndex=0;notify();render();};next.onclick=()=>{if(!live()||found.size!==task.targetIds.length||findIndex>=findTasks.length-1)return;stopSpeech();findIndex++;render();};update();
      renderDispose=()=>{frame.unwatch();frame.surface.onpointerdown=null;listenButton.onclick=reset.onclick=next.onclick=null;for(const e of targets.values())e.onclick=null;};heading.focus({preventScroll:true});
    }
    function render(){if(!live()||!ready)return;renderEpoch++;stopSpeech();clearDrag(true);renderDispose();renderDispose=()=>{};body.replaceChildren();for(const e of tabButtons){e.setAttribute('aria-selected',String(e.dataset.sceneMode===mode));e.tabIndex=e.dataset.sceneMode===mode?0:-1;if(e.dataset.sceneMode===mode)body.setAttribute('aria-labelledby',e.id);}if(mode==='place')renderPlace();else if(mode==='color')renderColor();else renderFind();}
    function open(event){if(disposed||!ready||document.hidden||!host.isConnected)return;const launcher=event?.currentTarget;
      if(launcher?.disabled||launcher?.dataset.sourcePageActive==='false'||!launcher&&launchers.every(e=>e.dataset.sourcePageActive==='false'))return;
      const requested=typeof event==='string'?event:launcher?.dataset.readingSceneOpen;if(requested&&modes.some(([id])=>id===requested))mode=requested;
      if(modal.open){if(requested)render();return;}returnFocus=launcher||document.activeElement;document.querySelectorAll('video').forEach(e=>{try{e.pause();}catch{}});active=true;modal.showModal();render();}
    function closed(){active=false;stopSpeech();clearDrag(true);if(!disposed&&!document.hidden&&host.isConnected&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
    function close(){active=false;stopSpeech();clearDrag(true);if(modal.open)modal.close();}
    for(const e of launchers){e.disabled=true;e.setAttribute('aria-disabled','true');listen(e,'click',open);}
    for(const e of tabButtons){listen(e,'click',()=>{if(!live())return;mode=e.dataset.sceneMode;render();});listen(e,'keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||!live())return;event.preventDefault();const index=tabButtons.indexOf(e),next=event.key==='Home'?0:event.key==='End'?tabButtons.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabButtons.length)%tabButtons.length;mode=tabButtons[next].dataset.sceneMode;render();tabButtons[next].focus();});}
    listen(closeButton,'click',close);listen(modal,'cancel',event=>{event.preventDefault();close();});listen(modal,'close',closed);
    listen(document,'visibilitychange',()=>{if(document.hidden){stopSpeech();clearDrag(true);}});listen(window,'pagehide',close);listen(window,'resize',()=>clearDrag());
    function dispose(){if(disposed)return;disposed=true;active=false;renderEpoch++;stopSpeech();clearDrag(true);renderDispose();listeners.splice(0).forEach(remove=>remove());abortLoad?.();abortLoad=null;sourceImage.onload=sourceImage.onerror=null;if(modal.open)modal.close();modal.remove();launchers.forEach(e=>{e.disabled=true;e.setAttribute('aria-disabled','true');});prepared.clear();sourcePixels=colorBasePixels=placementScene=sourceCanvas=coloredScene=maskLabels=null;if(mounted===dispose)mounted=null;}
    dispose.ready=readyPromise;dispose.open=open;dispose.close=close;mounted=dispose;return dispose;
  }
  window.M10ReadingScene={mount,fitRect,whiteRegion,sourceSprite,polygonRegion,contourSprite,contourPaintIndices};
})();
