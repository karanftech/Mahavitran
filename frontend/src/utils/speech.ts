'use client';

let lastSpokenText = '';

export const speakInstruction = (text: string, isMuted: boolean = false) => {
  if (isMuted || !text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  // Prevent repeating the exact same sentence continuously
  if (text === lastSpokenText && window.speechSynthesis.speaking) {
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Clear queued/previous speech
    lastSpokenText = text;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    // Optional: Select a clear voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('David'))
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Voice navigation speech synthesis error:', err);
  }
};

export const stopSpeech = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};
