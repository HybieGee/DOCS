import type { RealtimeMessage } from '@/lib/types';

export class WorldRoom {
  state: DurableObjectState;
  sessions: Map<WebSocket, { id: string; userId?: string }>;
  worldState: any;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = new Map();
    this.worldState = {
      total_characters: 0,
      total_waters: 0,
      season: 'spring',
      current_phase: 'day',
      last_milestone_reached: 0,
    };

    // Initialize world state from storage
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get('worldState');
      if (stored) {
        this.worldState = stored as any;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle internal broadcast requests
    if (url.pathname === '/broadcast') {
      const message = await request.json();
      this.broadcast(message);
      return new Response('OK');
    }

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.handleSession(server, request);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response('Expected WebSocket', { status: 400 });
  }

  handleSession(webSocket: WebSocket, request: Request) {
    // Accept the WebSocket connection
    webSocket.accept();

    // Create session
    const sessionId = crypto.randomUUID();
    const session = { id: sessionId };
    this.sessions.set(webSocket, session);

    // Send initial world state
    webSocket.send(
      JSON.stringify({
        type: 'world_state',
        payload: this.worldState,
        timestamp: new Date().toISOString(),
      })
    );

    // Handle messages from client
    webSocket.addEventListener('message', async (msg) => {
      try {
        const data = JSON.parse(msg.data as string);
        await this.handleMessage(webSocket, data);
      } catch (error) {
        console.error('Message handling error:', error);
      }
    });

    // Handle disconnect
    webSocket.addEventListener('close', () => {
      this.sessions.delete(webSocket);
    });

    // Handle errors
    webSocket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      this.sessions.delete(webSocket);
    });
  }

  async handleMessage(webSocket: WebSocket, message: any) {
    const session = this.sessions.get(webSocket);
    if (!session) return;

    switch (message.type) {
      case 'auth':
        // Store user ID in session
        session.userId = message.userId;
        break;

      case 'ping':
        webSocket.send(JSON.stringify({ type: 'pong' }));
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  broadcast(message: RealtimeMessage) {
    const messageStr = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
    });

    // Update internal world state if needed
    this.updateWorldState(message);

    // Send to all connected clients
    for (const [webSocket] of this.sessions) {
      try {
        webSocket.send(messageStr);
      } catch (error) {
        console.error('Broadcast error:', error);
        this.sessions.delete(webSocket);
      }
    }
  }

  async updateWorldState(message: RealtimeMessage) {
    let changed = false;

    switch (message.type) {
      case 'character_spawn':
        this.worldState.total_characters++;
        changed = true;
        break;

      case 'water':
        this.worldState.total_waters++;
        changed = true;
        break;

      case 'milestone':
        this.worldState = { ...this.worldState, ...message.payload };
        changed = true;
        break;

      case 'season_change':
        this.worldState.season = message.payload.season;
        this.worldState.current_phase = message.payload.phase;
        changed = true;
        break;
    }

    if (changed) {
      // Check for milestone unlocks
      await this.checkMilestones();
      
      // Persist state
      await this.state.storage.put('worldState', this.worldState);
    }
  }

  async checkMilestones() {
    const milestones = [
      { threshold: 100, type: 'streams' },
      { threshold: 500, type: 'plants' },
      { threshold: 1000, type: 'lights' },
      { threshold: 5000, type: 'village' },
      { threshold: 10000, type: 'city' },
    ];

    for (const milestone of milestones) {
      if (
        this.worldState.total_characters >= milestone.threshold &&
        this.worldState.last_milestone_reached < milestone.threshold
      ) {
        this.worldState.last_milestone_reached = milestone.threshold;
        
        // Broadcast milestone unlock
        this.broadcast({
          type: 'milestone',
          payload: {
            milestone: milestone.type,
            threshold: milestone.threshold,
            total_characters: this.worldState.total_characters,
          },
        } as RealtimeMessage);
      }
    }
  }

  // Scheduled alarm for season/time updates
  async alarm() {
    // Rotate through day/night phases
    const phases = ['dawn', 'day', 'dusk', 'night'] as const;
    const currentIndex = phases.indexOf(this.worldState.current_phase);
    const nextPhase = phases[(currentIndex + 1) % phases.length];

    this.worldState.current_phase = nextPhase;

    // Broadcast phase change
    this.broadcast({
      type: 'season_change',
      payload: {
        season: this.worldState.season,
        phase: nextPhase,
      },
    } as RealtimeMessage);

    // Save state
    await this.state.storage.put('worldState', this.worldState);

    // Schedule next alarm in 15 minutes (for demo, adjust for production)
    await this.state.storage.setAlarm(Date.now() + 15 * 60 * 1000);
  }
}