import { WebSocket, WebSocketServer } from "ws";

const wss = new WebSocketServer({
    port: 8001,
});

let senderSocket: null | WebSocket;
let recieverSocket: null | WebSocket;

wss.on("connection", (socket: WebSocket) => {
    socket.on("error", console.error);

    socket.on('message', (data) => {
        const parsedData = JSON.parse(data.toString());
        console.log({parsedData});
        
        if (parsedData.type === "SENDER") {
            senderSocket = socket;
        }
        if (parsedData.type === "RECIEVER") {
            recieverSocket = socket;
        }

        if (parsedData.type === "CREATE_OFFER") {
            if (senderSocket !== socket) {
                return;
            }

            recieverSocket?.send(JSON.stringify({ type: "CREATE_OFFER", sdp: parsedData.sdp }))
        }

        if (parsedData.type === "CREATE_ANSWER") {
            if (recieverSocket !== socket) {
                return;
            }

            senderSocket?.send(JSON.stringify({type: "CREATE_ANSWER", sdp: parsedData.sdp}))
        }
        if (parsedData.type === 'ICE_CANDIDATE') {
            if (socket === senderSocket) {
                recieverSocket?.send(JSON.stringify({ type: 'ICE_CANDIDATE', candidate: parsedData.candidate }));
            } else if (socket === recieverSocket) {
                senderSocket?.send(JSON.stringify({ type: 'ICE_CANDIDATE', candidate: parsedData.candidate }));
            }
        }

    })
})


console.log('server is up and running');
