import React, { useEffect, useState } from "react";

export function Sender() {
  const [socket, setSocket] = useState<null | WebSocket>(null);
  const [pc, setPc] = useState<null | RTCPeerConnection>(null);

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
      if (message.type === "CREATE_OFFER") {
        await pc?.setRemoteDescription(message.sdp);
      } else if (message.type === "ICE_CANDIDATE") {
        await pc?.addIceCandidate(message.candidate);
      }
    };

    const pc = new RTCPeerConnection();
    setPc(pc);
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

    pc.onnegotiationneeded = async (ev: Event) => {
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
      .getUserMedia({ video: true })
      .then((stream: MediaStream) => {
        const video = document.createElement("video");
        video.srcObject = stream;
        video.play();
        
        document.body.appendChild(video);
        stream.getTracks().forEach((track) => {
          pc.addTrack(track);
        });
      });
  };

  return (
    <div>
      Sender send video: <button onClick={initConn}>Send Video</button>
    </div>
  );
}
