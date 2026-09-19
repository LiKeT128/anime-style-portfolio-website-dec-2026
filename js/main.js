(() => {
    'use strict';

    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

    const store = {
        get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
    };

    /* Runs fn only while el is on screen */
    function whenVisible(el, onChange, rootMargin = '0px') {
        const io = new IntersectionObserver(entries => entries.forEach(e => onChange(e.isIntersecting)), { rootMargin });
        io.observe(el);
    }

    /* ------------------------------------------------------------------
       Marquee: duplicate content for a seamless loop (before i18n scan)
    ------------------------------------------------------------------ */
    $$('[data-marquee]').forEach(track => { track.innerHTML += track.innerHTML; });

    /* ------------------------------------------------------------------
       i18n
    ------------------------------------------------------------------ */
    const i18nEls = $$('[data-i18n]');
    const originals = new Map(i18nEls.map(el => [el, el.innerHTML]));
    const EN = {
        'hero.rotate': ['trading systems', 'LLM evaluations', 'web apps', 'Roblox game systems', 'order out of chaos'],
        'contact.copied': 'Copied!',
        'toast.copied': 'Email copied to clipboard'
    };
    const HTML_LANG = { en: 'en', sk: 'sk', ru: 'ru', ua: 'uk' };
    let dict = null;

    function t(key) {
        return (dict && dict[key] != null) ? dict[key] : EN[key];
    }

    function setLang(lang) {
        const all = window.translations || {};
        if (lang !== 'en' && !all[lang]) lang = 'en';
        dict = lang === 'en' ? null : all[lang];

        i18nEls.forEach(el => {
            const val = dict && dict[el.dataset.i18n];
            el.innerHTML = val != null ? val : originals.get(el);
        });

        document.documentElement.lang = HTML_LANG[lang];
        $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
        store.set('preferredLanguage', lang);
        rotatorIndex = -1;
        nextWord();
    }

    document.addEventListener('click', e => {
        const btn = e.target.closest('[data-lang]');
        if (btn) setLang(btn.dataset.lang);
    });

    /* ------------------------------------------------------------------
       Rotating word with a scramble effect
    ------------------------------------------------------------------ */
    const rotator = $('[data-rotator]');
    let rotatorIndex = -1;
    let rotatorRaf = 0;
    const GLYPHS = '!<>-_\\/[]{}=+*^?#01';
    const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function scrambleTo(el, text) {
        cancelAnimationFrame(rotatorRaf);
        if (reduceMotion) { el.textContent = text; return; }
        const from = el.textContent;
        const len = Math.max(from.length, text.length);
        const queue = [];
        for (let i = 0; i < len; i++) {
            const start = Math.floor(Math.random() * 14);
            queue.push({ from: from[i] || '', to: text[i] || '', start, end: start + 6 + Math.floor(Math.random() * 14) });
        }
        let frame = 0;
        const step = () => {
            let out = '';
            let done = 0;
            for (const q of queue) {
                if (frame >= q.end) { done++; out += esc(q.to); }
                else if (frame >= q.start) out += '<span class="scr">' + esc(GLYPHS[Math.floor(Math.random() * GLYPHS.length)]) + '</span>';
                else out += esc(q.from);
            }
            el.innerHTML = out;
            if (done < queue.length) { frame++; rotatorRaf = requestAnimationFrame(step); }
        };
        step();
    }

    function nextWord() {
        if (!rotator) return;
        const words = t('hero.rotate');
        rotatorIndex = (rotatorIndex + 1) % words.length;
        scrambleTo(rotator, words[rotatorIndex]);
    }

    if (rotator && !reduceMotion) setInterval(nextWord, 2800);

    setLang(store.get('preferredLanguage') || 'en');

    /* ------------------------------------------------------------------
       Page load
    ------------------------------------------------------------------ */
    const markLoaded = () => document.body.classList.add('is-loaded');
    Promise.race([
        document.fonts ? document.fonts.ready : Promise.resolve(),
        new Promise(r => setTimeout(r, 700))
    ]).then(markLoaded);

    const yearEl = $('[data-year]');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* ------------------------------------------------------------------
       Navigation, mobile menu, active section
    ------------------------------------------------------------------ */
    const nav = $('[data-nav]');
    const burger = $('[data-burger]');
    const menu = $('[data-menu]');
    let menuOpen = false;

    function toggleMenu(open = !menuOpen) {
        menuOpen = open;
        menu.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', String(open));
        document.body.style.overflow = open ? 'hidden' : '';
        nav.classList.remove('is-hidden');
    }

    burger.addEventListener('click', () => toggleMenu());
    $$('a', menu).forEach(a => a.addEventListener('click', () => toggleMenu(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) toggleMenu(false); });
    matchMedia('(min-width: 961px)').addEventListener('change', e => { if (e.matches && menuOpen) toggleMenu(false); });

    const navLinks = $$('.nav-links a');
    const sectionIO = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            const id = e.target.id === 'principles' ? 'experience' : e.target.id;
            navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(s => sectionIO.observe(s));

    /* ------------------------------------------------------------------
       Scroll-driven bits: nav state, progress bar, timeline, parallax
    ------------------------------------------------------------------ */
    const progress = $('.scroll-progress span');
    const timeline = $('[data-timeline]');
    const tlItems = timeline ? $$('.tl-item', timeline) : [];
    const aboutImg = $('.about-img');
    let lastY = window.scrollY;
    let scrollQueued = false;

    function onScroll() {
        scrollQueued = false;
        const y = window.scrollY;
        const vh = window.innerHeight;

        nav.classList.toggle('is-scrolled', y > 30);
        if (!menuOpen) nav.classList.toggle('is-hidden', y > lastY && y > 480);
        lastY = y;

        const max = document.documentElement.scrollHeight - vh;
        progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);

        if (timeline) {
            const r = timeline.getBoundingClientRect();
            const line = vh * 0.62;
            const p = clamp((line - r.top) / r.height, 0, 1);
            timeline.style.setProperty('--p', (p * 100).toFixed(2) + '%');
            tlItems.forEach(item => {
                const node = item.querySelector('.tl-node').getBoundingClientRect();
                item.classList.toggle('is-active', node.top < line);
            });
        }

        if (aboutImg && !reduceMotion) {
            const r = aboutImg.getBoundingClientRect();
            if (r.bottom > 0 && r.top < vh) {
                // media is scaled 1.06, so ±2.5% of the height never exposes an edge
                const room = r.height * 0.025;
                const offset = clamp((r.top + r.height / 2 - vh / 2) * -0.06, -room, room);
                aboutImg.style.setProperty('--iy', offset.toFixed(1) + 'px');
            }
        }
    }

    window.addEventListener('scroll', () => {
        if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    /* ------------------------------------------------------------------
       Reveal on scroll + count-up
    ------------------------------------------------------------------ */
    function countUp(el) {
        const target = +el.dataset.count;
        if (reduceMotion) { el.textContent = target; return; }
        const dur = 1700;
        const t0 = performance.now();
        const tick = now => {
            const k = clamp((now - t0) / dur, 0, 1);
            const eased = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
            el.textContent = Math.round(target * eased);
            if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    $$('[data-count]').forEach(el => { if (!reduceMotion) el.textContent = '0'; });

    const revealIO = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            e.target.classList.add('is-in');
            $$('[data-count]', e.target).forEach(countUp);
            revealIO.unobserve(e.target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('[data-reveal]').forEach(el => revealIO.observe(el));

    /* ------------------------------------------------------------------
       Hero WebGL shader (domain-warped noise in the site palette)
    ------------------------------------------------------------------ */
    const pointer = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5 };

    function initShader(canvas) {
        const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power' });
        if (!gl) return;

        const vsSrc = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
        const fsSrc = `
            precision mediump float;
            uniform vec2 u_res;
            uniform float u_time;
            uniform vec2 u_mouse;

            float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
            float noise(vec2 p){
                vec2 i = floor(p), f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                           mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
            }
            float fbm(vec2 p){
                float v = 0.0, a = 0.5;
                mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
                for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
                return v;
            }
            void main(){
                vec2 uv = gl_FragCoord.xy / u_res;
                vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
                float t = u_time * 0.05;
                vec2 m = (u_mouse - 0.5) * vec2(u_res.x / u_res.y, 1.0);
                p += m * 0.12;

                vec2 q = vec2(fbm(p * 1.25 + vec2(0.0, t)), fbm(p * 1.25 + vec2(5.2, 1.3) - t));
                vec2 r = vec2(fbm(p * 1.4 + 3.4 * q + vec2(1.7, 9.2) + 0.9 * t),
                              fbm(p * 1.4 + 3.4 * q + vec2(8.3, 2.8) - 0.7 * t));
                float f = fbm(p * 1.1 + 3.0 * r);

                vec3 coral  = vec3(1.00, 0.42, 0.24);
                vec3 pink   = vec3(1.00, 0.24, 0.55);
                vec3 violet = vec3(0.55, 0.36, 0.96);
                vec3 cyan   = vec3(0.13, 0.83, 0.93);

                vec3 col = mix(violet, cyan, smoothstep(0.30, 0.80, q.x));
                col = mix(col, pink, smoothstep(0.35, 0.85, r.y));
                col = mix(col, coral, smoothstep(0.30, 0.75, f * r.x * 1.5));

                // bright ribbons where the warped field folds, deep background elsewhere
                float glow = smoothstep(0.22, 0.78, f);
                float ribbon = pow(smoothstep(0.35, 0.95, length(r) * 0.95), 2.0);
                vec3 bg = vec3(0.027, 0.024, 0.043);
                col = mix(bg, col, clamp(glow * 0.75 + ribbon * 0.5, 0.0, 1.0));
                col += 0.18 * ribbon * mix(pink, cyan, uv.y);

                // brighter on the right where the cards float, calmer behind the text
                col *= mix(0.5, 1.2, smoothstep(0.0, 0.95, uv.x));
                col *= 0.8 + 0.2 * smoothstep(0.0, 0.6, uv.y);
                gl_FragColor = vec4(col, 1.0);
            }`;

        const compile = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
            return s;
        };
        const vs = compile(gl.VERTEX_SHADER, vsSrc);
        const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
        if (!vs || !fs) return;
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'p');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        const uRes = gl.getUniformLocation(prog, 'u_res');
        const uTime = gl.getUniformLocation(prog, 'u_time');
        const uMouse = gl.getUniformLocation(prog, 'u_mouse');

        // Render at reduced resolution — the image is soft anyway, and it keeps the GPU cool
        const resize = () => {
            const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.5;
            const w = Math.max(1, Math.round(canvas.clientWidth * scale));
            const h = Math.max(1, Math.round(canvas.clientHeight * scale));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
                gl.viewport(0, 0, w, h);
            }
        };

        let visible = true;
        let raf = 0;
        const start = performance.now() - 20000;

        const draw = now => {
            resize();
            pointer.sx = lerp(pointer.sx, pointer.x, 0.04);
            pointer.sy = lerp(pointer.sy, pointer.y, 0.04);
            gl.uniform2f(uRes, canvas.width, canvas.height);
            gl.uniform1f(uTime, (now - start) / 1000);
            gl.uniform2f(uMouse, pointer.sx, 1 - pointer.sy);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        };

        const loop = now => {
            draw(now);
            raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
        };

        draw(performance.now());
        canvas.classList.add('is-ready');
        $('.hero-fallback').style.display = 'none';

        if (reduceMotion) {
            window.addEventListener('resize', () => draw(start + 20000));
            return;
        }

        const kick = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop); };
        whenVisible(canvas, v => { visible = v; kick(); });
        document.addEventListener('visibilitychange', kick);
        kick();
    }

    const heroCanvas = $('.hero-canvas');
    if (heroCanvas) initShader(heroCanvas);

    /* ------------------------------------------------------------------
       Pointer: cursor ring, hero card parallax, magnetic buttons, tilt
    ------------------------------------------------------------------ */
    window.addEventListener('pointermove', e => {
        pointer.x = e.clientX / window.innerWidth;
        pointer.y = e.clientY / window.innerHeight;
    }, { passive: true });

    if (finePointer && !reduceMotion) {
        const cursor = $('.cursor');
        const floatCards = $$('.float-card');
        const hero = $('.hero');
        const c = { x: -100, y: -100, tx: -100, ty: -100 };
        let heroVisible = true;
        whenVisible(hero, v => { heroVisible = v; });

        window.addEventListener('pointermove', e => {
            c.tx = e.clientX;
            c.ty = e.clientY;
            cursor.classList.add('is-on');
        }, { passive: true });
        document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
        document.addEventListener('pointerover', e => {
            cursor.classList.toggle('is-hover', !!e.target.closest('a, button, [data-tilt], .chips li'));
        });

        const frame = () => {
            c.x = lerp(c.x, c.tx, 0.2);
            c.y = lerp(c.y, c.ty, 0.2);
            cursor.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;

            if (heroVisible && window.innerWidth > 960) {
                const dx = pointer.sx - 0.5;
                const dy = pointer.sy - 0.5;
                floatCards.forEach(card => {
                    const d = +card.dataset.depth || 10;
                    card.style.setProperty('--px', (-dx * d * 1.6).toFixed(2) + 'px');
                    card.style.setProperty('--py', (-dy * d * 1.6).toFixed(2) + 'px');
                });
            }
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);

        $$('.magnetic').forEach(el => {
            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                const x = e.clientX - (r.left + r.width / 2);
                const y = e.clientY - (r.top + r.height / 2);
                el.style.transform = `translate(${x * 0.22}px, ${y * 0.32}px)`;
            });
            el.addEventListener('pointerleave', () => { el.style.transform = ''; });
        });

        $$('[data-tilt]').forEach(el => {
            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;
                const py = (e.clientY - r.top) / r.height;
                el.style.setProperty('--ry', ((px - 0.5) * 9).toFixed(2) + 'deg');
                el.style.setProperty('--rx', ((0.5 - py) * 7).toFixed(2) + 'deg');
                el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
                el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
            });
            el.addEventListener('pointerleave', () => {
                el.style.setProperty('--rx', '0deg');
                el.style.setProperty('--ry', '0deg');
            });
        });
    }

    /* ------------------------------------------------------------------
       Live price chart (decorative random walk with signal markers)
    ------------------------------------------------------------------ */
    function initChart(canvas) {
        const ctx = canvas.getContext('2d');
        const big = canvas.dataset.chart === 'big';
        const N = big ? 140 : 90;
        const pts = [];
        let v = 0;
        let drift = 0;
        for (let i = 0; i < N; i++) {
            drift = drift * 0.9 + (Math.random() - 0.5) * 0.35;
            v += drift;
            pts.push({ v, sig: Math.random() < 0.035 ? (Math.random() < 0.5 ? 1 : -1) : 0 });
        }
        let w = 0;
        let h = 0;
        let dpr = 1;

        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = canvas.clientWidth;
            h = canvas.clientHeight;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const draw = () => {
            if (!w) resize();
            ctx.clearRect(0, 0, w, h);
            let min = Infinity;
            let max = -Infinity;
            pts.forEach(p => { min = Math.min(min, p.v); max = Math.max(max, p.v); });
            const pad = (max - min) * 0.18 + 0.001;
            min -= pad;
            max += pad;
            const X = i => (i / (N - 1)) * w;
            const Y = val => h - ((val - min) / (max - min)) * h;

            // grid
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            for (let g = 1; g < 4; g++) {
                const gy = Math.round((h / 4) * g) + 0.5;
                ctx.beginPath();
                ctx.moveTo(0, gy);
                ctx.lineTo(w, gy);
                ctx.stroke();
            }

            // area
            const area = ctx.createLinearGradient(0, 0, 0, h);
            area.addColorStop(0, 'rgba(255,61,139,0.28)');
            area.addColorStop(1, 'rgba(139,92,246,0)');
            ctx.beginPath();
            pts.forEach((p, i) => (i ? ctx.lineTo(X(i), Y(p.v)) : ctx.moveTo(X(i), Y(p.v))));
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fillStyle = area;
            ctx.fill();

            // line
            const line = ctx.createLinearGradient(0, 0, w, 0);
            line.addColorStop(0, '#8b5cf6');
            line.addColorStop(0.55, '#ff3d8b');
            line.addColorStop(1, '#ff6b3d');
            ctx.beginPath();
            pts.forEach((p, i) => (i ? ctx.lineTo(X(i), Y(p.v)) : ctx.moveTo(X(i), Y(p.v))));
            ctx.strokeStyle = line;
            ctx.lineWidth = big ? 2 : 1.6;
            ctx.lineJoin = 'round';
            ctx.stroke();

            // signals
            pts.forEach((p, i) => {
                if (!p.sig) return;
                const x = X(i);
                const y = Y(p.v) + (p.sig > 0 ? 12 : -12);
                ctx.fillStyle = p.sig > 0 ? '#a3e635' : '#22d3ee';
                ctx.beginPath();
                if (p.sig > 0) { ctx.moveTo(x, y - 5); ctx.lineTo(x + 4.5, y + 3); ctx.lineTo(x - 4.5, y + 3); }
                else { ctx.moveTo(x, y + 5); ctx.lineTo(x + 4.5, y - 3); ctx.lineTo(x - 4.5, y - 3); }
                ctx.fill();
            });

            // last price
            const last = pts[N - 1];
            const ly = Y(last.v);
            ctx.setLineDash([3, 4]);
            ctx.strokeStyle = 'rgba(255,107,61,0.55)';
            ctx.beginPath();
            ctx.moveTo(0, ly);
            ctx.lineTo(w, ly);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowColor = '#ff6b3d';
            ctx.shadowBlur = 14;
            ctx.fillStyle = '#ff6b3d';
            ctx.beginPath();
            ctx.arc(w - 3, ly, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        };

        const step = () => {
            pts.shift();
            drift = drift * 0.9 + (Math.random() - 0.5) * 0.35;
            v += drift;
            pts.push({ v, sig: Math.random() < 0.035 ? (Math.random() < 0.5 ? 1 : -1) : 0 });
            draw();
        };

        resize();
        draw();
        window.addEventListener('resize', () => { resize(); draw(); });
        if (reduceMotion) return;
        let timer = 0;
        whenVisible(canvas, vis => {
            clearInterval(timer);
            if (vis) timer = setInterval(step, big ? 160 : 190);
        });
    }

    $$('[data-chart]').forEach(initChart);

    /* ------------------------------------------------------------------
       Terminal log
    ------------------------------------------------------------------ */
    const pairs = ['EURUSD', 'GBPUSD', 'USDCHF', 'USDCAD', 'USDJPY', 'AUDUSD'];
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const LOG_LINES = [
        () => `<span class="k">feed  </span> ${pick(pairs)} tick stream <span class="ok">ok</span>`,
        () => `<span class="k">model </span> fold ${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')} retrained · data before cut-off`,
        () => `<span class="k">signal</span> ${pick(pairs)} p=0.${Math.floor(Math.random() * 12) + 58} <span class="hi">→ telegram</span>`,
        () => `<span class="k">health</span> vps <span class="ok">ok</span> · cpu ${Math.floor(Math.random() * 18) + 6}% · mem ${Math.floor(Math.random() * 20) + 30}%`,
        () => `<span class="k">review</span> ai diff checked · <span class="ok">0 skipped instructions</span>`,
        () => `<span class="k">settle</span> ${pick(pairs)} settled on bid · logged`
    ];

    function initLog(box) {
        const max = box.classList.contains('log--big') ? 5 : 4;
        let i = Math.floor(Math.random() * LOG_LINES.length);
        const push = () => {
            const d = new Date();
            const ts = [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
            const line = document.createElement('span');
            line.className = 'log-line';
            line.innerHTML = `<span class="t">[${ts}]</span> ${LOG_LINES[i % LOG_LINES.length]()}`;
            i++;
            box.appendChild(line);
            while (box.children.length > max) box.firstElementChild.remove();
        };
        for (let k = 0; k < max; k++) push();
        if (reduceMotion) return;
        let timer = 0;
        whenVisible(box, vis => {
            clearInterval(timer);
            if (vis) timer = setInterval(push, 1900 + Math.random() * 600);
        });
    }

    $$('[data-log]').forEach(initLog);

    /* ------------------------------------------------------------------
       Cross-lingual grid (xlingual-consistency visual)
    ------------------------------------------------------------------ */
    function initLangGrid(root) {
        const COLS = 25;
        const rows = ['EN', 'SK', 'RU', 'UA'].map(code => {
            const row = document.createElement('div');
            row.className = 'lg-row';
            row.innerHTML = `<span class="lg-label">${code}</span><span class="lg-cells">${'<i></i>'.repeat(COLS)}</span>`;
            root.appendChild(row);
            return $$('i', row);
        });
        // English is the baseline; other languages drift on a few items
        rows.slice(1).forEach(cells => cells.forEach(c => { if (Math.random() < 0.09) c.classList.add('bad'); }));

        const steps = $$('.pipeline span', root.parentElement);
        if (reduceMotion) { steps.forEach(s => s.classList.add('is-on')); return; }

        let col = 0;
        let stepIdx = 0;
        let timers = [];
        const scan = () => {
            rows.forEach(cells => cells[(col + COLS - 1) % COLS].classList.remove('scan'));
            rows.forEach(cells => cells[col].classList.add('scan'));
            col = (col + 1) % COLS;
        };
        const flip = () => {
            const cells = rows[1 + Math.floor(Math.random() * 3)];
            cells[Math.floor(Math.random() * COLS)].classList.toggle('bad');
        };
        const pipe = () => {
            steps.forEach((s, k) => s.classList.toggle('is-on', k === stepIdx));
            stepIdx = (stepIdx + 1) % steps.length;
        };
        whenVisible(root, vis => {
            timers.forEach(clearInterval);
            timers = vis ? [setInterval(scan, 110), setInterval(flip, 1300), setInterval(pipe, 1200)] : [];
        });
    }

    $$('[data-langgrid]').forEach(initLangGrid);

    /* ------------------------------------------------------------------
       About video: the impact flash plays once when the card comes into
       view, then hands off to a seamless ping-pong loop. Files load only
       when the section gets close; with reduced motion the poster stays.
    ------------------------------------------------------------------ */
    function initAboutVideo(box) {
        const loopV = $('.about-loop', box);
        const introV = $('.about-intro', box);
        if (reduceMotion || !loopV || !introV) return;

        let inView = false;
        let introStarted = false;
        let introDone = false;
        const playLoop = () => { if (inView) loopV.play().catch(() => { /* autoplay blocked — poster stays */ }); };

        whenVisible(box, near => {
            if (!near || introV.preload === 'auto') return;
            [introV, loopV].forEach(v => { v.preload = 'auto'; v.load(); });
        }, '600px');

        introV.addEventListener('playing', () => introV.classList.add('is-playing'));
        introV.addEventListener('ended', () => { introDone = true; playLoop(); });
        // the loop's first frame is the frame right after the intro ends, so the swap is invisible
        loopV.addEventListener('playing', () => introV.classList.remove('is-playing'));

        new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            if (!inView) { loopV.pause(); return; }
            if (introDone) { playLoop(); return; }
            if (!introStarted) {
                introStarted = true;
                introV.play().catch(() => { introDone = true; playLoop(); });
            }
        }, { threshold: 0.45 }).observe(box);
    }

    $$('[data-about-video]').forEach(initAboutVideo);

    /* ------------------------------------------------------------------
       Copy email
    ------------------------------------------------------------------ */
    const toast = $('[data-toast]');
    let toastTimer = 0;

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('is-on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2200);
    }

    $$('[data-copy]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const text = btn.dataset.copy;
            try {
                await navigator.clipboard.writeText(text);
            } catch (e) {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); } catch (err) { /* ignore */ }
                ta.remove();
            }
            const label = $('[data-copy-label]', btn);
            const prev = label.innerHTML;
            label.textContent = t('contact.copied');
            showToast(t('toast.copied'));
            setTimeout(() => { label.innerHTML = prev; }, 2000);
        });
    });
})();
