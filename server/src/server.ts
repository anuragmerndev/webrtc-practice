import { WebSocket, WebSocketServer } from "ws";

const wss = new WebSocketServer({
    port: 8001,
});

let participantOne: null | WebSocket;
let participantTwo: null | WebSocket;

wss.on("connection", (socket: WebSocket) => {
    socket.on("error", console.error);

    socket.on('message', (data) => {
        const parsedData = JSON.parse(data.toString());
        // console.log(parsedData);
        
        if (parsedData.type === "PARTICIPANT_ONE") {
            participantOne = socket;
        }
        if (parsedData.type === "PARTICIPANT_TWO") {
            participantTwo = socket;
        }

        if (parsedData.type === "CREATE_OFFER") {
            console.log(parsedData, {one: socket === participantOne, two: socket === participantTwo});
            
           if(socket === participantOne) {
               participantTwo?.send(JSON.stringify({ type: "CREATE_OFFER", sdp: parsedData.sdp }))
            }
            
            if (socket === participantTwo) {
                participantOne?.send(JSON.stringify({ type: "CREATE_OFFER", sdp: parsedData.sdp }))
           }

        }

        if (parsedData.type === "CREATE_ANSWER") {
            if(socket === participantOne) {
                participantTwo?.send(JSON.stringify({type: "CREATE_ANSWER", sdp: parsedData.sdp}))
            }
            
            if(socket === participantTwo) {
                participantOne?.send(JSON.stringify({type: "CREATE_ANSWER", sdp: parsedData.sdp}))
            }

        }
        if (parsedData.type === 'ICE_CANDIDATE') {
            if (socket === participantOne) {
                participantTwo?.send(JSON.stringify({ type: 'ICE_CANDIDATE', candidate: parsedData.candidate }));
            } else if (socket === participantTwo) {
                participantOne?.send(JSON.stringify({ type: 'ICE_CANDIDATE', candidate: parsedData.candidate }));
            }
        }

    })
})


console.log('server is up and running');
