export function normalizeMessage(value) {
  return value.trim();
}

export function canSendMessage(value, limit = 500) {
  return normalizeMessage(value).length > 0 && value.length <= limit;
}

export function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export class CallSession {
  constructor(mediaDevices) {
    this.mediaDevices = mediaDevices;
    this.stream = null;
    this.type = null;
  }

  async start(type) {
    const video = type === "video";
    this.stream = await this.mediaDevices.getUserMedia({ audio: true, video });
    this.type = type;
    return this.stream;
  }

  toggleAudio() {
    return this.#toggleTracks("audio");
  }

  toggleVideo() {
    return this.#toggleTracks("video");
  }

  end() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.type = null;
  }

  #toggleTracks(kind) {
    const tracks = this.stream?.getTracks().filter((track) => track.kind === kind) ?? [];
    const enabled = !tracks.every((track) => track.enabled);
    tracks.forEach((track) => {
      track.enabled = enabled;
    });
    return !enabled;
  }
}
