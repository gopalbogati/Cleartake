'use strict';

// Dependency-injected for deterministic timing tests. Electron supplies display DIP
// bounds and cursor DIP coordinates, keeping Retina and negative-origin monitors aligned.
class CursorCapture {
  constructor({bounds, now = () => performance.now(), point}) {
    this.bounds = {...bounds}; this.now = now; this.point = point;
    this.samples = []; this.active = false; this.paused = false; this.pausedMs = 0;
  }
  start() { this.started = this.now(); this.active = true; }
  setPaused(paused) {
    if (!this.active || this.paused === paused) return;
    if (paused) this.pauseStarted = this.now();
    else this.pausedMs += this.now() - this.pauseStarted;
    this.paused = paused;
  }
  sample() {
    if (!this.active || this.paused || this.samples.length >= 36000) return;
    const {x, y, width, height} = this.bounds, point = this.point();
    if (!(width > 0 && height > 0)) return;
    const px = (point.x - x) / width, py = (point.y - y) / height;
    if (px < 0 || px > 1 || py < 0 || py > 1) return;
    const t = (this.now() - this.started - this.pausedMs) / 1000;
    if (t < 0 || t > 3600 || (this.samples.length && t <= this.samples.at(-1).t)) return;
    this.samples.push({t, x: px, y: py});
  }
  stop() { this.active = false; return this.samples; }
}
module.exports = {CursorCapture};
