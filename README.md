# Stranger Bridge

A responsive, dependency-free chat interface focused on thoughtful conversation.

Open `index.html` in a browser to try the chat experience. It includes responsive layout, accessible controls, quick replies, message character limits, auto-growing composition, timestamps, delivery state, a typing indicator, and simulated replies.

Voice and video calls request microphone and camera access only after the user explicitly starts the call. The local video preview, mute, camera toggle, duration, and clean call teardown are provided client-side; a production remote call requires a signaling service and WebRTC peer connection.

Run `npm test` to execute the message and call-session tests.
