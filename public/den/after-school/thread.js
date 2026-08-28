const scroller = document.getElementById("scroller");
const thread = document.getElementById("thread");
const meta = document.getElementById("meta");
const months = document.getElementById("months");

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function dayKey(ts) {
  const d = new Date(ts);
  return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
}

function dayLabel(ts) {
  const d = new Date(ts);
  return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
}

function clock(ts) {
  const d = new Date(ts);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const am = h < 12 ? "am" : "pm";
  h = h % 12 || 12;
  return h + ":" + m + " " + am;
}

function linkify(text) {
  const esc = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
}

function parseTarget() {
  const hash = location.hash || "";
  const m = hash.match(/^#m-(\d+)/);
  return m ? parseInt(m[1], 10) : -1;
}

function appendBatch(messages, from, to, target, frag) {
  for (let i = from; i < to; i++) {
    const m = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];

    if (!prev || dayKey(prev.t) !== dayKey(m.t)) {
      const day = document.createElement("div");
      day.className = "day";
      day.textContent = dayLabel(m.t);
      frag.appendChild(day);
    }

    const mine = m.w === 1;
    const showTime =
      !next || dayKey(next.t) !== dayKey(m.t) || next.w !== m.w;

    const row = document.createElement("div");
    row.className = "row " + (mine ? "me" : "them") + (i === target ? " target" : "");
    row.id = "m-" + i;

    const kind = m.k && m.k !== "T" ? " kind" : "";
    row.innerHTML =
      '<div class="stack"><div class="bubble' +
      kind +
      '">' +
      linkify(m.x) +
      "</div>" +
      (showTime ? '<div class="time">' + clock(m.t) + "</div>" : "") +
      "</div>";
    frag.appendChild(row);
  }
}

// one chip per month that actually has messages, pointing at the first one
function buildMonths(messages, jump) {
  const seen = new Set();
  const frag = document.createDocumentFragment();

  messages.forEach((m, idx) => {
    const d = new Date(m.t);
    const key = d.getFullYear() + "-" + d.getMonth();
    if (seen.has(key)) return;
    seen.add(key);

    const b = document.createElement("button");
    b.type = "button";
    b.textContent = MONTHS[d.getMonth()] + " " + String(d.getFullYear()).slice(2);
    b.addEventListener("click", () => {
      months.querySelectorAll("button.on").forEach((n) => n.classList.remove("on"));
      b.classList.add("on");
      jump(idx);
    });
    frag.appendChild(b);
  });

  months.appendChild(frag);
}

function mount(messages) {
  const target = parseTarget();
  const total = messages.length;
  meta.textContent = "loading 0 / " + total.toLocaleString();
  thread.innerHTML = "";

  const BATCH = 400;
  let i = 0;
  let jumped = false;
  let pending = -1;

  function jumpTo(t) {
    const el = document.getElementById("m-" + t);
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    return true;
  }

  // a month chip can be tapped before that month has been appended; remember it
  // and let the render loop honour it as soon as the row exists.
  function requestJump(t) {
    if (!jumpTo(t)) pending = t;
  }

  buildMonths(messages, requestJump);

  function tick() {
    const frag = document.createDocumentFragment();
    const end = Math.min(total, i + BATCH);
    appendBatch(messages, i, end, target, frag);
    thread.appendChild(frag);
    i = end;
    meta.textContent =
      i < total
        ? "loading " + i.toLocaleString() + " / " + total.toLocaleString()
        : total.toLocaleString() + " messages";

    // jump as soon as the target exists, so a deep link lands in the first
    // second instead of after all 11,567 rows are in. everything still to be
    // appended sits below the target, so the position stays put.
    if (target >= 0 && !jumped && target < i) {
      jumped = jumpTo(target);
    }

    if (pending >= 0 && pending < i && jumpTo(pending)) {
      pending = -1;
      jumped = true;
    }

    if (i < total) {
      requestAnimationFrame(tick);
      return;
    }

    if (target >= 0 && !jumped) jumpTo(target);
  }

  tick();
}

fetch("./messages.json")
  .then((r) => r.json())
  .then((messages) => {
    mount(messages);
    window.addEventListener("hashchange", () => {
      const t = parseTarget();
      document.querySelectorAll(".row.target").forEach((n) => n.classList.remove("target"));
      const el = document.getElementById("m-" + t);
      if (el) {
        el.classList.add("target");
        el.scrollIntoView({ block: "center" });
      }
    });
  })
  .catch((err) => {
    meta.textContent = "couldn’t load messages";
    console.error(err);
  });
