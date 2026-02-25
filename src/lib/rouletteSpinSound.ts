/**
 * ルーレットの針・ボール音を Web Audio API で合成する。
 * ファイルに依存せず、回転音と転がり音をコードで生成する。
 */

export interface SpinSoundHandle {
    stop: () => void;
}

/** 針（盤）が回るときのクリック音の連続（一定間隔・一定音量でループ） */
export function createWheelSound(context: AudioContext): SpinSoundHandle {
    if (context.state === "closed") return { stop: () => {} };

    const sampleRate = context.sampleRate;
    const clickIntervalSec = 0.135;
    const length = Math.floor(sampleRate * clickIntervalSec);
    const buffer = context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const clickLen = Math.min(Math.floor(sampleRate * 0.002), length);
    for (let i = 0; i < length; i++) {
        if (i < clickLen) {
            const decay = 1 - i / clickLen;
            data[i] = (Math.random() * 2 - 1) * decay * 0.6;
        } else {
            data[i] = 0;
        }
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2500, context.currentTime);
    filter.Q.setValueAtTime(0.7, context.currentTime);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.2, context.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    source.start(context.currentTime);

    return {
        stop() {
            try {
                source.stop(context.currentTime);
                source.disconnect();
                filter.disconnect();
                gain.disconnect();
            } catch {
                // 既に停止済みなど
            }
        },
    };
}

/** ボールが転がるときのコロコロ音（一定間隔・一定音量でループ） */
export function createBallSound(context: AudioContext): SpinSoundHandle {
    if (context.state === "closed") return { stop: () => {} };

    const sampleRate = context.sampleRate;
    const duration = 0.32;
    const length = Math.floor(sampleRate * duration);
    const buffer = context.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const bumpIntervalSamples = Math.floor(sampleRate * 0.08);
    const bumpLen = Math.floor(sampleRate * 0.025);
    const freq = 95;

    for (let i = 0; i < length; i++) data[i] = 0;
    for (let b = 0; b * bumpIntervalSamples < length; b++) {
        const start = b * bumpIntervalSamples;
        for (let i = 0; i < bumpLen && start + i < length; i++) {
            const t = i / sampleRate;
            const decay = Math.exp(-t * 35);
            const phase = 2 * Math.PI * freq * t;
            const idx = start + i;
            data[idx] = (data[idx] ?? 0) + Math.sin(phase) * decay * 0.18;
        }
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, context.currentTime);
    filter.Q.setValueAtTime(0.5, context.currentTime);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.12, context.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    source.start(context.currentTime);

    return {
        stop() {
            try {
                source.stop(context.currentTime);
                source.disconnect();
                filter.disconnect();
                gain.disconnect();
            } catch {
                // 既に停止済みなど
            }
        },
    };
}
