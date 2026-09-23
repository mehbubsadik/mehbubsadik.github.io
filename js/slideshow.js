(function(){
  var track=document.getElementById('ssTrack'); if(!track)return;
  var slides=track.querySelectorAll('.ss-slide'); var total=slides.length;
  var dotsWrap=document.getElementById('ssDots'); var i=0,timer=null,AUTO=4000;
  for(var d=0;d<total;d++){
    var b=document.createElement('button');
    b.className='ss-dot'+(d===0?' active':'');
    b.setAttribute('aria-label','Slide '+(d+1));
    (function(idx){ b.addEventListener('click',function(){ go(idx); reset(); }); })(d);
    dotsWrap.appendChild(b);
  }
  var dots=dotsWrap.querySelectorAll('.ss-dot');
  function go(n){ i=(n+total)%total; track.style.transform='translateX(-'+(i*100)+'%)';
    for(var k=0;k<dots.length;k++) dots[k].classList.toggle('active',k===i); }
  function next(){ go(i+1); } function prev(){ go(i-1); }
  function start(){ timer=setInterval(next,AUTO); }
  function reset(){ clearInterval(timer); start(); }
  document.getElementById('ssNext').addEventListener('click',function(){ next(); reset(); });
  document.getElementById('ssPrev').addEventListener('click',function(){ prev(); reset(); });
  var frame=track.parentElement;
  frame.addEventListener('mouseenter',function(){ clearInterval(timer); });
  frame.addEventListener('mouseleave',function(){ start(); });
  var x0=null;
  track.addEventListener('touchstart',function(e){ x0=e.touches[0].clientX; },{passive:true});
  track.addEventListener('touchend',function(e){ if(x0===null)return;
    var dx=e.changedTouches[0].clientX-x0;
    if(Math.abs(dx)>50){ dx<0?next():prev(); reset(); } x0=null; },{passive:true});
  start();
})();
