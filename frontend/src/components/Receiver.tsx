import { useEffect, useRef, useState } from "react";
import { SocketMessage } from "../types/common";

export const Receiver = () => {
  const [socket, setSocket] = useState<null | WebSocket>(null);
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);
  const [muted, setMuted] = useState(true);

 const [senderVideoMedia, setSenderVideoMedia] = useState<MediaStream | null>(
   null
 );

 const senderVideoRef = useRef<HTMLVideoElement | null>(null);
 const recieverVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const socket = new WebSocket(import.meta.env.VITE_BACKEND_URL);
    const recievePC = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    setPeerConnection(recievePC);
    
    socket.onopen = () => {
      setSocket(socket);
      socket.send(JSON.stringify({ type: "PARTICIPANT_TWO" }));
    };

    socket.onmessage = async (messageEv: MessageEvent) => {
      const message: SocketMessage = JSON.parse(messageEv.data);
      console.log("recieved message :", message);

      if (!recievePC) return;
      switch (message.type) {
        case "CREATE_OFFER": {
          await recievePC.setRemoteDescription(message.sdp);
          const answer = await recievePC.createAnswer();
          await recievePC.setLocalDescription(answer);
          socket.send(JSON.stringify({ type: "CREATE_ANSWER", sdp: answer }));
          break;
        }
        case "CREATE_ANSWER":
          await recievePC.setRemoteDescription(message.sdp);
          break;
        case "ICE_CANDIDATE":
          await recievePC.addIceCandidate(message.candidate);
          break;
        default:
          break;
      }
    };
    
        let inboundStreams: null | MediaStream = null;
        recievePC.ontrack = (ev: RTCTrackEvent) => {
          if (!recieverVideoRef.current) return;
          if (ev.streams && ev.streams[0]) {
            recieverVideoRef.current.srcObject = ev.streams[0];
          } else {
            if (ev.track) {
              if (!inboundStreams) {
                inboundStreams = new MediaStream();
                recieverVideoRef.current.srcObject = inboundStreams;
              }
              inboundStreams.addTrack(ev.track);
            }
          }
        };

    return () => {
      socket.close();
      recievePC.close();
    };
  }, []);

  const initConn = async () => {
    if (!socket || !peerConnection) {
      alert("socket not connected");
      return;
    }

    peerConnection.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        socket.send(
          JSON.stringify({
            type: "ICE_CANDIDATE",
            candidate: event.candidate,
          })
        );
      }
    };

    peerConnection.onnegotiationneeded = async () => {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.send(
        JSON.stringify({
          type: "CREATE_OFFER",
          sdp: peerConnection.localDescription,
        })
      );
    };

    getStreamAndCameraAccess(peerConnection);
  };

  const getStreamAndCameraAccess = (pc: RTCPeerConnection) => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream: MediaStream) => {
        if(!senderVideoRef.current) return;
        senderVideoRef.current.srcObject = stream;
        setSenderVideoMedia(stream);
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      });
  };

  const toggleMute = () => {
    if(!recieverVideoRef.current) return;
    setMuted((prev) => !prev);
    recieverVideoRef.current.muted = !muted;
  }

  return (
    <div style={{ display: "flex", width: "80dvw", height: "100dvh" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          border: "2px solid white",
        }}
        id="videoBoxRecieve"
      >
        Reciver: recieve video
        <button style={{margin: "1rem 0"}} onClick={toggleMute}>{muted ? "UnMute" : "Mute"}</button>
        <video ref={recieverVideoRef} muted={muted} autoPlay></video>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          border: "2px solid blue",
        }}
        id="videoBoxSend"
      >
        Send video:{" "}
        <button
          style={{
            margin: "1rem 0",
          }}
          onClick={initConn}
          disabled={Boolean(senderVideoMedia)}
        >
          Send Video
        </button>
        <video ref={senderVideoRef} muted autoPlay></video>
      </div>
    </div>
  );
};
