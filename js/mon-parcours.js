(function(){
'use strict';
var state={products:[],settings:{}};

async function loadFormations(){
 var box=document.getElementById('formation-trainers');if(!box)return;
 try{
  var token=sessionStorage.getItem('nyxia_token')||'';if(!token)throw Error('Reconnecte-toi pour retrouver tes formations.');
  var response=await fetch('/portal-manifest.json',{cache:'no-store'});if(!response.ok)throw Error('Les formateurs de ce portail sont indisponibles.');
  var manifest=await response.json(),agents=(manifest.agents||[]).filter(function(a){return a.placement!=='hidden';});
  var results=await Promise.all(agents.map(async function(agent){var r=await fetch('/api/formation/list?token='+encodeURIComponent(token)+'&agent='+encodeURIComponent(agent.key),{cache:'no-store'}),data=await r.json();if(!r.ok)throw Error(data.error||'Formations indisponibles.');return{agent:agent,data:data};}));
  box.replaceChildren();var count=0;
  results.forEach(function(result){var list=result.data.formations||[];if(!list.length)return;count+=list.length;
   var article=document.createElement('article');article.className='card';var body=document.createElement('div');body.className='body';
   var name=document.createElement('h3');name.textContent=result.agent.name||result.agent.key;body.appendChild(name);
   list.forEach(function(formation){var title=document.createElement('p');title.textContent=formation.titre||'Formation vivante';body.appendChild(title);});
   var status=document.createElement('p');status.className='desc';status.textContent=result.data.hasProgress?'Ton parcours est commencé.':'Ta formation est prête à commencer.';body.appendChild(status);
   var button=document.createElement('button');button.className='btn primary';button.textContent=result.data.hasProgress?'Retrouver ma formation':'Ouvrir ma formation';button.onclick=function(){var chosen=list.find(function(f){return f.status==='active'})||list[0];if(!chosen)return;var payload={type:'nyxia_open_formation',agent:result.agent.key,formationId:chosen.id,status:chosen.status||''};if(window.parent!==window){window.parent.postMessage(payload,location.origin);return}location.href='/chat-'+encodeURIComponent(result.agent.key)+'.html?formationId='+encodeURIComponent(chosen.id); };body.appendChild(button);article.appendChild(body);box.appendChild(article);
  });
  if(!count)box.textContent='Aucune formation publiée dans ce portail pour le moment.';
 }catch(e){box.textContent=e.message||'Tes formations sont indisponibles pour le moment.';}
}
loadFormations();

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(p){if(p.priceLabel)return p.priceLabel;if(p.price==null||p.price==='')return'';var n=Number(p.price);if(!isFinite(n)||n<=0)return'';try{return n.toLocaleString('fr-CA',{style:'currency',currency:p.currency||'CAD'})}catch(_){return n.toFixed(2)+' $'}}
function portalName(id){var p=(state.settings.portals||[]).find(function(x){return x.id===id});return p&&p.name?p.name:(id||'NyXia')}
function media(p){p=nxParcoursPresentation(p);if(!p.imageMain&&p.videoPosition!=='hidden'&&nxProductVideoInfo(p.videoUrl))return '<span class="fallback">▶ Vidéo de présentation</span>';return p.imageMain?'<img src="'+esc(p.imageMain)+'" alt="'+esc(p.title||'')+'" loading="lazy">':'<span class="fallback">✦</span>'}
function render(list){
 var h=document.getElementById('cards');
 if(!list.length){h.innerHTML='<div class="empty">Aucune proposition publiée ne correspond à cette recherche.</div>';return}
 h.innerHTML=list.map(function(p,i){
   var d=String(p.shortDescription||p.description||'').slice(0,155);
   return '<article class="card">'
    +(p.featured?'<span class="badge">★ À découvrir</span>':'')
    +'<div class="media">'+media(p)+'</div>'
    +'<div class="body"><div class="meta"><span>'+esc(p.type||'Parcours')+'</span><span>'+esc(portalName(p.portal))+'</span></div>'
    +'<h3>'+esc(p.title||'Expérience NyXia')+'</h3>'
    +'<div class="desc">'+esc(d)+(d.length>=155?'…':'')+'</div>'
    +(money(p)?'<div class="price">'+esc(money(p))+'</div>':'')
    +'<div class="actions"><button class="btn primary" data-open="'+i+'">Découvrir dans NyXia</button></div></div></article>'
 }).join('');
 document.querySelectorAll('[data-open]').forEach(function(b){b.onclick=function(){openDetail(list[Number(b.dataset.open)])}})
}
function actionFor(p){
 var url=String(p.ctaUrl||p.systemeCheckoutUrl||'').trim();
 if(!url){
  var id=String(p.id||p.slug||'').trim();
  return{url:'https://boutique.nyxia.top/'+(id?'produit.html?id='+encodeURIComponent(id):''),label:'Voir dans la boutique'};
 }
 var label='Continuer';
 var t=String(p.ctaType||'').toLowerCase();
 if(t==='gratuit')label='Rejoindre gratuitement';
 else if(t==='rendez-vous'||t==='reservation-consultation'||t==='appel')label='Prendre rendez-vous';
 else if(Number(p.price)>0)label='Rejoindre / acheter';
 return{url:url,label:label};
}
function nxProductVideoInfo(value){
 var raw=String(value||'').trim();if(!raw)return null;
 try{
  var url=new URL(raw,'https://boutique.nyxia.top');if(url.protocol!=='https:'&&url.protocol!=='http:')return null;
  var host=url.hostname.toLowerCase().replace(/^www\./,''),id='',match;
  if(host==='youtu.be')id=url.pathname.split('/')[1]||'';
  else if(host==='youtube.com'||host==='m.youtube.com'||host==='youtube-nocookie.com'){
   if(url.pathname==='/watch')id=url.searchParams.get('v')||'';
   else{match=url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]+)/);if(match)id=match[1];}
  }
  if(id&&/^[A-Za-z0-9_-]{6,}$/.test(id))return{kind:'iframe',src:'https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?rel=0',provider:'YouTube'};
  if(host==='vimeo.com'||host==='player.vimeo.com'){
   match=url.pathname.match(/(?:\/video)?\/(\d+)(?:\/([A-Za-z0-9]+))?/);
   if(match){var hash=url.searchParams.get('h')||match[2]||'';return{kind:'iframe',src:'https://player.vimeo.com/video/'+match[1]+(hash?'?h='+encodeURIComponent(hash):''),provider:'Vimeo'};}
  }
  if(/\.mp4$/i.test(url.pathname))return{kind:'video',src:url.href,provider:'MP4'};
 }catch(_){}
 return null;
}

function nxParcoursPresentation(p){
 var entries=[],videos=[],seen={};
 function add(value){
  if(typeof value!=='string')return;var url=value.trim();
  if(!url||seen[url]||!/^https?:\/\/|^\//i.test(url))return;
  seen[url]=true;var video=nxProductVideoInfo(url);entries.push({url:url,kind:video?'video':'image'});if(video)videos.push(url);
 }
 [p.imageMain].concat(Array.isArray(p.images)?p.images:[]).slice(0,5).forEach(add);
 if(nxProductVideoInfo(p.videoUrl))add(p.videoUrl);
 var mainVideo=!!nxProductVideoInfo(p.imageMain),position=p.videoPosition||'gallery';
 return Object.assign({},p,{imageMain:mainVideo?'':p.imageMain,videoUrl:nxProductVideoInfo(p.videoUrl)?p.videoUrl:(videos[0]||''),videoFirst:mainVideo||p.videoFirst===true,presentationVideos:videos,modalMedia:entries.filter(function(e){return e.kind==='image'||position==='gallery'})});
}
function nxParcoursClearMedia(box){
 if(!box)return;
 box.querySelectorAll('video').forEach(function(video){try{video.pause()}catch(_){}});
 box.querySelectorAll('iframe').forEach(function(frame){frame.src='about:blank'});
 box.textContent='';
}
function nxParcoursMediaGallery(box,entries,p){
 nxParcoursClearMedia(box);box.hidden=!entries.length;if(box.hidden)return;
 box.className='nx-product-gallery';box.style.cssText='';
 var view=document.createElement('div');view.className='nx-product-view';box.appendChild(view);
 var controls=document.createElement('div');controls.className='nx-product-thumbnails';controls.setAttribute('role','group');controls.setAttribute('aria-label','Images et vidéos du produit');box.appendChild(controls);
 var buttons=[],current=-1;
 function select(index){
  var item=entries[index];if(!item||item.failed)return;
  current=index;nxParcoursClearMedia(view);
  buttons.forEach(function(button,i){button.setAttribute('aria-pressed',String(i===index))});
  var info=item.kind==='video'?nxProductVideoInfo(item.url):null;
  var media=document.createElement(info?(info.kind==='video'?'video':'iframe'):'img');
  media.src=info?info.src:item.url;
  if(info){
   if(info.kind==='video'){media.controls=true;media.preload='metadata';media.setAttribute('playsinline','');}
   else{media.title=p.videoTitle||'Vidéo de présentation — '+(p.title||'Produit');media.setAttribute('allowfullscreen','');media.setAttribute('allow','encrypted-media; picture-in-picture');}
  }else{
   media.alt=p.title||'Image du produit';
   media.onerror=function(){
    item.failed=true;buttons[index].style.display='none';
    var next=entries.findIndex(function(entry){return !entry.failed});
    if(next>=0)select(next);else{nxParcoursClearMedia(view);box.hidden=true;}
   };
  }
  view.appendChild(media);
 }
 entries.forEach(function(item,index){
  var button=document.createElement('button');button.type='button';button.setAttribute('aria-label',(item.kind==='video'?'Voir la vidéo ':'Voir l’image ')+(index+1));button.setAttribute('aria-pressed','false');
  if(item.kind==='video'){button.textContent='▶ Vidéo';}
  else{
   var image=document.createElement('img');image.src=item.url;image.alt='';image.loading='lazy';
   image.onerror=function(){item.failed=true;button.style.display='none';if(current===index){var next=entries.findIndex(function(entry){return !entry.failed});if(next>=0)select(next);else{nxParcoursClearMedia(view);box.hidden=true;}}};
   button.appendChild(image);
  }
  button.addEventListener('click',function(){select(index)});buttons.push(button);controls.appendChild(button);
 });
 controls.hidden=entries.length<2;
 var initial=p.videoFirst?entries.findIndex(function(entry){return entry.kind==='video'}):-1;
 select(initial>=0?initial:0);
}
function nxParcoursVideo(p){
 document.documentElement.classList.add('nx-product-modal-open');
 var image=document.getElementById('detail-image');image.hidden=true;image.style.display='none';
 var box=document.getElementById('detail-video'),text=document.getElementById('detail-text');
 if(!box){box=document.createElement('div');box.id='detail-video';text.parentNode.insertBefore(box,text);}
 else text.parentNode.insertBefore(box,text);
 nxParcoursMediaGallery(box,p.modalMedia||[],p);
 var after=document.getElementById('detail-description-video');
 if(!after){after=document.createElement('div');after.id='detail-description-video';text.parentNode.insertBefore(after,document.getElementById('detail-actions'));}
 var videos=(p.videoPosition==='description'?p.presentationVideos||[]:[]).map(function(url){return{kind:'video',url:url}});
 nxParcoursMediaGallery(after,videos,p);
}
function nxParcoursStopVideo(){
 ['detail-video','detail-description-video'].forEach(function(id){var box=document.getElementById(id);if(box){nxParcoursClearMedia(box);box.hidden=true;}});
 document.documentElement.classList.remove('nx-product-modal-open');
}

function openDetail(p){
 p=nxParcoursPresentation(p);
 document.getElementById('detail-meta').textContent=(p.type||'Parcours')+' · '+portalName(p.portal);
 document.getElementById('detail-title').textContent=p.title||'Expérience NyXia';
 var img=document.getElementById('detail-image');img.onerror=function(){this.hidden=true;this.style.display='none';this.removeAttribute('src')};if(typeof p.imageMain==='string'&&p.imageMain.trim()){img.src=p.imageMain.trim();img.hidden=false;img.style.display=''}else{img.hidden=true;img.style.display='none';img.removeAttribute('src')}
 document.getElementById('detail-text').textContent=p.description||p.shortDescription||'';
 nxParcoursVideo(p);
 var act=actionFor(p),box=document.getElementById('detail-actions');
 box.innerHTML='<a class="btn primary" href="'+esc(act.url)+'" target="_blank" rel="noopener">'+esc(act.label)+'</a>';
 document.getElementById('detail').classList.add('open');
}
function close(){nxParcoursStopVideo();document.getElementById('detail').classList.remove('open')}
document.getElementById('detail-close').onclick=close;
document.getElementById('detail').onclick=function(e){if(e.target===this)close()};
document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
document.getElementById('search').oninput=function(){var q=this.value.trim().toLowerCase();render(state.products.filter(function(p){return !q||[p.title,p.shortDescription,p.description,p.category,p.type,portalName(p.portal)].join(' ').toLowerCase().includes(q)}))};
fetch('/api/nyxia-universe/boutique').then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d}})}).then(function(res){
 if(!res.ok)throw Error(res.data.error||'Boutique indisponible.');
 state.products=(res.data.products||[]).filter(function(p){return p.active!==false});
 state.settings=res.data.settings||{};
 render(state.products);
}).catch(function(e){document.getElementById('cards').innerHTML='<div class="error">'+esc(e.message)+'</div>'});
})();