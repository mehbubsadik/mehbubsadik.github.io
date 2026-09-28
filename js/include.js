/* ─── SHARED PARTIALS (nav + footer) ───
   Every page marks its chrome with data-include="/partials/…" and lists its
   own section links in <script type="application/json" id="page-links">.
   Never hand-copy nav or footer markup into a page; edit the partial.

   The placeholders already carry the real classes (an empty .site-nav pill,
   an empty .site-footer), so the fixed nav is visible from first paint and
   nothing in the flow shifts when the content lands. Load this before
   main.js: code there that binds to the nav/footer waits via onPartialsReady.

   Page JSON keys: nav, mobile (defaults to nav), footer -> [{href, label, className?}]
                   logoHref, logoLabel, ctaMobile -> strings (optional)
                   highlight -> {href, label} (optional accent chip in the nav + mobile menu) */
(function() {
  var queue = [];
  var ready = false;

  window.onPartialsReady = function(fn) {
    if (ready) fn(); else queue.push(fn);
  };

  var config = {};
  try {
    var el = document.getElementById('page-links');
    if (el) config = JSON.parse(el.textContent);
  } catch (e) {}

  function makeLink(item) {
    var a = document.createElement('a');
    a.href = item.href;
    a.textContent = item.label;
    if (item.className) a.className = item.className;
    return a;
  }

  function fill(root) {
    root.querySelectorAll('[data-slot]').forEach(function(slot) {
      var name = slot.getAttribute('data-slot');
      var items = config[name] || (name === 'mobile' ? config.nav : null) || [];
      var isList = slot.tagName === 'UL' || slot.tagName === 'OL';
      items.forEach(function(item, i) {
        var a = makeLink(item);
        if (name === 'mobile') {
          var num = document.createElement('span');
          num.textContent = (i < 9 ? '0' : '') + (i + 1);
          a.insertBefore(num, a.firstChild);
        }
        if (isList) {
          var li = document.createElement('li');
          li.appendChild(a);
          slot.appendChild(li);
        } else {
          slot.appendChild(a);
        }
      });
      slot.removeAttribute('data-slot');
    });
    [['data-config-href', 'href'], ['data-config-label', 'aria-label']].forEach(function(pair) {
      root.querySelectorAll('[' + pair[0] + ']').forEach(function(node) {
        var value = config[node.getAttribute(pair[0])];
        if (value) node.setAttribute(pair[1], value);
        node.removeAttribute(pair[0]);
      });
    });
    /* Optional highlighted link: rendered only when the page sets {href, label} */
    root.querySelectorAll('[data-config-link]').forEach(function(node) {
      var value = config[node.getAttribute('data-config-link')];
      if (!value || !value.href) { node.parentNode.removeChild(node); return; }
      node.setAttribute('href', value.href);
      var label = node.querySelector('[data-link-label]') || node;
      label.textContent = value.label;
      if (label !== node) label.removeAttribute('data-link-label');
      node.removeAttribute('data-config-link');
    });
    root.querySelectorAll('[data-config-text]').forEach(function(node) {
      var value = config[node.getAttribute('data-config-text')];
      if (value) node.textContent = value;
      node.removeAttribute('data-config-text');
    });
  }

  function inject(host, html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = html;
    fill(tpl.content);
    var inside = [];
    var after = host;
    Array.prototype.slice.call(tpl.content.children).forEach(function(node) {
      var place = node.getAttribute('data-place');
      node.removeAttribute('data-place');
      if (place === 'after') { after.parentNode.insertBefore(node, after.nextSibling); after = node; }
      else if (place === 'before') host.parentNode.insertBefore(node, host);
      else inside.push(node);
    });
    host.textContent = '';
    inside.forEach(function(node) { host.appendChild(node); });
    host.removeAttribute('data-include');
  }

  function load(host) {
    return fetch(host.getAttribute('data-include'))
      .then(function(r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function(html) { inject(host, html); })
      .catch(function(err) { console.error('include failed:', host.getAttribute('data-include'), err); });
  }

  var hosts = Array.prototype.slice.call(document.querySelectorAll('[data-include]'));
  Promise.all(hosts.map(load)).then(function() {
    ready = true;
    queue.splice(0).forEach(function(fn) { fn(); });
  });
})();
