export default function SpeakButton({ speaking, onSpeak, onStop }) {
  return (
    <button className={`speak-btn ${speaking?"speaking":""}`} onClick={speaking?onStop:onSpeak} title={speaking?"Arrêter MathBot":"Écouter MathBot"}>
      {speaking
        ? <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>
        : <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
      }
    </button>
  );
}
