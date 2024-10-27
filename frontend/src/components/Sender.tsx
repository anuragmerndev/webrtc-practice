import { useEffect, useRef, useState } from "react";
import { SocketMessage } from "../types/common";

export function Sender() {
  const [socket, setSocket] = useState<null | WebSocket>(null);
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);
  const [senderVideoMedia, setSenderVideoMedia] = useState<MediaStream | null>(
    null
  );

  const senderVideoRef = useRef<HTMLVideoElement | null>(null);
  const recieverVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const socket = new WebSocket(import.meta.env.VITE_BACKEND_URL);
    setSocket(socket);
    const recievePC = new RTCPeerConnection();
    setPeerConnection(recievePC);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "PARTICIPANT_ONE" }));
    };

    socket.onmessage = async (mesEv: MessageEvent) => {
      const message: SocketMessage = JSON.parse(mesEv.data);
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

    recievePC.ontrack = (ev: RTCTrackEvent) => {
      const stream = new MediaStream([ev.track]);
      if (!recieverVideoRef.current) return;
      recieverVideoRef.current.srcObject = stream;
    };

    return () => {
      socket.close();
      recievePC.close();
    };
  }, []);

  const initConn = async () => {
    if (!socket || !peerConnection) {
      alert("socket or peer connection not found");
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
        if (!senderVideoRef.current) return;
        senderVideoRef.current.srcObject = stream;
        setSenderVideoMedia(stream);
        stream.getTracks().forEach((track) => {
          pc.addTrack(track);
        });
      });
  };

  return (
    <div style={{ display: "flex", width: "80dvw", height: "100dvh" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          border: "2px solid red",
        }}
        id="videoBox"
      >
        Sender send video:{" "}
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          border: "2px solid green",
        }}
        id="videoBoxRecieve"
      >
        Participant Two
        <video ref={recieverVideoRef} muted autoPlay></video>
      </div>
    </div>
  );
}
