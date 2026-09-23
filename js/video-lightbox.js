function openVideo(id, type) {
  var lb = document.getElementById('videoLightbox');
  var frame = document.getElementById('lightboxFrame');
  var inner = document.getElementById('lightboxInner');
  if (type === 'shorts') {
    frame.style.width = '360px';
    frame.style.height = '640px';
    inner.style.width = '360px';
  } else {
    frame.style.width = '90vw';
    frame.style.maxWidth = '900px';
    frame.style.height = '506px';
    inner.style.width = '';
  }
  frame.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1';
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeLightbox(e) {
  if (e && e.target !== document.getElementById('videoLightbox')) return;
  var lb = document.getElementById('videoLightbox');
  var frame = document.getElementById('lightboxFrame');
  lb.style.display = 'none';
  frame.src = '';
  document.body.style.overflow = '';
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeLightbox();
});
