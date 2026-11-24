import { ReminderSound } from '@/src/types/calendar';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function playReminderSound(sound: ReminderSound): void {
  if (sound === 'silent') return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const playTone = (freq: number, start: number, duration: number, type: OscillatorType, gainPeak: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  };

  if (sound === 'gentle') {
    playTone(523.25, now, 0.35, 'sine', 0.14); // C5
    playTone(659.25, now + 0.14, 0.45, 'sine', 0.14); // E5
    playTone(783.99, now + 0.28, 0.65, 'sine', 0.12); // G5
  } else if (sound === 'bell') {
    playTone(880, now, 0.7, 'triangle', 0.18);
    playTone(1318.5, now + 0.02, 0.55, 'sine', 0.09);
    playTone(880, now + 0.42, 0.75, 'triangle', 0.15);
  } else if (sound === 'marimba') {
    playTone(587.33, now, 0.18, 'sine', 0.18); // D5
    playTone(739.99, now + 0.13, 0.18, 'sine', 0.18); // F#5
    playTone(880, now + 0.26, 0.22, 'sine', 0.18); // A5
    playTone(1174.66, now + 0.39, 0.4, 'sine', 0.16); // D6
  } else if (sound === 'pulse') {
    for (let i = 0; i < 3; i++) {
      playTone(987.77, now + i * 0.22, 0.14, 'square', 0.07);
    }
  }
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showBrowserNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      tag: `my-pro-calendar-${Date.now()}`,
    });
  } catch {
    // Ignore errors in restricted iframe environments
  }
}
