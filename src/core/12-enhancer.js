// ═══════════════════════════════════════════════════════════════════════
// Batch 4.5: accessibility enhancer (was a separate inline <script>
// after the main script). Kept as an IIFE so its internal state stays
// isolated from the global scope, matching original behavior.
// ═══════════════════════════════════════════════════════════════════════

/* ── Accessibility enhancer (row 11, phase 1) ───────────────────────
   Makes every click-only element keyboard-operable without rewriting the
   app's markup: after each screen render it tags clickable elements so they
   can be reached with Tab and announced by screen readers, and makes
   Enter / Space activate them. */
(function(){
  function enhance(root){
    if(!root) return;
    root.querySelectorAll('[onclick]').forEach(function(el){
      var t = el.tagName;
      if(t==='BUTTON'||t==='A'||t==='INPUT'||t==='SELECT'||t==='TEXTAREA') return;
      if(!el.hasAttribute('tabindex')) el.setAttribute('tabindex','0');
      if(!el.hasAttribute('role')) el.setAttribute('role','button');
    });
  }
  var area = document.getElementById('content-area');
  if(!area) return;
  var scheduled = false;
  function schedule(){
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(function(){ scheduled = false; enhance(area); });
  }
  new MutationObserver(schedule).observe(area, { childList:true, subtree:true });
  enhance(area);

  document.addEventListener('keydown', function(e){
    // Batch 19: Ctrl+B / Cmd+B toggles the desktop sidebar rail (desktop only — nav is a top strip below 900px)
    if((e.ctrlKey||e.metaKey) && !e.altKey && (e.key==='b'||e.key==='B') && window.matchMedia('(min-width:900px)').matches){
      const t=e.target; const tag=t&&t.tagName;
      if(tag==='INPUT'||tag==='TEXTAREA'||(t&&t.isContentEditable)) return; // don't hijack bold in editable fields
      e.preventDefault(); toggleSidebar(); return;
    }
    if(e.key!=='Enter' && e.key!==' ') return;
    var el = e.target;
    if(!el || el.getAttribute('role')!=='button' || !el.hasAttribute('onclick')) return;
    e.preventDefault();   // stop Space from scrolling the page
    el.click();
  });
})();

