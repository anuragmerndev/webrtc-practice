import { useEffect, useState } from "react";

export const Receiver = () => {
  const [clicked, setClicked] = useState(false);
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8001");
    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "RECIEVER",
        })
      );
    };
    if(clicked) {startReceiving(socket);}
  }, [clicked]);

  function startReceiving(socket: WebSocket) {
    const video = document.createElement("video");
    document.body.appendChild(video);

    const pc = new RTCPeerConnection();
    pc.ontrack = (event) => {
      video.srcObject = new MediaStream([event.track]);
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
    <div>
      Reciver: <button onClick={() => setClicked(!clicked)}>recieve video</button>
    </div>
  );
};
