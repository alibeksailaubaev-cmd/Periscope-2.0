/* ==========================================================================
   AITAS UKPF — оживление панели дэшборда
   Только оформление и микроанимации: перекраска графиков в фирменные цвета,
   плавное появление карточек и графиков, счётчики KPI, «волна» на кнопках,
   связь с оболочкой (навигация по разделам и выгрузка всех слайдов).
   Никакая расчётная логика панели не меняется.
   ========================================================================== */
(function(){
  'use strict';

  var doc = document;
  var body = doc.body;
  var FONT = "'Segoe UI', -apple-system, BlinkMacSystemFont, Inter, Roboto, Arial, sans-serif";
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  body.classList.add('aitas-js');

  /* --- фирменная перекраска старой палитры графиков --------------------- */
  var COLOR_MAP = {
    '#12938c':'#0e9a92', '#0d6f6a':'#0a6f69', '#5fc4bd':'#57c4bc',
    '#1a9e63':'#2e7d52', '#d94f4f':'#c0392f', '#c98a2e':'#c2871f',
    '#f1ede0':'#e6ddc4', '#e1d6b3':'#ded4b4', '#c9bd97':'#c3b58c',
    '#3a2f1e':'#1e1a12', '#7a6d52':'#7a6e52',
    '#f7f9fc':'#f6f2e6', '#f0f9f7':'#e8f5f3', '#cfe9e6':'#bfe2de',
    '#eaf1ff':'#e8f5f3', '#eff6ff':'#e8f5f3'
  };
  var PALETTE = ['#0e9a92','#c2871f','#2e7d52','#c0392f','#4d7ea8','#7a6e52','#57c4bc','#8f5da8'];

  function mapColor(v){
    if(typeof v !== 'string') return v;
    var k = v.trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(COLOR_MAP, k) ? COLOR_MAP[k] : v;
  }
  function recolor(node, depth){
    if(!node || depth > 8) return node;
    if(Array.isArray(node)){
      for(var i=0;i<node.length;i++){
        node[i] = (typeof node[i] === 'object' && node[i] !== null) ? recolor(node[i], depth+1) : mapColor(node[i]);
      }
      return node;
    }
    if(typeof node === 'object'){
      for(var k in node){
        if(!Object.prototype.hasOwnProperty.call(node, k)) continue;
        var v = node[k];
        if(v && typeof v === 'object') recolor(v, depth+1);
        else node[k] = mapColor(v);
      }
    }
    return node;
  }

  function themeLayout(layout){
    layout = layout || {};
    layout.font = Object.assign({ family:FONT, color:'#1e1a12', size:13 }, layout.font || {});
    layout.colorway = layout.colorway || PALETTE;
    layout.hoverlabel = Object.assign({
      bgcolor:'#1e1a12', bordercolor:'#1e1a12',
      font:{ color:'#fffdf7', family:FONT, size:13 }
    }, layout.hoverlabel || {});
    layout.modebar = Object.assign({
      bgcolor:'rgba(0,0,0,0)', color:'#a79a76', activecolor:'#0e9a92', orientation:'v'
    }, layout.modebar || {});
    if(layout.legend) layout.legend.font = Object.assign({ family:FONT, size:12, color:'#4a4232' }, layout.legend.font || {});
    layout.transition = layout.transition || { duration:350, easing:'cubic-in-out' };
    return recolor(layout, 0);
  }

  function isNumberish(v){ return v === null || v === undefined || typeof v === 'number'; }

  if(window.Plotly && typeof window.Plotly.newPlot === 'function' && !window.Plotly.__aitasThemed){
    var origNewPlot = window.Plotly.newPlot;
    window.Plotly.__aitasThemed = true;

    window.Plotly.newPlot = function(gd, data, layout, config){
      var animIdx = [], animReal = [];

      if(Array.isArray(data)){
        recolor(data, 0);
        if(!reduceMotion){
          for(var i=0;i<data.length;i++){
            var t = data[i];
            if(t && t.type === 'bar' && Array.isArray(t.y) && t.y.length && t.y.every(isNumberish)){
              animIdx.push(i);
              animReal.push(t.y);
              // рисуем нулевые столбцы, реальные значения «вырастут» анимацией
              data[i] = Object.assign({}, t, { y: t.y.map(function(v){ return v === null || v === undefined ? v : 0; }) });
            }
          }
        }
      }

      layout = themeLayout(layout);
      config = Object.assign({ responsive:true, displaylogo:false }, config || {});
      config.modeBarButtonsToRemove = config.modeBarButtonsToRemove ||
        ['lasso2d','select2d','autoScale2d','toggleSpikelines'];

      var promise = origNewPlot.call(window.Plotly, gd, data, layout, config);

      return promise.then(function(plotDiv){
        var el = plotDiv || (typeof gd === 'string' ? doc.getElementById(gd) : gd);
        if(el && el.classList) requestAnimationFrame(function(){ el.classList.add('aitas-chart-in'); });

        if(animIdx.length && el){
          var restore = function(){
            try{ window.Plotly.restyle(el, { y: animReal }, animIdx); }catch(e){}
          };
          try{
            window.Plotly.animate(el, {
              data: animReal.map(function(y){ return { y:y }; }),
              traces: animIdx
            }, {
              transition:{ duration:680, easing:'cubic-out' },
              frame:{ duration:680, redraw:false }
            });
          }catch(e){ restore(); }
          // страховка: значения обязаны стать настоящими, даже если анимация сорвалась
          setTimeout(function(){
            try{
              var cur = el.data && el.data[animIdx[0]] && el.data[animIdx[0]].y;
              var zero = Array.isArray(cur) && cur.every(function(v){ return !v; });
              var real = animReal[0].some(function(v){ return v; });
              if(zero && real) restore();
            }catch(e){ restore(); }
          }, 1100);
        }
        return plotDiv;
      });
    };
  }

  // страховка: если график по какой-то причине не отрисовался, блок всё равно виден
  setTimeout(function(){
    [].slice.call(doc.querySelectorAll('.chart-box')).forEach(function(el){
      el.classList.add('aitas-chart-in');
    });
  }, 3500);

  /* --- компактная зона загрузки внутри оболочки -------------------------- */
  if(body.classList.contains('embedded-in-shell') || window.parent !== window){
    [].slice.call(doc.querySelectorAll('.dropzone')).forEach(function(dz){
      if(dz.querySelector('.dz-text')) return;
      var wrap = doc.createElement('div');
      wrap.className = 'dz-text';
      var moving = [].slice.call(dz.children).filter(function(ch){
        return !ch.classList.contains('icon') && ch.tagName !== 'INPUT';
      });
      moving.forEach(function(ch){ wrap.appendChild(ch); });
      dz.appendChild(wrap);
    });
  }

  /* --- каскадное появление карточек ------------------------------------- */
  function visible(el){ return !!(el.offsetParent || el.getClientRects().length); }

  function reveal(nodes, step){
    var delay = 0;
    nodes.forEach(function(el){
      if(el.dataset.aitasRevealed) return;
      if(!visible(el)) return;
      el.dataset.aitasRevealed = '1';
      el.classList.add('aitas-reveal');
      setTimeout(function(){ el.classList.add('is-in'); }, delay);
      delay += step;
    });
  }

  function revealAll(){
    reveal([].slice.call(doc.querySelectorAll('.grid-upload, .controls-bar, .card')), reduceMotion ? 0 : 80);
  }
  revealAll();

  // карточки, которые показываются позже (display:none -> block), тоже появляются мягко
  var revealObserver = new MutationObserver(function(){ revealAll(); notifySections(); });
  [].slice.call(doc.querySelectorAll('.card')).forEach(function(card){
    revealObserver.observe(card, { attributes:true, attributeFilter:['style','class'] });
  });

  /* --- анимированные счётчики KPI --------------------------------------- */
  var NUM_RE = /^([^\d]*?)([+-]?\d[\d  ]*(?:[.,]\d+)?)([^\d]*)$/;

  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

  function animateNumber(el, from, to, decimals, sep, prefix, suffix){
    var start = performance.now(), dur = 620;
    el.__aitasAnimating = true;
    function frame(now){
      var p = Math.min(1, (now - start) / dur);
      var v = from + (to - from) * easeOutCubic(p);
      var txt = v.toFixed(decimals).replace('.', sep);
      el.__aitasWrite = true;
      el.textContent = prefix + txt + suffix;
      el.__aitasWrite = false;
      if(p < 1) requestAnimationFrame(frame);
      else { el.__aitasAnimating = false; el.dataset.aitasValue = String(to); }
    }
    requestAnimationFrame(frame);
  }

  function handleValueChange(el){
    if(el.__aitasWrite || el.__aitasAnimating) return;
    var raw = (el.textContent || '').trim();
    var m = NUM_RE.exec(raw);
    el.classList.remove('aitas-bump');
    void el.offsetWidth;
    el.classList.add('aitas-bump');
    if(!m) { delete el.dataset.aitasValue; return; }
    var numStr = m[2].replace(/[  ]/g, '');
    var sep = numStr.indexOf(',') > -1 ? ',' : '.';
    var value = parseFloat(numStr.replace(',', '.'));
    if(!isFinite(value)) return;
    var decimals = (numStr.split(/[.,]/)[1] || '').length;
    var prev = parseFloat(el.dataset.aitasValue);
    el.dataset.aitasValue = String(value);
    if(reduceMotion || !isFinite(prev) || prev === value || Math.abs(value - prev) < 0.001) return;
    animateNumber(el, prev, value, decimals, sep, m[1], m[3]);
  }

  var valueObserver = new MutationObserver(function(muts){
    var seen = [];
    muts.forEach(function(m){
      var el = m.target.nodeType === 3 ? m.target.parentNode : m.target;
      if(!el || seen.indexOf(el) > -1) return;
      seen.push(el);
      handleValueChange(el);
    });
  });

  function watchValues(){
    [].slice.call(doc.querySelectorAll('.stat-pill .val')).forEach(function(el){
      if(el.__aitasWatched) return;
      el.__aitasWatched = true;
      var raw = (el.textContent || '').trim();
      var m = NUM_RE.exec(raw);
      if(m) el.dataset.aitasValue = String(parseFloat(m[2].replace(/[  ]/g,'').replace(',', '.')));
      valueObserver.observe(el, { childList:true, characterData:true, subtree:true });
    });
  }
  watchValues();
  setInterval(watchValues, 1500);

  /* --- «волна» по клику на кнопках -------------------------------------- */
  doc.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest('.btn, .viol-scope-btn, .day-modal-close, .corpus-modal-close');
    if(!btn || reduceMotion || btn.disabled) return;
    var rect = btn.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 1.05;
    var ripple = doc.createElement('span');
    ripple.className = 'aitas-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left) + 'px';
    ripple.style.top = (e.clientY - rect.top) + 'px';
    btn.appendChild(ripple);
    setTimeout(function(){ ripple.remove(); }, 620);
  });

  /* --- режим съёмки PNG: замораживаем анимации --------------------------- */
  doc.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest('.btn-download');
    if(!btn) return;
    body.classList.add('aitas-exporting');
    clearTimeout(window.__aitasExportTimer);
    window.__aitasExportTimer = setTimeout(function(){
      body.classList.remove('aitas-exporting');
    }, 7000);
  }, true);

  /* --- модальные окна: закрытие по Esc и клику по фону -------------------- */
  function closeOpenModals(){
    [].slice.call(doc.querySelectorAll('.day-modal-overlay.open, .corpus-modal-overlay.open')).forEach(function(ov){
      var btn = ov.querySelector('.day-modal-close, .corpus-modal-close');
      if(btn) btn.click();
    });
  }
  doc.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeOpenModals(); });
  doc.addEventListener('mousedown', function(e){
    if(e.target.classList && (e.target.classList.contains('day-modal-overlay') || e.target.classList.contains('corpus-modal-overlay'))){
      closeOpenModals();
    }
  });

  /* ======================================================================
     Мост с оболочкой: список разделов, переход к разделу, выгрузка слайдов
     ====================================================================== */
  var KEY = window.__DASH_KEY__ || '';
  function post(msg){
    try{ if(window.parent && window.parent !== window) window.parent.postMessage(Object.assign({ key:KEY }, msg), '*'); }catch(e){}
  }

  var sectionsSignature = '';
  function collectSections(){
    return [].slice.call(doc.querySelectorAll('.card[id]')).filter(visible).map(function(card){
      var t = card.querySelector('.card-header h2, .chart-subtitle');
      return { id:card.id, title:(t ? t.textContent : card.id).trim() };
    });
  }
  var sectionsTimer;
  function notifySections(){
    clearTimeout(sectionsTimer);
    sectionsTimer = setTimeout(function(){
      var list = collectSections();
      var sig = JSON.stringify(list);
      if(sig === sectionsSignature) return;
      sectionsSignature = sig;
      post({ type:'aitas-sections', sections:list });
    }, 120);
  }

  window.addEventListener('message', function(e){
    var d = e.data;
    if(!d || typeof d !== 'object') return;

    if(d.type === 'aitas-scroll-to'){
      var card = doc.getElementById(d.id);
      if(!card) return;
      var y = card.getBoundingClientRect().top + window.pageYOffset;
      card.classList.remove('aitas-flash');
      void card.offsetWidth;
      card.classList.add('aitas-flash');
      post({ type:'aitas-scroll-request', y:y });
    }

    if(d.type === 'aitas-export-all'){
      var buttons = [].slice.call(doc.querySelectorAll('.btn-download')).filter(function(b){ return !b.disabled; });
      if(!buttons.length){ post({ type:'aitas-export-done', total:0 }); return; }
      var idx = 0;
      (function next(){
        if(idx >= buttons.length){
          post({ type:'aitas-export-done', total:buttons.length });
          return;
        }
        post({ type:'aitas-export-progress', done:idx, total:buttons.length });
        buttons[idx].click();
        idx++;
        setTimeout(next, 2200);
      })();
    }
  });

  /* --- период данных уезжает в шапку оболочки ---------------------------- */
  var lastRange = null;
  function pushRange(){
    var badge = doc.getElementById('rangeBadge');
    if(!badge) return;
    var txt = (badge.textContent || '').trim();
    if(txt === lastRange) return;
    lastRange = txt;
    post({ type:'aitas-range', text:txt });
  }
  pushRange();
  setInterval(pushRange, 1200);

  post({ type:'aitas-ready' });
  notifySections();
  setInterval(notifySections, 2000);
})();
