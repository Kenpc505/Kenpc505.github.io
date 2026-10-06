/* PLACEHOLDER secret level: reach the flag. Replace this folder with your own game build.
   Includes coyote time, jump buffering and variable jump height (a small nod to Celeste). */
(function () {
	'use strict';

	const canvas = document.getElementById('game');
	if (!canvas || !canvas.getContext) return;
	const ctx = canvas.getContext('2d');

	const W = 960, H = 360;
	const MODE = new URLSearchParams(location.search).get('mode'); // '404' = go home on win, 'play' = replay
	let view = { scale: 1, ox: 0, oy: 0, dpr: 1 };

	// Scale the 960x360 level to fit the frame (letterboxed), crisp on high-DPI screens.
	function resize() {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const cw = canvas.clientWidth, ch = canvas.clientHeight;
		canvas.width = Math.round(cw * dpr);
		canvas.height = Math.round(ch * dpr);
		const scale = Math.min(cw / W, ch / H);
		view = { scale: scale, ox: (cw - W * scale) / 2, oy: (ch - H * scale) / 2, dpr: dpr };
	}
	window.addEventListener('resize', resize);
	resize();

	// ---- Level ----
	const platforms = [
		{ x: 0,   y: 320, w: 300, h: 40 },
		{ x: 395, y: 320, w: 170, h: 40 },
		{ x: 670, y: 320, w: 290, h: 40 },
		{ x: 240, y: 240, w: 90,  h: 14 },
		{ x: 455, y: 205, w: 100, h: 14 },
		{ x: 595, y: 255, w: 70,  h: 14 }
	];
	const FLAG = { x: 890, y: 250, w: 30, h: 70 };
	const SPAWN = { x: 40, y: 280 };

	// ---- Tuning ----
	const SPEED = 300, ACCEL = 2600, FRICTION = 3000;
	const GRAVITY = 2200, JUMP_VELOCITY = 760, MAX_FALL = 900;
	const COYOTE_TIME = 0.1, JUMP_BUFFER = 0.12;

	const player = { x: SPAWN.x, y: SPAWN.y, w: 22, h: 28, vx: 0, vy: 0, onGround: false, face: 1 };
	const keys = { left: false, right: false, jump: false };
	let coyote = 0, buffer = 0, deaths = 0, won = false, winTimer = 0, flash = 0;

	function overlap(a, b) {
		return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
	}

	function respawn() {
		player.x = SPAWN.x; player.y = SPAWN.y; player.vx = 0; player.vy = 0;
		deaths++; flash = 0.25;
	}

	function finish() {
		if (MODE === '404') {
			// Leave the iframe and go to the portfolio home page.
			const home = new URL('../../index.html', location.href).href;
			try { window.top.location.href = home; } catch (e) { location.href = home; }
		} else {
			won = false; winTimer = 0; deaths = 0;
			player.x = SPAWN.x; player.y = SPAWN.y; player.vx = 0; player.vy = 0;
		}
	}

	function step(dt) {
		flash = Math.max(0, flash - dt);
		if (won) {
			winTimer += dt;
			if (winTimer > 1.4) finish();
			return;
		}

		// Horizontal movement with acceleration / friction
		const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
		if (dir !== 0) {
			player.vx = Math.max(-SPEED, Math.min(SPEED, player.vx + dir * ACCEL * dt));
			player.face = dir;
		} else {
			const f = FRICTION * dt;
			player.vx = Math.abs(player.vx) <= f ? 0 : player.vx - Math.sign(player.vx) * f;
		}

		// Jump: coyote time + buffered input
		coyote = player.onGround ? COYOTE_TIME : Math.max(0, coyote - dt);
		buffer = Math.max(0, buffer - dt);
		if (buffer > 0 && coyote > 0) {
			player.vy = -JUMP_VELOCITY;
			buffer = 0; coyote = 0; player.onGround = false;
		}

		// Gravity (heavier when jump is released early = variable jump height)
		let g = GRAVITY;
		if (player.vy < 0 && !keys.jump) g *= 2.5;
		player.vy = Math.min(MAX_FALL, player.vy + g * dt);

		// Move X then resolve
		player.x += player.vx * dt;
		for (const p of platforms) {
			if (overlap(player, p)) {
				if (player.vx > 0) player.x = p.x - player.w;
				else if (player.vx < 0) player.x = p.x + p.w;
				player.vx = 0;
			}
		}
		player.x = Math.max(0, Math.min(W - player.w, player.x));

		// Move Y then resolve
		player.y += player.vy * dt;
		player.onGround = false;
		for (const p of platforms) {
			if (overlap(player, p)) {
				if (player.vy > 0) { player.y = p.y - player.h; player.onGround = true; }
				else if (player.vy < 0) { player.y = p.y + p.h; }
				player.vy = 0;
			}
		}

		if (player.y > H + 40) respawn();
		if (overlap(player, FLAG)) won = true;
	}

	// ---- Rendering ----
	function accent() {
		try {
			const v = getComputedStyle(window.parent.document.documentElement).getPropertyValue('--accent').trim();
			if (v) return v;
		} catch (e) { /* not embedded, or different origin */ }
		return '#60a5fa';
	}

	function draw() {
		const a = accent();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const k = view.scale * view.dpr;
		ctx.setTransform(k, 0, 0, k, view.ox * view.dpr, view.oy * view.dpr);
		ctx.fillStyle = 'rgba(255,255,255,0.025)';
		ctx.fillRect(0, 0, W, H);

		// Big background "404"
		ctx.save();
		ctx.globalAlpha = 0.07;
		ctx.fillStyle = a;
		ctx.font = '800 220px system-ui, sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('404', W / 2, H / 2 - 10);
		ctx.restore();

		// Platforms
		for (const p of platforms) {
			ctx.fillStyle = 'rgba(255,255,255,0.08)';
			ctx.fillRect(p.x, p.y, p.w, p.h);
			ctx.fillStyle = a;
			ctx.fillRect(p.x, p.y, p.w, 3);
		}

		// Flag
		ctx.fillStyle = 'rgba(255,255,255,0.8)';
		ctx.fillRect(FLAG.x, FLAG.y, 3, FLAG.h);
		ctx.fillStyle = a;
		ctx.beginPath();
		ctx.moveTo(FLAG.x + 3, FLAG.y);
		ctx.lineTo(FLAG.x + 30, FLAG.y + 10);
		ctx.lineTo(FLAG.x + 3, FLAG.y + 20);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = 'rgba(255,255,255,0.55)';
		ctx.font = '600 12px system-ui, sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('HOME', FLAG.x + 8, FLAG.y - 8);

		// Player (squash a little when airborne)
		const stretch = player.onGround ? 0 : Math.min(4, Math.abs(player.vy) / 200);
		const pw = player.w - stretch, ph = player.h + stretch;
		const px = player.x + stretch / 2, py = player.y - stretch;
		ctx.fillStyle = a;
		ctx.fillRect(px, py, pw, ph);
		ctx.fillStyle = '#0b1120';
		const eyeX = player.face > 0 ? px + pw - 9 : px + 4;
		ctx.fillRect(eyeX, py + 7, 4, 6);

		// HUD
		ctx.textAlign = 'left';
		ctx.fillStyle = 'rgba(255,255,255,0.6)';
		ctx.font = '600 14px ui-monospace, Consolas, monospace';
		if (deaths > 0) ctx.fillText('DEATHS: ' + deaths, 16, 26);

		if (flash > 0) {
			ctx.fillStyle = 'rgba(255,255,255,' + (flash * 0.6).toFixed(3) + ')';
			ctx.fillRect(0, 0, W, H);
		}

		if (won) {
			ctx.fillStyle = 'rgba(0,0,0,0.55)';
			ctx.fillRect(0, 0, W, H);
			ctx.fillStyle = a;
			ctx.textAlign = 'center';
			ctx.font = '800 40px system-ui, sans-serif';
			ctx.fillText('LEVEL COMPLETE', W / 2, H / 2 - 6);
			ctx.fillStyle = 'rgba(255,255,255,0.8)';
			ctx.font = '500 16px system-ui, sans-serif';
			ctx.fillText(MODE === '404' ? 'Returning home…' : 'Nice! Restarting…', W / 2, H / 2 + 26);
		}
	}

	// ---- Loop (fixed timestep) ----
	const STEP = 1 / 120;
	let last = performance.now(), acc = 0;
	function frame(now) {
		acc += Math.min(0.05, (now - last) / 1000);
		last = now;
		while (acc >= STEP) { step(STEP); acc -= STEP; }
		draw();
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);

	// ---- Input ----
	const KEYMAP = {
		ArrowLeft: 'left', KeyA: 'left',
		ArrowRight: 'right', KeyD: 'right',
		Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump'
	};

	function press(k) {
		if (k === 'jump' && !keys.jump) buffer = JUMP_BUFFER;
		keys[k] = true;
	}
	function release(k) { keys[k] = false; }

	// Only steal keys when focus isn't on a link/button/menu (so Space/Enter still work there).
	function gameOwnsKeys() {
		const el = document.activeElement;
		return !el || el === document.body || el === canvas;
	}

	document.addEventListener('keydown', function (e) {
		const k = KEYMAP[e.code];
		if (!k || !gameOwnsKeys()) return;
		e.preventDefault();
		if (!e.repeat) press(k);
	});
	document.addEventListener('keyup', function (e) {
		const k = KEYMAP[e.code];
		if (k) release(k);
	});
	window.addEventListener('blur', function () { keys.left = keys.right = keys.jump = false; });

	canvas.addEventListener('pointerdown', function () { canvas.focus(); });
	window.addEventListener('load', function () { canvas.focus(); });

	document.querySelectorAll('.touch-controls button').forEach(function (btn) {
		const k = btn.dataset.key;
		btn.addEventListener('pointerdown', function (e) { e.preventDefault(); btn.setPointerCapture(e.pointerId); press(k); });
		['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) {
			btn.addEventListener(ev, function () { release(k); });
		});
		btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
	});
})();
