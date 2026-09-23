/* 自定义 tooltip：接管原生 title，提供统一样式、动态定位与动态文案更新。 */
(function () {
    'use strict';

    if (window.__appTooltip) return;
    window.__appTooltip = true;

    var tip = null;
    var active = null;
    var store = new WeakMap();
    var observer = null;
    var moveRaf = 0;

    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    function rawTitle(el) {
        var t = el.getAttribute('title');
        return t ? t.trim() : '';
    }

    function restoreTitle(el) {
        if (!el || el.getAttribute('title')) return;
        var s = store.get(el);
        if (s) el.setAttribute('title', s);
    }

    function stopObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    function watch(el) {
        stopObserver();
        observer = new MutationObserver(function () {
            if (active !== el) return;
            var t = rawTitle(el);
            if (!t) return;
            store.set(el, t);
            el.removeAttribute('title');
            tip.textContent = t;
            place(el);
        });
        observer.observe(el, { attributes: true, attributeFilter: ['title'] });
    }

    function place(el) {
        var r = el.getBoundingClientRect();
        if (!r.width && !r.height) {
            hide(el);
            return;
        }
        var tw = tip.offsetWidth;
        var th = tip.offsetHeight;
        var gap = 10;
        var edge = 8;
        var y = r.bottom + gap;
        if (y + th > window.innerHeight - edge) {
            y = r.top - gap - th;
        }
        if (y < edge) y = edge;
        var x = r.left + r.width / 2 - tw / 2;
        x = Math.max(edge, Math.min(x, window.innerWidth - tw - edge));
        tip.style.left = Math.round(x) + 'px';
        tip.style.top = Math.round(y) + 'px';
    }

    function show(el) {
        var text = rawTitle(el);
        if (!text) text = store.get(el) || '';
        if (!text) return;
        if (!el.getAttribute('title') && !store.has(el)) return;

        if (rawTitle(el)) {
            store.set(el, rawTitle(el));
            el.removeAttribute('title');
        }

        if (active && active !== el) hide(active);

        active = el;
        tip.style.display = 'block';
        tip.textContent = text;
        place(el);
        tip.classList.add('is-visible');
        watch(el);
    }

    function hide(el) {
        if (!el || active !== el) return;
        active = null;
        stopObserver();
        tip.classList.remove('is-visible');
        restoreTitle(el);
    }

    function onPointerOver(e) {
        if (e.pointerType === 'touch') return;
        var target = e.target;
        if (!target || target.nodeType !== 1) return;
        if (active) {
            if (active === target || active.contains(target)) return;
            hide(active);
        }
        var el = target.closest ? target.closest('[title]') : null;
        if (el && rawTitle(el)) show(el);
    }

    function onPointerMove() {
        if (!active || moveRaf) return;
        moveRaf = requestAnimationFrame(function () {
            moveRaf = 0;
            if (!active) return;
            if (!active.isConnected) {
                hide(active);
                return;
            }
            var r = active.getBoundingClientRect();
            if (!r.width && !r.height) hide(active);
        });
    }

    function onFocusIn(e) {
        var target = e.target;
        if (!target || target.nodeType !== 1 || !target.closest) return;
        var el = target.closest('[title]');
        if (el && rawTitle(el)) show(el);
    }

    function onFocusOut() {
        if (active) hide(active);
    }

    function onViewportChange() {
        if (active) place(active);
    }

    ready(function () {
        tip = document.createElement('div');
        tip.className = 'app-tooltip';
        tip.setAttribute('role', 'tooltip');
        document.body.appendChild(tip);

        document.addEventListener('pointerover', onPointerOver, true);
        document.addEventListener('pointermove', onPointerMove, true);
        document.addEventListener('focusin', onFocusIn, true);
        document.addEventListener('focusout', onFocusOut, true);
        window.addEventListener('scroll', onViewportChange, true);
        window.addEventListener('resize', onViewportChange);
    });
})();
