// ask-for-a-random-hyperlink: reveal an input, then open a pre-filled
// gmail compose window addressed to hi@sif.fyi once a topic is typed.
const toggle = document.querySelector('.ask-toggle');
const form = document.querySelector('.ask-form');
const input = document.querySelector('.ask-input');

if (toggle && form && input) {
  toggle.addEventListener('click', () => {
    const willOpen = form.hidden;
    form.hidden = !willOpen;
    toggle.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) input.focus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const topic = input.value.trim();
    if (!topic) {
      input.focus();
      return;
    }

    const subject = `send me a random hyperlink about ${topic}`;
    const body =
      `hey asif — send me a random hyperlink from your list about ${topic}, please.\n\n` +
      `(sent from sif.fyi)`;
    const compose =
      'https://mail.google.com/mail/?view=cm&fs=1&to=hi@sif.fyi' +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    window.open(compose, '_blank', 'noopener');
  });
}

// scroll reveal: each sentence (or SET_SIZE of them) stays dimmed until it
// scrolls up into view, then fades in to full opacity in one step and stays
// lit — a discrete, one-at-a-time reveal, not a continuous scroll-linked ramp.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// group each prose paragraph into .reveal-unit spans of SET_SIZE sentences,
// keeping inline elements (links) whole and inside the sentence they belong to.
const SET_SIZE = 1; // sentences per reveal unit (bump to 2 for two-by-two)
const SENTENCE_RE = /[^.!?]*[.!?]+["')\]]*\s*|[^.!?]+/g;
const ENDS_SENTENCE = /[.!?]+["')\]]*\s*$/;

function wrapSentences(paragraph) {
  const atoms = [];
  for (const node of Array.from(paragraph.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = node.nodeValue.match(SENTENCE_RE);
      if (!parts) continue;
      for (const text of parts) {
        atoms.push({ text, endsSentence: ENDS_SENTENCE.test(text) });
      }
    } else {
      // inline element (e.g. a link) — always mid-sentence in this copy
      atoms.push({ node: node.cloneNode(true), endsSentence: false });
    }
  }

  paragraph.textContent = '';
  let span = null;
  let sentences = 0;
  for (const atom of atoms) {
    if (!span) {
      span = document.createElement('span');
      span.className = 'reveal-unit';
      paragraph.appendChild(span);
    }
    span.appendChild(atom.node || document.createTextNode(atom.text));
    if (atom.endsSentence && ++sentences >= SET_SIZE) {
      span = null;
      sentences = 0;
    }
  }
}

if (!reduceMotion) {
  document
    .querySelectorAll('main section > p:not(.ask-line)')
    .forEach(wrapSentences);

  // block-level bits (header, headings, work rows, footer) reveal as one unit
  // each; give them the same class so they share the fade behaviour.
  document
    .querySelectorAll('header, main section > h2, .ask-line, .work li, footer')
    .forEach((el) => el.classList.add('reveal-unit'));

  const units = Array.from(document.querySelectorAll('.reveal-unit'));
  const REVEAL_LINE = 0.85; // reveal a unit once its top rises above 85% of the viewport

  const revealVisible = () => {
    const line = window.innerHeight * REVEAL_LINE;
    for (const el of units) {
      if (el.classList.contains('is-in')) continue;
      if (el.getBoundingClientRect().top < line) el.classList.add('is-in');
    }
  };

  // reveal whatever's already on screen instantly, then turn on the transition
  // so only units scrolled into view afterwards fade in one at a time.
  revealVisible();
  void document.body.offsetHeight; // flush styles so the initial reveal doesn't animate
  document.body.classList.add('reveal-ready');

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      revealVisible();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
}
