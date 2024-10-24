import React, { useEffect, useState } from "react";

export function Sender() {
  const [socket, setSocket] = useState<null | WebSocket>(null);

  useEffect(() => {
    const socket = new WebSocket("http://localhost:8001");
    setSocket(socket);
    socket.onopen = () => {
      socket?.send(
        JSON.stringify({
          type: "SENDER",
        })
      );
    };
  }, []);

  const initConn = async () => {
    if (!socket) {
      alert("socket not found");
      return;
    }

    socket.onmessage = async (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      if (message.type === "CREATE_ANSWER") {
        await pc?.setRemoteDescription(message.sdp)
      } else if (message.type === "ICE_CANDIDATE") {
        await pc?.addIceCandidate(message.candidate);
      }
    };

    const pc = new RTCPeerConnection();
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        socket.send(
          JSON.stringify({
            type: "ICE_CANDIDATE",
            candidate: event.candidate,
          })
        );
      }
    };

    pc.onnegotiationneeded = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.send(
        JSON.stringify({
          type: "CREATE_OFFER",
          sdp: pc.localDescription,
        })
      );
    };

    getStreamAndCameraAccess(pc);
  };

  const getStreamAndCameraAccess = (pc: RTCPeerConnection) => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream: MediaStream) => {
        const video = document.createElement("video");
        video.srcObject = stream;
        video.play();
        
         const videoBox = document.getElementById("videoBox");
         videoBox?.appendChild(video);
        stream.getTracks().forEach((track) => {
          pc.addTrack(track);
        });
      });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}
      id="videoBox"
    >
      Sender send video: <button style={{
        margin: "1rem 0"
      }} onClick={initConn}>Send Video</button>
    </div>
  );
}
