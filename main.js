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
