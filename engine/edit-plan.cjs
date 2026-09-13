'use strict';

const number = (v, min, max, fallback) => Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : fallback;

function cleanEdits(input, duration) {
  const e = input && typeof input === 'object' ? input : {};
  const start = number(e.start, 0, Math.max(0, duration - .05), 0);
  const end = number(e.end, start + .05, duration, duration);
  const ranges = (Array.isArray(e.ranges) ? e.ranges : []).slice(0, 200).map((r, i) => ({
    id: String(r.id ?? i).slice(0, 80), start: number(r.start, 0, duration, 0),
    end: number(r.end, 0, duration, 0), action: r.action === 'cut' ? 'cut' : 'mute',
    scope: r.scope === 'voice' ? 'voice' : 'all', label: String(r.label ?? 'Edit').slice(0, 100),
    enabled: r.enabled !== false,
  })).filter(r => r.end > r.start);
  const captions = (Array.isArray(e.captions) ? e.captions : []).slice(0, 500).map(c => ({
    start: number(c.start, 0, duration, 0), end: number(c.end, 0, duration, 0),
    text: String(c.text ?? '').replace(/<[^>]*>/g, '').slice(0, 250),
  })).filter(c => c.end > c.start && c.text);
  return {start, end, ranges, captions,
    speed: [.5, .75, 1, 1.25, 1.5, 2].includes(Number(e.speed)) ? Number(e.speed) : 1,
    voiceVolume: number(e.voiceVolume, 0, 2, 1), systemVolume: number(e.systemVolume, 0, 2, 1),
    noise: e.noise !== false, aspect: ['wide','vertical','square'].includes(e.aspect) ? e.aspect : 'wide',
    background: /^#[0-9a-f]{6}$/i.test(e.background) ? e.background : '#10272d',
    padding: number(e.padding, 0, .16, .05), zoom: number(e.zoom, 1, 2, 1),
    camera: e.camera !== false, cameraSize: number(e.cameraSize, .12, .35, .22),
    cameraCorner: ['tl','tr','bl','br'].includes(e.cameraCorner) ? e.cameraCorner : 'br',
    title: String(e.title ?? '').replace(/[\x00-\x08]/g,'').slice(0, 100),
  };
}

function keptSegments(edits) {
  const cuts = edits.ranges.filter(r => r.enabled && r.action === 'cut' && r.end > edits.start && r.start < edits.end)
    .map(r => [Math.max(edits.start, r.start), Math.min(edits.end, r.end)]).sort((a,b) => a[0]-b[0]);
  const result = []; let cursor = edits.start;
  for (const [a,b] of cuts) {if (a > cursor) result.push({start: cursor, end: a}); cursor = Math.max(cursor,b);}
  if (cursor < edits.end) result.push({start: cursor, end: edits.end});
  return result.filter(s => s.end - s.start >= .04);
}

function mappedCaptions(edits, segments) {
  const result=[]; let elapsed=0;
  for (const segment of segments) {
    for (const c of edits.captions) {
      const a=Math.max(segment.start,c.start), b=Math.min(segment.end,c.end);
      if(b>a) result.push({start:elapsed+(a-segment.start)/edits.speed,end:elapsed+(b-segment.start)/edits.speed,text:c.text});
    }
    elapsed+=(segment.end-segment.start)/edits.speed;
  }
  return result;
}

function parseSrt(text) {
  const seconds=s=>{const [h,m,rest]=s.replace(',','.').split(':').map(Number); return h*3600+m*60+rest;};
  return String(text).replace(/\r/g,'').split(/\n\s*\n/).flatMap(block=>{
    const rows=block.trim().split('\n'); const at=rows.findIndex(r=>r.includes('-->'));
    if(at<0)return [];
    const m=rows[at].match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
    return m?[{start:seconds(m[1]),end:seconds(m[2]),text:rows.slice(at+1).join('\n').replace(/<[^>]*>/g,'')}]:[];
  });
}

module.exports={cleanEdits,keptSegments,mappedCaptions,parseSrt};
