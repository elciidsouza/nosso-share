"use client";

import { useEffect, useState } from "react";
import { DiscordSDK, patchUrlMappings } from "@discord/embedded-app-sdk";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
} from "@livekit/components-react";
import "@livekit/components-styles";

const discordClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
let discordSdk: DiscordSDK | null = null;

if (discordClientId) {
  discordSdk = new DiscordSDK(discordClientId);
  
  // Força o Discord a permitir a conexão de WebSocket externa!
  // O target precisa ter o wss:// para o interceptador do Discord reconhecer!
  patchUrlMappings([
    {
      prefix: '/livekit',
      target: process.env.NEXT_PUBLIC_LIVEKIT_URL || ""
    }
  ], {
    patchWebSocket: true
  });
}

export default function Page() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function setupDiscord() {
      if (!discordSdk) {
        setError("O Client ID do Discord não foi configurado (.env).");
        return;
      }
      try {
        await discordSdk.ready();
        
        // Usa o ID do canal de voz como nome da sala (todos no mesmo canal caem na mesma sala)
        const channelId = discordSdk.channelId || "sala-de-teste";

        // Gera um nome aleatório para não precisar configurar tela de login
        const username = "Membro-" + Math.floor(Math.random() * 10000);

        const res = await fetch(`/api/token?room=${channelId}&username=${username}`);
        const data = await res.json();
        
        if (data.token) {
          setToken(data.token);
        } else {
          setError(data.error || "Falha ao pegar token");
        }
      } catch (err) {
        console.error(err);
        setError("Erro ao conectar com o Discord. Você está abrindo isso dentro do Discord?");
      }
    }
    setupDiscord();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-red-500 font-bold p-4 text-center">
        {error}
      </div>
    );
  }

  if (token === "") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white font-bold">
        Conectando na sala...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden">
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
      </LiveKitRoom>
    </div>
  );
}
