// Optional Firefox console audit: reads geometry only, stops after 30 s, sends nothing.
window.causalFlyTimelineAudit = (() => {
  const track = document.querySelector('[data-timeline-track]');
  if (!track) throw new Error('Open the Event Timeline before starting the audit.');
  const targets = [['panel', track.closest('section')], ['track', track]];
  track.querySelectorAll('[data-slot]').forEach(slot => {
    const id = slot.getAttribute('data-slot');
    targets.push([`slot-${id}`, slot]);
    for (const role of ['marker', 'baseline', 'label', 'tick', 'time']) targets.push([`${role}-${id}`, slot.querySelector(`[data-timeline-${role}]`)]);
  });
  const samples = [];
  const measure = () => samples.push({ time: performance.now(), scrollY, height: document.documentElement.scrollHeight, rects: Object.fromEntries(targets.map(([key, element]) => {
    const r = element.getBoundingClientRect();
    return [key, { x: r.x, y: r.y, width: r.width, height: r.height }];
  })) });
  measure();
  const timer = setInterval(measure, 100);
  const stop = () => { clearInterval(timer); return summary(); };
  const summary = () => ({ samples: samples.length, maxScrollDelta: Math.max(...samples.map(s => Math.abs(s.scrollY - samples[0].scrollY))), documentHeightRange: Math.max(...samples.map(s => s.height)) - Math.min(...samples.map(s => s.height)), maximumDeltaByTarget: Object.fromEntries(targets.map(([key]) => [key, Math.max(...samples.flatMap(s => ['x', 'y', 'width', 'height'].map(d => Math.abs(s.rects[key][d] - samples[0].rects[key][d]))))])) });
  setTimeout(stop, 30000);
  return { samples, stop, summary };
})();
