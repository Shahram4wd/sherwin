// Sherwin Universe — cosmos engine + UI effects
(function () {
    'use strict';

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canHover = window.matchMedia('(hover: hover)').matches;

    function themeIsLight() {
        return document.documentElement.getAttribute('data-theme') === 'light';
    }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function rand(a, b) { return a + Math.random() * (b - a); }
    function each(list, fn) { Array.prototype.forEach.call(list, fn); }

    /* ============================================================
       SCROLL BUS — one passive listener, one rAF, many subscribers
       ============================================================ */
    var scrollFns = [];
    var scrollTicking = false;
    function runScrollFns() {
        scrollTicking = false;
        var y = window.scrollY || 0;
        for (var i = 0; i < scrollFns.length; i++) scrollFns[i](y);
    }
    function onScroll(fn) {
        if (!scrollFns.length) {
            window.addEventListener('scroll', function () {
                if (!scrollTicking) { scrollTicking = true; requestAnimationFrame(runScrollFns); }
            }, { passive: true });
        }
        scrollFns.push(fn);
        fn(window.scrollY || 0);
    }

    /* ============================================================
       STARFIELD — parallax layers, twinkle, shooting stars
       ============================================================ */
    function initCosmos() {
        var canvas = document.getElementById('cosmos-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var stars = [];
        var shooters = [];
        var w = 0, h = 0;
        var running = false;
        var lastShooter = 0;

        var LAYERS = [
            { count: 0.00012, size: [0.4, 0.9], speed: 0.006, parallax: 0.05, alpha: [0.2, 0.55] },
            { count: 0.00007, size: [0.9, 1.5], speed: 0.012, parallax: 0.12, alpha: [0.35, 0.8] },
            { count: 0.00003, size: [1.4, 2.2], speed: 0.02, parallax: 0.22, alpha: [0.5, 1.0] },
        ];
        var TINTS = ['255,255,255', '255,255,255', '255,255,255', '190,220,255', '255,225,200', '210,190,255'];

        function build() {
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            stars = [];
            var area = w * h;
            LAYERS.forEach(function (layer, li) {
                var n = Math.max(12, Math.round(area * layer.count));
                for (var i = 0; i < n; i++) {
                    stars.push({
                        x: Math.random() * w,
                        y: Math.random() * h,
                        r: rand(layer.size[0], layer.size[1]),
                        baseA: rand(layer.alpha[0], layer.alpha[1]),
                        tw: rand(0.5, 2.2),          // twinkle speed
                        ph: Math.random() * Math.PI * 2, // twinkle phase
                        drift: layer.speed * rand(0.5, 1.5),
                        px: layer.parallax,
                        tint: TINTS[Math.floor(Math.random() * TINTS.length)],
                        layer: li,
                    });
                }
            });
        }

        function spawnShooter() {
            var fromLeft = Math.random() < 0.5;
            shooters.push({
                x: fromLeft ? -60 : rand(w * 0.3, w + 60),
                y: rand(0, h * 0.45),
                vx: (fromLeft ? 1 : -1) * rand(9, 15),
                vy: rand(2.5, 5),
                life: 1,
                decay: rand(0.012, 0.02),
            });
        }

        function frame(t) {
            if (!running) return;
            ctx.clearRect(0, 0, w, h);
            var scroll = window.scrollY || 0;
            var time = t / 1000;

            for (var i = 0; i < stars.length; i++) {
                var s = stars[i];
                if (!reducedMotion) {
                    s.x -= s.drift;
                    if (s.x < -2) s.x = w + 2;
                }
                var y = s.y - ((scroll * s.px) % (h + 4));
                if (y < -2) y += h + 4;
                var a = s.baseA;
                if (!reducedMotion) a *= 0.65 + 0.35 * Math.sin(time * s.tw + s.ph);
                ctx.beginPath();
                ctx.fillStyle = 'rgba(' + s.tint + ',' + Math.max(0, a).toFixed(3) + ')';
                ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
                ctx.fill();
            }

            if (!reducedMotion) {
                if (time - lastShooter > rand(5, 11) && shooters.length < 2) {
                    spawnShooter();
                    lastShooter = time;
                }
                for (var j = shooters.length - 1; j >= 0; j--) {
                    var sh = shooters[j];
                    sh.x += sh.vx;
                    sh.y += sh.vy;
                    sh.life -= sh.decay;
                    if (sh.life <= 0 || sh.x < -120 || sh.x > w + 120 || sh.y > h + 60) {
                        shooters.splice(j, 1);
                        continue;
                    }
                    var tail = 14;
                    var grad = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * tail, sh.y - sh.vy * tail);
                    grad.addColorStop(0, 'rgba(255,255,255,' + (0.9 * sh.life).toFixed(3) + ')');
                    grad.addColorStop(0.3, 'rgba(160,210,255,' + (0.45 * sh.life).toFixed(3) + ')');
                    grad.addColorStop(1, 'rgba(160,210,255,0)');
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 1.6;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(sh.x, sh.y);
                    ctx.lineTo(sh.x - sh.vx * tail, sh.y - sh.vy * tail);
                    ctx.stroke();
                }
            }
            requestAnimationFrame(frame);
        }

        function start() {
            if (running || themeIsLight() || document.hidden) return;
            running = true;
            requestAnimationFrame(frame);
        }
        function stop() { running = false; }

        build();
        start();

        // Let page interactions call down a meteor shower (hero "poke the planet").
        window.SherwinCosmos = {
            burst: function (n) {
                if (reducedMotion || !running) return;
                n = n || 3;
                for (var i = 0; i < n; i++) setTimeout(spawnShooter, i * 140);
            }
        };

        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(build, 150);
        });
        document.addEventListener('visibilitychange', function () {
            document.hidden ? stop() : start();
        });
        new MutationObserver(function () {
            themeIsLight() ? stop() : start();
        }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    /* ============================================================
       SCROLL PROGRESS ROCKET
       ============================================================ */
    function initScrollRocket() {
        var bar = document.getElementById('scroll-progress-bar');
        var rocket = document.getElementById('scroll-rocket');
        if (!bar || !rocket) return;
        onScroll(function (y) {
            var max = document.documentElement.scrollHeight - window.innerHeight;
            var p = max > 0 ? Math.min(1, y / max) : 0;
            bar.style.width = (p * 100) + '%';
            rocket.style.left = 'calc(' + (p * 100) + '% - 9px)';
            rocket.style.opacity = p > 0.01 ? '1' : '0';
        });
    }

    /* ============================================================
       REVEAL ON SCROLL
       ============================================================ */
    var revealObserver = null;
    function observeReveals(root) {
        if (reducedMotion) {
            (root || document).querySelectorAll('.reveal:not(.revealed)').forEach(function (el) {
                el.classList.add('revealed');
            });
            return;
        }
        if (!revealObserver) {
            revealObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        revealObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        }
        (root || document).querySelectorAll('.reveal:not(.revealed)').forEach(function (el) {
            revealObserver.observe(el);
        });
    }

    /* ============================================================
       ANIMATED COUNTERS — <span data-count-to="42">
       ============================================================ */
    function initCounters() {
        var els = document.querySelectorAll('[data-count-to]');
        if (!els.length) return;
        var seen = new WeakSet();
        function animate(el) {
            var target = parseInt(el.getAttribute('data-count-to'), 10) || 0;
            if (reducedMotion) { el.textContent = target; return; }
            var dur = 1400;
            var t0 = null;
            function step(t) {
                if (!t0) t0 = t;
                var p = Math.min(1, (t - t0) / dur);
                var eased = 1 - Math.pow(1 - p, 3);
                el.textContent = Math.round(target * eased);
                if (p < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }
        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting && !seen.has(entry.target)) {
                    seen.add(entry.target);
                    animate(entry.target);
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.4 });
        els.forEach(function (el) { obs.observe(el); });
    }

    /* ============================================================
       3D TILT CARDS — .tilt-card
       ============================================================ */
    function initTilt(root) {
        if (reducedMotion || !canHover) return;
        (root || document).querySelectorAll('.tilt-card:not([data-tilt-ready])').forEach(function (card) {
            card.setAttribute('data-tilt-ready', '1');
            card.addEventListener('pointermove', function (e) {
                var r = card.getBoundingClientRect();
                var x = (e.clientX - r.left) / r.width - 0.5;
                var y = (e.clientY - r.top) / r.height - 0.5;
                card.style.transform = 'perspective(800px) rotateY(' + (x * 7).toFixed(2) + 'deg) rotateX(' + (-y * 7).toFixed(2) + 'deg) translateY(-4px)';
            });
            card.addEventListener('pointerleave', function () {
                card.style.transform = '';
            });
        });
    }

    /* ============================================================
       SCROLL SCRUB — scroll-linked enter/exit motion.
       [data-scrub="in"]    eases in as it enters the viewport
       [data-scrub="out"]   eases away as it leaves past the top
       [data-scrub="inout"] both
       Continuous (scrubbed by scroll position), not just triggered.
       ============================================================ */
    function initScrub() {
        var els = Array.prototype.slice.call(document.querySelectorAll('[data-scrub]'));
        if (!els.length || reducedMotion) return;
        function update() {
            var vh = window.innerHeight;
            for (var i = 0; i < els.length; i++) {
                var el = els[i];
                var mode = el.getAttribute('data-scrub');
                var r = el.getBoundingClientRect();
                if (r.bottom < -80 || r.top > vh + 80) continue;
                var opacity = 1, ty = 0;
                if (mode !== 'out') {
                    var p = clamp((vh * 0.94 - r.top) / (vh * 0.22), 0, 1);
                    var ep = 1 - Math.pow(1 - p, 3);
                    opacity = ep;
                    ty = (1 - ep) * 30;
                }
                if (mode !== 'in') {
                    // Only start fading once the element is nearly off the top of the viewport.
                    var q = clamp((r.bottom - vh * 0.03) / (vh * 0.11), 0, 1);
                    var eq = 1 - Math.pow(1 - q, 2);
                    opacity = Math.min(opacity, 0.15 + 0.85 * eq);
                    ty -= (1 - eq) * 22;
                }
                el.style.opacity = opacity.toFixed(3);
                el.style.transform = ty ? 'translateY(' + ty.toFixed(1) + 'px)' : '';
            }
        }
        onScroll(update);
        window.addEventListener('resize', update);
    }

    /* ============================================================
       HERO SCENE — mouse parallax across depth layers
       ============================================================ */
    function initHeroScene() {
        var scene = document.querySelector('.hero-scene');
        if (!scene || reducedMotion || !canHover) return;
        var panel = scene.closest('.launch-hero, .cosmic-panel') || scene;
        var layers = scene.querySelectorAll('[data-depth]');
        var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
        function tick() {
            raf = requestAnimationFrame(function () {
                cx += (tx - cx) * 0.07;
                cy += (ty - cy) * 0.07;
                for (var i = 0; i < layers.length; i++) {
                    var d = parseFloat(layers[i].getAttribute('data-depth')) || 0;
                    layers[i].style.transform =
                        'translate(' + (cx * d * 34).toFixed(1) + 'px, ' + (cy * d * 26).toFixed(1) + 'px)';
                }
                if (Math.abs(cx - tx) > 0.002 || Math.abs(cy - ty) > 0.002) tick();
                else raf = null;
            });
        }
        panel.addEventListener('pointermove', function (e) {
            var r = panel.getBoundingClientRect();
            tx = (e.clientX - r.left) / r.width - 0.5;
            ty = (e.clientY - r.top) / r.height - 0.5;
            if (!raf) tick();
        });
        panel.addEventListener('pointerleave', function () {
            tx = 0; ty = 0;
            if (!raf) tick();
        });
    }

    /* ============================================================
       LAUNCH HERO — T-minus countdown, liftoff, scroll-driven ascent,
       and a planet you can poke.
       ============================================================ */
    function initLaunchHero() {
        var hero = document.querySelector('.launch-hero');
        if (!hero) return;
        var status = hero.querySelector('[data-countdown]');
        var rocketTrack = hero.querySelector('.hero-rocket-track');
        var horizon = hero.querySelector('.hero-horizon');
        var disc = hero.querySelector('.horizon-disc');

        // The countdown plays once per session; after that the rocket is already up.
        var launchedBefore = false;
        try { launchedBefore = sessionStorage.getItem('su-launched') === '1'; } catch (e) { /* private mode */ }

        // Live mission clock: T+ elapsed since the first published mission.
        var resting = status ? status.textContent : '';
        var startMs = status ? Date.parse(status.getAttribute('data-mission-start') || '') : NaN;
        var clockTimer = null;
        function pad(n) { return (n < 10 ? '0' : '') + n; }
        function tickClock() {
            var s = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
            var d = Math.floor(s / 86400); s -= d * 86400;
            var h = Math.floor(s / 3600); s -= h * 3600;
            var m = Math.floor(s / 60); s -= m * 60;
            status.textContent = 'T+' + d + 'd ' + pad(h) + ':' + pad(m) + ':' + pad(s);
        }
        function startClock() {
            if (!status) return;
            if (isNaN(startMs)) { status.textContent = resting; return; }
            tickClock();
            clearInterval(clockTimer);
            clockTimer = setInterval(function () { if (!document.hidden) tickClock(); }, 1000);
        }

        if (reducedMotion || launchedBefore || !status) {
            hero.classList.add('is-instant', 'is-launched');
            startClock();
        } else {
            var steps = ['T-3', 'T-2', 'T-1', 'Liftoff'];
            var stepMs = 380;
            status.textContent = steps[0];
            steps.forEach(function (label, i) {
                if (i === 0) return;
                setTimeout(function () {
                    status.textContent = label;
                    if (label === 'Liftoff') hero.classList.add('is-launched');
                }, stepMs * i);
            });
            setTimeout(startClock, stepMs * steps.length + 1400);
            try { sessionStorage.setItem('su-launched', '1'); } catch (e) { /* ignore */ }
        }

        // Liftoff height follows the hero, so the rocket ends in clear sky on any screen.
        function setClimb() {
            var k = window.innerWidth < 768 ? 0.55 : 0.47; // phones: clear the headline block
            hero.style.setProperty('--climb', Math.round(hero.offsetHeight * k) + 'px');
        }
        setClimb();
        window.addEventListener('resize', setClimb);

        // Scroll: the rocket keeps climbing, the planet sinks away.
        if (!reducedMotion) {
            onScroll(function (y) {
                var h = hero.offsetHeight || 1;
                var p = clamp(y / h, 0, 1.3);
                if (rocketTrack) {
                    rocketTrack.style.transform = 'translate3d(' + (p * 70).toFixed(1) + 'px, ' + (-p * h * 0.95).toFixed(1) + 'px, 0)';
                }
                if (horizon) {
                    horizon.style.transform = 'translate3d(-50%, ' + (p * h * 0.32).toFixed(1) + 'px, 0)';
                }
            });
        }

        // Poke the planet: it wobbles and calls down a meteor shower.
        if (horizon && disc) {
            horizon.addEventListener('click', function () {
                if (reducedMotion) return;
                disc.classList.remove('is-poked');
                void disc.offsetWidth; // restart the animation
                disc.classList.add('is-poked');
                if (window.SherwinCosmos) window.SherwinCosmos.burst(4);
            });
        }
    }

    /* ============================================================
       SIM PREVIEWS — procedural "attract mode" scenes drawn on the
       Lab tiles. Each sim gets a tiny live scene keyed by its slug.
       Runs only while visible; speeds up on hover; one still frame
       under prefers-reduced-motion.
       ============================================================ */
    var C = { orange: '#ff8a3d', red: '#ef2d2d', cyan: '#22d3ee', ice: '#7dd3fc', violet: '#a78bfa', white: '#ffffff', gold: '#ffd08a' };

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // Gravity Gunner: shots curving around two gravity wells.
    function sceneGravity(w, h) {
        var m = Math.min(w, h);
        var wells = [
            { x: w * 0.40, y: h * 0.54, r: m * 0.11, a: '#ff9d6b', b: '#ef2d2d', c: '#4c0519' },
            { x: w * 0.78, y: h * 0.30, r: m * 0.055, a: '#c4b5fd', b: '#7c3aed', c: '#2e1065' },
        ];
        var ships = [];
        for (var i = 0; i < 9; i++) {
            var well = wells[i % 3 === 2 ? 1 : 0];
            ships.push({
                well: well, a: rand(0, Math.PI * 2), R: well.r * rand(1.9, 3.3), e: rand(0.7, 1),
                speed: rand(0.35, 0.7) * (well === wells[1] ? 1.7 : 1),
                tint: i % 3 === 0 ? C.cyan : i % 3 === 1 ? C.white : C.gold, trail: [],
            });
        }
        return function (ctx, t, dt, boost) {
            wells.forEach(function (wl) {
                ctx.strokeStyle = 'rgba(125,211,252,0.10)';
                ctx.lineWidth = 1;
                for (var k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(wl.x, wl.y, wl.r * (1 + k * 0.85), 0, Math.PI * 2); ctx.stroke(); }
                var g = ctx.createRadialGradient(wl.x - wl.r * 0.35, wl.y - wl.r * 0.35, wl.r * 0.1, wl.x, wl.y, wl.r);
                g.addColorStop(0, wl.a); g.addColorStop(0.55, wl.b); g.addColorStop(1, wl.c);
                ctx.fillStyle = g;
                ctx.shadowColor = wl.b; ctx.shadowBlur = 24;
                ctx.beginPath(); ctx.arc(wl.x, wl.y, wl.r, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
            });
            ships.forEach(function (s) {
                s.a += dt * s.speed * boost;
                var x = s.well.x + Math.cos(s.a) * s.R;
                var y = s.well.y + Math.sin(s.a) * s.R * s.e;
                s.trail.push(x, y);
                if (s.trail.length > 30) s.trail.splice(0, 2);
                ctx.beginPath();
                for (var j = 0; j < s.trail.length; j += 2) {
                    if (j) ctx.lineTo(s.trail[j], s.trail[j + 1]); else ctx.moveTo(s.trail[j], s.trail[j + 1]);
                }
                ctx.strokeStyle = s.tint; ctx.globalAlpha = 0.32; ctx.lineWidth = 1.2; ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.fillStyle = s.tint;
                ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
            });
        };
    }

    // --- shared drawing helpers for the richer scenes ---
    function lerpColor(a, b, t) {
        var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
        var r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
        var g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
        var bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
        return 'rgb(' + r + ',' + g + ',' + bl + ')';
    }
    // Brushed steel: a vertical post (gradient across x) or a horizontal plate (gradient across y)
    function steel(ctx, x, y, w, h, r, vertical) {
        var g = vertical ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, '#1b2433'); g.addColorStop(0.3, '#5c6f8a'); g.addColorStop(0.5, '#9fb3cc'); g.addColorStop(0.72, '#4b5d78'); g.addColorStop(1, '#141c28');
        ctx.fillStyle = g; roundRect(ctx, x, y, w, h, r); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.stroke();
    }
    function bolt(ctx, x, y, r) {
        var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
        g.addColorStop(0, '#e2e8f0'); g.addColorStop(1, '#475569');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    // Hydraulics Lab: an industrial press cycling on a test block. Fluid, gauge, heat and sparks follow the pressure.
    function sceneHydraulics(w, h) {
        var cx = w * 0.44, base = h * 0.84, top = h * 0.12;
        var postX = w * 0.21, postW = Math.max(6, w * 0.035);
        var cylW = w * 0.14, cylH = h * 0.2;
        var blockW = w * 0.2, blockH = h * 0.2;
        var gx = w * 0.84, gy = h * 0.34, gr = Math.min(w, h) * 0.1;
        var pumpX = cx - postX * 1.32, pumpW = w * 0.085, pumpH = h * 0.15;
        var sparks = [];
        return function (ctx, t, dt, boost) {
            var s = (Math.sin(t * 1.15 * boost) + 1) / 2;
            var e = s * s * (3 - 2 * s);
            var heat = Math.max(0, (e - 0.35) / 0.65);
            // blueprint grid
            ctx.strokeStyle = 'rgba(125,211,252,0.05)'; ctx.lineWidth = 1;
            ctx.beginPath();
            for (var gx1 = 0.5; gx1 < w; gx1 += 22) { ctx.moveTo(gx1, 0); ctx.lineTo(gx1, h); }
            for (var gy1 = 0.5; gy1 < h; gy1 += 22) { ctx.moveTo(0, gy1); ctx.lineTo(w, gy1); }
            ctx.stroke();
            // floor shadow + plate
            var fs = ctx.createLinearGradient(0, base, 0, base + 16);
            fs.addColorStop(0, 'rgba(0,0,0,0.55)'); fs.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = fs; ctx.fillRect(cx - postX - 20, base + 2, postX * 2 + 40, 16);
            steel(ctx, cx - postX - 14, base, postX * 2 + 28, 8, 2, false);
            // posts + top beam with bolts
            steel(ctx, cx - postX - postW / 2, top, postW, base - top, 2, true);
            steel(ctx, cx + postX - postW / 2, top, postW, base - top, 2, true);
            steel(ctx, cx - postX - postW / 2 - 6, top - 7, postX * 2 + postW + 12, 14, 3, false);
            [cx - postX, cx - postX * 0.5, cx + postX * 0.5, cx + postX].forEach(function (bx) { bolt(ctx, bx, top, 2.2); });
            // hydraulic line from the pump to the cylinder; fluid flows along it
            ctx.lineCap = 'round';
            ctx.strokeStyle = 'rgba(34,211,238,0.45)'; ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(pumpX + pumpW / 2, base - pumpH);
            ctx.bezierCurveTo(pumpX + pumpW / 2, top + cylH * 0.5, cx - postX, top + cylH * 0.5, cx - cylW / 2, top + cylH * 0.5);
            ctx.stroke();
            ctx.setLineDash([3, 7]); ctx.lineDashOffset = -t * 40 * boost;
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.25 + e * 0.45).toFixed(2) + ')'; ctx.lineWidth = 1.5;
            ctx.stroke(); ctx.setLineDash([]);
            // pump unit with a status lamp
            steel(ctx, pumpX, base - pumpH, pumpW, pumpH, 4, false);
            ctx.fillStyle = heat > 0.6 ? C.orange : '#34d399'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(pumpX + pumpW * 0.5, base - pumpH + 9, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            // cylinder body and sight glass
            var cg = ctx.createLinearGradient(cx - cylW / 2, 0, cx + cylW / 2, 0);
            cg.addColorStop(0, '#1e2a3a'); cg.addColorStop(0.35, '#5b7290'); cg.addColorStop(0.5, '#93abcc'); cg.addColorStop(0.7, '#4a5f7c'); cg.addColorStop(1, '#16202e');
            ctx.fillStyle = cg; roundRect(ctx, cx - cylW / 2, top + 7, cylW, cylH, 5); ctx.fill();
            ctx.strokeStyle = 'rgba(125,211,252,0.35)'; ctx.lineWidth = 1; ctx.stroke();
            var sgX = cx + cylW * 0.16, sgY = top + 14, sgW = cylW * 0.16, sgH = cylH - 14;
            ctx.fillStyle = 'rgba(5,10,20,0.75)'; roundRect(ctx, sgX, sgY, sgW, sgH, 2); ctx.fill();
            var fl = (sgH - 4) * (0.2 + e * 0.75);
            ctx.fillStyle = 'rgba(34,211,238,0.8)'; roundRect(ctx, sgX + 1.5, sgY + sgH - 2 - fl, sgW - 3, fl, 2); ctx.fill();
            // rod and platen
            var squash = 1 - e * 0.36;
            var platenY = base - blockH * squash - 8;
            var rodTop = top + 7 + cylH;
            var rg = ctx.createLinearGradient(cx - 5, 0, cx + 5, 0);
            rg.addColorStop(0, '#94a3b8'); rg.addColorStop(0.45, '#f8fafc'); rg.addColorStop(1, '#64748b');
            ctx.fillStyle = rg; ctx.fillRect(cx - 5, rodTop, 10, Math.max(0, platenY - rodTop));
            steel(ctx, cx - blockW * 0.72, platenY, blockW * 1.44, 8, 2, false);
            // test block: compresses, bulges and heats up
            var bw = blockW * (1 + e * 0.2), bh = blockH * squash;
            var bg2 = ctx.createLinearGradient(cx - bw / 2, base - bh, cx + bw / 2, base);
            bg2.addColorStop(0, lerpColor('#a8b6c8', '#ffd08a', heat));
            bg2.addColorStop(1, lerpColor('#3f4c5f', '#ef2d2d', heat));
            ctx.fillStyle = bg2;
            if (heat > 0.2) { ctx.shadowColor = 'rgba(255,138,61,' + (heat * 0.9).toFixed(2) + ')'; ctx.shadowBlur = 26 * heat; }
            roundRect(ctx, cx - bw / 2, base - bh, bw, bh, 5); ctx.fill(); ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
            if (e > 0.72) {
                ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(0.9, (e - 0.72) * 3).toFixed(2) + ')'; ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx - bw * 0.32, base - bh * 0.78); ctx.lineTo(cx - bw * 0.12, base - bh * 0.42); ctx.lineTo(cx + bw * 0.06, base - bh * 0.62); ctx.lineTo(cx + bw * 0.24, base - bh * 0.22);
                ctx.moveTo(cx + bw * 0.3, base - bh * 0.85); ctx.lineTo(cx + bw * 0.16, base - bh * 0.55);
                ctx.stroke();
            }
            if (e > 0.9 && Math.random() < 0.45 * boost) {
                sparks.push({ x: cx + rand(-bw / 2, bw / 2), y: base - bh, vx: rand(-60, 60), vy: rand(-110, -40), life: rand(0.3, 0.6) });
            }
            for (var i = sparks.length - 1; i >= 0; i--) {
                var sp = sparks[i];
                sp.life -= dt; sp.vy += 260 * dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt;
                if (sp.life <= 0) { sparks.splice(i, 1); continue; }
                ctx.fillStyle = 'rgba(255,208,138,' + Math.min(1, sp.life * 2).toFixed(2) + ')';
                ctx.fillRect(sp.x, sp.y, 1.6, 1.6);
            }
            // gauge: dial, zones, ticks, needle, glass
            var a0 = Math.PI * 0.75, sweep = Math.PI * 1.5;
            var dg = ctx.createRadialGradient(gx, gy, gr * 0.2, gx, gy, gr * 1.15);
            dg.addColorStop(0, '#1a2233'); dg.addColorStop(1, '#070a12');
            ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(gx, gy, gr * 1.15, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(159,179,204,0.6)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.lineWidth = 4; ctx.lineCap = 'butt';
            ctx.strokeStyle = 'rgba(52,211,153,0.55)'; ctx.beginPath(); ctx.arc(gx, gy, gr * 0.86, a0, a0 + sweep * 0.6); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,208,138,0.65)'; ctx.beginPath(); ctx.arc(gx, gy, gr * 0.86, a0 + sweep * 0.6, a0 + sweep * 0.8); ctx.stroke();
            ctx.strokeStyle = 'rgba(239,45,45,0.8)'; ctx.beginPath(); ctx.arc(gx, gy, gr * 0.86, a0 + sweep * 0.8, a0 + sweep); ctx.stroke();
            ctx.strokeStyle = 'rgba(226,232,240,0.7)'; ctx.lineWidth = 1;
            for (var k = 0; k <= 12; k++) {
                var ta = a0 + sweep * k / 12, inner = k % 3 === 0 ? 0.62 : 0.7;
                ctx.beginPath(); ctx.moveTo(gx + Math.cos(ta) * gr * inner, gy + Math.sin(ta) * gr * inner); ctx.lineTo(gx + Math.cos(ta) * gr * 0.78, gy + Math.sin(ta) * gr * 0.78); ctx.stroke();
            }
            var na = a0 + sweep * e;
            ctx.strokeStyle = C.white; ctx.lineWidth = 2; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(gx - Math.cos(na) * gr * 0.15, gy - Math.sin(na) * gr * 0.15); ctx.lineTo(gx + Math.cos(na) * gr * 0.8, gy + Math.sin(na) * gr * 0.8); ctx.stroke();
            ctx.strokeStyle = C.red; ctx.beginPath(); ctx.moveTo(gx + Math.cos(na) * gr * 0.6, gy + Math.sin(na) * gr * 0.6); ctx.lineTo(gx + Math.cos(na) * gr * 0.8, gy + Math.sin(na) * gr * 0.8); ctx.stroke();
            bolt(ctx, gx, gy, 3.5);
            ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(gx, gy, gr * 1.02, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke();
        };
    }

    // Nuclear Decay: a jittery nucleus, electron shells, and the occasional alpha kick.
    function sceneNucleus(w, h) {
        var cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.085;
        var nucleons = [];
        for (var i = 0; i < 14; i++) {
            var a = rand(0, Math.PI * 2), r = rand(0, R * 0.8);
            nucleons.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, proton: i % 2 === 0, ph: rand(0, Math.PI * 2) });
        }
        var orbits = [
            { rx: R * 3.4, ry: R * 1.25, rot: 0.35, sp: 1.3 },
            { rx: R * 3.6, ry: R * 1.35, rot: 1.4, sp: -1.0 },
            { rx: R * 3.1, ry: R * 1.15, rot: 2.45, sp: 0.85 },
        ];
        var burst = null, nextBurst = 1.8;
        return function (ctx, t, dt, boost) {
            orbits.forEach(function (o) {
                ctx.save(); ctx.translate(cx, cy); ctx.rotate(o.rot);
                ctx.strokeStyle = 'rgba(167,139,250,0.22)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(0, 0, o.rx, o.ry, 0, 0, Math.PI * 2); ctx.stroke();
                var ang = t * o.sp * boost;
                ctx.fillStyle = C.ice; ctx.shadowColor = C.ice; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.arc(Math.cos(ang) * o.rx, Math.sin(ang) * o.ry, 2.6, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0; ctx.restore();
            });
            nucleons.forEach(function (n) {
                var jx = Math.sin(t * 6 + n.ph) * 1.3 * boost, jy = Math.cos(t * 5 + n.ph) * 1.3 * boost;
                var x = cx + n.x + jx, y = cy + n.y + jy, r = R * 0.33;
                var g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.2, x, y, r);
                g.addColorStop(0, n.proton ? '#ffd08a' : '#e2e8f0');
                g.addColorStop(1, n.proton ? '#ef2d2d' : '#475569');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
            });
            nextBurst -= dt * boost;
            if (nextBurst <= 0 && !burst) { burst = { a: rand(0, Math.PI * 2), d: R, life: 1 }; nextBurst = rand(2.4, 4); }
            if (burst) {
                burst.d += dt * boost * w * 0.5;
                burst.life -= dt * boost * 0.8;
                var bx = cx + Math.cos(burst.a) * burst.d, by = cy + Math.sin(burst.a) * burst.d;
                ctx.strokeStyle = 'rgba(255,138,61,' + (0.6 * burst.life).toFixed(2) + ')'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(cx + Math.cos(burst.a) * R, cy + Math.sin(burst.a) * R); ctx.lineTo(bx, by); ctx.stroke();
                ctx.fillStyle = C.orange; ctx.shadowColor = C.orange; ctx.shadowBlur = 12;
                ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * burst.life).toFixed(2) + ')'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(cx, cy, R * 1.1 + (1 - burst.life) * R * 2.6, 0, Math.PI * 2); ctx.stroke();
                if (burst.life <= 0) burst = null;
            }
        };
    }

    // Tank Attack Lab: an SPG on a night ridge lobbing shells at dome bunkers. Aiming arc, tracers, impacts and debris.
    function sceneArtillery(w, h) {
        var ground = h * 0.8;
        var stars = [];
        for (var i = 0; i < 26; i++) stars.push({ x: rand(0, w), y: rand(0, ground * 0.65), r: rand(0.5, 1.4), a: rand(0.3, 0.9), ph: rand(0, 6) });
        function ridge(amp, freq, phase) {
            var pts = [];
            for (var x = 0; x <= w + 8; x += 8) {
                pts.push([x, ground - amp * (0.55 + 0.45 * Math.sin(x * freq + phase)) - amp * 0.3 * Math.sin(x * freq * 2.3 + phase * 1.7)]);
            }
            return pts;
        }
        var farRidge = ridge(h * 0.12, 0.011, 1.2), nearRidge = ridge(h * 0.055, 0.019, 4.1);
        var bunkers = [{ x: w * 0.66, r: w * 0.062, hit: 0 }, { x: w * 0.87, r: w * 0.046, hit: 0 }];
        var hullW = w * 0.15, hullH = h * 0.065, tankX = w * 0.17;
        var shells = [], debris = [], puffs = [];
        var flash = 0, recoil = 0, nextShot = 0.8, target = bunkers[0];
        var T = 1.5, G = h * 1.1;
        function muzzle(tx) { return { x: tx + hullW * 0.72, y: ground - hullH - 6 - h * 0.1 }; }
        function fillRidge(ctx, pts, color) {
            ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, ground + 2);
            for (var i = 0; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
            ctx.lineTo(w + 8, ground + 2); ctx.closePath(); ctx.fill();
        }
        return function (ctx, t, dt, boost) {
            var sdt = dt * boost;
            // sky, stars, moon
            var sky = ctx.createLinearGradient(0, 0, 0, ground);
            sky.addColorStop(0, 'rgba(8,10,28,0)'); sky.addColorStop(1, 'rgba(24,52,70,0.45)');
            ctx.fillStyle = sky; ctx.fillRect(0, 0, w, ground);
            stars.forEach(function (s) {
                ctx.fillStyle = 'rgba(255,255,255,' + (s.a * (0.6 + 0.4 * Math.sin(t * 1.8 + s.ph))).toFixed(2) + ')';
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
            });
            var mx = w * 0.8, my = h * 0.16, mr = h * 0.055;
            var mg = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
            mg.addColorStop(0, '#f1f5f9'); mg.addColorStop(1, '#94a3b8');
            ctx.fillStyle = mg; ctx.shadowColor = 'rgba(226,232,240,0.6)'; ctx.shadowBlur = 18;
            ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            // ridges and ground
            fillRidge(ctx, farRidge, '#0c1a1d'); fillRidge(ctx, nearRidge, '#10231a');
            var gg = ctx.createLinearGradient(0, ground, 0, h);
            gg.addColorStop(0, '#1b2c1e'); gg.addColorStop(1, '#0a120c');
            ctx.fillStyle = gg; ctx.fillRect(0, ground, w, h - ground);
            ctx.strokeStyle = 'rgba(163,200,90,0.4)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, ground + 0.5); ctx.lineTo(w, ground + 0.5); ctx.stroke();
            // aiming arc while reloading
            recoil = Math.max(0, recoil - dt * 4);
            var tx = tankX - recoil * 6;
            var m = muzzle(tx);
            if (!shells.length) {
                var vx = (target.x - m.x) / T, vy = (ground - m.y) / T - G * T / 2;
                ctx.setLineDash([2, 6]); ctx.strokeStyle = 'rgba(125,211,252,0.35)'; ctx.lineWidth = 1;
                ctx.beginPath();
                for (var q = 0; q <= 16; q++) {
                    var st = T * q / 16, px = m.x + vx * st, py = m.y + vy * st + 0.5 * G * st * st;
                    if (q) ctx.lineTo(px, py); else ctx.moveTo(px, py);
                }
                ctx.stroke(); ctx.setLineDash([]);
                ctx.strokeStyle = 'rgba(125,211,252,0.5)';
                ctx.beginPath(); ctx.arc(target.x, ground - target.r * 0.5, target.r * 1.25, 0, Math.PI * 2); ctx.stroke();
            }
            // bunkers
            bunkers.forEach(function (b) {
                b.hit = Math.max(0, b.hit - dt);
                var g = ctx.createRadialGradient(b.x - b.r * 0.35, ground - b.r * 0.7, b.r * 0.1, b.x, ground - b.r * 0.2, b.r * 1.15);
                g.addColorStop(0, b.hit > 0 ? '#ffb45c' : '#8f8ab0'); g.addColorStop(0.55, '#463e6b'); g.addColorStop(1, '#1e1a33');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, ground, b.r, Math.PI, 0); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = 'rgba(196,181,253,0.5)'; ctx.lineWidth = 1; ctx.stroke();
                ctx.fillStyle = 'rgba(5,5,8,0.75)'; roundRect(ctx, b.x - b.r * 0.2, ground - b.r * 0.42, b.r * 0.4, b.r * 0.42, 2); ctx.fill();
                ctx.strokeStyle = 'rgba(226,232,240,0.55)'; ctx.beginPath(); ctx.moveTo(b.x, ground - b.r); ctx.lineTo(b.x, ground - b.r * 1.35); ctx.stroke();
                ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(b.x, ground - b.r * 1.38, Math.sin(t * 4 + b.x) > 0 ? 2 : 1.3, 0, Math.PI * 2); ctx.fill();
            });
            // tank: tracks, wheels, hull, turret, barrel
            var trackY = ground - hullH * 0.75, trackH = hullH * 0.75;
            ctx.fillStyle = '#242c14'; roundRect(ctx, tx - hullW * 0.55, trackY, hullW * 1.1, trackH, trackH * 0.5); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
            for (var wI = 0; wI < 5; wI++) {
                var wx = tx - hullW * 0.42 + wI * hullW * 0.21, wy = trackY + trackH * 0.5;
                var wg = ctx.createRadialGradient(wx - 1, wy - 1, 0.5, wx, wy, trackH * 0.34);
                wg.addColorStop(0, '#9aa86a'); wg.addColorStop(1, '#3f4a1f');
                ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(wx, wy, trackH * 0.34, 0, Math.PI * 2); ctx.fill();
            }
            var hg = ctx.createLinearGradient(0, trackY - hullH, 0, trackY);
            hg.addColorStop(0, '#a6c25c'); hg.addColorStop(1, '#5d7a22');
            ctx.fillStyle = hg;
            ctx.beginPath(); ctx.moveTo(tx - hullW * 0.5, trackY); ctx.lineTo(tx - hullW * 0.42, trackY - hullH); ctx.lineTo(tx + hullW * 0.46, trackY - hullH); ctx.lineTo(tx + hullW * 0.56, trackY); ctx.closePath(); ctx.fill();
            var turW = hullW * 0.46, turH = hullH * 0.8, turY = trackY - hullH - turH + 2;
            var tg = ctx.createLinearGradient(0, turY, 0, turY + turH);
            tg.addColorStop(0, '#b5d06b'); tg.addColorStop(1, '#6b8a2a');
            ctx.fillStyle = tg; roundRect(ctx, tx - turW * 0.55, turY, turW, turH, turH * 0.45); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(tx - turW * 0.1, turY + turH * 0.35, turH * 0.2, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#8fb339'; ctx.lineWidth = Math.max(3, hullH * 0.28); ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(tx + turW * 0.3, turY + turH * 0.45); ctx.lineTo(m.x, m.y); ctx.stroke();
            ctx.strokeStyle = '#5d7a22'; ctx.lineWidth = Math.max(4, hullH * 0.36);
            ctx.beginPath(); ctx.moveTo(m.x - (m.x - tx) * 0.12, m.y + (ground - m.y) * 0.03); ctx.lineTo(m.x, m.y); ctx.stroke();
            // firing
            nextShot -= sdt;
            if (nextShot <= 0) {
                var vx2 = (target.x - m.x) / T, vy2 = (ground - m.y) / T - G * T / 2;
                shells.push({ x: m.x, y: m.y, vx: vx2, vy: vy2, life: T + 0.3, trail: [] });
                flash = 1; recoil = 1; nextShot = rand(1.8, 2.6);
                for (var k = 0; k < 5; k++) puffs.push({ x: m.x + rand(-4, 4), y: m.y + rand(-4, 4), r: rand(2, 4), life: rand(0.5, 0.9), c: '230,230,240', vy: -10 });
            }
            if (flash > 0) {
                var fr = hullW * 0.28 * flash;
                var fg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, fr);
                fg.addColorStop(0, 'rgba(255,255,255,0.95)'); fg.addColorStop(0.35, 'rgba(255,208,138,0.8)'); fg.addColorStop(1, 'rgba(255,138,61,0)');
                ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(m.x, m.y, fr, 0, Math.PI * 2); ctx.fill();
                flash = Math.max(0, flash - dt * 7);
            }
            // shells with tracer trails
            for (var j = shells.length - 1; j >= 0; j--) {
                var sh = shells[j];
                sh.vy += G * sdt; sh.x += sh.vx * sdt; sh.y += sh.vy * sdt; sh.life -= sdt;
                sh.trail.push(sh.x, sh.y); if (sh.trail.length > 24) sh.trail.splice(0, 2);
                ctx.beginPath();
                for (var p2 = 0; p2 < sh.trail.length; p2 += 2) { if (p2) ctx.lineTo(sh.trail[p2], sh.trail[p2 + 1]); else ctx.moveTo(sh.trail[p2], sh.trail[p2 + 1]); }
                ctx.strokeStyle = 'rgba(255,138,61,0.45)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
                ctx.fillStyle = '#ffd08a'; ctx.shadowColor = C.orange; ctx.shadowBlur = 12;
                ctx.beginPath(); ctx.arc(sh.x, sh.y, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
                if (sh.y >= ground || sh.life <= 0) {
                    shells.splice(j, 1);
                    bunkers.forEach(function (b) { if (Math.abs(sh.x - b.x) < b.r * 1.2) b.hit = 0.7; });
                    target = bunkers[Math.floor(Math.random() * bunkers.length)];
                    puffs.push({ x: sh.x, y: ground - 4, r: 6, life: 0.5, c: '255,220,160', ring: true });
                    for (var d = 0; d < 9; d++) debris.push({ x: sh.x, y: ground - 4, vx: rand(-70, 70), vy: rand(-140, -50), life: rand(0.5, 0.9), s: rand(1.5, 3) });
                    for (var k2 = 0; k2 < 7; k2++) puffs.push({ x: sh.x + rand(-8, 8), y: ground - rand(0, 10), r: rand(4, 9), life: rand(0.7, 1.2), c: k2 % 2 ? '255,138,61' : '120,120,135', vy: -14 });
                }
            }
            // debris and smoke
            for (var di = debris.length - 1; di >= 0; di--) {
                var db = debris[di];
                db.life -= sdt; db.vy += 280 * sdt; db.x += db.vx * sdt; db.y += db.vy * sdt;
                if (db.life <= 0 || db.y > ground + 2) { debris.splice(di, 1); continue; }
                ctx.fillStyle = 'rgba(70,62,107,' + Math.min(1, db.life * 1.5).toFixed(2) + ')'; ctx.fillRect(db.x, db.y, db.s, db.s);
            }
            for (var pi = puffs.length - 1; pi >= 0; pi--) {
                var pf = puffs[pi];
                pf.life -= sdt; pf.y += (pf.vy || 0) * dt; pf.r += dt * (pf.ring ? 70 : 14);
                if (pf.life <= 0) { puffs.splice(pi, 1); continue; }
                if (pf.ring) {
                    ctx.strokeStyle = 'rgba(' + pf.c + ',' + Math.min(1, pf.life * 1.4).toFixed(2) + ')'; ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.arc(pf.x, pf.y, pf.r, Math.PI, 0); ctx.stroke();
                } else {
                    ctx.fillStyle = 'rgba(' + pf.c + ',' + (pf.life * 0.5).toFixed(2) + ')';
                    ctx.beginPath(); ctx.arc(pf.x, pf.y, pf.r, 0, Math.PI * 2); ctx.fill();
                }
            }
        };
    }

    // Anything else: a slow drift of stars and a passing comet.
    function sceneComet(w, h) {
        var stars = [];
        for (var i = 0; i < 40; i++) stars.push({ x: rand(0, w), y: rand(0, h), r: rand(0.6, 1.8), a: rand(0.3, 0.9), ph: rand(0, 6) });
        var comet = { x: -40, y: h * 0.3, vx: w * 0.25, vy: h * 0.12 };
        return function (ctx, t, dt, boost) {
            stars.forEach(function (s) {
                ctx.fillStyle = 'rgba(255,255,255,' + (s.a * (0.6 + 0.4 * Math.sin(t * 1.5 + s.ph))).toFixed(2) + ')';
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
            });
            comet.x += comet.vx * dt * boost; comet.y += comet.vy * dt * boost;
            if (comet.x > w + 60) { comet.x = -60; comet.y = rand(h * 0.1, h * 0.5); }
            var g = ctx.createLinearGradient(comet.x, comet.y, comet.x - 90, comet.y - 40);
            g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.3, 'rgba(125,211,252,0.5)'); g.addColorStop(1, 'rgba(125,211,252,0)');
            ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(comet.x, comet.y); ctx.lineTo(comet.x - 90, comet.y - 40); ctx.stroke();
            ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(comet.x, comet.y, 2.5, 0, Math.PI * 2); ctx.fill();
        };
    }

    function pickScene(slug) {
        slug = (slug || '').toLowerCase();
        if (/gravit|orbit|gunner/.test(slug)) return sceneGravity;
        if (/hydraul|press|piston/.test(slug)) return sceneHydraulics;
        if (/nuclear|decay|atom|reactor/.test(slug)) return sceneNucleus;
        if (/tank|artiller|siege|cannon/.test(slug)) return sceneArtillery;
        return sceneComet;
    }

    var previews = [];
    var previewLoop = { running: false, io: null };
    function initSimPreviews(root) {
        var canvases = (root || document).querySelectorAll('[data-sim] canvas.sim-preview:not([data-ready])');
        if (!canvases.length) return;
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        each(canvases, function (canvas) {
            canvas.setAttribute('data-ready', '1');
            var tile = canvas.closest('[data-sim]');
            var item = {
                canvas: canvas, ctx: canvas.getContext('2d'), tile: tile,
                factory: pickScene(tile.getAttribute('data-sim')),
                draw: null, w: 0, h: 0, visible: false, boost: 1, targetBoost: 1, last: 0,
            };
            item.size = function () {
                var r = canvas.getBoundingClientRect();
                if (!r.width || !r.height) return;
                item.w = r.width; item.h = r.height;
                canvas.width = Math.round(r.width * dpr);
                canvas.height = Math.round(r.height * dpr);
                item.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                // Scenes draw into a centred box: the top ~72% of a card (title block below stays
                // clear), most of a mini tile; width capped so wide tiles keep the scene's proportions.
                var fit = tile.classList.contains('is-mini') ? 0.92 : tile.classList.contains('is-open') ? 0.56 : 0.72;
                var vh = item.h * fit, vw = Math.min(item.w, vh * 1.75);
                item.offset = (item.w - vw) / 2;
                item.draw = item.factory(vw, vh);
                // Paint one frame now: resizing the backing store clears the canvas.
                item.paint(performance.now() / 1000, 0.016);
            };
            item.paint = function (t, dt) {
                item.ctx.clearRect(0, 0, item.w, item.h);
                item.ctx.save();
                item.ctx.translate(item.offset || 0, 0);
                item.draw(item.ctx, t, dt, item.boost);
                item.ctx.restore();
            };
            // A scripted scene is the tile's picture; the static thumbnail steps aside.
            if (item.factory !== sceneComet) tile.setAttribute('data-has-scene', '1');
            if (canHover) {
                tile.addEventListener('pointerenter', function () { item.targetBoost = 2.4; });
                tile.addEventListener('pointerleave', function () { item.targetBoost = 1; });
            }
            item.size();
            previews.push(item);
        });

        if (reducedMotion) {
            // One composed still per tile: run a few silent ticks so trails exist.
            previews.forEach(function (it) {
                if (!it.draw) return;
                for (var k = 0; k < 40; k++) it.paint(1 + k * 0.03, 0.03);
            });
            return;
        }

        function frame(now) {
            var any = false;
            for (var i = 0; i < previews.length; i++) {
                var it = previews[i];
                if (!it.visible || !it.draw) continue;
                any = true;
                var dt = it.last ? Math.min(0.05, (now - it.last) / 1000) : 0.016;
                it.last = now;
                it.boost += (it.targetBoost - it.boost) * 0.08;
                it.paint(now / 1000, dt);
            }
            if (any && !document.hidden) requestAnimationFrame(frame);
            else previewLoop.running = false;
        }
        function kick() {
            if (!previewLoop.running) { previewLoop.running = true; requestAnimationFrame(frame); }
        }

        if (!previewLoop.io) {
            previewLoop.io = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    for (var i = 0; i < previews.length; i++) {
                        if (previews[i].canvas === e.target) { previews[i].visible = e.isIntersecting; previews[i].last = 0; }
                    }
                });
                kick();
            }, { threshold: 0.05 });
            document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
            var rt;
            window.addEventListener('resize', function () {
                clearTimeout(rt);
                rt = setTimeout(function () { previews.forEach(function (it) { it.size(); }); kick(); }, 150);
            });
        }
        each(canvases, function (c) { previewLoop.io.observe(c); });
    }

    /* ============================================================
       FLIGHT PATH — the timeline's rocket marker follows the scroll,
       lighting each waypoint it passes.
       ============================================================ */
    function initFlightPath() {
        var path = document.querySelector('.flight-path');
        if (!path) return;
        var marker = path.querySelector('.flight-marker');
        var nodes = path.querySelectorAll('.flight-node, .flight-year');
        if (!marker) return;
        if (reducedMotion) {
            marker.style.display = 'none';
            each(nodes, function (n) { n.classList.add('is-passed'); });
            return;
        }
        function update() {
            var r = path.getBoundingClientRect();
            var focus = window.innerHeight * 0.42;
            var y = clamp(focus - r.top, 0, r.height);
            marker.style.transform = 'translate3d(-50%, ' + y.toFixed(1) + 'px, 0)';
            for (var i = 0; i < nodes.length; i++) {
                var nr = nodes[i].getBoundingClientRect();
                nodes[i].classList.toggle('is-passed', nr.top - r.top <= y + 8);
            }
        }
        onScroll(update);
        window.addEventListener('resize', update);
    }

    /* ============================================================
       SPOTLIGHT — pointer-tracked glow on .spotlight cards
       ============================================================ */
    function initSpotlight() {
        if (!canHover) return;
        document.addEventListener('pointermove', function (e) {
            if (!e.target || !e.target.closest) return;
            var card = e.target.closest('.spotlight');
            if (!card) return;
            var r = card.getBoundingClientRect();
            card.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(2) + '%');
            card.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(2) + '%');
        }, { passive: true });
    }

    /* ============================================================
       MAGNETIC BUTTONS — CTAs lean toward the cursor
       ============================================================ */
    function initMagnetic(root) {
        if (reducedMotion || !canHover) return;
        (root || document).querySelectorAll('.btn-launch:not([data-mag]), .btn-ghost:not([data-mag])').forEach(function (btn) {
            btn.setAttribute('data-mag', '1');
            btn.addEventListener('pointermove', function (e) {
                var r = btn.getBoundingClientRect();
                var x = (e.clientX - r.left - r.width / 2) * 0.14;
                var y = (e.clientY - r.top - r.height / 2) * 0.22;
                var max = 6;
                x = Math.max(-max, Math.min(max, x));
                y = Math.max(-max, Math.min(max, y));
                btn.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + (y - 2).toFixed(1) + 'px) scale(1.02)';
            });
            btn.addEventListener('pointerleave', function () {
                btn.style.transform = '';
            });
        });
    }

    /* ============================================================
       BOOT
       ============================================================ */
    document.addEventListener('DOMContentLoaded', function () {
        initCosmos();
        initScrollRocket();
        observeReveals();
        initCounters();
        initTilt();
        initScrub();
        initHeroScene();
        initLaunchHero();
        initSimPreviews();
        initFlightPath();
        initSpotlight();
        initMagnetic();
        // Re-scan content swapped in by HTMX (infinite scroll, search)
        document.body.addEventListener('htmx:afterSwap', function () {
            observeReveals(document);
            initTilt(document);
            initMagnetic(document);
            initSimPreviews(document);
        });
    });
})();
