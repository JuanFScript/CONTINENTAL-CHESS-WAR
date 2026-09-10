/**
 * CONTINENTAL - Audio & Haptic Feedback Synthesizer
 * Uses Web Audio API to produce rich audio effects without external file dependencies.
 */

const AudioManager = {
    audioCtx: null,
    enabled: true,
    hapticsEnabled: true,

    init() {
        // AudioContext lazy initialization on first user interaction
        const initCtx = () => {
            if (!this.audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.audioCtx = new AudioContext();
                }
            }
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        };

        window.addEventListener('click', initCtx, { once: true });
        window.addEventListener('touchstart', initCtx, { once: true });

        // Load preferences
        const soundPref = localStorage.getItem('continental_sound');
        if (soundPref !== null) this.enabled = soundPref === 'true';

        const vibPref = localStorage.getItem('continental_vibrate');
        if (vibPref !== null) this.hapticsEnabled = vibPref === 'true';
    },

    playMove() {
        if (!this.enabled || !this.audioCtx) return;
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(180, this.audioCtx.currentTime + 0.08);

            gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.08);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.08);
            this.vibrate(15);
        } catch (e) { console.warn('Audio play error', e); }
    },

    playCapture() {
        if (!this.enabled || !this.audioCtx) return;
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(55, this.audioCtx.currentTime + 0.12);

            gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.12);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.12);
            this.vibrate([25, 30, 25]);
        } catch (e) { console.warn('Audio play error', e); }
    },

    playCheck() {
        if (!this.enabled || !this.audioCtx) return;
        try {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
            osc.frequency.setValueAtTime(880, this.audioCtx.currentTime + 0.1); // A5

            gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.25);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.25);
            this.vibrate(60);
        } catch (e) { console.warn('Audio play error', e); }
    },

    playVictory() {
        if (!this.enabled || !this.audioCtx) return;
        try {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
            notes.forEach((freq, idx) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + idx * 0.1 + 0.3);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(this.audioCtx.currentTime + idx * 0.1);
                osc.stop(this.audioCtx.currentTime + idx * 0.1 + 0.3);
            });
            this.vibrate([100, 50, 100, 50, 150]);
        } catch (e) { console.warn('Audio play error', e); }
    },

    vibrate(pattern) {
        if (this.hapticsEnabled && 'vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }
};

AudioManager.init();
