// Run with Deno: deno run --allow-read --allow-write --allow-net --allow-run scripts/check-site.mjs
// Requires Chrome and .build/axe.min.js (axe-core 4.10.3).
const root = Deno.cwd();
const results = { pages: [], checks: [], failures: [] };
const check = (name, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  results.checks.push({ name, pass, detail });
  if (!pass) results.failures.push(name);
};
const prefix = '/SWELL_Lab_Website/';
const server = Deno.serve({ hostname: '127.0.0.1', port: 8765, onListen() {} }, async request => {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(prefix)) return new Response('Not found', { status: 404 });
  const path = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
  if (path.includes('..')) return new Response('Forbidden', { status: 403 });
  try {
    let data = await Deno.readFile(`${root}/_site/${path}`);
    if (path === 'contact.html' && url.searchParams.has('configured')) {
      data = new TextEncoder().encode(new TextDecoder().decode(data).replace(/data-recipient="[^"]*"/, 'data-recipient="test@example.org"').replace(/data-cc="[^"]*"/, 'data-cc="copy@example.org"'));
    }
    // Capture the mailto URL without invoking an external email application during tests.
    if (path === 'site.js') data = new TextEncoder().encode(new TextDecoder().decode(data).replace('window.location.href =', 'window.__testMailto ='));
    const ext = path.split('.').pop();
    const type = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', svg: 'image/svg+xml', json: 'application/json' }[ext] || 'application/octet-stream';
    return new Response(data, { headers: { 'content-type': `${type}; charset=utf-8` } });
  } catch { return new Response('Not found', { status: 404 }); }
});
const chrome = new Deno.Command('C:/Program Files/Google/Chrome/Application/chrome.exe', {
  args: ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9223', `--user-data-dir=${root}/.build/chrome-audit`, 'about:blank'],
  stdout: 'null', stderr: 'null'
}).spawn();
let ws;
try {
  let target;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { target = await (await fetch('http://127.0.0.1:9223/json/new?about:blank', { method: 'PUT' })).json(); break; }
    catch { await new Promise(resolve => setTimeout(resolve, 200)); }
  }
  if (!target) throw new Error('Chrome remote debugging did not start.');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let id = 0;
  let loads = 0;
  const pending = new Map();
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Page.loadEventFired') loads++;
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error))); else resolve(message.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const callId = ++id;
    const timer = setTimeout(() => { pending.delete(callId); reject(new Error(`Timed out: ${method}`)); }, 15000);
    pending.set(callId, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } }); ws.send(JSON.stringify({ id: callId, method, params }));
  });
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  const navigate = async path => {
    const previousLoads = loads;
    await send('Page.navigate', { url: `http://127.0.0.1:8765${prefix}${path}` });
    for (let n = 0; n < 200; n++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (loads > previousLoads && await evaluate(`document.readyState === 'complete' && !!document.querySelector('.site-footer')`)) return;
    }
    throw new Error(`Navigation did not finish: ${path}`);
  };
  const viewport = (width, height = 1000) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  const checkMinimumFont = async (page, width) => {
    const undersized = await evaluate(`Array.from(document.querySelectorAll('body *')).filter(el => {
      if (!el.checkVisibility({checkVisibilityCSS:true,checkOpacity:true})) return false;
      const hasText = Array.from(el.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      return (hasText || el.matches('input,textarea,select')) && parseFloat(getComputedStyle(el).fontSize) < 14;
    }).map(el => ({tag:el.tagName, className:el.className, size:getComputedStyle(el).fontSize, text:el.textContent.trim().slice(0,80)}))`);
    check(`${page}: ${width}px minimum text size is 14px`, undersized.length === 0, undersized);
  };
  const axe = await Deno.readTextFile('.build/axe.min.js');
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await Deno.writeFile(`.build/${name}.png`, Uint8Array.from(atob(shot.data), c => c.charCodeAt(0)));
  };
  // Exercise the actual keyboard controls and animation timelines, including no-JS fallback.
  for (const [page, toggle, scene] of [
    ['index.html', '.wave-toggle', '.masthead-wave'],
    ['research.html', '.tidal-toggle', '.tidal-background'],
    ['people.html', '.adcp-toggle', '.adcp-background'],
    ['positions.html', '.sailing-toggle', '.sailing-background']
  ]) {
    await navigate(page);
    const animations = `${JSON.stringify(scene)}`;
    check(`${page}: animation starts with available control`, await evaluate(`!document.querySelector('${toggle}').hidden && document.querySelector(${animations}).getAnimations({subtree:true}).some(a=>a.playState==='running')`));
    await evaluate(`document.querySelector('${toggle}').focus()`);
    for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: type === 'keyDown' ? '\r' : '' });
    await new Promise(resolve => setTimeout(resolve, 80));
    const before = await evaluate(`document.querySelector(${animations}).getAnimations({subtree:true}).map(a=>a.currentTime)`);
    await new Promise(resolve => setTimeout(resolve, 150));
    check(`${page}: keyboard pause freezes animation`, await evaluate(`document.activeElement.matches('${toggle}') && document.activeElement.textContent.startsWith('Play') && document.querySelector(${animations}).getAnimations({subtree:true}).every((a,i)=>a.playState==='paused' && a.currentTime===${JSON.stringify(before)}[i])`));
    for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: type === 'keyDown' ? ' ' : '' });
    check(`${page}: keyboard resumes animation`, await evaluate(`document.querySelector(${animations}).getAnimations({subtree:true}).some(a=>a.playState==='running')`));
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    check(`${page}: reduced motion stops decoration`, await evaluate(`document.querySelector(${animations}).getAnimations({subtree:true}).length===0 && getComputedStyle(document.querySelector('${toggle}')).display==='none' || document.querySelector(${animations}).getAnimations({subtree:true}).length===0 && getComputedStyle(document.querySelector('${toggle}').parentElement).display==='none'`));
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await send('Emulation.setScriptExecutionDisabled', { value: true });
    await navigate(page);
    check(`${page}: no-JS decoration stays static`, await evaluate(`document.querySelector(${animations}).getAnimations({subtree:true}).length===0 && document.querySelector('${toggle}').hidden`));
    await send('Emulation.setScriptExecutionDisabled', { value: false });
  }
  await viewport(320, 800);
  await navigate('research.html');
  await evaluate(`document.querySelector('.tidal-controls').scrollIntoView()`);
  await evaluate(axe);
  for (const time of [0, 500, 1000, 7000, 9000, 15999]) {
    await evaluate(`document.querySelector('.tidal-background').getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=${time}})`);
    const contrast = await evaluate(`axe.run(document.querySelector('.tidal-controls'), {runOnly:['color-contrast']}).then(r=>({violations:r.violations.length,incomplete:r.incomplete.length,details:r.incomplete.map(v=>v.nodes),style:{opacity:getComputedStyle(document.querySelector('.tidal-static-label')).opacity,animation:getComputedStyle(document.querySelector('.tidal-static-label')).animationName}}))`);
    // Axe cannot resolve all SVG overlaps. Check this caption's own opaque
    // foreground/background colors and preserve incomplete items for review.
    const caption = await evaluate(`(() => {
      const style=getComputedStyle(document.querySelector('.tidal-static-label'));
      const luminance=color=>{const rgb=color.match(/[\\d.]+/g).slice(0,3).map(Number).map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
      const fg=luminance(style.color),bg=luminance(style.backgroundColor);
      return {ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05),color:style.color,background:style.backgroundColor,opacity:style.opacity,animation:style.animationName};
    })()`);
    check(`Tide caption opaque with sufficient computed contrast at ${time}ms and paused`, contrast.violations === 0 && caption.ratio >= 4.5 && caption.opacity === '1' && caption.animation === 'none' && caption.background === 'rgb(250, 249, 246)', {caption,axe:contrast});
  }
  await screenshot('research-caption-mobile');
  await send('Emulation.setScriptExecutionDisabled', { value: true });
  await navigate('contact.html');
  check('Accessibility feedback and recipients available without JavaScript', await evaluate(`(() => { const link=document.querySelector('#accessibility-feedback a'); const url=new URL(link.href); return url.pathname==='kimberly.huguenard@maine.edu' && url.searchParams.get('cc')==='vanessa.mahan@maine.edu' && document.querySelector('#recipient-display a').textContent==='kimberly.huguenard@maine.edu'; })()`));
  await send('Emulation.setScriptExecutionDisabled', { value: false });
  for (const page of ['index.html', 'research.html', 'people.html', 'news.html', 'positions.html', 'contact.html']) {
    await viewport(1440);
    await navigate(page);
    await evaluate(axe);
    await checkMinimumFont(page, 1440);
    const audit = await evaluate(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice'] } }).then(r => ({violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),incomplete:r.incomplete.map(v=>v.id)}))`);
    results.pages.push({ page, viewport: 1440, ...audit });
    check(`${page}: desktop axe`, audit.violations.length === 0, audit.violations);
    const structure = await evaluate(`({h1:document.querySelectorAll('h1').length,main:document.querySelectorAll('main').length,current:document.querySelectorAll('[aria-current="page"]').length,overflow:document.documentElement.scrollWidth>innerWidth,links:[...document.querySelectorAll('a[href],img[src],script[src],link[rel="stylesheet"]')].map(e=>e.href||e.src).filter(u=>u.startsWith(location.origin))})`);
    check(`${page}: structure`, structure.h1 === 1 && structure.main === 1 && structure.current === 1 && !structure.overflow, structure);
    const broken = [];
    for (const link of new Set(structure.links)) {
      const response = await fetch(link);
      if (!response.ok) broken.push(link);
      await response.body?.cancel();
    }
    check(`${page}: repository-path links and assets`, broken.length === 0, broken);
    if (page === 'index.html' || page === 'people.html') await screenshot(page.replace('.html', '-desktop'));
    // Actual keyboard events: first Tab reaches skip link; Enter moves focus to main.
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    check(`${page}: keyboard skip link`, await evaluate(`document.activeElement.classList.contains('skip-link')`));
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await new Promise(resolve => setTimeout(resolve, 100));
    check(`${page}: skip moves focus`, await evaluate(`document.activeElement?.tagName==='MAIN'`));
    await viewport(320, 800);
    await evaluate('window.scrollTo(0,0)');
    await checkMinimumFont(page, 320);
    const mobileAudit = await evaluate(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } }).then(r => r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})))`);
    results.pages.push({ page, viewport: 320, violations: mobileAudit });
    check(`${page}: mobile axe`, mobileAudit.length === 0, mobileAudit);
    check(`${page}: 320px reflow`, await evaluate('document.documentElement.scrollWidth <= innerWidth'), await evaluate(`Array.from(document.querySelectorAll('main,main *')).filter(e=>e.getBoundingClientRect().right>innerWidth).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,display:getComputedStyle(e).display,cols:getComputedStyle(e).gridTemplateColumns}))`));
    if (page === 'index.html' || page === 'contact.html') await screenshot(page.replace('.html', '-mobile'));
    await evaluate(`document.head.insertAdjacentHTML('beforeend','<style id="spacing-test">*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}</style>')`);
    check(`${page}: text-spacing reflow`, await evaluate('document.documentElement.scrollWidth <= innerWidth'), await evaluate(`Array.from(document.querySelectorAll('main *')).filter(e=>e.getBoundingClientRect().right>innerWidth).slice(0,8).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width}))`));
    await evaluate(`document.getElementById('spacing-test').remove()`);
    // A 1280px browser at 200% exposes a 640 CSS-pixel layout viewport.
    await send('Emulation.setDeviceMetricsOverride', { width: 640, height: 500, deviceScaleFactor: 2, mobile: false });
    check(`${page}: 200% zoom-equivalent reflow`, await evaluate('document.documentElement.scrollWidth <= innerWidth'));
  }
  await viewport(1440);
  await navigate('index.html');
  check('Header has a named home link and supplied logo', await evaluate(`document.querySelector('.brand').getAttribute('aria-label')==='SWELL Lab home' && ['/SWELL_Lab_Website/', '/SWELL_Lab_Website/index.html'].includes(new URL(document.querySelector('.brand').href).pathname) && document.querySelector('.brand-wave').getAttribute('src')==='images/logo_final.png'`));
  await new Promise(resolve => setTimeout(resolve, 6800));
  check('Slideshow advances automatically', await evaluate(`document.querySelector('.slide-count').textContent==='2 / 3'`));
  await evaluate(`document.querySelector('.slide-playback').click()`);
  await new Promise(resolve => setTimeout(resolve, 6800));
  check('Slideshow pause stops rotation', await evaluate(`document.querySelector('.slide-count').textContent==='2 / 3' && document.querySelector('.slide-playback').textContent==='Play slideshow'`));
  await evaluate(`document.querySelector('.slide-next').click();document.querySelector('.slide-next').click()`);
  check('Slideshow next wraps around', await evaluate(`document.querySelector('.slide-count').textContent==='1 / 3' && document.querySelectorAll('.landscape-slide[aria-hidden="false"]').length===1`));
  await evaluate(`document.querySelector('.slide-previous').click()`);
  check('Slideshow previous wraps around', await evaluate(`document.querySelector('.slide-count').textContent==='3 / 3'`));
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await navigate('index.html');
  check('Reduced motion disables autoplay and transitions', await evaluate(`document.querySelector('.slide-playback').hidden && document.querySelector('.landscape-track').getAttribute('aria-live')==='polite' && getComputedStyle(document.querySelector('.landscape-track')).transitionDuration==='0s'`));
  await evaluate(`document.querySelector('.slide-next').click()`);
  check('Reduced motion retains manual photo navigation', await evaluate(`document.querySelector('.slide-count').textContent==='2 / 3'`));
  await send('Emulation.setEmulatedMedia', { features: [] });
  await viewport(320, 800);
  await navigate('people.html');
  await evaluate(`document.querySelector('.email').innerHTML='<a href="mailto:long@example.org">averylongdepartmentalresearchaddress@a-long-university-domain.example.org</a>'`);
  check('Long school email wraps on mobile', await evaluate('document.documentElement.scrollWidth <= innerWidth'));
  await send('Emulation.setScriptExecutionDisabled', { value: true });
  await navigate('research.html');
  check('Research and navigation available without JavaScript', await evaluate(`document.querySelectorAll('.site-nav a').length===6 && document.querySelector('h1').textContent==='Reading the coast.' && document.documentElement.scrollWidth<=innerWidth`));
  await send('Emulation.setScriptExecutionDisabled', { value: false });
  await viewport(1280);
  await navigate('contact.html');
  check('Confirmed recipients enable email action', await evaluate(`!document.getElementById('open-draft').disabled && document.getElementById('contact-form').dataset.recipient==='kimberly.huguenard@maine.edu' && document.getElementById('contact-form').dataset.cc==='vanessa.mahan@maine.edu'`));
  await evaluate(`document.getElementById('prepare-message').click()`);
  check('Required field errors and focus', await evaluate(`document.querySelectorAll('[aria-invalid="true"]').length===4 && document.activeElement.id==='sender-name'`));
  await evaluate(`document.getElementById('sender-name').value='Vanessa & Kim';document.getElementById('sender-email').value='invalid';document.getElementById('subject').value='Coast & sea? #1';document.getElementById('message').value='Mercury, PFAS & estuaries.\\nA second line.';document.getElementById('prepare-message').click()`);
  check('Email validation', await evaluate(`document.activeElement.id==='sender-email' && document.getElementById('email-error').hidden===false`));
  await evaluate(`document.getElementById('sender-email').value='visitor@example.org';document.getElementById('prepare-message').click()`);
  check('Message preview includes confirmed To and CC', await evaluate(`!document.getElementById('draft-preview').hidden && document.getElementById('copy-text').value.includes('Mercury, PFAS & estuaries.') && document.getElementById('copy-text').value.includes('To: kimberly.huguenard@maine.edu') && document.getElementById('copy-text').value.includes('Cc: vanessa.mahan@maine.edu')`));
  await evaluate(`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Unavailable')}}});document.getElementById('copy-message').click()`);
  await new Promise(resolve => setTimeout(resolve, 100));
  check('Clipboard fallback selects message', await evaluate(`document.activeElement.id==='copy-text' && document.activeElement.selectionEnd===document.activeElement.value.length`));
  await navigate('contact.html?configured=1');
  check('Configured recipient enables email action', await evaluate(`!document.getElementById('open-draft').disabled && document.querySelector('#recipient-display a').textContent==='test@example.org'`));
  await evaluate(`document.getElementById('sender-name').value='Vanessa & Kim';document.getElementById('sender-email').value='visitor@example.org';document.getElementById('subject').value='Coast & sea? #1';document.getElementById('message').value='Mercury, PFAS & estuaries.\\nA second line.';document.getElementById('open-draft').click()`);
  const mailto = await evaluate('window.__testMailto');
  const parsed = new URL(mailto);
  check('Email draft URL encoding', parsed.protocol === 'mailto:' && parsed.pathname === 'test@example.org' && parsed.searchParams.get('cc') === 'copy@example.org' && parsed.searchParams.get('subject') === 'Coast & sea? #1' && parsed.searchParams.get('body').includes('Mercury, PFAS & estuaries.\nA second line.'), mailto);
  const tree = await send('Accessibility.getFullAXTree');
  check('Accessible form controls exposed', ['Your name','Your email','Subject','Message','Open email draft'].every(label => tree.nodes.some(n => n.name?.value?.includes(label))));
  await evaluate(`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text}}});document.getElementById('copy-message').click()`);
  await new Promise(resolve => setTimeout(resolve, 100));
  check('Clipboard success copies exact message', await evaluate(`window.__copied===document.getElementById('copy-text').value`));
  await evaluate(axe);
  const formAudit = await evaluate(`axe.run().then(r=>r.violations.map(v=>v.id))`);
  check('Prepared form accessibility', formAudit.length === 0, formAudit);
  await send('Browser.close');
} catch (error) { results.failures.push(String(error)); }
finally {
  ws?.close();
  try { chrome.kill(); } catch { /* Already closed. */ }
  await server.shutdown();
  await Deno.writeTextFile('.build/accessibility-results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify({ checks: results.checks.length, failures: results.failures, pages: results.pages }, null, 2));
Deno.exit(results.failures.length ? 1 : 0);
