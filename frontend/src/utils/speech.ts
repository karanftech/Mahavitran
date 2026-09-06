'use client';

let lastSpokenText = '';
let activeUtterance: SpeechSynthesisUtterance | null = null;

export const speakInstruction = (text: string, isMuted: boolean = false) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  if (isMuted) {
    window.speechSynthesis.cancel();
    lastSpokenText = '';
    activeUtterance = null;
    return;
  }

  if (!text) return;

  // Prevent repeating the exact same sentence continuously while speaking
  if (text === lastSpokenText && window.speechSynthesis.speaking) {
    return;
  }

  try {
    // Resume speech synthesis if paused by browser tab inactivity
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    lastSpokenText = text;

    // Retain global reference to prevent V8 Garbage Collection from silencing speech mid-sentence
    activeUtterance = new SpeechSynthesisUtterance(text);
    activeUtterance.rate = 0.95;
    activeUtterance.pitch = 1.0;
    activeUtterance.lang = 'en-US';

    const playSpeech = () => {
      if (!activeUtterance) return;
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferredVoice =
          voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Google') ||
                v.name.includes('Natural') ||
                v.name.includes('Samantha') ||
                v.name.includes('David') ||
                v.name.includes('English'))
          ) || voices.find((v) => v.lang.startsWith('en'));
        if (preferredVoice) {
          activeUtterance.voice = preferredVoice;
        }
      }

      activeUtterance.onend = () => {
        activeUtterance = null;
      };
      activeUtterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        activeUtterance = null;
      };

      // Cancel previous utterance and speak new instruction clearly
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(activeUtterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        playSpeech();
        window.speechSynthesis.onvoiceschanged = null;
      };
    } else {
      playSpeech();
    }
  } catch (err) {
    console.warn('Voice navigation speech synthesis error:', err);
  }
};

export const stopSpeech = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
    lastSpokenText = '';
  }
};
