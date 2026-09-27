'use strict';
const {suggestZooms} = require('../../engine/motion.cjs');

function motionControls({getProject, getEdits, change, selection, seek, stop, layout, toast}) {
  const $ = id => document.getElementById(id);
  let selected = null, picking = false, projectID = null;
  function select(id) { selected = id; picking = false; render(); layout(); }
  function update(id, key, value) {
    change(() => { const region = getEdits().zoomRegions.find(r => r.id === id); if (region) region[key] = value; });
  }
  function render() {
    const project = getProject(); if (!project) return;
    if (project.id !== projectID) { projectID = project.id; selected = null; picking = false; }
    const regions = getEdits().zoomRegions;
    if (!regions.some(r => r.id === selected)) { selected = regions[0]?.id ?? null; picking = false; }
    $('zoom-list').replaceChildren();
    $('zoom-pick').disabled = !selected;
    $('zoom-pick').textContent = picking ? 'Cancel subject selection' : 'Point to subject';
    $('screen-frame').classList.toggle('picking-focus', picking);
    $('zoom-note').textContent = picking ? 'Click the subject in the full source picture above.' :
      project.cursorSamples?.length ? 'Suggest zooms from pauses in pointer movement, then review each region. Times refer to the original video.' :
        'No pointer track in this recording. Select a time range, add a zoom, then point to its subject.';
    $('zoom-suggest').disabled = !project.cursorSamples?.length;
    for (const region of regions) {
      const row = document.createElement('div'); row.className = 'zoom-row' + (selected === region.id ? ' selected' : '');
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = region.enabled;
      check.setAttribute('aria-label', 'Enable zoom'); check.onchange = () => update(region.id, 'enabled', check.checked);
      const focus = document.createElement('button'); focus.className = 'text-button';
      focus.textContent = `${region.source === 'auto' ? 'Suggested' : 'Manual'} · ${Math.round(region.x * 100)}%, ${Math.round(region.y * 100)}%`;
      focus.onclick = () => { stop(); select(region.id); seek(Math.min(region.end, region.start + region.ease)); };
      row.append(check, focus);
      for (const [key, title, min, max, step] of [
        ['start', 'From (s)', 0, project.duration, .1], ['end', 'To (s)', 0, project.duration, .1],
        ['zoom', 'Zoom ×', 1, 3, .1], ['ease', 'Ease (s)', .15, 2, .05],
      ]) {
        const label = document.createElement('label'); label.textContent = title;
        const input = document.createElement('input'); input.type = 'number'; input.min = min; input.max = max; input.step = step;
        input.value = +region[key].toFixed(3); input.setAttribute('aria-label', title);
        input.onchange = () => {
          const value = Number(input.value);
          if (!Number.isFinite(value) || (key === 'start' && value > region.end - .2) || (key === 'end' && value < region.start + .2)) {
            toast('A zoom must last at least 0.2 seconds.'); render(); return;
          }
          update(region.id, key, value);
        };
        label.append(input); row.append(label);
      }
      const remove = document.createElement('button'); remove.className = 'text-button'; remove.textContent = 'Remove';
      remove.onclick = () => change(() => { getEdits().zoomRegions = getEdits().zoomRegions.filter(r => r.id !== region.id); });
      row.append(remove); $('zoom-list').append(row);
    }
  }
  $('zoom-add').onclick = () => {
    try {
      const range = selection();
      if (range.end - range.start < .2) throw Error('Select at least 0.2 seconds for a zoom.');
      if (getEdits().zoomRegions.some(r => r.enabled && r.start < range.end && r.end > range.start)) {
        throw Error('This selection overlaps an existing zoom. Edit that zoom or select another moment.');
      }
      if (getEdits().zoomRegions.length >= 100) throw Error('This project already has 100 zooms. Remove a zoom before adding another.');
      const id = crypto.randomUUID();
      change(() => getEdits().zoomRegions.push({...range, id, x: .5, y: .5, zoom: 2, ease: .65, enabled: true}));
      select(id); stop(); seek(range.start);
    } catch (error) { toast(error.message); }
  };
  $('zoom-pick').onclick = () => { stop(); picking = !picking; render(); layout(); };
  $('screen-frame').addEventListener('click', event => {
    if (!picking || !selected) return;
    const box = $('screen-frame').getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
    const y = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
    picking = false;
    change(() => { const region = getEdits().zoomRegions.find(r => r.id === selected); if (region) Object.assign(region, {x, y}); });
    const region = getEdits().zoomRegions.find(r => r.id === selected);
    if (region) seek(region.start + region.ease);
  });
  $('zoom-suggest').onclick = () => {
    const manual = getEdits().zoomRegions.filter(r => r.source !== 'auto');
    const suggestions = suggestZooms(getProject().cursorSamples, getProject().duration)
      .filter(r => !manual.some(m => m.enabled && m.start < r.end && m.end > r.start));
    change(() => { getEdits().zoomRegions = [...manual, ...suggestions].slice(0, 100); });
    toast(`${suggestions.length} focus suggestions. Review or adjust each before exporting.`);
  };
  return {render, isPicking: () => picking};
}
module.exports = {motionControls};
