'use strict';

// Independent motion model. Coordinates and timestamps refer to the source video,
// so cuts, output aspect ratios and playback speed never change the focus target.
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const bounded = (value, a, b, fallback) => Number.isFinite(Number(value)) ? clamp(Number(value), a, b) : fallback;
const smooth = u => u * u * (3 - 2 * u);

function cleanZoomRegions(input, duration) {
  let previousEnd = 0;
  return (Array.isArray(input) ? input : []).filter(r => r && typeof r === 'object').slice(0, 100)
    .map((r, i) => ({
      id: String(r.id ?? `zoom-${i}`).slice(0, 80),
      start: bounded(r.start, 0, duration, 0), end: bounded(r.end, 0, duration, 0),
      x: bounded(r.x, 0, 1, .5), y: bounded(r.y, 0, 1, .5),
      zoom: bounded(r.zoom, 1, 3, 2), ease: bounded(r.ease, .15, 2, .65),
      enabled: r.enabled !== false, source: r.source === 'auto' ? 'auto' : 'manual',
    })).sort((a, b) => a.start - b.start).flatMap(r => {
      // Disabled regions remain editable without reserving time on the camera track.
      if (r.enabled) r.start = Math.max(r.start, previousEnd);
      if (r.end - r.start < .2) return [];
      r.ease = Math.min(r.ease, (r.end - r.start) / 2);
      if (r.enabled) previousEnd = r.end;
      return [r];
    });
}

function weight(region, t) {
  const u = clamp(Math.min((t - region.start) / region.ease, (region.end - t) / region.ease), 0, 1);
  return smooth(u);
}

function motionAt(edits, t) {
  const base = bounded(edits.zoom, 1, 2, 1);
  const region = (edits.zoomRegions || []).find(r => r.enabled && t >= r.start && t <= r.end);
  const w = region ? weight(region, t) : 0;
  const zoom = base + (region ? Math.max(base, region.zoom) - base : 0) * w;
  const x = .5 + (region ? region.x - .5 : 0) * w;
  const y = .5 + (region ? region.y - .5 : 0) * w;
  return {zoom, left: clamp(x - .5 / zoom, 0, 1 - 1 / zoom), top: clamp(y - .5 / zoom, 0, 1 - 1 / zoom)};
}

function cleanCursorSamples(input, duration) {
  let last = -1;
  return (Array.isArray(input) ? input : []).slice(0, 36000).filter(p => {
    if (!p || ![p.t, p.x, p.y].every(Number.isFinite) || p.t < 0 || p.t > duration ||
        p.t <= last || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return false;
    last = p.t; return true;
  }).map(p => ({t: p.t, x: p.x, y: p.y}));
}

function suggestZooms(input, duration) {
  const samples = cleanCursorSamples(input, duration), groups = [];
  let group = [];
  const flush = () => { if (group.length && group.at(-1).t - group[0].t >= .65) groups.push(group); group = []; };
  for (const point of samples) {
    if (group.length && (point.t - group.at(-1).t > .4 || Math.hypot(point.x - group[0].x, point.y - group[0].y) > .065)) flush();
    group.push(point);
  }
  flush();
  return cleanZoomRegions(groups.map((points, index) => ({
    id: `auto-${index}-${points[0].t.toFixed(3)}`, source: 'auto',
    start: Math.max(0, points[0].t - .4), end: Math.min(duration, points.at(-1).t + .65),
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length, zoom: 2, ease: .65,
  })), duration);
}

// FFmpeg zoompan uses output frame index `on`. Its input is normalized to 30fps
// after trimming and speed adjustment; convert back to original source seconds.
function zoomFilter(edits, segment, width, height) {
  const t = `(on/30*${edits.speed}+${segment.start})`;
  const regions = edits.zoomRegions.filter(r => r.enabled && r.end > segment.start && r.start < segment.end);
  const weights = regions.map(r => {
    const u = `clip(min((${t}-${r.start})/${r.ease},(${r.end}-${t})/${r.ease}),0,1)`;
    return `(${u}*${u}*(3-2*${u}))`;
  });
  const expression = (base, delta) => String(base) + regions.map((r, i) => `+(${delta(r)})*${weights[i]}`).join('');
  const z = expression(edits.zoom, r => Math.max(edits.zoom, r.zoom) - edits.zoom);
  const x = expression(.5, r => r.x - .5), y = expression(.5, r => r.y - .5);
  return `zoompan=z='${z}':x='max(0,min(iw-iw/zoom,iw*(${x})-iw/zoom/2))':y='max(0,min(ih-ih/zoom,ih*(${y})-ih/zoom/2))':d=1:s=${width}x${height}:fps=30`;
}

module.exports = {cleanZoomRegions, motionAt, cleanCursorSamples, suggestZooms, zoomFilter};
