import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function VoiceInputButton({ onTranscript, currentText = '' }) {
  const { t, i18n } = useTranslation();
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const onTranscriptRef = useRef(onTranscript);

  const currentLang = i18n.language || (typeof localStorage !== 'undefined' && localStorage.getItem('cropshield_language')) || 'en';

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      setIsSupported(true);
      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = false;
      recognizer.lang =
        currentLang === 'kn'
          ? 'kn-IN'
          : currentLang === 'hi'
          ? 'hi-IN'
          : currentLang === 'te'
          ? 'te-IN'
          : 'en-IN';

      recognizer.onresult = (event) => {
        const results = event.results;
        let finalTrans = '';
        for (let i = event.resultIndex; i < results.length; i++) {
          if (results[i].isFinal) {
            finalTrans += results[i][0].transcript + ' ';
          }
        }
        if (finalTrans.trim()) {
          const updated = currentText ? `${currentText.trim()} ${finalTrans.trim()}` : finalTrans.trim();
          onTranscriptRef.current?.(updated);
        }
      };

      recognizer.onerror = (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognizer.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognizer;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [currentText, currentLang]);

  if (!isSupported) {
    return null; // strictly hide if unsupported
  }

  function toggleListening() {
    if (!recognitionRef.current) return;

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech start error:', err);
        setIsListening(false);
      }
    }
  }

  return (
    <button
      type="button"
      className={`cs-voice-btn ${isListening ? 'is-recording' : ''}`}
      onClick={toggleListening}
      aria-label={isListening ? t('symptomsStep.voiceStop', 'Stop recording') : t('symptomsStep.voiceButton', 'Speak to type notes')}
      title={isListening ? t('symptomsStep.voiceStop', 'Stop recording') : t('symptomsStep.voiceButton', 'Speak to type notes')}
    >
      {isListening ? (
        <>
          <MicOff size={16} className="icon-mr text-danger" />
          <span className="text-danger font-bold">{t('symptomsStep.voiceListening', 'Listening... speak now')}</span>
          <span className="cs-pulse-dot" />
        </>
      ) : (
        <>
          <Mic size={16} className="icon-mr text-primary" />
          <span>{t('symptomsStep.voiceButton', 'Speak to type notes')}</span>
        </>
      )}
    </button>
  );
}
