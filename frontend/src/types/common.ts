interface SocketMessage {
    type: "CREATE_OFFER" | "CREATE_ANSWER" | "ICE_CANDIDATE";
    sdp: RTCSessionDescriptionInit;
    candidate: RTCIceCandidateInit | null;
}

export type { SocketMessage };