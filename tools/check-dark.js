/*
 * check-dark.js — two guards against light values leaking through the theme.
 *
 * Run it in the browser console on any ISPConfig page that has the Cicada
 * theme active, or on tools/preview.html:
 *
 *     copy the file contents into the console, or
 *     fetch('/check-dark.js').then(r=>r.text()).then(eval)
 *
 * Guard 1 (rendered)  walks the live DOM and reports every element that
 *                     actually paints a light background. It only sees what
 *                     the current page contains.
 * Guard 2 (declared)  walks every rule of the foreign stylesheets, collects
 *                     the ones setting a light value, and reports those whose
 *                     selector this theme never touches. It sees the parts the
 *                     page happens not to show.
 *
 * Neither guard alone is enough: guard 1 is blind to components not on the
 * page, guard 2 is blind to specificity. A finding in guard 2 is a lead, not
 * a verdict — check it against the rendered page before acting.
 */
(function () {
	'use strict';

	var NAMED = {
		white: 1, whitesmoke: .95, ivory: .99, snow: .98, gainsboro: .79,
		lightgrey: .79, lightgray: .79, silver: .53, beige: .9, linen: .9,
		azure: .97, yellow: .93
	};

	function luminance(value) {
		var c = String(value).trim();
		if (NAMED[c.toLowerCase()] !== undefined) return NAMED[c.toLowerCase()];

		var r, g, b;
		var rgb = c.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
		if (rgb) {
			if (rgb[4] !== undefined && parseFloat(rgb[4]) === 0) return null; // fully transparent
			r = +rgb[1]; g = +rgb[2]; b = +rgb[3];
		} else {
			var hex = c.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
			if (!hex) return null;
			var s = hex[1];
			if (s.length === 3) s = s.split('').map(function (x) { return x + x; }).join('');
			r = parseInt(s.slice(0, 2), 16);
			g = parseInt(s.slice(2, 4), 16);
			b = parseInt(s.slice(4, 6), 16);
		}
		function lin(v) { v = v / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }
		return .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b);
	}

	function describe(el) {
		var parts = [], node = el;
		while (node && node.nodeType === 1 && parts.length < 3) {
			var cls = (typeof node.className === 'string' && node.className.trim())
				? '.' + node.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
			parts.unshift(node.tagName.toLowerCase() + (node.id ? '#' + node.id : '') + cls);
			node = node.parentElement;
		}
		return parts.join(' > ');
	}

	/* ---- guard 1: what the page actually paints ------------------------- */

	function parseColor(value) {
		var m = String(value).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
		if (!m) return null;
		return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : parseFloat(m[4]) };
	}

	/* A translucent light layer over a dark ground reads dark. Scoring the
	   declared colour alone reports rgba(255,255,255,.35) highlights as
	   "light background" and buries the real findings in noise. */
	function paintedColor(el) {
		var layers = [], node = el;
		while (node && node.nodeType === 1) {
			var c = parseColor(getComputedStyle(node).backgroundColor);
			if (c && c.a > 0) {
				layers.push(c);
				if (c.a === 1) break;
			}
			node = node.parentElement;
		}
		if (!layers.length) return null;
		var out = layers[layers.length - 1];
		for (var i = layers.length - 2; i >= 0; i--) {
			var top = layers[i], a = top.a + out.a * (1 - top.a);
			out = {
				r: (top.r * top.a + out.r * out.a * (1 - top.a)) / a,
				g: (top.g * top.a + out.g * out.a * (1 - top.a)) / a,
				b: (top.b * top.a + out.b * out.a * (1 - top.a)) / a,
				a: a
			};
		}
		return out;
	}

	/* The Cicada palette is orange, green, red and greys. Anything with real
	   saturation in the cyan-to-violet arc is a foreign colour that leaked
	   through - dark blue is not "light", so the luminance test alone walks
	   straight past bootstrap-datetimepicker's #039 selected day. */
	function foreignHue(c) {
		var r = c.r / 255, g = c.g / 255, b = c.b / 255;
		var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
		if (d < .06) return null;                              // grey enough
		var l = (max + min) / 2;
		var s = l > .5 ? d / (2 - max - min) : d / (max + min);
		if (s < .15) return null;                              // barely tinted
		var h;
		if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
		else if (max === g) h = (b - r) / d + 2;
		else h = (r - g) / d + 4;
		h = h * 60;
		return (h >= 170 && h <= 330) ? Math.round(h) : null;
	}

	/* A gradient can be light without containing white — the picker's
	   #fdd49a → #fdf59a is a pale yellow with no white stop in it. Stops are
	   composited over the element's own ground first, otherwise a stripe
	   overlay of rgba(255,255,255,.12) reports as a light gradient. */
	function lightGradientStops(image, ground, threshold) {
		if (!image || image === 'none' || !/gradient/.test(image)) return null;
		var stops = image.match(/rgba?\([^)]*\)|#[0-9a-fA-F]{3,6}\b/g) || [];
		var bright = [];
		for (var i = 0; i < stops.length; i++) {
			var c = parseColor(stops[i]);
			if (!c) {
				var l0 = luminance(stops[i]);                  // hex stop, opaque
				if (l0 !== null && l0 > threshold) bright.push(stops[i]);
				continue;
			}
			if (c.a === 0) continue;
			var eff = c;
			if (c.a < 1 && ground) {
				var a = c.a + ground.a * (1 - c.a);
				eff = {
					r: (c.r * c.a + ground.r * ground.a * (1 - c.a)) / a,
					g: (c.g * c.a + ground.g * ground.a * (1 - c.a)) / a,
					b: (c.b * c.a + ground.b * ground.a * (1 - c.a)) / a
				};
			}
			var l = luminance('rgb(' + eff.r + ',' + eff.g + ',' + eff.b + ')');
			if (l !== null && l > threshold) bright.push(stops[i]);
		}
		return bright.length ? bright : null;
	}

	function renderedFindings(threshold) {
		var out = [];
		var nodes = document.querySelectorAll('body *');
		for (var i = 0; i < nodes.length; i++) {
			var el = nodes[i];
			if (el.closest('.pv-swatch')) continue;            // preview palette chips
			if (el.closest('.pushy')) continue;                // off-canvas menu, hidden
			var box = el.getBoundingClientRect();
			if (!box.width || !box.height) continue;
			var style = getComputedStyle(el);
			var ground = paintedColor(el);

			var gradient = lightGradientStops(style.backgroundImage, ground, threshold);
			if (gradient) {
				out.push({ what: 'light gradient', where: describe(el), value: gradient.join(', ') });
			}

			var own = parseColor(style.backgroundColor);
			if (!own || own.a === 0) continue;                 // paints nothing itself
			var painted = ground;
			if (!painted) continue;

			var l = luminance('rgb(' + painted.r + ',' + painted.g + ',' + painted.b + ')');
			if (l !== null && l > threshold) {
				out.push({
					what: 'light background',
					where: describe(el),
					declared: style.backgroundColor,
					painted: 'rgb(' + Math.round(painted.r) + ',' + Math.round(painted.g) + ',' + Math.round(painted.b) + ')'
				});
				continue;
			}

			var hue = foreignHue(painted);
			if (hue !== null) {
				out.push({
					what: 'foreign hue ' + hue + '°',
					where: describe(el),
					declared: style.backgroundColor
				});
			}
		}
		return out;
	}

	/* ---- guard 2: what the foreign sheets declare ------------------------ */

	function flattenRules() {
		var flat = [];
		for (var i = 0; i < document.styleSheets.length; i++) {
			var sheet = document.styleSheets[i];
			var name = (sheet.href || 'inline').split('/').pop().split('?')[0];
			var list = null;
			try { list = sheet.cssRules; } catch (e) { continue; }   // cross-origin
			if (!list) continue;
			var stack = [];
			for (var k = 0; k < list.length; k++) stack.push(list[k]);
			while (stack.length) {
				var rule = stack.pop();
				if (rule.cssRules && rule.cssRules.length) {
					for (var j = 0; j < rule.cssRules.length; j++) stack.push(rule.cssRules[j]);
					continue;
				}
				if (rule.selectorText && rule.style) flat.push({ sheet: name, sel: rule.selectorText, style: rule.style });
			}
		}
		return flat;
	}

	function normalise(selector) {
		return selector.toLowerCase()
			.replace(/::?(hover|focus|active|visited|first-child|last-child|before|after|nth-child\([^)]*\))/g, '')
			.replace(/\s+/g, ' ')
			.trim();
	}

	function declaredFindings(threshold, themeSheet, ignoreSheets) {
		var flat = flattenRules();
		var mine = new Set(), foreign = [];

		for (var i = 0; i < flat.length; i++) {
			var rule = flat[i];
			if (rule.sheet === themeSheet) {
				rule.sel.split(',').forEach(function (s) { mine.add(normalise(s)); });
				continue;
			}
			if (ignoreSheets.some(function (p) { return rule.sheet.indexOf(p) === 0; })) continue;

			var hits = [];
			var l1 = luminance(rule.style.backgroundColor);
			if (l1 !== null && l1 > threshold) hits.push('bg ' + rule.style.backgroundColor);
			if (rule.style.background && !/url\(/.test(rule.style.background)) {
				var l2 = luminance(rule.style.background);
				if (l2 !== null && l2 > threshold) hits.push('bg ' + rule.style.background.slice(0, 30));
			}
			if (rule.style.backgroundImage && /(#fff|255,\s*255,\s*255|\bwhite\b)/i.test(rule.style.backgroundImage)) {
				hits.push('light gradient');
			}
			if (hits.length) foreign.push({ sheet: rule.sheet, sel: rule.sel, hits: hits.join('; ') });
		}

		if (mine.size === 0) {
			throw new Error('guard 2 found no rules from "' + themeSheet + '" — wrong file name, or the sheet did not load. '
				+ 'A silent zero here would read as "nothing to fix".');
		}

		return {
			themeSelectors: mine.size,
			lightRules: foreign.length,
			untouched: foreign.filter(function (f) {
				return !f.sel.split(',').some(function (s) { return mine.has(normalise(s)); });
			})
		};
	}

	/* ---- report ---------------------------------------------------------- */

	var THRESHOLD = 0.45;   // relative luminance above which a fill reads as "light"
	var rendered = renderedFindings(0.35);
	var declared = declaredFindings(THRESHOLD, 'cicada.css', ['font-awesome', 'bootstrap-icons', 'fonts']);

	var report = {
		rendered: {
			checked: document.querySelectorAll('body *').length,
			findings: rendered.length,
			list: rendered.slice(0, 40)
		},
		declared: {
			themeSelectors: declared.themeSelectors,
			lightRulesInForeignSheets: declared.lightRules,
			untouched: declared.untouched.length,
			list: declared.untouched.map(function (f) {
				return f.sheet + ' :: ' + f.sel.slice(0, 90) + '   [' + f.hits + ']';
			})
		}
	};

	if (typeof console !== 'undefined' && console.table && rendered.length) {
		console.table(rendered);
	}
	return report;
})()
