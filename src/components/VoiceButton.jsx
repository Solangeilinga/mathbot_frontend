export default function VoiceButton({ listening, onStart, onStop, disabled }) {
  return (
    <button className={`voice-btn ${listening?"active":""}`} onClick={listening?onStop:onStart} disabled={disabled} title={listening?"Arrêter l'écoute":"Parler à MathBot"}>
      {listening && <><span className="voice-wave"/><span className="voice-wave"/><span className="voice-wave"/></>}
      <svg className="voice-btn-icon" viewBox="0 0 24 24" fill="none">
        <rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor"/>
        <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="9"  y1="21" x2="15" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </button>
  );
}
