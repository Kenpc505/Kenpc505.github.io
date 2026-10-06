/* Shared site script: theme switcher + menu.
   Loaded in <head> without defer so the saved theme is applied before first paint (no colour flash). */
(function () {
	'use strict';

	const PALETTES = {
		default: { bg: '#0b1120', accent: '#60a5fa' },
		emerald: { bg: '#022c22', accent: '#10b981' },
		ruby:    { bg: '#1c0a0a', accent: '#ef4444' },
		gold:    { bg: '#1a160d', accent: '#fbbf24' },
		violet:  { bg: '#1e1b4b', accent: '#a78bfa' }
	};
	const STORAGE_KEY = 'selectedTheme';

	// Lets CSS know JS is running (scroll-reveal only hides content when it can be revealed again).
	document.documentElement.classList.add('js');

	// localStorage can be unavailable (private mode, blocked storage) - never let that break the page.
	function loadTheme() {
		try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
	}
	function saveTheme(theme) {
		try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* ignore */ }
	}

	function applyTheme(theme) {
		// Only accept known theme names; anything else falls back to the default.
		const name = Object.prototype.hasOwnProperty.call(PALETTES, theme) ? theme : 'default';
		const p = PALETTES[name];
		const root = document.documentElement;
		root.style.setProperty('--bg-color', p.bg);
		root.style.setProperty('--accent', p.accent);
		root.dataset.theme = name;
		return name;
	}

	// When the files are opened straight from disk (file://), some browsers give every page its own
	// storage, so the theme is also carried between pages in the link (?theme=...). On the live site
	// localStorage is shared by all pages and the links stay clean.
	const IS_LOCAL_FILE = location.protocol === 'file:';

	function themeFromUrl() {
		try { return new URLSearchParams(location.search).get('theme'); } catch (e) { return null; }
	}

	function tagLocalLinks(theme) {
		if (!IS_LOCAL_FILE) return;
		document.querySelectorAll('a[href]').forEach(function (link) {
			const url = new URL(link.href);
			if (url.protocol !== 'file:' || !/\.html$/.test(url.pathname)) return; // internal pages only
			url.searchParams.set('theme', theme);
			link.href = url.href;
		});
	}

	let current = applyTheme(themeFromUrl() || loadTheme());
	saveTheme(current);

	function setTheme(theme) {
		current = applyTheme(theme);
		saveTheme(current);
		tagLocalLinks(current);
	}

	// Another tab/page of the site changed the theme -> follow it live.
	window.addEventListener('storage', function (e) {
		if (e.key === STORAGE_KEY && e.newValue) {
			current = applyTheme(e.newValue);
			tagLocalLinks(current);
		}
	});

	// Page restored from the back/forward cache -> re-read the latest saved theme.
	window.addEventListener('pageshow', function (e) {
		if (e.persisted) {
			const saved = loadTheme();
			if (saved && saved !== current) {
				current = applyTheme(saved);
				tagLocalLinks(current);
			}
		}
	});

	document.addEventListener('DOMContentLoaded', function () {
		tagLocalLinks(current);

		const btn = document.getElementById('theme-btn');
		const menu = document.getElementById('theme-menu');
		if (!btn || !menu) return;

		function setOpen(open) {
			menu.classList.toggle('active', open);
			btn.setAttribute('aria-expanded', String(open));
		}

		btn.addEventListener('click', function (e) {
			e.stopPropagation();
			setOpen(!menu.classList.contains('active'));
		});

		menu.querySelectorAll('button[data-theme]').forEach(function (option) {
			option.addEventListener('click', function () {
				setTheme(option.dataset.theme);
				setOpen(false);
				btn.focus();
			});
		});

		document.addEventListener('click', function (e) {
			if (!menu.contains(e.target)) setOpen(false);
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && menu.classList.contains('active')) {
				setOpen(false);
				btn.focus();
			}
		});
	});

	/* ---------- Game layer: scroll reveal, XP bar, project previews ---------- */
	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

	function initReveal() {
		const targets = document.querySelectorAll('.about-me-container, .inventory, .project-row, .resume-container, .page-title, .notfound-text, .game-frame');
		targets.forEach(function (el) { el.classList.add('reveal'); });
		if (!('IntersectionObserver' in window)) {
			targets.forEach(function (el) { el.classList.add('is-visible'); });
			return;
		}
		const io = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-visible');
					io.unobserve(entry.target);
				}
			});
		}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
		targets.forEach(function (el) { io.observe(el); });
	}

	function initXpBar() {
		const bar = document.querySelector('.xp-bar span');
		if (!bar) return;
		let queued = false;
		function update() {
			queued = false;
			const max = document.documentElement.scrollHeight - window.innerHeight;
			const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
			bar.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
		}
		function request() {
			if (!queued) { queued = true; requestAnimationFrame(update); }
		}
		window.addEventListener('scroll', request, { passive: true });
		window.addEventListener('resize', request);
		update();
	}

	function initPreviews() {
		const cards = document.querySelectorAll('[data-preview]');
		if (!cards.length) return;
		const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

		cards.forEach(function (card) {
			const video = card.querySelector('video');
			if (!video) return;
			const row = card.closest('.project-row') || card;

			function play() { const p = video.play(); if (p) p.catch(function () { /* autoplay blocked: ignore */ }); }
			function pause() { video.pause(); }
			function toggle() { if (video.paused) play(); else pause(); }

			video.addEventListener('playing', function () { card.classList.add('is-playing'); });
			video.addEventListener('pause', function () { card.classList.remove('is-playing'); });

			// Click / Enter / Space always toggles (works for mouse, touch and keyboard).
			card.addEventListener('click', toggle);
			card.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
			});

			if (canHover) {
				// Desktop: hovering the project "selects" it and plays the preview.
				row.addEventListener('mouseenter', play);
				row.addEventListener('mouseleave', pause);
			} else if (!reduceMotion.matches && 'IntersectionObserver' in window) {
				// Touch: play while the card is mostly on screen.
				new IntersectionObserver(function (entries) {
					entries.forEach(function (entry) { if (entry.isIntersecting) play(); else pause(); });
				}, { threshold: 0.6 }).observe(card);
			}
		});
	}

	// Embedded games: nothing loads until the visitor presses Start.
	function initGames() {
		document.querySelectorAll('[data-game]').forEach(function (frame) {
			const start = frame.querySelector('.game-start');
			if (!start) return;
			start.addEventListener('click', function () {
				const iframe = document.createElement('iframe');
				iframe.src = frame.dataset.src;
				iframe.title = frame.dataset.title || 'Game';
				iframe.allow = 'fullscreen; gamepad; autoplay';
				iframe.addEventListener('load', function () { iframe.focus(); });
				start.replaceWith(iframe);
			});
		});

		document.querySelectorAll('[data-game-fullscreen]').forEach(function (btn) {
			const frame = document.querySelector('[data-game]');
			if (!frame || !frame.requestFullscreen) { btn.hidden = true; return; }
			btn.addEventListener('click', function () {
				const s = frame.querySelector('.game-start');
				if (s) s.click(); // start the game if it isn't running yet
				frame.requestFullscreen().catch(function () {});
			});
		});
	}

	/* ---------- Mobile nav menu ---------- */
	function initNavToggle() {
		const toggle = document.getElementById('nav-toggle');
		const panel = document.getElementById('nav-panel');
		if (!toggle || !panel) return;
		function setOpen(open) {
			panel.classList.toggle('open', open);
			toggle.setAttribute('aria-expanded', String(open));
			toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
		}
		toggle.addEventListener('click', function (e) {
			e.stopPropagation();
			setOpen(!panel.classList.contains('open'));
		});
		panel.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
		document.addEventListener('click', function (e) {
			if (!panel.contains(e.target) && e.target !== toggle) setOpen(false);
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && panel.classList.contains('open')) { setOpen(false); toggle.focus(); }
		});
		window.matchMedia('(min-width: 769px)').addEventListener('change', function (mq) { if (mq.matches) setOpen(false); });
	}

	/* ---------- Typewriter hero subtitle ---------- */
	function initTypewriter() {
		const el = document.querySelector('.hero-subtitle');
		if (!el || reduceMotion.matches) return;
		const words = ['Game Developer', 'Technical Designer', 'Producer', 'Composer'];
		el.setAttribute('aria-label', el.textContent.trim()); // screen readers keep the full original text
		const span = document.createElement('span');
		span.className = 'typewriter';
		span.setAttribute('aria-hidden', 'true');
		el.textContent = '';
		el.appendChild(span);
		let w = 0, i = 0, deleting = false;
		(function tick() {
			const word = words[w];
			i += deleting ? -1 : 1;
			span.textContent = word.slice(0, i);
			let delay = deleting ? 40 : 80;
			if (!deleting && i === word.length) { deleting = true; delay = 1800; }
			else if (deleting && i === 0) { deleting = false; w = (w + 1) % words.length; delay = 350; }
			setTimeout(tick, delay);
		})();
	}

	/* ---------- Toast ("achievement unlocked") ---------- */
	const TROPHY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18 3V2H6v1H2v3a4 4 0 0 0 4 4h.3A6 6 0 0 0 11 13.9V17H8v2H6v3h12v-3h-2v-2h-3v-3.1A6 6 0 0 0 17.7 10h.3a4 4 0 0 0 4-4V3h-4zM4 6V5h2v3a2 2 0 0 1-2-2zm16 0a2 2 0 0 1-2 2V5h2v1z"/></svg>';
	function toast(title, text) {
		const region = document.querySelector('.toast-region');
		if (!region) return;
		const t = document.createElement('div');
		t.className = 'toast';
		const badge = document.createElement('span');
		badge.className = 'toast-badge';
		badge.innerHTML = TROPHY; // static, trusted markup
		const body = document.createElement('span');
		const h = document.createElement('span'); h.className = 'toast-title'; h.textContent = title;
		const p = document.createElement('span'); p.className = 'toast-text'; p.textContent = text;
		body.append(h, p);
		t.append(badge, body);
		region.appendChild(t);
		setTimeout(function () { t.classList.add('leaving'); }, 3200);
		setTimeout(function () { t.remove(); }, 3600);
	}

	/* ---------- Copy email (address is assembled here so it isn't plain text in the HTML) ---------- */
	function copyText(text) {
		if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
		return new Promise(function (resolve, reject) {
			const ta = document.createElement('textarea');
			ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
			document.body.appendChild(ta); ta.select();
			try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
			ta.remove();
		});
	}
	function initCopyEmail() {
		document.querySelectorAll('.copy-email').forEach(function (btn) {
			btn.addEventListener('click', function () {
				const email = btn.dataset.user + '@' + btn.dataset.domain;
				copyText(email).then(
					function () { toast('Achievement unlocked', 'Email copied: ' + email); },
					function () { toast('Contact', email); }
				);
			});
		});
	}

	/* ---------- Skill tooltips: keep them inside the inventory box ---------- */
	function initSlots() {
		const box = document.querySelector('.inventory');
		if (!box) return;
		function layout() {
			const b = box.getBoundingClientRect();
			box.querySelectorAll('.slot').forEach(function (slot) {
				const tip = slot.querySelector('.slot-tip');
				const r = slot.getBoundingClientRect();
				const w = tip.offsetWidth;
				const want = r.left + r.width / 2 - w / 2;
				const clamped = Math.max(b.left + 4, Math.min(b.right - 4 - w, want));
				tip.style.setProperty('--tip-shift', Math.round(clamped - want) + 'px');
			});
		}
		// Measure when shown (styles/fonts may not be ready at DOMContentLoaded), plus on load/resize.
		box.querySelectorAll('.slot').forEach(function (slot) {
			slot.addEventListener('pointerenter', layout);
			slot.addEventListener('focus', layout);
		});
		window.addEventListener('load', layout);
		window.addEventListener('resize', layout);
	}

	function initPrint() {
		document.querySelectorAll('[data-print]').forEach(function (btn) {
			btn.addEventListener('click', function () { window.print(); });
		});
	}

	document.addEventListener('DOMContentLoaded', function () {
		initNavToggle();
		initTypewriter();
		initCopyEmail();
		initSlots();
		initPrint();
		initGames();
		initReveal();
		initXpBar();
		initPreviews();
	});
})();
