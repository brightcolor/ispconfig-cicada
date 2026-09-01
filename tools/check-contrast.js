/*
 * check-contrast.js — WCAG AA contrast check for every visible text node.
 *
 * Run it in the browser console on any page carrying the theme:
 *
 *     fetch('/check-contrast.js').then(r=>r.text()).then(eval)
 *
 * The point of this file is the *effective* background. Reading
 * getComputedStyle(el).backgroundColor gives "rgba(0, 0, 0, 0)" for most
 * elements, and a check that scores text against one assumed surface passes
 * everything. This walks up the ancestor chain, composites every translucent
 * layer it meets, and scores the text against what a reader actually sees.
 *
 * Thresholds are WCAG 2.1 AA: 4.5:1 for body text, 3:1 for large text
 * (>= 24px, or >= 18.66px when bold).
 */
(function () {
	'use strict';

	function parse(color) {
		var m = String(color).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/);
		if (!m) return null;
		return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : parseFloat(m[4]) };
	}

	/* Paint `top` onto `bottom`; both opaque-ish rgba objects. */
	function composite(top, bottom) {
		var a = top.a + bottom.a * (1 - top.a);
		if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
		return {
			r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
			g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
			b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
			a: a
		};
	}

	function effectiveBackground(el) {
		var layers = [];
		var node = el;
		while (node && node.nodeType === 1) {
			var bg = parse(getComputedStyle(node).backgroundColor);
			if (bg && bg.a > 0) {
				layers.push(bg);
				if (bg.a === 1) break;          // opaque, nothing below shows through
			}
			node = node.parentElement;
		}
		if (!layers.length) return { r: 255, g: 255, b: 255, a: 1 };  // canvas default
		var out = layers[layers.length - 1];
		for (var i = layers.length - 2; i >= 0; i--) out = composite(layers[i], out);
		return out;
	}

	function luminance(c) {
		function lin(v) { v = v / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }
		return .2126 * lin(c.r) + .7152 * lin(c.g) + .0722 * lin(c.b);
	}

	function ratio(fg, bg) {
		var a = luminance(fg), b = luminance(bg);
		return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
	}

	function hex(c) {
		function h(v) { return ('0' + Math.round(v).toString(16)).slice(-2); }
		return '#' + h(c.r) + h(c.g) + h(c.b);
	}

	function describe(el) {
		var cls = (typeof el.className === 'string' && el.className.trim())
			? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
		return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls;
	}

	function hasOwnText(el) {
		for (var i = 0; i < el.childNodes.length; i++) {
			var n = el.childNodes[i];
			if (n.nodeType === 3 && n.textContent.trim().length > 1) return true;
		}
		return false;
	}

	var results = [], checked = 0, seen = {};
	var nodes = document.querySelectorAll('body *');

	for (var i = 0; i < nodes.length; i++) {
		var el = nodes[i];
		if (!hasOwnText(el)) continue;
		if (el.closest('.pv-swatch')) continue;
		var box = el.getBoundingClientRect();
		if (!box.width || !box.height) continue;

		var style = getComputedStyle(el);
		if (style.visibility === 'hidden' || style.opacity === '0') continue;

		var fg = parse(style.color);
		if (!fg || fg.a === 0) continue;
		var bg = effectiveBackground(el);
		if (fg.a < 1) fg = composite(fg, bg);

		var size = parseFloat(style.fontSize);
		var weight = parseInt(style.fontWeight, 10) || 400;
		var large = size >= 24 || (size >= 18.66 && weight >= 700);
		var need = large ? 3 : 4.5;
		var got = ratio(fg, bg);
		checked++;

		if (got < need) {
			var key = describe(el) + '|' + hex(fg) + '|' + hex(bg);
			if (seen[key]) { seen[key].count++; continue; }
			var entry = {
				where: describe(el),
				text: el.textContent.trim().slice(0, 40),
				fg: hex(fg),
				bg: hex(bg),
				ratio: Math.round(got * 100) / 100,
				needs: need,
				count: 1
			};
			seen[key] = entry;
			results.push(entry);
		}
	}

	results.sort(function (a, b) { return a.ratio - b.ratio; });

	if (typeof console !== 'undefined' && console.table && results.length) console.table(results);

	return {
		textNodesChecked: checked,
		belowAA: results.length,
		findings: results
	};
})()
