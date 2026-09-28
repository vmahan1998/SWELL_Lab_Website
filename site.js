(() => {
  'use strict';
  const contactHero = document.querySelector('.contact-hero');
  const lighthouseToggle = contactHero?.querySelector('.lighthouse-toggle');
  if (lighthouseToggle) {
    lighthouseToggle.hidden = false;
    contactHero.classList.add('motion-enabled');
    lighthouseToggle.addEventListener('click', () => {
      const paused = contactHero.classList.toggle('lighthouse-paused');
      lighthouseToggle.setAttribute('aria-pressed', String(paused));
      lighthouseToggle.textContent = paused ? 'Play animation' : 'Pause animation';
    });
  }
  const newsMasthead = document.querySelector('.news-masthead');
  const bottleToggle = newsMasthead?.querySelector('.bottle-toggle');
  if (bottleToggle) {
    bottleToggle.hidden = false;
    newsMasthead.classList.add('motion-enabled');
    bottleToggle.addEventListener('click', () => {
      const paused = newsMasthead.classList.toggle('bottle-paused');
      bottleToggle.setAttribute('aria-pressed', String(paused));
      bottleToggle.textContent = paused ? 'Play animation' : 'Pause animation';
    });
  }
  const cover = document.querySelector('.cover');
  const waveToggle = cover?.querySelector('.wave-toggle');
  if (waveToggle) {
    waveToggle.hidden = false;
    cover.classList.add('motion-enabled');
    waveToggle.addEventListener('click', () => {
      const paused = cover.classList.toggle('waves-paused');
      waveToggle.textContent = paused ? 'Play waves' : 'Pause waves';
    });
  }
  const sailingHero = document.querySelector('.positions-hero');
  const sailingToggle = sailingHero?.querySelector('.sailing-toggle');
  if (sailingToggle) {
    sailingToggle.hidden = false;
    sailingHero.classList.add('motion-enabled');
    sailingToggle.addEventListener('click', () => {
      const paused = sailingHero.classList.toggle('sailing-paused');
      sailingToggle.setAttribute('aria-pressed', String(paused));
      sailingToggle.textContent = paused ? 'Play animation' : 'Pause animation';
    });
  }
  const adcpHero = document.querySelector('.people-hero');
  const adcpToggle = adcpHero?.querySelector('.adcp-toggle');
  if (adcpToggle) {
    adcpToggle.hidden = false;
    adcpHero.classList.add('motion-enabled');
    adcpToggle.addEventListener('click', () => {
      const paused = adcpHero.classList.toggle('adcp-paused');
      adcpToggle.setAttribute('aria-pressed', String(paused));
      adcpToggle.textContent = paused ? 'Play animation' : 'Pause animation';
    });
  }
  const tidalHero = document.querySelector('.research-hero');
  const tidalToggle = tidalHero?.querySelector('.tidal-toggle');
  if (tidalToggle) {
    tidalToggle.hidden = false;
    tidalHero.classList.add('motion-enabled');
    tidalToggle.addEventListener('click', () => {
      const paused = tidalHero.classList.toggle('tides-paused');
      tidalToggle.setAttribute('aria-pressed', String(paused));
      tidalToggle.textContent = paused ? 'Play tides' : 'Pause tides';
    });
  }
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a').forEach(link => {
    if (link.getAttribute('href') === page) link.setAttribute('aria-current', 'page');
  });
  const main = document.querySelector('main');
  if (main) main.setAttribute('tabindex', '-1');
  // Quarto includes custom body fragments inside main; expose the shared
  // header/footer as page-level landmarks and put the skip link before them.
  const header = document.querySelector('.site-header');
  const footer = document.querySelector('.site-footer');
  const skip = document.querySelector('.skip-link');
  if (header) document.body.prepend(header);
  if (skip && header) header.prepend(skip);
  if (footer) document.body.append(footer);
  skip?.addEventListener('click', event => {
    if (!main) return;
    event.preventDefault();
    main.focus();
    main.scrollIntoView();
  });
  const carousel = document.querySelector('.landscape-carousel');
  if (carousel) {
    const track = carousel.querySelector('.landscape-track');
    const slides = [...carousel.querySelectorAll('.landscape-slide')];
    const toggle = carousel.querySelector('.slide-playback');
    const count = carousel.querySelector('.slide-count');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let active = 0;
    let paused = reducedMotion.matches;
    function updatePlayback() {
      toggle.textContent = paused ? 'Play slideshow' : 'Pause slideshow';
      toggle.hidden = reducedMotion.matches;
      track.setAttribute('aria-live', paused ? 'polite' : 'off');
    }
    function showSlide(index) {
      active = (index + slides.length) % slides.length;
      track.style.transform = `translateX(-${active * 100}%)`;
      slides.forEach((slide, index) => slide.setAttribute('aria-hidden', String(index !== active)));
      count.textContent = `${active + 1} / ${slides.length}`;
    }
    function pause() { paused = true; updatePlayback(); }
    carousel.querySelector('.landscape-controls').hidden = false;
    carousel.querySelector('.slide-previous').addEventListener('click', () => { pause(); showSlide(active - 1); });
    carousel.querySelector('.slide-next').addEventListener('click', () => { pause(); showSlide(active + 1); });
    toggle.addEventListener('click', () => { paused = !paused; updatePlayback(); });
    carousel.addEventListener('focusin', event => { if (event.target !== toggle) pause(); });
    reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) paused = true; updatePlayback(); });
    // Reading or using the controls temporarily stops rotation. Explicit pause
    // and manual navigation stay paused until the visitor chooses Play.
    window.setInterval(() => {
      if (!paused && !reducedMotion.matches && !document.hidden && !carousel.matches(':hover, :focus-within')) showSlide(active + 1);
    }, 6500);
    updatePlayback();
  }
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.noValidate = true;
  const recipient = form.dataset.recipient.trim();
  const cc = form.dataset.cc?.trim() || '';
  const validCc = /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(cc);
  const validRecipient = /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(recipient);
  const status = document.getElementById('form-status');
  const preview = document.getElementById('draft-preview');
  const copyText = document.getElementById('copy-text');
  const openButton = document.getElementById('open-draft');
  document.getElementById('prepare-message').disabled = false;
  if (validRecipient) {
    const link = document.createElement('a');
    link.href = `mailto:${recipient}${validCc ? `?cc=${encodeURIComponent(cc)}` : ''}`;
    link.textContent = recipient;
    document.getElementById('recipient-display').replaceChildren(link);
    document.getElementById('recipient-note').hidden = true;
    openButton.disabled = false;
    openButton.removeAttribute('aria-describedby');
  }
  const fields = [
    ['sender-name', 'name-error', 'Enter your name.'],
    ['sender-email', 'email-error', 'Enter a valid email address.'],
    ['subject', 'subject-error', 'Enter a subject.'],
    ['message', 'message-error', 'Enter a message.']
  ];
  function validate() {
    let firstInvalid = null;
    for (const [id, errorId, message] of fields) {
      const field = document.getElementById(id);
      const error = document.getElementById(errorId);
      const invalid = !field.value.trim() || !field.validity.valid;
      field.setAttribute('aria-invalid', String(invalid));
      error.textContent = invalid ? message : '';
      error.hidden = !invalid;
      if (invalid && !firstInvalid) firstInvalid = field;
    }
    if (firstInvalid) {
      status.textContent = 'Please correct the marked fields before preparing your message.';
      firstInvalid.focus();
      return false;
    }
    return true;
  }
  function prepare() {
    if (!validate()) return null;
    const name = document.getElementById('sender-name').value.trim();
    const email = document.getElementById('sender-email').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const message = document.getElementById('message').value.trim();
    const body = `Hello Dr. Huguenard,\n\n${message}\n\n${name}\nReply email: ${email}`;
    copyText.value = `${validRecipient ? `To: ${recipient}\n` : ''}${validCc ? `Cc: ${cc}\n` : ''}Subject: ${subject}\n\n${body}`;
    preview.hidden = false;
    document.getElementById('copy-status').textContent = '';
    return { subject, body };
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const draft = prepare();
    if (!draft) return;
    if (!validRecipient) {
      status.textContent = 'Kim’s email is not available yet. You can copy your prepared message below.';
      return;
    }
    status.textContent = 'Your email app may open with a draft. Send it there, or copy the message below. Nothing has been sent by this website.';
    window.location.href = `mailto:${recipient}?${validCc ? `cc=${encodeURIComponent(cc)}&` : ''}subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
  });
  document.getElementById('prepare-message').addEventListener('click', () => {
    if (!prepare()) return;
    status.textContent = 'Your message is ready to copy below. Nothing has been sent.';
    copyText.focus();
  });
  document.getElementById('copy-message').addEventListener('click', async () => {
    const copyStatus = document.getElementById('copy-status');
    try {
      await navigator.clipboard.writeText(copyText.value);
      copyStatus.textContent = 'Message copied. Paste it into your email application.';
    } catch {
      copyText.focus();
      copyText.select();
      copyStatus.textContent = 'Automatic copying is unavailable. Your message is selected; use your device’s copy command.';
    }
  });
})();
