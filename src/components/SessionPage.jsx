import { useState } from "react";
import Sidebar from "./Sidebar";
import OwlTutor from "./OwlTutor";
import ChatArea from "./ChatArea";
import ExerciseAnalyzer from "./ExerciseAnalyzer";

export default function SessionPage({ currentChapter, setCurrentChapter, onXPUpdate, showToast, user, chapitres }) {
  const [isTalking, setIsTalking] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "analyze"

  // Quand on change de chapitre, revenir sur l'onglet chat
  const handleChapterChange = (ch) => {
    setCurrentChapter(ch);
    setActiveTab("chat");
  };

  return (
    <div className="session-layout" style={{ animation: "fade-in .4s ease" }}>
      <Sidebar
        currentChapter={currentChapter}
        setCurrentChapter={handleChapterChange}
        showToast={showToast}
        user={user}
        chapitres={chapitres}
      />

      <div className="chat-column">
        {/* Hibou — toujours visible */}
        <OwlTutor chapter={currentChapter} chapitres={chapitres} isTalking={isTalking} />

        {/* Onglets */}
        <div className="session-tabs">
          <button
            className={`session-tab ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            💬 Chat avec MathBot
          </button>
          <button
            className={`session-tab ${activeTab === "analyze" ? "active" : ""}`}
            onClick={() => setActiveTab("analyze")}
          >
            🔍 Analyser un exercice
          </button>
        </div>

        {/* Contenu selon onglet actif */}
        {activeTab === "chat" && (
          <ChatArea
            key={currentChapter}
            chapter={currentChapter}
            onXPUpdate={onXPUpdate}
            showToast={showToast}
            user={user}
            onTalkingChange={setIsTalking}
          />
        )}

        {activeTab === "analyze" && (
          <ExerciseAnalyzer
            chapter={currentChapter}
            user={user}
            showToast={showToast}
            onXPUpdate={onXPUpdate}
          />
        )}
      </div>
    </div>
  );
}