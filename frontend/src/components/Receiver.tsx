import { useEffect, useState } from "react";

export const Receiver = () => {
  const [socket, setSocket] = useState<null | WebSocket>(null);
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8001");
    socket.onopen = () => {
      setSocket(socket);
      socket.send(
        JSON.stringify({
          type: "PARTICIPANT_TWO",
        })
      );
    };
     const recievePC = new RTCPeerConnection();
     startReceiving(recievePC);
     socket.onmessage = async (ev) => {
       const message = JSON.parse(ev.data);
       console.log({message});
       
       if (message.type === "CREATE_OFFER") {
         await recievePC.setRemoteDescription(message.sdp);
         const answer = await recievePC.createAnswer();
         await recievePC.setLocalDescription(answer);
         socket.send(
           JSON.stringify({
             type: "CREATE_ANSWER",
             sdp: answer,
           })
         );
       } else if (message.type === "ICE_CANDIDATE") {
         await recievePC.addIceCandidate(message.candidate);
       }
     };
  }, []);

  function startReceiving(recievePC: RTCPeerConnection) {
    try {
      console.log("hello");
      
      const video = document.createElement("video");
      const videoBox = document.getElementById("videoBoxRecieve");
      recievePC.ontrack = (event) => {
        videoBox?.appendChild(video);
        const stream = new MediaStream([event.track]);
        console.log({ stream });

        video.srcObject = stream;
        video.muted = true;
        video.play();
      };
    } catch (err) {
      console.log("error connecting", { err });
    }
  }

  const initConn = async () => {
    if (!socket) {
      alert("socket not connected");
      return;
    }

    socket.onmessage = async (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      if (message.type === "CREATE_ANSWER") {
        await pc?.setRemoteDescription(message.sdp);
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

        const videoBox = document.getElementById("videoBoxSend");
        videoBox?.appendChild(video);
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
          border: "2px solid white",
        }}
        id="videoBoxRecieve"
      >
        Reciver: recieve video
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
        >
          Send Video
        </button>
      </div>
    </div>
  );
};
