(function() {
  var lb = document.getElementById('videoLightbox');
  if (!lb) return;
  var inner = document.getElementById('lightboxInner');
  var frame = document.getElementById('lightboxFrame');
  var closeBtn = document.getElementById('lightboxClose');
  var lastFocus = null;

  function open(id, type) {
    lastFocus = document.activeElement;
    inner.classList.toggle('lightbox-inner--shorts', type === 'shorts');
    frame.src = 'https://www.youtube.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function close() {
    if (lb.hidden) return;
    lb.hidden = true;
    frame.src = '';
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  document.querySelectorAll('[data-video-id]').forEach(function(card) {
    card.addEventListener('click', function() {
      open(card.getAttribute('data-video-id'), card.getAttribute('data-video-type'));
    });
  });

  closeBtn.addEventListener('click', close);
  lb.addEventListener('click', function(e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function(e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    /* Keep keyboard focus inside the dialog: the close button and the player. */
    if (e.key === 'Tab') {
      var f = [closeBtn, frame];
      var idx = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(idx + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  /* YouTube serves a 120x90 grey placeholder (not an error) when a video
     has no maxres thumbnail — swap to hqdefault, which always exists. */
  document.querySelectorAll('img[data-yt-thumb]').forEach(function(img) {
    function check() {
      if (img.naturalWidth && img.naturalWidth <= 120) {
        img.src = 'https://img.youtube.com/vi/' + img.getAttribute('data-yt-thumb') + '/hqdefault.jpg';
      }
    }
    if (img.complete) check();
    img.addEventListener('load', check);
    img.addEventListener('error', function() {
      img.src = 'https://img.youtube.com/vi/' + img.getAttribute('data-yt-thumb') + '/hqdefault.jpg';
    }, { once: true });
  });
})();
