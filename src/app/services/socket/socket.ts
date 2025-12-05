import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket?: ClientSocket;
  private readonly baseUrl = environment.socket;

  // Initialize the socket connection with an optional token.
  // Call this before using send/get methods. If called multiple times,
  // it will recreate the socket with the new token.
  init(token?: string) {
    if (this.socket) {
      try { this.socket.disconnect(); } catch (e) {}
      this.socket = undefined;
    }

    const opts: any = {};
    if (token) opts.auth = { token };

    this.socket = io(this.baseUrl, opts);

    // expose socket for debug/testing
    try { (window as any).__socket = this.socket; console.log('[SocketService] socket exposed to window.__socket'); } catch (e) {}

    this.socket.on('connect', () => console.log('[SocketService] connected', this.socket?.id));
    this.socket.on('connect_error', (err: any) => console.error('[SocketService] connect_error', err));
  }


  // Desconectarse del socket
  disconnect(): void {
    try { this.socket?.disconnect(); } catch (e) {}
    this.socket = undefined;
  }

  // Enviar audio: ArrayBuffer or Blob or typed array
  sendAudioBuffer(arrayBuffer: ArrayBuffer) {
    this.socket?.emit('audio-chunk', arrayBuffer);
  }

  sendAudioBlob(blob: Blob) {
    this.socket?.emit('audio-chunk', blob);
  }

  // Request server to join the listeners room for a target user (admin action)
  startListening(targetUserId: string) {
    this.socket?.emit('start-listening', { targetUserId });
  }

  stopListening(targetUserId: string) {
    this.socket?.emit('stop-listening', { targetUserId });
  }

  // Observables for listening start/stop confirmations
  onListeningStarted(): Observable<any> {
    return new Observable(observer => {
      const handler = (data: any) => observer.next(data);
      this.socket?.on('listening-started', handler);
      return () => { this.socket?.off('listening-started', handler); };
    });
  }

  onListeningStopped(): Observable<any> {
    return new Observable(observer => {
      const handler = (data: any) => observer.next(data);
      this.socket?.on('listening-stopped', handler);
      return () => { this.socket?.off('listening-stopped', handler); };
    });
  }

  // Generic server errors
  onServerError(): Observable<any> {
    return new Observable(observer => {
      const handler = (err: any) => observer.next(err);
      this.socket?.on('error', handler);
      return () => { this.socket?.off('error', handler); };
    });
  }

  // Return whether the socket has been initialized (connected or created)
  isInitialized(): boolean {
    return !!this.socket;
  }

  // Método para recibir audio en trozos (ArrayBuffer) para streaming
  getAudio(): Observable<ArrayBuffer> {
    return new Observable(observer => {
      if (!this.socket) {
        observer.error(new Error('Socket not initialized. Call init(token?) first.'));
        return;
  }

const handler = async (...args: any[]) => {
        // normalize incoming arguments: some servers emit (audioBinary, meta)
        // while others emit a single payload object.
        const payload = args.length === 1 ? args[0] : args;
        // keep original args for debug
        console.debug('[SocketService] audio-chunk-received args', args);

        try {
          // Debug: log the incoming payload to help diagnose formats
          console.debug('[SocketService] incoming payload', payload);

          // Server might send (audioBinary, meta) -> payload is args array
          let audioData: any;
          if (Array.isArray(payload) && payload.length > 0) {
            // first element may be binary or object
            audioData = payload[0] && payload[0].audioData !== undefined ? payload[0].audioData : payload[0];
          } else {
            audioData = payload && payload.audioData !== undefined ? payload.audioData : payload;
          }

          if (!audioData) {
            console.warn('[SocketService] received empty audio payload', payload);
            return;
          }

          // Case: ArrayBuffer
          if (audioData instanceof ArrayBuffer) {
            console.debug('[SocketService] payload is ArrayBuffer, bytes=', audioData.byteLength);
            observer.next(audioData);
            return;
          }

          // Case: TypedArray (Uint8Array, Float32Array, etc.)
          if (audioData && audioData.buffer instanceof ArrayBuffer) {
            console.debug('[SocketService] payload is TypedArray, bytes=', audioData.buffer.byteLength);
            observer.next(audioData.buffer as ArrayBuffer);
            return;
          }

          // Case: Blob (browser-side binary)
          if (audioData instanceof Blob) {
            console.debug('[SocketService] payload is Blob, size=', audioData.size);
            const ab = await audioData.arrayBuffer();
            observer.next(ab);
            return;
          }

          // Case: Node Buffer serialized as { type: 'Buffer', data: [...] }
          if (audioData && audioData.type === 'Buffer' && Array.isArray(audioData.data)) {
            console.debug('[SocketService] payload appears to be serialized Node Buffer, length=', audioData.data.length);
            const u = new Uint8Array(audioData.data);
            observer.next(u.buffer);
            return;
          }

          // socket.io may wrap binary under `data` or provide {data: <binary>}
          if (audioData && audioData.data) {
            const maybe = audioData.data;
            if (maybe instanceof ArrayBuffer) { console.debug('[SocketService] payload.data is ArrayBuffer'); observer.next(maybe); return; }
            if (maybe instanceof Blob) { console.debug('[SocketService] payload.data is Blob'); const ab = await maybe.arrayBuffer(); observer.next(ab); return; }
            if (maybe && maybe.buffer instanceof ArrayBuffer) { console.debug('[SocketService] payload.data is TypedArray'); observer.next(maybe.buffer as ArrayBuffer); return; }
            if (maybe && maybe.type === 'Buffer' && Array.isArray(maybe.data)) { console.debug('[SocketService] payload.data is serialized Node Buffer'); const u = new Uint8Array(maybe.data); observer.next(u.buffer); return; }
          }

          console.warn('[SocketService] unsupported audioData type', audioData);
        } catch (err) {
          console.error('[SocketService] error handling incoming audioData', err);
        }
      };

      this.socket.on('audio-chunk-received', handler);

      return () => { this.socket?.off('audio-chunk-received', handler); };
    });
  }

  // Enviar ubicación desde el usuario (cliente móvil)
sendLocation(location: { lat: number; long: number; timestamp?: string } | any) {
  // Normaliza: algunos clientes envían directamente location, otros lo envuelven
  const payload = (location && location.lat !== undefined) ? { location } : { location };
  this.socket?.emit('location-update', payload);
}


// Observable para recibir actualizaciones de ubicación (admin escuchando)
onLocationUpdate(): Observable<{ fromUserId: number; location: any }> {
  return new Observable(observer => {
    const handler = (data: any) => {
      console.log('[SocketService] location-update received:', data);
      observer.next(data);
    };
    this.socket?.on('location-update', handler);
    return () => { this.socket?.off('location-update', handler); };
  });
}

// Observable para cuando un recorrido inicia (global o en sala listen:{userId})
onRouteRunStarted(): Observable<any> {
  return new Observable(observer => {
    const handler = (data: any) => {
      console.log('[SocketService] route-run-started received:', data);
      observer.next(data);
    };
    this.socket?.on('route-run-started', handler);
    return () => { this.socket?.off('route-run-started', handler); };
  });
}

// Observable para cuando un recorrido finaliza
onRouteRunFinished(): Observable<any> {
  return new Observable(observer => {
    const handler = (data: any) => {
      console.log('[SocketService] route-run-finished received:', data);
      observer.next(data);
    };
    this.socket?.on('route-run-finished', handler);
    return () => { this.socket?.off('route-run-finished', handler); };
  });
}


}