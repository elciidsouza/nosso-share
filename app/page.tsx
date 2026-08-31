"use client";

import { useEffect, useState } from "react";
import { DiscordSDK, patchUrlMappings } from "@discord/embedded-app-sdk";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useLocalParticipant,
  ControlBar
} from "@livekit/components-react";
import "@livekit/components-styles";

const discordClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
let discordSdk: DiscordSDK | null = null;

if (discordClientId) {
  discordSdk = new DiscordSDK(discordClientId);
  const livekitDomain = process.env.NEXT_PUBLIC_LIVEKIT_URL?.replace("wss://", "").replace("https://", "") || "";
  patchUrlMappings([
    { prefix: '/livekit', target: livekitDomain }
  ], {
    patchWebSocket: true,
    patchFetch: true,
    patchXhr: true
  });
}

// Botão que aparece no Discord para o streamer abrir no Chrome
function HostControls({ roomId }: { roomId: string }) {
  function openBrowser() {
    const url = `https://nosso-share.vercel.app/?room=${roomId}`;
    if (discordSdk) {
      // Força o Discord a abrir o navegador padrão do PC!
      discordSdk.commands.openExternalLink({ url });
    } else {
      window.open(url, "_blank");
    }
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-4">
      <button 
        onClick={openBrowser}
        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all border-2 border-purple-400"
      >
        📡 Compartilhar Tela (Abre no Navegador)
      </button>
    </div>
  );
}

export default function Page() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isBrowserMode, setIsBrowserMode] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState("");

  useEffect(() => {
    // Verifica se tem '?room=' na URL (modo navegador)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room");

    if (roomParam) {
      setIsBrowserMode(true);
      setActiveRoomId(roomParam);
      joinRoom(roomParam, "Streamer-" + Math.floor(Math.random() * 1000));
      return;
    }

    // Modo Discord (iframe)
    async function setupDiscord() {
      if (!discordSdk) return setError("Client ID não configurado.");
      
      try {
        await discordSdk.ready();
        const channelId = discordSdk.channelId || "sala-de-teste";
        setActiveRoomId(channelId);
        joinRoom(channelId, "Espectador-" + Math.floor(Math.random() * 1000));
      } catch (err: any) {
        setError("Abra isso pelo Discord, ou use o link de Streamer no navegador!");
      }
    }
    setupDiscord();
  }, []);

  async function joinRoom(room: string, username: string) {
    try {
      const res = await fetch(`/api/token?room=${room}&username=${username}`);
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
      } else {
        setError(data.error || "Falha ao pegar token");
      }
    } catch (err: any) {
      setError("Falha de rede ao buscar token");
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-red-500 font-bold p-4 text-center">
        <p>{error}</p>
      </div>
    );
  }

  if (token === "") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white font-bold">
        <p>Conectando na sala de vídeo...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative">
      <LiveKitRoom
        video={false}
        audio={false}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        connect={true}
        data-lk-theme="default"
        style={{ height: "100vh", width: "100vw" }}
      >
        <VideoConference />
        <RoomAudioRenderer />
        
        {/* Se estiver no Discord, mostra o botão para copiar o link. 
            Se estiver no Chrome, mostra a barra de controles padrão do LiveKit para ligar a tela! */}
        {!isBrowserMode ? (
          <HostControls roomId={activeRoomId} />
        ) : (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
            <ControlBar controls={{ microphone: true, camera: true, screenShare: true }} />
          </div>
        )}
      </LiveKitRoom>
    </div>
  );
}
