const rtcConfig: RTCConfiguration = {
    iceServers: [
        { urls: import.meta.env.VITE_STUN_URL },
        {
            urls: import.meta.env.VITE_TURN_URL,
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_CREDENTIAL,
        },
    ]
}

export { rtcConfig }