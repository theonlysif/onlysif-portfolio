/* Two views over an aggregate export of my Readwise corpus.
   Data is theme labels and monthly totals only — no highlight text, no notes. */

let atlas, view = "river";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const yearOf = m => m.slice(0, 4);

fetch("/reading/atlas.json").then(r => r.json()).then(d => { atlas = d; boot(); });

function boot() {
  const t = atlas.totals;
  document.getElementById("sub").textContent =
    `${t.annotations.toLocaleString()} highlights from ${t.sources.toLocaleString()} sources · ` +
    `${atlas.themes.length} themes · ${atlas.months[0]} – ${atlas.months.at(-1)}`;

  document.querySelectorAll(".switch b").forEach(b => {
    b.onclick = () => {
      view = b.dataset.view;
      document.querySelectorAll(".switch b").forEach(x => x.classList.toggle("on", x === b));
      render();
    };
  });
  render();
}

function render() {
  document.getElementById("legend").textContent = VIEWS[view].legend;
  document.getElementById("stage").innerHTML = VIEWS[view].draw();
}

const VIEWS = {};

/* ---------------- river: a themeriver / streamgraph ---------------- */
VIEWS.river = {
  legend: "ribbon thickness = how much i highlighted that month · ordered by era",
  draw() {
    const top = [...atlas.themes].sort((a, b) => b.weight - a.weight).slice(0, 24)
      .sort((a, b) => a.era - b.era);
    const W = 1100, H = 480, n = atlas.months.length, colw = W / (n - 1);

    // Monthly counts are bursty enough that a single heavy weekend spikes a
    // ribbon into a needle. Smooth over five months so the trend reads.
    const smooth = t => {
      const raw = atlas.months.map(m => t.months[m] || 0);
      return raw.map((_, i) => {
        let s = 0, w = 0;
        for (let k = -2; k <= 2; k++) {
          const j = i + k;
          if (j < 0 || j >= raw.length) continue;
          const weight = 3 - Math.abs(k);
          s += raw[j] * weight; w += weight;
        }
        return s / w;
      });
    };
    const series = new Map(top.map(t => [t.id, smooth(t)]));

    const cols = atlas.months.map((m, i) => top.reduce((s, t) => s + series.get(t.id)[i], 0));
    const scale = (H - 48) / Math.max(...cols, 1);

    // Catmull-Rom through the points, emitted as cubic beziers.
    const curve = (pts, move = true) => {
      let d = (move ? "M" : "L") + pts[0][0] + "," + pts[0][1];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i];
        const p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        d += `C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6}` +
             ` ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6}` +
             ` ${p2[0]},${p2[1]}`;
      }
      return d;
    };

    const running = atlas.months.map((m, i) => (H - cols[i] * scale) / 2);
    const shade = k => 26 + (k % 6) * 27;
    const bands = top.map((t, k) => {
      const vals = series.get(t.id), upper = [], lower = [];
      atlas.months.forEach((m, i) => {
        const h = vals[i] * scale;
        upper.push([i * colw, running[i]]);
        lower.push([i * colw, running[i] + h]);
        running[i] += h;
      });
      const d = curve(upper) + curve([...lower].reverse(), false) + "Z";
      const s = shade(k);
      return `<path d="${d}" fill="rgb(${s},${s},${s})"><title>${esc(t.label)}</title></path>`;
    }).join("");

    const ticks = atlas.months.map((m, i) => m.endsWith("-01")
      ? `<text x="${i * colw}" y="${H - 4}">${yearOf(m)}</text>` : "").join("");

    return `<svg viewBox="0 0 ${W} ${H}" class="river" role="img"
        aria-label="streamgraph of reading themes over time">${bands}${ticks}</svg>
      <ol class="key">${top.map((t, k) => {
        const s = shade(k);
        return `<li><i style="background:rgb(${s},${s},${s})"></i>${esc(t.label)}</li>`;
      }).join("")}</ol>`;
  },
};

/* ---------------- matrix: every theme against every month ---------------- */
VIEWS.matrix = {
  legend: "darker = more highlights · amber = a month i wrote a note of my own",
  draw() {
    const list = [...atlas.themes].sort((a, b) => a.era - b.era);
    const max = Math.max(...list.flatMap(t => Object.values(t.months)), 1);
    const years = atlas.months.map(yearOf);

    const head = `<div class="mrow mhead"><span></span><div class="cells">${
      atlas.months.map((m, i) =>
        `<u>${m.endsWith("-01") ? yearOf(m) : ""}</u>`).join("")}</div></div>`;

    return `<div>${head}${list.map(t => {
      const notes = new Set(t.note_months);
      const cells = atlas.months.map((m, i) => {
        const v = t.months[m] || 0;
        // sqrt so the quiet months stay visible instead of washing out
        const a = v ? 0.12 + Math.sqrt(v / max) * 0.88 : 0;
        const cls = (notes.has(m) ? "n " : "") + (years[i] !== years[i - 1] ? "y" : "");
        return `<i class="${cls}" style="--a:${a.toFixed(3)}"></i>`;
      }).join("");
      return `<div class="mrow"><span>${esc(t.label)}${
        t.note_months.length ? ` <em>✎</em>` : ""}</span><div class="cells">${cells}</div></div>`;
    }).join("")}</div>`;
  },
};
