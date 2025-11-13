"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mic,
  MicOff,
  Volume2,
  History,
  Users,
  Wifi,
  WifiOff,
  Radio,
  Activity,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";
import { SocketMessage } from "@/lib/types";

interface Message {
  originalText: string;
  translatedText: string;
  speaker: "cliente" | "cajero";
  timestamp: Date;
}

interface ConversationHistory {
  id: string;
  sessionId: string;
  speaker: "cliente" | "cajero";
  originalText: string;
  originalLanguage: string;
  translatedText: string;
  translatedLanguage: string;
  timestamp: string;
}

interface StatusLog {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

export function CashierInterface() {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [otherParticipantLanguage, setOtherParticipantLanguage] = useState("es");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    ConversationHistory[]
  >([]);
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { toast } = useToast();

  const addLog = (message: string, type: StatusLog["type"] = "info") => {
    const time = new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setStatusLogs((prev) => [...prev.slice(-14), { time, message, type }]);
  };

  const connectToSession = async () => {
    if (!sessionId.trim()) {
      addLog("✗ Código de sesión vacío", "error");
      toast({
        title: "Error",
        description: "Por favor ingresa un código de sesión",
        variant: "destructive",
      });
      return;
    }

    addLog(`Intentando conectar a sesión: ${sessionId}`, "info");

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";
    socketRef.current = io(socketUrl, {
      transports: ["websocket", "polling"],
      forceNew: true,
    });

    socketRef.current.on("connect", () => {
      setIsConnected(true);
      addLog("✓ WebSocket conectado correctamente", "success");
      socketRef.current?.emit("join-session", sessionId);
      socketRef.current?.emit("language-update", { sessionId, language: selectedLanguage });
      addLog(`✓ Unido a sesión: ${sessionId}`, "success");
      toast({
        title: "Conectado",
        description: `Sesión: ${sessionId}`,
      });
    });

    socketRef.current.on("disconnect", () => {
      setIsConnected(false);
      addLog("✗ WebSocket desconectado", "error");
      toast({
        title: "Desconectado",
        description: "Se perdió la conexión",
        variant: "destructive",
      });
    });

    socketRef.current.on("language-update", (data: { language: string }) => {
      setOtherParticipantLanguage(data.language);
      addLog(`🌐 Idioma del otro participante: ${data.language}`, "info");
    });

    socketRef.current.on("message-received", (data: SocketMessage) => {
      addLog(
        `📩 Mensaje recibido de ${
          data.speaker === "cliente" ? "Cliente" : "Empleado"
        }`,
        "success"
      );
      setMessages((prev) => [
        ...prev,
        {
          originalText: data.originalText,
          translatedText: data.translatedText,
          speaker: data.speaker,
          timestamp: new Date(data.timestamp),
        },
      ]);

      // Play audio if available
      if (data.audioBase64) {
        addLog("🔊 Reproduciendo audio traducido", "info");
        playAudio(data.audioBase64);
      }
    });
  };

  const playAudio = (audioBase64: string) => {
    try {
      const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
      audio.play().catch(console.error);
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  const startRecording = async () => {
    try {
      addLog("🎤 Solicitando acceso al micrófono...", "info");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      addLog("✓ Micrófono activado", "success");

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/wav",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        addLog("⏹️ Grabación finalizada", "info");
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        addLog(
          `📦 Audio capturado: ${(audioBlob.size / 1024).toFixed(2)} KB`,
          "info"
        );
        sendAudioForProcessing(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      addLog("🔴 Grabando audio...", "warning");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      addLog("✗ Error al acceder al micrófono", "error");
      toast({
        title: "Error",
        description: "No se pudo acceder al micrófono",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      addLog("⏸️ Deteniendo grabación...", "info");
    }
  };

  const sendAudioForProcessing = async (audioBlob: Blob) => {
    setIsProcessing(true);
    addLog("📤 Enviando audio al servidor...", "info");

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.wav");
      formData.append("sourceLanguage", selectedLanguage);
      formData.append("targetLanguage", otherParticipantLanguage);
      formData.append("sessionId", sessionId);
      formData.append("speaker", "cajero");

      addLog("🔄 Procesando: Transcripción → Traducción → Síntesis", "info");
      const response = await fetch("/api/process-audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Error processing audio";
        throw new Error(errorMessage);
      }

      const result = await response.json();
      addLog(
        `✓ Texto transcrito: "${result.originalText.substring(0, 30)}..."`,
        "success"
      );
      addLog(
        `✓ Texto traducido: "${result.translatedText.substring(0, 30)}..."`,
        "success"
      );

      // Add message to local state
      setMessages((prev) => [
        ...prev,
        {
          originalText: result.originalText,
          translatedText: result.translatedText,
          speaker: "cajero",
          timestamp: new Date(),
        },
      ]);

      // Emit to other participants via Socket.io
      addLog("📡 Enviando mensaje a otros participantes...", "info");
      socketRef.current?.emit("send-message", {
        sessionId: sessionId,
        originalText: result.originalText,
        translatedText: result.translatedText,
        speaker: "cajero",
        audioBase64: result.audioBase64,
        timestamp: new Date(),
      });
      addLog("✓ Mensaje enviado exitosamente", "success");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al procesar el audio";
      console.error("Error processing audio:", errorMessage);
      addLog(`✗ ${errorMessage}`, "error");
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const loadConversationHistory = async () => {
    try {
      const response = await fetch(`/api/conversations?sessionId=${sessionId}`);
      if (response.ok) {
        const history = await response.json();
        setConversationHistory(history);
        setShowHistory(true);
      }
    } catch (error) {
      console.error("Error loading conversation history:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el historial",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-900 mb-2">
            Empleado - Traductor
          </h1>
          <p className="text-green-700">
            Atiende a clientes en cualquier idioma
          </p>
        </div>

        {/* Language Selection */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-4">
              <label className="text-lg font-medium">Mi idioma:</label>
              <Select
                value={selectedLanguage}
                onValueChange={(value) => {
                  setSelectedLanguage(value);
                  if (isConnected && socketRef.current) {
                    socketRef.current.emit("language-update", {
                      sessionId,
                      language: value
                    });
                    addLog(`🌐 Idioma actualizado a: ${value}`, "info");
                  }
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                  <SelectItem value="pt">🇵🇹 Português</SelectItem>
                  <SelectItem value="it">🇮🇹 Italiano</SelectItem>
                  <SelectItem value="zh">🇨🇳 中文</SelectItem>
                  <SelectItem value="ja">🇯🇵 日本語</SelectItem>
                  <SelectItem value="ko">🇰🇷 한국어</SelectItem>
                  <SelectItem value="ar">🇸🇦 العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Status Panel */}
        <Card className="mb-6 bg-gray-50 border-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center">
                <Activity className="mr-2 h-5 w-5 text-green-600" />
                Panel de Estado
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDebugPanel(!showDebugPanel)}
              >
                {showDebugPanel ? "Ocultar" : "Mostrar"}
              </Button>
            </div>

            {showDebugPanel && (
              <>
                {/* Status Indicators */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div
                    className={`p-3 rounded-lg border-2 ${
                      isConnected
                        ? "bg-green-50 border-green-300"
                        : "bg-red-50 border-red-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">WebSocket</span>
                      {isConnected ? (
                        <Wifi className="h-5 w-5 text-green-600" />
                      ) : (
                        <WifiOff className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        isConnected ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {isConnected ? "Conectado" : "Desconectado"}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border-2 ${
                      isConnected
                        ? "bg-green-50 border-green-300"
                        : "bg-gray-100 border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Sesión</span>
                      <Radio
                        className={`h-5 w-5 ${
                          isConnected ? "text-green-600" : "text-gray-400"
                        }`}
                      />
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        isConnected ? "text-green-700" : "text-gray-600"
                      }`}
                    >
                      {isConnected ? `${sessionId}` : "Sin sesión"}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border-2 ${
                      isRecording
                        ? "bg-red-50 border-red-300 animate-pulse"
                        : "bg-gray-100 border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Micrófono</span>
                      {isRecording ? (
                        <Mic className="h-5 w-5 text-red-600" />
                      ) : (
                        <MicOff className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        isRecording ? "text-red-700" : "text-gray-600"
                      }`}
                    >
                      {isRecording ? "Grabando" : "Inactivo"}
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border-2 ${
                      isProcessing
                        ? "bg-yellow-50 border-yellow-300"
                        : "bg-gray-100 border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Procesando</span>
                      {isProcessing ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600" />
                      ) : (
                        <Check className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        isProcessing ? "text-yellow-700" : "text-gray-600"
                      }`}
                    >
                      {isProcessing ? "En proceso" : "Listo"}
                    </div>
                  </div>
                </div>

                {/* Event Log */}
                <div className="bg-black text-green-400 rounded-lg p-3 font-mono text-xs h-48 overflow-y-auto">
                  <div className="font-bold mb-2 text-green-300">
                    📋 Log de Eventos:
                  </div>
                  {statusLogs.length === 0 ? (
                    <div className="text-gray-500">Esperando eventos...</div>
                  ) : (
                    statusLogs.map((log, index) => (
                      <div
                        key={index}
                        className={`mb-1 ${
                          log.type === "success"
                            ? "text-green-400"
                            : log.type === "error"
                            ? "text-red-400"
                            : log.type === "warning"
                            ? "text-yellow-400"
                            : "text-blue-400"
                        }`}
                      >
                        <span className="text-gray-500">[{log.time}]</span>{" "}
                        {log.message}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Session Management */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {!isConnected ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="mb-4 text-lg">
                    Ingresa el código de sesión del cliente:
                  </p>
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <input
                      type="text"
                      placeholder="CÓDIGO"
                      value={sessionId}
                      onChange={(e) =>
                        setSessionId(e.target.value.toUpperCase())
                      }
                      className="px-4 py-2 border rounded text-xl font-bold text-center w-48"
                      maxLength={6}
                    />
                  </div>
                </div>

                <div className="text-center">
                  <Button
                    onClick={connectToSession}
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                    disabled={!sessionId.trim()}
                  >
                    <Users className="mr-2 h-5 w-5" />
                    Conectar con Cliente
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg inline-block">
                  ✓ Conectado a sesión: {sessionId}
                </div>
                <Button
                  onClick={loadConversationHistory}
                  variant="outline"
                  className="ml-4"
                >
                  <History className="mr-2 h-4 w-4" />
                  Ver Conversación Completa
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recording Button */}
        {isConnected && (
          <div className="text-center mb-8">
            <Button
              size="lg"
              className={`w-48 h-48 rounded-full text-2xl font-bold transition-all duration-200 ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700 animate-pulse"
                  : "bg-green-600 hover:bg-green-700 hover:scale-105"
              } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-2" />
                  <span className="text-sm">Procesando...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  {isRecording ? (
                    <MicOff className="h-16 w-16 mb-2" />
                  ) : (
                    <Mic className="h-16 w-16 mb-2" />
                  )}
                  {isRecording ? "Detener" : "HABLAR"}
                </div>
              )}
            </Button>
          </div>
        )}

        {/* Messages */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Volume2 className="mr-2" />
              Conversación
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center">
                  La conversación aparecerá aquí...
                </p>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      message.speaker === "cajero"
                        ? "bg-green-100 ml-8"
                        : "bg-blue-100 mr-8"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">
                        {message.speaker === "cajero" ? "Tú" : "Cliente"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-800 mb-1">{message.originalText}</p>
                    <p className="text-sm text-gray-600 italic">
                      → {message.translatedText}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversation History Modal */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Historial Completo - Sesión {sessionId}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {conversationHistory.length === 0 ? (
                <p className="text-gray-500 text-center">
                  No hay historial disponible
                </p>
              ) : (
                conversationHistory.map((message, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded ${
                      message.speaker === "cajero"
                        ? "bg-green-50 border-l-4 border-green-500"
                        : "bg-blue-50 border-l-4 border-blue-500"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">
                        {message.speaker === "cajero" ? "Empleado" : "Cliente"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm mb-1">{message.originalText}</p>
                    <p className="text-xs text-gray-600 italic">
                      → {message.translatedText}
                    </p>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
