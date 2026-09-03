/*
 * cicada-charts.js — dark defaults for the ISPConfig 3.3 dashboard charts.
 *
 * The metrics dashlet builds its charts with Chart.js defaults that assume a
 * light page: axis ticks and grid lines are drawn in near-black. On Cicada's
 * ground those are invisible. Chart.js reads these defaults when a chart is
 * constructed, so this file only has to run before the dashlet does — the
 * template loads it directly after chart.umd.js, and dashlets arrive later
 * with the AJAX page content.
 *
 * Loaded only when the panel ships chart.umd.js (ISPConfig 3.3 and up); on
 * 3.2 make-templates.sh leaves the reference out.
 */
(function () {
	'use strict';

	if (typeof Chart === 'undefined') {
		return;
	}

	/* Kept in sync with cicada.css by hand — Chart.js draws onto a canvas and
	   cannot read CSS custom properties. */
	var TEXT = '#bac3ca';           /* --cic-text      */
	var GRID = 'rgba(186, 195, 202, .14)';
	var ACCENT = '#ef7d21';         /* --cic-accent-text */
	var ACCENT_FILL = 'rgba(239, 125, 33, .18)';

	/* The colour the dashlet hard-codes for every line. Only datasets still
	   carrying it get recoloured, so a chart that sets its own colour on
	   purpose is left alone. */
	var DASHLET_LINE = 'rgb(75, 192, 192)';
	var DASHLET_FILL = 'rgba(75, 192, 192, 0.2)';

	Chart.defaults.color = TEXT;
	Chart.defaults.borderColor = GRID;

	if (Chart.defaults.scale && Chart.defaults.scale.grid) {
		Chart.defaults.scale.grid.color = GRID;
	}
	if (Chart.defaults.scale && Chart.defaults.scale.ticks) {
		Chart.defaults.scale.ticks.color = TEXT;
	}
	if (Chart.defaults.plugins && Chart.defaults.plugins.legend) {
		Chart.defaults.plugins.legend.labels = Chart.defaults.plugins.legend.labels || {};
		Chart.defaults.plugins.legend.labels.color = TEXT;
	}
	/* Tooltip: --cic-overlay for the panel, --cic-text-dim for its edge. The
	   obvious pick, --cic-line-loud, sits at 2.5:1 against the page and 1.7:1
	   against the panel — below the 3:1 WCAG asks of a meaningful graphic
	   boundary. --cic-text-dim clears both (5.4:1 and 3.7:1). */
	if (Chart.defaults.plugins && Chart.defaults.plugins.tooltip) {
		Chart.defaults.plugins.tooltip.backgroundColor = '#383838'; /* --cic-overlay  */
		Chart.defaults.plugins.tooltip.borderColor = '#8b9298';     /* --cic-text-dim */
		Chart.defaults.plugins.tooltip.borderWidth = 1;
	}

	/* Repaint the dashlet's teal line in the theme accent. Registered as a
	   plugin so it applies to charts built after this file runs, which is what
	   the AJAX-loaded dashboard does. */
	Chart.register({
		id: 'cicadaDarkLine',
		beforeInit: function (chart) {
			var sets = chart.config && chart.config.data && chart.config.data.datasets;
			if (!sets) {
				return;
			}
			sets.forEach(function (set) {
				if (set.borderColor === DASHLET_LINE) {
					set.borderColor = ACCENT;
				}
				if (set.backgroundColor === DASHLET_FILL) {
					set.backgroundColor = ACCENT_FILL;
				}
			});
		}
	});
})();
