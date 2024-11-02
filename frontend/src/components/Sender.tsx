import { useEffect, useRef, useState } from "react";
import { SocketMessage } from "../types/common";
import { rtcConfig } from "../utils/helper";

export function Sender() {
  const [socket, setSocket] = useState<null | WebSocket>(null);
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);
  const [senderVideoMedia, setSenderVideoMedia] = useState<MediaStream | null>(
    null
  );
  const [muted, setMuted] = useState(true);
  const [availableVideoDevices, setAvailableVideoDevices] = useState<
    MediaDeviceInfo[] | null
  >(null);

  const senderVideoRef = useRef<HTMLVideoElement | null>(null);
  const recieverVideoRef = useRef<HTMLVideoElement | null>(null);

  async function getDevices() {
    const checkCameraPermission = await navigator.permissions.query({
      // @ts-expect-error name is not visible here
      name: "camera",
    });
    if (checkCameraPermission.state !== "granted") return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices?.filter(
      (inpDev) => inpDev.kind === "videoinput"
    );
    setAvailableVideoDevices(videoDevices);
  }

  useEffect(() => {
    const socket = new WebSocket(import.meta.env.VITE_BACKEND_URL);
    setSocket(socket);
    const recievePC = new RTCPeerConnection(rtcConfig);
    setPeerConnection(recievePC);

    getDevices();

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
      recieverVideoRef.current.style.transform = "scale(-1, 1)";
    };

    return () => {
      socket.close();
      recievePC.close();
    };
  }, []);

  useEffect(() => {
    if (!senderVideoRef.current) return;
    senderVideoRef.current.srcObject = senderVideoMedia;
  }, [senderVideoMedia]);

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
        getDevices();
        if (!senderVideoRef.current) return;
        senderVideoRef.current.style.transform = "scale(-1, 1)";
        setSenderVideoMedia(stream);
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      });
  };

  const toggleMute = () => {
    if (!recieverVideoRef.current) return;
    setMuted((prev) => !prev);
    recieverVideoRef.current.muted = !muted;
  };

  const changeCamera = async (deviceID: string) => {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          deviceId: {
            exact: deviceID,
          },
        },
        audio: true,
      })
      .then((stream) => {
        setSenderVideoMedia(stream);
        const [videoTrack] = stream.getVideoTracks();
        const sender = peerConnection
          ?.getSenders()
          .find((s) => s.track!.kind === videoTrack.kind);
        sender?.replaceTrack(videoTrack);
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            width: "50dvw",
          }}
        >
          <button
            style={{
              margin: "1rem 0",
            }}
            onClick={initConn}
            disabled={Boolean(senderVideoMedia)}
          >
            Send Video
          </button>

          {availableVideoDevices && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label htmlFor="camera">Choose a camera:</label>
              <select
                name="camera"
                id="camera"
                onChange={(e) => changeCamera(e.target.value)}
              >
                {availableVideoDevices?.map((videoDevice) => (
                  <option
                    key={videoDevice.deviceId}
                    value={videoDevice.deviceId}
                  >
                    {videoDevice.label}
                  </option>
                ))}
              </select>{" "}
            </div>
          )}
        </div>
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
        <button style={{ margin: "1rem 0" }} onClick={toggleMute}>
          {muted ? "UnMute" : "Mute"}
        </button>
        <video ref={recieverVideoRef} muted autoPlay></video>
      </div>
    </div>
  );
}
