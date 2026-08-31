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
  
  const livekitDomain = process.env.NEXT_PUBLIC_LIVEKIT_URL?.replace("wss://", "").replace("https://", "") || "";
  
  patchUrlMappings([
    { prefix: '/livekit', target: livekitDomain }
  ], {
    patchWebSocket: true,
    patchFetch: true,
    patchXhr: true
  });
}

export default function Page() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<string[]>(["Iniciando..."]);

  function addLog(msg: string) {
    setLogs((prev) => [...prev, msg]);
  }

  useEffect(() => {
    window.onerror = (msg) => addLog(`Browser Error: ${msg}`);
    window.onunhandledrejection = (e) => addLog(`Promise Rej: ${e.reason}`);

    async function setupDiscord() {
      addLog("Lendo SDK do Discord...");
      if (!discordSdk) {
        setError("O Client ID do Discord não foi configurado (.env).");
        return;
      }
      try {
        addLog("Aguardando ready() do Discord...");
        await discordSdk.ready();
        addLog(`Discord ready! Canal: ${discordSdk.channelId}`);
        
        const channelId = discordSdk.channelId || "sala-de-teste";
        const username = "Membro-" + Math.floor(Math.random() * 10000);

        addLog(`Buscando token (/api/token?room=${channelId})...`);
        const res = await fetch(`/api/token?room=${channelId}&username=${username}`);
        const data = await res.json();
        
        if (data.token) {
          addLog("Token recebido com sucesso!");
          addLog(`URL do LiveKit: ${process.env.NEXT_PUBLIC_LIVEKIT_URL}`);
          setToken(data.token);
        } else {
          addLog(`Erro API: ${data.error}`);
          setError(data.error || "Falha ao pegar token");
        }
      } catch (err: any) {
        addLog(`CATCH Error: ${err.message || err}`);
        console.error(err);
        setError("Erro ao conectar com o Discord.");
      }
    }
    setupDiscord();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-red-500 font-bold p-4 text-center flex-col">
        <p>{error}</p>
        <pre className="text-left text-xs mt-4 text-gray-400">{logs.join("\n")}</pre>
      </div>
    );
  }

  if (token === "") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white font-bold flex-col">
        <p>Conectando na sala...</p>
        <pre className="text-left text-xs mt-4 text-gray-400 w-full p-4">{logs.join("\n")}</pre>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative">
      <div className="absolute top-0 left-0 z-50 p-2 bg-black/80 text-green-400 text-xs w-full max-h-40 overflow-y-auto">
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      <LiveKitRoom
        video={false}
        audio={false}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        connect={true}
        data-lk-theme="default"
        style={{ height: "100vh", width: "100vw" }}
        onConnected={() => addLog("LiveKitRoom disparou: onConnected!")}
        onDisconnected={() => addLog("LiveKitRoom disparou: onDisconnected (conexão caiu ou falhou)")}
        onError={(err) => addLog(`LiveKit Error: ${err?.message}`)}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
