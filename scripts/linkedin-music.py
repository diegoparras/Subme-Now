#!/usr/bin/env python3
"""Música original para el video de LinkedIn de Subme Now (generada con código, sin samples).

120 BPM, La menor (Am - F - C - G), 44 segundos:
  0-4 s   intro: pad, arpegio y subida (el gancho del video)
  4-30 s  drop: bombo, palmas, bajo con "bombeo" y la melodía pegadiza
  30-38 s respiro (cómo instalarlo): sin melodía, con subida al final
  38-42 s drop final + golpe
  42-44 s cola

Uso: python3 scripts/linkedin-music.py salida.wav
"""
import sys
import wave

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
STEP = BEAT / 4          # semicorchea
BAR = BEAT * 4
LENGTH = 44.0
N = int(LENGTH * SR)
rng = np.random.default_rng(7)

L = np.zeros(N)
R = np.zeros(N)
kick_env = np.zeros(N)   # para el "sidechain"


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def add(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * (1 - max(0, pan))
    R[i:i + len(sig)] += sig * gain * (1 + min(0, pan))


def tvec(dur):
    return np.arange(int(dur * SR)) / SR


def additive(freq, dur, harmonics=10, roll=0.75, odd=False, detune=0.0):
    t = tvec(dur)
    out = np.zeros_like(t)
    for k in range(1, harmonics + 1):
        if odd and k % 2 == 0:
            continue
        if k * freq > SR / 2.2:
            break
        amp = (roll ** (k - 1)) / k
        out += amp * np.sin(2 * np.pi * k * freq * (1 + detune) * t + k * 0.7)
    return out


def env_adsr(n, a=0.005, d=0.1, s=0.6, r=0.05):
    t = np.arange(n) / SR
    dur = n / SR
    e = np.ones(n) * s
    e[t < a] = t[t < a] / a
    m = (t >= a) & (t < a + d)
    e[m] = 1 - (1 - s) * (t[m] - a) / d
    rel = t > dur - r
    e[rel] *= np.clip((dur - t[rel]) / r, 0, 1)
    return e


# ---------- percusión ----------
def kick(at, gain=1.0):
    t = tvec(0.42)
    f = 46 + 120 * np.exp(-t * 30)
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(phase) * np.exp(-t * 6.5)
    click = rng.standard_normal(len(t)) * np.exp(-t * 400) * 0.35
    add(np.tanh((body + click) * 1.6), at, 0.95 * gain)
    i = int(at * SR)
    e = np.exp(-tvec(0.3) * 9)
    kick_env[i:i + len(e)] = np.maximum(kick_env[i:i + len(e)], e[: max(0, N - i)])


def clap(at, gain=1.0):
    t = tvec(0.3)
    n = rng.standard_normal(len(t))
    n = np.diff(n, prepend=0)  # más brillo
    e = np.zeros_like(t)
    for off in (0, 0.011, 0.023):
        e += np.where(t >= off, np.exp(-(t - off) * 55), 0)
    e += np.exp(-t * 14) * 0.35
    add(n * e * 0.22, at, gain, pan=0.08)


def hat(at, gain=1.0, open_=False):
    t = tvec(0.25 if open_ else 0.06)
    n = np.diff(rng.standard_normal(len(t)), prepend=0)
    add(n * np.exp(-t * (18 if open_ else 90)) * 0.09, at, gain, pan=-0.25)


def riser(start, dur, gain=1.0):
    t = tvec(dur)
    x = t / dur
    n = np.diff(rng.standard_normal(len(t)), prepend=0) * (x ** 2.6) * 0.07
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1600 * x ** 2) / SR) * (x ** 3) * 0.12
    add(n + sweep, start, gain)


def impact(at, gain=1.0):
    t = tvec(2.2)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t * 8)) / SR) * np.exp(-t * 2.2)
    noise = np.diff(rng.standard_normal(len(t)), prepend=0) * np.exp(-t * 3.5) * 0.25
    add(np.tanh((boom + noise) * 1.4) * 0.9, at, gain)


# ---------- armonía ----------
CHORDS = [(57, [69, 72, 76]), (53, [65, 69, 72]), (48, [67, 72, 76]), (55, [67, 71, 74])]  # Am F C G (bajo, acorde)


def pad(at, notes, dur, gain=1.0):
    for m in notes:
        for dt, pan in ((-0.004, -0.6), (0.0, 0.0), (0.005, 0.6)):
            s = additive(midi(m), dur, harmonics=7, roll=0.6, detune=dt)
            add(s * env_adsr(len(s), a=0.35, d=0.4, s=0.8, r=0.5) * 0.028, at, gain, pan=pan)


def bass(at, m, dur, gain=1.0):
    s = additive(midi(m - 12), dur, harmonics=9, roll=0.8, odd=True)
    s += 0.6 * np.sin(2 * np.pi * midi(m - 24) * tvec(dur))
    add(np.tanh(s * 1.3) * env_adsr(len(s), a=0.004, d=0.08, s=0.7, r=0.03) * 0.30, at, gain)


def pluck(at, m, dur, gain=1.0, bright=0.82):
    s = additive(midi(m), dur, harmonics=14, roll=bright) + 0.5 * additive(midi(m), dur, harmonics=10, roll=bright, detune=0.006)
    t = tvec(dur)
    e = np.exp(-t * 7) * 0.85 + 0.15
    e *= env_adsr(len(s), a=0.003, d=0.05, s=1.0, r=0.04)
    sig = s * e * 0.11
    add(sig, at, gain, pan=-0.15)
    add(sig * 0.45, at + STEP * 3, gain, pan=0.7)   # eco a la derecha (3/16)
    add(sig * 0.22, at + STEP * 6, gain, pan=-0.7)


def arp(at, notes, bars=1, gain=1.0):
    seq = notes + [notes[1] + 12]
    for i in range(int(16 * bars)):
        if i % 2:
            continue
        m = seq[(i // 2) % len(seq)] + 12
        pluck(at + i * STEP, m, STEP * 1.6, gain * 0.55, bright=0.7)


# Melodía pegadiza: 4 compases (paso de semicorchea, nota MIDI, duración en pasos)
HOOK = [
    (0, 76, 2), (3, 76, 1), (4, 74, 2), (6, 72, 2), (8, 69, 3), (12, 72, 2), (14, 74, 2),
    (16, 76, 2), (18, 79, 2), (20, 76, 2), (22, 74, 2), (24, 72, 4), (28, 74, 2), (30, 72, 2),
    (32, 72, 2), (35, 72, 1), (36, 74, 2), (38, 76, 2), (40, 79, 3), (44, 76, 2), (46, 74, 2),
    (48, 74, 2), (50, 76, 2), (52, 74, 2), (54, 72, 2), (56, 71, 4), (60, 69, 4),
]


def hook(at, gain=1.0, octave=0):
    for step, m, ln in HOOK:
        pluck(at + step * STEP, m + 12 * octave, ln * STEP + 0.12, gain)


# ---------- arreglo ----------
def bar_t(b):
    return b * BAR


# Intro (compases 0-1): pad + arpegio; subida y redoble en el compás 1
for b in range(2):
    root, notes = CHORDS[b % 4]
    pad(bar_t(b), notes, BAR + 0.4, 0.9)
    arp(bar_t(b), notes, 1, 0.8)
riser(bar_t(1), BAR, 1.0)
for i in range(8):
    clap(bar_t(1) + BEAT * 2 + i * STEP, 0.25 + i * 0.09)

# Drop (compases 2-14) y drop final (19-20)
def groove(b, lead=True, full=True):
    root, notes = CHORDS[b % 4]
    t0 = bar_t(b)
    pad(t0, notes, BAR + 0.3, 1.0)
    for beat in range(4):
        kick(t0 + beat * BEAT, 1.0 if full else 0.7)
        if beat % 2 == 1:
            clap(t0 + beat * BEAT, 1.0)
        hat(t0 + beat * BEAT + BEAT / 2, 1.0, open_=(beat == 3))
        hat(t0 + beat * BEAT + BEAT / 4, 0.45)
        hat(t0 + beat * BEAT + 3 * BEAT / 4, 0.45)
        for half in (0.5,):
            bass(t0 + beat * BEAT + half * BEAT, root, BEAT * 0.45)
    if lead and (b - 2) % 4 == 0:
        hook(t0, 1.0, octave=0 if b < 10 else 1 if b < 14 else 0)


impact(bar_t(2), 0.9)
for b in range(2, 15):
    groove(b)

# Respiro (compases 15-18): pad, arpegio, bombo suave en 1 y 3
for b in range(15, 19):
    root, notes = CHORDS[b % 4]
    pad(bar_t(b), notes, BAR + 0.3, 1.0)
    arp(bar_t(b), notes, 1, 0.75)
    kick(bar_t(b), 0.55)
    kick(bar_t(b) + 2 * BEAT, 0.55)
    for beat in range(4):
        hat(bar_t(b) + beat * BEAT + BEAT / 2, 0.6)
        bass(bar_t(b) + beat * BEAT + BEAT / 2, root, BEAT * 0.4, 0.6)
riser(bar_t(18), BAR, 1.1)
for i in range(16):
    clap(bar_t(18) + BEAT * 2 + i * STEP / 2, 0.2 + i * 0.05)

impact(bar_t(19), 1.0)
for b in range(19, 21):
    groove(b)
hook(bar_t(19), 0.9, octave=1)

# Final: golpe con acorde largo
impact(bar_t(21), 1.0)
pad(bar_t(21), [69, 72, 76, 81], 2.0, 1.2)
kick(bar_t(21), 1.0)

# ---------- mezcla ----------
duck = 1 - 0.55 * kick_env  # el pad y el bajo "respiran" con el bombo
L *= duck
R *= duck


def reverb(x, seconds=1.6, mix=0.18):
    t = np.arange(int(seconds * SR)) / SR
    ir = rng.standard_normal(len(t)) * np.exp(-t * 3.2)
    ir[: int(0.012 * SR)] = 0
    n = 1 << int(np.ceil(np.log2(len(x) + len(ir))))
    wet = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: len(x)]
    wet /= np.max(np.abs(wet)) + 1e-9
    return x + wet * mix * np.max(np.abs(x))


L = reverb(L)
R = reverb(R)
master = np.stack([L, R], axis=1)
master = np.tanh(master * 1.05)
fade = int(1.8 * SR)
master[-fade:] *= np.linspace(1, 0, fade)[:, None]
master /= np.max(np.abs(master)) / 0.89

out = sys.argv[1] if len(sys.argv) > 1 else 'subme-now-musica.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((master * 32767).astype('<i2').tobytes())
print(f'Música generada: {out} ({LENGTH:.0f} s, {BPM} BPM)')
