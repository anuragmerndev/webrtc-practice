import { useEffect } from "react";

export const Receiver = () => {
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8001");
    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "RECIEVER",
        })
      );
    };
   startReceiving(socket);
  }, []);

  function startReceiving(socket: WebSocket) {
    const video = document.createElement("video");
    const videoBox = document.getElementById("videoBox");
    videoBox?.appendChild(video);
    const pc = new RTCPeerConnection();
    pc.ontrack = (event) => {
     const stream = new MediaStream([event.track]);
      video.srcObject = stream;
      video.muted = true;
      video.play();
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "CREATE_OFFER") {
        pc.setRemoteDescription(message.sdp).then(() => {
          pc.createAnswer().then((answer) => {
            pc.setLocalDescription(answer);
            socket.send(
              JSON.stringify({
                type: "CREATE_ANSWER",
                sdp: answer,
              })
            );
          });
        });
      } else if (message.type === "ICE_CANDIDATE") {
        pc.addIceCandidate(message.candidate);
      }
    };
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column"
    }} id="videoBox">
      Reciver: recieve video
    </div>
  );
};
