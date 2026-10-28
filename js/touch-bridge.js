/* Touch bridge: a finger on a mouse-only surface acts as the left mouse button.
 *
 * Shared copy. Apps take this file unchanged into their own js/ folder; fix it
 * here and copy it back out. GameMaker's js/touch-bridge.js is the first
 * version, with its level pinch built in.
 *
 * iPad Safari sends no mouse events for a finger drag, so apps that listen for
 * mousedown/mousemove/mouseup cannot be dragged, drawn in or moved by touch.
 * TouchBridge.attach(el) replays one finger on el as the mouse events a real
 * mouse would make: mousemove then mousedown on el, mousemoves with buttons 1
 * to whatever is under the finger, a mouseleave when it crosses out of el,
 * and mouseup where it lifts. Listeners on el, document or window all run as
 * they do for the mouse, so the app's own code does not change.
 *
 * preventDefault on touchstart stops Safari's own pretend mouse events and the
 * click after a tap, so a tap is not counted twice. A tap still gives
 * mousedown and mouseup; an app that acts only on click needs opts.click.
 *
 * opts.onPinch(midX, midY, scale, dx, dy): two fingers, midX/midY relative to
 * el, scale and dx/dy since the last call. A first finger waits HOLD_MS so a
 * pinch starts without pressing anything. Without onPinch a second finger is
 * ignored and the first carries on.
 * opts.click: also send a click on a tap that did not move.
 * opts.dblclick: two taps close together in time and place also send a
 * dblclick, after the second tap's mousedown and mouseup, as a mouse does.
 */
(function () {
    var HOLD_MS = 80;
    var DOUBLE_TAP_MS = 350;
    var DOUBLE_TAP_PX = 24;

    function synth(type, x, y, to, buttons) {
        to.dispatchEvent(new MouseEvent(type, {
            bubbles: type !== 'mouseleave',
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y,
            button: 0,
            buttons: buttons
        }));
    }

    function attach(el, opts) {
        if (!el || el.dataset.touchBridge) return;
        el.dataset.touchBridge = '1';
        el.style.touchAction = 'none';
        el.style.webkitTouchCallout = 'none';
        opts = opts || {};

        var pending = null, down = false, inside = true, pinch = null, last = null, start = null, moved = false;
        var lastTap = null;

        function under(x, y) { return document.elementFromPoint(x, y) || document.body; }
        function centroid(ts) {
            return {
                x: (ts[0].clientX + ts[1].clientX) / 2,
                y: (ts[0].clientY + ts[1].clientY) / 2,
                d: Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY) || 1
            };
        }
        // A bridged element inside another bridged element (a scrollbar thumb
        // in its track) owns its own touches.
        function mine(e) { return e.target.closest('[data-touch-bridge]') === el; }

        function press() {
            if (!pending) return;
            clearTimeout(pending.timer);
            var p = pending;
            pending = null;
            down = true;
            inside = true;
            synth('mousemove', p.x, p.y, el, 0);
            synth('mousedown', p.x, p.y, el, 1);
        }

        function move(x, y) {
            var target = under(x, y);
            var nowInside = el.contains(target);
            if (inside && !nowInside) synth('mouseleave', x, y, el, 1);
            inside = nowInside;
            synth('mousemove', x, y, target, 1);
        }

        function release(x, y) {
            if (!down) return;
            down = false;
            var target = under(x, y);
            synth('mouseup', x, y, target, 0);
            if (moved) { lastTap = null; return; }
            if (opts.click) synth('click', x, y, target, 0);
            if (opts.dblclick) {
                var now = Date.now();
                if (lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(x - lastTap.x, y - lastTap.y) < DOUBLE_TAP_PX) {
                    synth('dblclick', x, y, target, 0);
                    lastTap = null;
                } else {
                    lastTap = { t: now, x: x, y: y };
                }
            }
        }

        el.addEventListener('touchstart', function (e) {
            if (!mine(e)) return;
            e.preventDefault();
            if (e.touches.length >= 2) {
                if (!opts.onPinch) return;
                if (pending) { clearTimeout(pending.timer); pending = null; }
                else if (down && last) release(last.x, last.y);
                pinch = centroid(e.touches);
                return;
            }
            if (pinch) return;
            var t = e.touches[0];
            last = start = { x: t.clientX, y: t.clientY };
            moved = false;
            pending = { x: t.clientX, y: t.clientY, timer: setTimeout(press, HOLD_MS) };
        }, { passive: false });

        el.addEventListener('touchmove', function (e) {
            if (!mine(e)) return;
            e.preventDefault();
            if (pinch) {
                if (e.touches.length < 2) return;
                var c = centroid(e.touches);
                var r = el.getBoundingClientRect();
                opts.onPinch(c.x - r.left, c.y - r.top, c.d / pinch.d, c.x - pinch.x, c.y - pinch.y);
                pinch = c;
                return;
            }
            var t = e.touches[0];
            last = { x: t.clientX, y: t.clientY };
            if (start && Math.hypot(last.x - start.x, last.y - start.y) > 6) moved = true;
            if (pending) press();
            if (down) move(t.clientX, t.clientY);
        }, { passive: false });

        function end(e) {
            if (!mine(e)) return;
            e.preventDefault();
            if (pinch) {
                if (e.touches.length === 0) pinch = null;
                return;
            }
            if (pending) press();   // a quick tap still counts
            var t = e.changedTouches[0];
            if (t) release(t.clientX, t.clientY);
            else if (last) release(last.x, last.y);
        }
        el.addEventListener('touchend', end, { passive: false });
        el.addEventListener('touchcancel', end, { passive: false });
    }

    window.TouchBridge = { attach: attach };
})();
