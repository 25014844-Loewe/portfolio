(() => {
  'use strict';

  // Update the detailed cursor on movement only, with one coalesced animation frame.
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const sakuraCursor = document.querySelector('.sakura-cursor');
  if (finePointer.matches && sakuraCursor) {
    document.documentElement.classList.add('sakura-pointer');
    let lastPetalAt = 0;
    let lastX = -1, lastY = -1;
    let pointerX = 0, pointerY = 0, cursorFrame = 0;
    const hoverable = 'a,button,input,textarea,select,[data-copy],[role="button"]';
    const paintCursor = () => {
      sakuraCursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0) translate(-50%, -50%)`;
      cursorFrame = 0;
    };
    window.addEventListener('mousemove', event => {
      const x = event.clientX, y = event.clientY;
      pointerX = x; pointerY = y;
      if (!cursorFrame) cursorFrame = requestAnimationFrame(paintCursor);
      sakuraCursor.classList.add('is-visible');
      sakuraCursor.classList.toggle('is-interactive', Boolean(event.target.closest?.(hoverable)));
      const now = performance.now();
      if (now - lastPetalAt >= 36 && (Math.abs(x - lastX) + Math.abs(y - lastY) > 2)) {
        lastPetalAt = now; lastX = x; lastY = y;
        const count = Math.random() < .32 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const petal = document.createElement('i');
          petal.className = 'sakura-trail-petal';
          petal.style.setProperty('--start-x', `${x + (Math.random() - .5) * 8}px`);
          petal.style.setProperty('--start-y', `${y + (Math.random() - .5) * 8}px`);
          petal.style.setProperty('--drift', `${(Math.random() - .5) * 65}px`);
          petal.style.setProperty('--drop', `${58 + Math.random() * 65}px`);
          petal.style.setProperty('--spin', `${(Math.random() - .5) * 240}deg`);
          petal.style.setProperty('--fall-time', `${1.2 + Math.random() * .4}s`);
          document.body.append(petal);
          window.setTimeout(() => petal.remove(), 1800);
        }
      }
    }, { passive: true });
    window.addEventListener('mouseout', event => {
      if (!event.relatedTarget) sakuraCursor.classList.remove('is-visible');
    }, { passive: true });
    window.addEventListener('blur', () => sakuraCursor.classList.remove('is-visible'));
    window.addEventListener('pagehide', () => sakuraCursor.classList.remove('is-visible'));
    window.addEventListener('pageshow', () => sakuraCursor.classList.remove('is-visible'));
    finePointer.addEventListener?.('change', event => {
      if (!event.matches) document.documentElement.classList.remove('sakura-pointer');
      else document.documentElement.classList.add('sakura-pointer');
    });
  }

  // Scroll reveals, skill focus, copy feedback, and contact form transitions.
  const bloomTargets = document.querySelectorAll('.about-journey-card,.skill-cluster,.about-resume-section > .about-section-heading,.about-resume-section > .about-wide-card,.project-charm');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    bloomTargets.forEach((item, index) => { item.dataset.bloom = ''; item.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`; });
    const bloomObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-bloomed'); bloomObserver.unobserve(entry.target); }
    }), { threshold: .12, rootMargin: '0px 0px -35px 0px' });
    bloomTargets.forEach(item => bloomObserver.observe(item));
  }

  document.querySelectorAll('[data-skill-explorer]').forEach(explorer => {
    explorer.addEventListener('click', event => {
      const button = event.target.closest('[data-skill-filter]');
      if (!button) return;
      explorer.dataset.active = button.dataset.skillFilter;
      explorer.querySelectorAll('[data-skill-filter]').forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    });
    explorer.addEventListener('pointerover', event => {
      const button = event.target.closest('[data-skill-filter]');
      if (button) explorer.dataset.active = button.dataset.skillFilter;
    });
    explorer.addEventListener('pointerleave', () => { explorer.dataset.active = 'all'; });
  });

  document.addEventListener('click', async event => {
    const copyButton = event.target.closest('[data-copy]');
    if (copyButton) {
      try {
        await navigator.clipboard.writeText(copyButton.dataset.copy);
        const toast = document.createElement('div'); toast.className = 'contact-toast'; toast.setAttribute('role', 'status'); toast.textContent = 'Copied!';
        document.body.append(toast); window.setTimeout(() => toast.remove(), 3300);
      } catch (_) { copyButton.setAttribute('aria-label', 'Copy unavailable; select the contact text'); }
    }
    if (event.target.closest('.contact-again')) window.location.href = '/contact';
  });

  const contactForm = document.querySelector('.contact-form');
  if (contactForm) contactForm.addEventListener('submit', event => {
    if (!contactForm.reportValidity()) { event.preventDefault(); return; }
    contactForm.classList.add('is-submitting');
  });

  // Sample the complete name in CSS pixels, then render each sample as a sakura petal.
  const canvas = document.getElementById('petal-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d', { alpha: true });
    const sampler = document.createElement('canvas');
    const sampleCtx = sampler.getContext('2d', { willReadFrequently: true });
    const colors = ['#FFB7C5', '#FFC8DD', '#FFAFCC', '#F8EDEB', '#E0B1CB'];
    const particles = [];
    let width = 0, height = 0, dpr = 1, scrollProgress = 0, targetScrollProgress = 0, frame = 0;
    const pointer = { x: -1000, y: -1000 };
    window.addEventListener('mousemove', event => { pointer.x = event.clientX; pointer.y = event.clientY; }, { passive: true });
    window.addEventListener('mouseleave', () => { pointer.x = -1000; pointer.y = -1000; }, { passive: true });
    let canvasRunning = false;
    const ambient = [];
    let lastFrameTime = 0;

    function resetAmbient() {
      ambient.length = 0;
      for (let i = 0; i < 90; i++) ambient.push({ x: Math.random() * width, y: Math.random() * height,
        size: 1.4 + Math.random() * 2.6, vx: (Math.random() - .5) * 7, vy: 2 + Math.random() * 8,
        angle: Math.random() * Math.PI * 2, spin: (Math.random() - .5) * .75,
        sway: Math.random() * 1.5 + .4, phase: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)] });
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildParticles();
      resetAmbient();
    }

    function buildParticles() {
      particles.length = 0;
      sampler.width = Math.max(1, Math.ceil(width)); sampler.height = Math.max(1, Math.ceil(height));
      sampleCtx.clearRect(0, 0, sampler.width, sampler.height);
      const fontSize = Math.min(width * .75, 136);
      sampleCtx.font = `700 ${fontSize}px "Playfair Display", Georgia, serif`;
      sampleCtx.textAlign = 'center'; sampleCtx.textBaseline = 'middle'; sampleCtx.fillStyle = '#fff';
      const centerX = sampler.width / 2, centerY = sampler.height / 2;
      sampleCtx.fillText('LOEWE SING', centerX, centerY, width * .94);
      const data = sampleCtx.getImageData(0, 0, sampler.width, sampler.height).data;
      const gap = width < 600 ? 3.3 : 3.2;
      for (let y = 0; y < sampler.height; y += gap) {
        for (let x = 0; x < sampler.width; x += gap) {
          if (data[(Math.floor(y) * sampler.width + Math.floor(x)) * 4 + 3] < 110) continue;
          particles.push({ baseX: x, baseY: y, vx: .95 + Math.random() * .9,
            vy: (Math.random() - .5) * 2, angle: Math.random() * Math.PI * 2,
            size: 2.1 + Math.random() * 1.6,
            color: colors[Math.floor(Math.random() * colors.length)], phase: Math.random() * Math.PI * 2,
            rotation: Math.random() * Math.PI * 2, seed: Math.random() });
        }
      }
    }

    function updateScroll() { targetScrollProgress = Math.max(0, Math.min(1, window.scrollY / 650)); }

    function draw(time) {
      if (!canvasRunning) return;
      frame = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, width, height);
      const elapsed = lastFrameTime ? Math.min((time - lastFrameTime) / 1000, .05) : 0;
      lastFrameTime = time;
      const centerX = canvas.width / 2;
      // Time-based easing keeps the return to the sampled lettering smooth and quick.
      const easingTime = targetScrollProgress < scrollProgress ? .34 : .45;
      scrollProgress += (targetScrollProgress - scrollProgress) * (1 - Math.exp(-elapsed / easingTime));
      if (Math.abs(targetScrollProgress - scrollProgress) < .0005) scrollProgress = targetScrollProgress;
      const dispersal = scrollProgress * Math.max(width * 2.15, 1100);
      for (const petal of ambient) {
        petal.x += (petal.vx + Math.sin(time * .00035 + petal.phase) * petal.sway * 4) * elapsed;
        petal.y += petal.vy * elapsed;
        const dx = petal.x - pointer.x, dy = petal.y - pointer.y, distance2 = dx * dx + dy * dy;
        if (distance2 < 10000 && distance2 > 1) { const force = (1 - Math.sqrt(distance2) / 100) * 22 * elapsed; petal.x += dx / Math.sqrt(distance2) * force; petal.y += dy / Math.sqrt(distance2) * force; }
        petal.angle += petal.spin * elapsed;
        if (petal.y > height + 14) { petal.y = -14; petal.x = Math.random() * width; }
        if (petal.x < -14) petal.x = width + 14;
        if (petal.x > width + 14) petal.x = -14;
        ctx.save(); ctx.translate(petal.x, petal.y); ctx.rotate(petal.angle + Math.sin(time * .0004 + petal.phase) * .18); ctx.globalAlpha = .16 + .13 * (.5 + .5 * Math.sin(time * .00035 + petal.phase));
        ctx.fillStyle = petal.color; ctx.shadowColor = petal.color; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.ellipse(0, 0, petal.size * .72, petal.size, .35, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      for (const p of particles) {
        const sway = Math.sin(time * .00055 + p.phase);
        const particleX = p.baseX * dpr;
        const particleY = p.baseY * dpr;
        const distanceFactor = particleX - centerX;
        const side = distanceFactor < 0 ? -1 : 1;
        const normalizedDistance = Math.abs(distanceFactor) / Math.max(1, centerX);
        const verticalFromCenter = (particleY - canvas.height / 2) / Math.max(1, canvas.height / 2);
        const outward = dispersal * p.vx;
        // The two halves travel outwards while their vertical component fans into
        // mirrored diagonals, forming a broad bowtie around the canvas center.
        const x = p.baseX + side * (outward * (.72 + normalizedDistance * .42) + sway * scrollProgress * 9);
        // Particles near the center axis fan most strongly up/down; samples
        // toward either edge keep a shallower mirrored diagonal trajectory.
        const centerFan = 1 - Math.min(1, normalizedDistance);
        const verticalFan = outward * (.16 + centerFan * .62);
        const diagonalSlant = side * (1 - centerFan) * height * .28;
        const y = p.baseY + scrollProgress * (
          verticalFromCenter * verticalFan + diagonalSlant +
          Math.sin(time * .0007 + p.phase) * 2.2 + p.vy * verticalFan * .22
        );
        const alpha = Math.max(0, 1 - Math.pow(scrollProgress, 1.15) * 1.08);
        if (alpha <= 0 || x < -20 || x > width + 20) continue;
        const size = p.size * (1 + scrollProgress * .3 * Math.sin(time * .0008 + p.phase));
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rotation + scrollProgress * (sway * .2 + side * 2.8 + Math.sin(p.angle) * 1.5));
        ctx.globalAlpha = alpha * (.91 + scrollProgress * .09 * Math.sin(time * .001 + p.phase));
        ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = size * 2.2;
        // Five rounded lobes and a shallow notch form a recognizable blossom petal.
        ctx.beginPath(); ctx.moveTo(0, size * .95); ctx.bezierCurveTo(-size * .15, size * .45, -size * 1.1, size * .25, -size * .92, -size * .35);
        ctx.bezierCurveTo(-size * .78, -size * .88, -size * .25, -size * .96, 0, -size * .53);
        ctx.bezierCurveTo(size * .25, -size * .96, size * .78, -size * .88, size * .92, -size * .35);
        ctx.bezierCurveTo(size * 1.1, size * .25, size * .15, size * .45, 0, size * .95); ctx.fill();
        ctx.restore();
      }
    }

    function stopCanvas() {
      canvasRunning = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }

    function startCanvas() {
      stopCanvas();
      canvasRunning = true;
      lastFrameTime = 0;
      resize();
      updateScroll();
      frame = requestAnimationFrame(draw);
    }

    window.addEventListener('resize', () => { if (canvasRunning) resize(); }, { passive: true });
    window.addEventListener('scroll', updateScroll, { passive: true });
    document.fonts?.ready.then(() => { if (canvasRunning) resize(); });
    window.addEventListener('pagehide', stopCanvas);
    window.addEventListener('pageshow', event => {
      const navigationType = window.performance?.getEntriesByType?.('navigation')?.[0]?.type;
      if (event.persisted || navigationType === 'back_forward') startCanvas();
      document.querySelectorAll('.falling-petal').forEach(petal => {
        petal.style.animationPlayState = 'running';
      });
    });
    startCanvas();
  }
  // Static, high-density blossom canopy: draw once and only redraw after resize.
  const canopy = document.getElementById('blossom-canopy');
  if (canopy) {
    const canopyCtx = canopy.getContext('2d', { alpha: true });
    const canopyBase = document.getElementById('canopy-base');
    const canopyBaseCtx = canopyBase?.getContext('2d', { alpha: true });
    const blossomColors = ['#FFB7C5', '#FFC8DD', '#FFAFCC', '#F8EDEB', '#E0B1CB'];
    let canopyFrame = 0;
    let canopySeed = 0x51A7;
    const random = () => {
      canopySeed = (canopySeed * 1664525 + 1013904223) >>> 0;
      return canopySeed / 4294967296;
    };

    function drawFlower(x, y, radius) {
      const angle = random() * Math.PI * 2;
      canopyCtx.globalAlpha = .72 + random() * .25;
      canopyCtx.fillStyle = blossomColors[Math.floor(random() * blossomColors.length)];
      canopyCtx.beginPath();
      for (let petal = 0; petal < 5; petal++) {
        const petalAngle = angle + petal * Math.PI * 2 / 5;
        const petalX = x + Math.cos(petalAngle) * radius * .42;
        const petalY = y + Math.sin(petalAngle) * radius * .42;
        canopyCtx.ellipse(petalX, petalY, radius * .4, radius * .68, petalAngle + Math.PI / 2, 0, Math.PI * 2);
      }
      canopyCtx.fill();
      canopyCtx.globalAlpha = .95;
      canopyCtx.fillStyle = '#FFF8ED';
      canopyCtx.beginPath();
      canopyCtx.arc(x, y, Math.max(.65, radius * .19), 0, Math.PI * 2);
      canopyCtx.fill();
      canopyCtx.globalAlpha = 1;
    }

    function renderCanopy() {
      const bounds = canopy.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canopy.width = Math.round(bounds.width * ratio);
      canopy.height = Math.round(bounds.height * ratio);
      canopyCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
      canopyCtx.clearRect(0, 0, bounds.width, bounds.height);
      if (canopyBase && canopyBaseCtx) {
        canopyBase.width = Math.round(bounds.width * ratio);
        canopyBase.height = Math.round(bounds.height * ratio);
        canopyBaseCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
        canopyBaseCtx.clearRect(0, 0, bounds.width, bounds.height);
      }
      canopySeed = 0x51A7;

      const clouds = [
        [.015, .66, .09, .42], [.075, .38, .12, .42], [.16, .57, .14, .39],
        [.265, .34, .14, .36], [.35, .56, .11, .4], [.39, .3, .07, .28],
        [.985, .66, .09, .42], [.925, .38, .12, .42], [.84, .57, .14, .39],
        [.735, .34, .14, .36], [.65, .56, .11, .4], [.61, .3, .07, .28],
        // Lower canopy fills the spaces around the trunks and between cards.
        [.065, .78, .07, .2, 20], [.31, .8, .055, .18, 20], [.08, .95, .05, .1, 14], [.3, .95, .04, .09, 12],
        [.935, .78, .07, .2, 20], [.69, .8, .055, .18, 20], [.92, .95, .05, .1, 14], [.7, .95, .04, .09, 12]
      ];
      for (const [cx, cy, rx, ry, bloomCount = 26] of clouds) {
        const centerX = cx * bounds.width;
        const centerY = cy * bounds.height;
        const radiusX = rx * bounds.width;
        const radiusY = ry * bounds.height;
        const glow = (canopyBaseCtx || canopyCtx).createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(radiusX, radiusY));
        glow.addColorStop(0, 'rgba(255, 200, 221, .26)');
        glow.addColorStop(.58, 'rgba(224, 177, 203, .14)');
        glow.addColorStop(1, 'rgba(224, 177, 203, 0)');
        const glowCtx = canopyBaseCtx || canopyCtx;
        glowCtx.fillStyle = glow;
        glowCtx.beginPath();
        glowCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        glowCtx.fill();

        for (let bloom = 0; bloom < bloomCount * 4; bloom++) {
          const theta = random() * Math.PI * 2;
          const spread = Math.sqrt(random());
          const x = centerX + Math.cos(theta) * radiusX * spread;
          const y = centerY + Math.sin(theta) * radiusY * spread;
          drawFlower(x, y, 2.1 + random() * 2.3);
        }
      }

      // Supplemental blooms fill the spaces around the limbs without changing
      // the positions or sizes of the established flower pass above.
      const detailClouds = [
        [.025, .2, .055, .22, 9], [.105, .13, .07, .2, 9], [.19, .21, .075, .2, 10],
        [.285, .13, .07, .18, 9], [.365, .24, .055, .2, 8],
        [.975, .2, .055, .22, 9], [.895, .13, .07, .2, 9], [.81, .21, .075, .2, 10],
        [.715, .13, .07, .18, 9], [.635, .24, .055, .2, 8],
        [.055, .78, .045, .14, 8], [.3, .79, .035, .13, 8], [.09, .93, .035, .08, 7],
        [.32, .92, .03, .08, 7], [.945, .78, .045, .14, 8], [.7, .79, .035, .13, 8],
        [.91, .93, .035, .08, 7], [.68, .92, .03, .08, 7]
      ];
      for (const [cx, cy, rx, ry, count] of detailClouds) {
        const centerX = cx * bounds.width;
        const centerY = cy * bounds.height;
        const radiusX = rx * bounds.width;
        const radiusY = ry * bounds.height;
        for (let bloom = 0; bloom < count * 4; bloom++) {
          const theta = random() * Math.PI * 2;
          const spread = Math.sqrt(random());
          const x = centerX + Math.cos(theta) * radiusX * spread;
          const y = centerY + Math.sin(theta) * radiusY * spread;
          const foreground = random() > .72;
          const size = foreground ? 4.2 + random() * 1.8 : 1.15 + random() * 1.35;
          drawFlower(x, y, size);
        }
      }

      // Fade both foliage layers into a soft central opening between the trees.
      function fadeCenter(ctx) {
        if (!ctx) return;
        const opening = ctx.createLinearGradient(0, 0, bounds.width, 0);
        opening.addColorStop(0, 'rgba(0,0,0,0)');
        opening.addColorStop(.36, 'rgba(0,0,0,0)');
        opening.addColorStop(.42, 'rgba(0,0,0,.5)');
        opening.addColorStop(.46, 'rgba(0,0,0,1)');
        opening.addColorStop(.54, 'rgba(0,0,0,1)');
        opening.addColorStop(.58, 'rgba(0,0,0,.5)');
        opening.addColorStop(.64, 'rgba(0,0,0,0)');
        opening.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = opening;
        ctx.fillRect(0, 0, bounds.width, bounds.height);
        ctx.restore();
      }
      fadeCenter(canopyBaseCtx);
      fadeCenter(canopyCtx);

      // Keep the translucent project cards and their text completely free of foliage.
      const orchard = canopy.closest('.orchard');
      orchard?.querySelectorAll('.charm-card').forEach(card => {
        const cardBounds = card.getBoundingClientRect();
        const padding = 10;
        canopyCtx.clearRect(
          cardBounds.left - bounds.left - padding,
          cardBounds.top - bounds.top - padding,
          cardBounds.width + padding * 2,
          cardBounds.height + padding * 2
        );
        canopyBaseCtx?.clearRect(
          cardBounds.left - bounds.left - padding,
          cardBounds.top - bounds.top - padding,
          cardBounds.width + padding * 2,
          cardBounds.height + padding * 2
        );
      });
    }

    function scheduleCanopyDraw() {
      if (canopyFrame) cancelAnimationFrame(canopyFrame);
      canopyFrame = requestAnimationFrame(() => {
        canopyFrame = 0;
        renderCanopy();
      });
    }

    window.addEventListener('resize', scheduleCanopyDraw, { passive: true });
    window.addEventListener('pagehide', () => {
      if (canopyFrame) cancelAnimationFrame(canopyFrame);
    }, { once: true });
    scheduleCanopyDraw();
  }
  // Project dialog content is rendered from safely parsed JSON embedded by EJS.
  const dataNode = document.getElementById('projects-data');
  const dialog = document.querySelector('.project-dialog');
  if (dataNode && dialog) {
    let projects = [];
    try { projects = JSON.parse(dataNode.textContent); } catch (error) { console.error('Could not read project data.', error); }
    const title = dialog.querySelector('#dialog-title');
    const category = dialog.querySelector('#dialog-category');
    const description = dialog.querySelector('.dialog-description');
    const details = dialog.querySelector('.dialog-details');
    const tech = dialog.querySelector('.dialog-tech');
    const links = dialog.querySelector('.dialog-links');
    document.querySelectorAll('.project-charm').forEach(button => {
      button.addEventListener('click', () => {
        const project = projects[Number(button.dataset.project)];
        if (!project) return;
        title.textContent = project.title || 'Project';
        category.textContent = project.category || 'Selected work';
        description.textContent = project.description || '';
        details.textContent = project.details || '';
        tech.replaceChildren(...(Array.isArray(project.tech) ? project.tech : []).map(label => {
          const tag = document.createElement('span'); tag.textContent = label; return tag;
        }));
        links.replaceChildren();
        [['GitHub', project.github], ['Live demo', project.demo]].forEach(([label, href]) => {
          if (!href) return;
          const link = document.createElement('a'); link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = `${label} â†—`; links.append(link);
        });
        if (!links.children.length) {
          const note = document.createElement('span'); note.className = 'dialog-link-note'; note.textContent = 'Project links coming soon'; links.append(note);
        }
        if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
        dialog.dispatchEvent(new Event('open'));
      });
    });
    const openProjectFromHash = () => {
      const match = window.location.hash.match(/^#project-(0[1-4])$/);
      if (!match) return;
      const target = document.getElementById(`project-${match[1]}`);
      if (!target) return;
      target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      target.click();
    };
    window.addEventListener('hashchange', openProjectFromHash);
    if (window.location.hash) window.setTimeout(openProjectFromHash, 0);
    dialog.addEventListener('open', () => {
      if (finePointer.matches && sakuraCursor) dialog.append(sakuraCursor);
      window.dispatchEvent(new Event('portfolio:modal-open'));
    });
    dialog.addEventListener('close', () => {
      if (sakuraCursor) document.body.append(sakuraCursor);
      window.dispatchEvent(new Event('portfolio:modal-close'));
    });
    dialog.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', event => { if (event.key === 'Escape') dialog.close(); });
  }

  // A bounded canvas pool keeps the Projects page petals light and non-interactive.
  const orchard = document.querySelector('.orchard');
  const ambientCanvas = document.getElementById('ambient-petal-canvas');
  const fallingCanvas = ambientCanvas || document.getElementById('falling-petal-canvas');
  const viewportPetals = Boolean(ambientCanvas);
  if ((orchard || viewportPetals) && fallingCanvas) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      fallingCanvas.hidden = true;
    } else {
      const fallingCtx = fallingCanvas.getContext('2d', { alpha: true });
      const fallingColors = ['#F8EDEB', '#FFC8DD', '#FFB7C5', '#E0B1CB'];
      const fallingPool = [];
      const particleCount = viewportPetals ? 48 : 64;
      let width = 0, height = 0, pixelRatio = 1, fallingFrame = 0, lastTime = 0;
      let running = false, modalOpen = false, inView = viewportPetals || !('IntersectionObserver' in window);

      function spawnPetal(petal, initial = false) {
        const fromLeftTree = Math.random() < .5;
        const canopyBand = viewportPetals ? [0, 1] : (fromLeftTree ? [.01, .4] : [.6, .99]);
        petal.x = width * (canopyBand[0] + Math.random() * (canopyBand[1] - canopyBand[0]));
        petal.y = initial ? Math.random() * height : -12 - Math.random() * Math.min(height * .18, 120);
        petal.size = 2.2 + Math.random() * 4.2;
        petal.vx = (Math.random() - .5) * 13;
        petal.vy = 17 + Math.random() * 31;
        petal.sway = 5 + Math.random() * 13;
        petal.phase = Math.random() * Math.PI * 2;
        petal.spin = (Math.random() - .5) * 1.4;
        petal.angle = Math.random() * Math.PI * 2;
        petal.alpha = .24 + Math.random() * .34;
        petal.color = fallingColors[Math.floor(Math.random() * fallingColors.length)];
      }

      function resizeFallingCanvas() {
        const rect = viewportPetals ? { width: window.innerWidth, height: window.innerHeight } : orchard.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        pixelRatio = viewportPetals ? 1 : Math.min(window.devicePixelRatio || 1, 1.25);
        fallingCanvas.width = Math.max(1, Math.round(width * pixelRatio));
        fallingCanvas.height = Math.max(1, Math.round(height * pixelRatio));
        fallingCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        fallingPool.length = 0;
        for (let i = 0; i < particleCount; i++) {
          const petal = {};
          spawnPetal(petal, true);
          fallingPool.push(petal);
        }
        lastTime = 0;
      }

      function drawFallingPetals(time) {
        if (!running) return;
        fallingFrame = requestAnimationFrame(drawFallingPetals);
        const elapsed = lastTime ? Math.min((time - lastTime) / 1000, .05) : 0;
        lastTime = time;
        fallingCtx.clearRect(0, 0, width, height);
        for (const petal of fallingPool) {
          petal.x += (petal.vx + Math.sin(time * .00055 + petal.phase) * petal.sway) * elapsed;
          petal.y += petal.vy * elapsed;
          petal.angle += petal.spin * elapsed;
          if (petal.y > height + 16) spawnPetal(petal);
          if (petal.x < -16) petal.x = width + 16;
          if (petal.x > width + 16) petal.x = -16;
          fallingCtx.save();
          fallingCtx.translate(petal.x, petal.y);
          fallingCtx.rotate(petal.angle + Math.sin(time * .0004 + petal.phase) * .16);
          fallingCtx.globalAlpha = petal.alpha;
          fallingCtx.fillStyle = petal.color;
          fallingCtx.shadowColor = petal.color;
          fallingCtx.shadowBlur = 2.5;
          fallingCtx.beginPath();
          fallingCtx.moveTo(0, petal.size);
          fallingCtx.bezierCurveTo(-petal.size * .12, petal.size * .45, -petal.size, petal.size * .25, -petal.size * .84, -petal.size * .3);
          fallingCtx.bezierCurveTo(-petal.size * .65, -petal.size * .85, -petal.size * .2, -petal.size * .9, 0, -petal.size * .5);
          fallingCtx.bezierCurveTo(petal.size * .2, -petal.size * .9, petal.size * .65, -petal.size * .85, petal.size * .84, -petal.size * .3);
          fallingCtx.bezierCurveTo(petal.size, petal.size * .25, petal.size * .12, petal.size * .45, 0, petal.size);
          fallingCtx.fill();
          fallingCtx.restore();
        }
      }

      function startFallingPetals() {
        if (running || modalOpen || !inView || document.hidden || !width || !height) return;
        running = true;
        lastTime = 0;
        fallingFrame = requestAnimationFrame(drawFallingPetals);
      }

      function stopFallingPetals() {
        running = false;
        if (fallingFrame) cancelAnimationFrame(fallingFrame);
        fallingFrame = 0;
      }

      resizeFallingCanvas();
      window.addEventListener('resize', resizeFallingCanvas, { passive: true });
      document.addEventListener('visibilitychange', () => document.hidden ? stopFallingPetals() : startFallingPetals());
      window.addEventListener('portfolio:modal-open', () => { modalOpen = true; stopFallingPetals(); });
      window.addEventListener('portfolio:modal-close', () => { modalOpen = false; startFallingPetals(); });
      window.addEventListener('pagehide', stopFallingPetals);
      window.addEventListener('pageshow', startFallingPetals);
      if (orchard && 'ResizeObserver' in window) new ResizeObserver(resizeFallingCanvas).observe(orchard);
      if (orchard && 'IntersectionObserver' in window) {
        const visibilityObserver = new IntersectionObserver(entries => {
          inView = entries.some(entry => entry.isIntersecting);
          if (inView) startFallingPetals(); else stopFallingPetals();
        }, { rootMargin: '80px 0px' });
        visibilityObserver.observe(orchard);
      }
      startFallingPetals();
    }
  }
})();
