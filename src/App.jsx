
import { useState, useRef } from "react";
import "./App.css";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "llama3.2:latest";

function App() {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("Ready");

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  // START MICROPHONE RECORDING
  async function startRecording() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      audioChunks.current = [];

      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunks.current, {
          type: recorder.mimeType,
        });

        await transcribeAudio(audioBlob);
      };

      mediaRecorder.current = recorder;

      recorder.start();

      setRecording(true);
      setStatus("Recording...");
      setAnswer("");
    } catch (error) {
      console.error("Microphone Error:", error);

      setStatus(error.message || "Microphone permission denied");
    }
  }

  // STOP RECORDING
  function stopRecording() {
    if (mediaRecorder.current && recording) {
      mediaRecorder.current.stop();

      setRecording(false);
      setProcessing(true);
      setStatus("Transcribing audio...");
    }
  }

  // WHISPER TRANSCRIPTION
  async function transcribeAudio(blob) {
    try {
      const formData = new FormData();

      formData.append("audio", blob, "recording.webm");

      const response = await fetch("http://localhost:8000/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          `Transcription error ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();

      setTranscription(data.text || "");

      setStatus("Transcription complete");
    } catch (error) {
      console.error("Transcription Error:", error);

      setStatus("Transcription service unavailable");
    } finally {
      setProcessing(false);
    }
  }

  // GENERATE AI ANSWER USING OLLAMA
  async function suggestAnswer() {
    if (!transcription.trim() || processing) {
      return;
    }

    setAnswer("");
    setProcessing(true);
    setStatus("Generating answer...");

    try {
      const response = await fetch(OLLAMA_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: MODEL,

          messages: [
            {
              role: "system",

              content:
                "You are Lacritiz AI, a helpful local voice assistant. Answer the user's questions clearly, accurately, and concisely.",
            },

            {
              role: "user",

              content: transcription.trim(),
            },
          ],

          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          `Ollama error ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();

      const aiResponse = data.message?.content;

      if (!aiResponse) {
        throw new Error("Ollama returned an empty response.");
      }

      setAnswer(aiResponse);

      setStatus("Answer complete");
    } catch (error) {
      console.error("AI Error:", error);

      setAnswer(
        `Error: ${error.message}\n\nPlease check that Ollama is running and the model "${MODEL}" is installed.`
      );

      setStatus("Could not generate answer");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <div className="logo">
          <span className="logo-icon">L</span>

          <div>
            <h1>Lacritiz AI</h1>

            <p>Local Voice Assistant</p>
          </div>
        </div>

        <div className="status">
          <span
            className={`status-dot ${recording ? "active" : ""}`}
          />

          {status}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="main">
        {/* HERO SECTION */}
        <section className="hero">
          <div className="hero-badge">100% LOCAL AI</div>

          <h2>
            Your voice.
            <br />

            <span>Your intelligence.</span>
          </h2>

          <p>
            Speak naturally. Get intelligent answers.
            <br />

            Your audio and AI responses stay on your device.
          </p>

          {/* RECORDING CONTROLS */}
          <div className="controls">
            <button
              className="start-button"
              onClick={startRecording}
              disabled={recording || processing}
            >
              <span>●</span> Start Recording
            </button>

            <button
              className="stop-button"
              onClick={stopRecording}
              disabled={!recording}
            >
              ■ Stop Recording
            </button>
          </div>
        </section>

        {/* TRANSCRIPTION + AI ANSWER */}
        <div className="content-grid">
          {/* TRANSCRIPTION PANEL */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-number">01</span>

                <h3>Transcription</h3>
              </div>

              <span className="panel-tag">SPEECH TO TEXT</span>
            </div>

            <textarea
              value={transcription}
              onChange={(event) =>
                setTranscription(event.target.value)
              }
              placeholder="Your spoken words will appear here..."
              className="transcription-area"
            />

            <button
              className="suggest-button"
              onClick={suggestAnswer}
              disabled={!transcription.trim() || processing}
            >
              {processing && !recording
                ? "Generating..."
                : "Suggest Answer"}

              <span>→</span>
            </button>
          </section>

          {/* AI ANSWER PANEL */}
          <section className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-number">02</span>

                <h3>AI Answer</h3>
              </div>

              <span className="panel-tag">LOCAL LLM</span>
            </div>

            <div className="answer-area">
              {answer ? (
                <div className="answer-text">
                  {answer}
                </div>
              ) : (
                <div className="empty-answer">
                  <div className="answer-icon">✦</div>

                  <p>
                    {processing
                      ? "Generating your answer..."
                      : "Your AI-generated answer will appear here."}
                  </p>

                  <span>Powered by Ollama</span>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <footer>
          <span>● PRIVATE BY DESIGN</span>

          <span>WHISPER + OLLAMA</span>

          <span>RUNNING LOCALLY</span>
        </footer>
      </main>
    </div>
  );
}

export default App;

