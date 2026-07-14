// Sherwin Universe — cosmos engine + UI effects
(function () {
    'use strict';

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function themeIsLight() {
        return document.documentElement.getAttribute('data-theme') === 'light';
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

        function rand(a, b) { return a + Math.random() * (b - a); }

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
        var ticking = false;
        function update() {
            ticking = false;
            var max = document.documentElement.scrollHeight - window.innerHeight;
            var p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
            bar.style.width = (p * 100) + '%';
            rocket.style.left = 'calc(' + (p * 100) + '% - 14px)';
            rocket.style.opacity = p > 0.01 ? '1' : '0';
        }
        window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(update); }
        }, { passive: true });
        update();
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
        if (reducedMotion || !window.matchMedia('(hover: hover)').matches) return;
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
       BOOT
       ============================================================ */
    document.addEventListener('DOMContentLoaded', function () {
        initCosmos();
        initScrollRocket();
        observeReveals();
        initCounters();
        initTilt();
        // Re-scan content swapped in by HTMX (infinite scroll, search)
        document.body.addEventListener('htmx:afterSwap', function (e) {
            observeReveals(document);
            initTilt(document);
        });
    });
})();
