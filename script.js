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

	applyTheme(loadTheme());

	document.addEventListener('DOMContentLoaded', function () {
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
				saveTheme(applyTheme(option.dataset.theme));
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
})();
