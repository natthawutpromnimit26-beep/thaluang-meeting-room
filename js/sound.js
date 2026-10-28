/**
 * Web Audio API Sound Synthesizer
 * ระบบจำลองเสียงแจ้งเตือนผ่าน Web Audio API โดยไม่ต้องพึ่งพาไฟล์เสียงภายนอก
 * วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
 */

class SoundManager {
  constructor() {
    this.enabled = localStorage.getItem('thaluang_sound_enabled') !== 'false';
    this.audioCtx = null;
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    } catch (e) {
      console.warn('Web Audio API not supported in this browser', e);
    }
  }

  ensureContext() {
    if (!this.audioCtx) {
      this.initAudioContext();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    localStorage.setItem('thaluang_sound_enabled', this.enabled);
    this.updateUI();
    if (this.enabled) {
      this.playChime();
    }
  }

  updateUI() {
    const icon = document.getElementById('soundIcon');
    const text = document.getElementById('soundText');
    if (icon) {
      icon.className = this.enabled ? 'fas fa-volume-up mr-1 text-amber-300' : 'fas fa-volume-mute mr-1 text-slate-300';
    }
    if (text) {
      text.textContent = this.enabled ? 'เสียงเปิด' : 'เสียงปิด';
    }
  }

  // เสียงกระดิ่งนุ่มนวลตอนมีแจ้งเตือนทั่วไป / สำเร็จ
  playChime() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      osc2.frequency.setValueAtTime(880, now);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn('Sound play error:', e);
    }
  }

  // เสียงแจ้งเตือนสำเร็จ (เมื่อจองห้องสำเร็จ หรือ อนุมัติสำเร็จ)
  playSuccess() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Arpeggio)
      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.01, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    } catch (e) {
      console.warn('Sound play error:', e);
    }
  }

  // เสียงเตือนเวลาชนกัน (Conflict Warning)
  playWarning() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.setValueAtTime(293.66, now + 0.12); // D4

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Sound play error:', e);
    }
  }
}

// Global instance
const soundManager = new SoundManager();
document.addEventListener('DOMContentLoaded', () => {
  soundManager.updateUI();
});
