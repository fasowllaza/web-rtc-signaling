import { VideoCall } from '@webrtc/client-core';

export default function App() {
  return (
    <VideoCall
      title="Client 1"
      signalingServerUrl={import.meta.env.VITE_SIGNALING_SERVER_URL}
    />
  );
}
