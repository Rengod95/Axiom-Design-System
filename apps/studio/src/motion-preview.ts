import type { ResolvedStudioMotion } from "../../../modules/ads-core/src/index.ts";

export const motionKeyframes = (track: ResolvedStudioMotion): Keyframe[] => track.keyframes.map(frame => ({ offset: frame.offset, ...(track.property === "opacity" ? { opacity: frame.value } : { transform: track.property === "scale" ? `scale(${frame.value})` : `translateY(${frame.value}px)` }) }));
/** A preview owns only its animation handles; reset/unmount always releases them. */
export class MotionPreview {
  #animations = new Map<string, Animation>();
  #queued = new Map<string, () => void>();
  play(root: Element, tracks: ResolvedStudioMotion[], reduced = false) {
    for (const track of tracks) {
      const target = [...root.querySelectorAll<HTMLElement>("[data-part-id]")].find(element => element.dataset.partId === track.targetPartRef);
      if (!target) continue;
      const key = `${track.targetPartRef}/${track.property === "opacity" ? "opacity" : "transform"}`, old = this.#animations.get(key);
      const start = () => {
        const frames = motionKeyframes(track), interruptedSnap = old?.playState === "running" && track.interruption === "snap";
        if (old && track.interruption === "replace-from-current" && !reduced) {
          const style = getComputedStyle(target);
          frames[0] = { offset: 0, ...(track.property === "opacity" ? { opacity: style.opacity } : { transform: style.transform }) };
        }
        old?.cancel();
        const snapValue = reduced ? track.reducedAlternative.value : track.keyframes.at(-1)!.value;
        const snap = { ...track, keyframes: [{ offset: 0, value: snapValue }, { offset: 1, value: snapValue }] };
        const animation = target.animate(reduced || interruptedSnap ? motionKeyframes(snap) : frames, { duration: reduced || interruptedSnap ? 0 : track.durationMs, delay: reduced || interruptedSnap ? 0 : track.delayMs, easing: track.easing, fill: "forwards" });
        this.#animations.set(key, animation);
        animation.onfinish = () => { const next = this.#queued.get(key); this.#queued.delete(key); next?.(); };
      };
      if (!reduced && old?.playState === "running" && track.interruption === "finish-then-next") this.#queued.set(key, start);
      else { this.#queued.delete(key); start(); }
    }
  }
  pause() { for (const animation of this.#animations.values()) animation.pause(); }
  resume() { for (const animation of this.#animations.values()) animation.play(); }
  seek(milliseconds: number) { this.#queued.clear(); for (const animation of this.#animations.values()) { animation.pause(); animation.currentTime = milliseconds; } }
  get time() { return Math.max(0, ...[...this.#animations.values()].map(animation => typeof animation.currentTime === "number" ? animation.currentTime : 0)); }
  reset() { this.#queued.clear(); for (const animation of this.#animations.values()) { animation.onfinish = null; animation.cancel(); } this.#animations.clear(); }
}
