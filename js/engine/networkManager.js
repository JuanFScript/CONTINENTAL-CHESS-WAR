/**
 * CONTINENTAL - Real LAN / PeerJS Multiplayer Manager
 * Handles real WebRTC PeerJS connections between Host and Guest.
 */

const NetworkManager = {
    peer: null,
    conn: null,
    isHost: false,
    roomCode: null,
    onMoveReceived: null,
    onStatusChange: null,
    onMatchStart: null,

    init() {
        // Initializer
    },

    generateCode() {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return 'CW-' + code;
    },

    /**
     * Host creates a room with a real PeerJS ID (e.g. CW-8492)
     */
    hostRoom(onSuccess, onError) {
        this.disconnect();
        const code = this.generateCode();
        this.isHost = true;
        this.roomCode = code;

        try {
            this.peer = new Peer(code, {
                debug: 1
            });

            this.peer.on('open', (id) => {
                console.log('[LAN] Room created with ID:', id);
                if (onSuccess) onSuccess(id);
            });

            this.peer.on('connection', (connection) => {
                console.log('[LAN] Guest connected to room!');
                this.conn = connection;
                this.setupConnectionHandlers();
            });

            this.peer.on('error', (err) => {
                console.error('[LAN] Peer error:', err);
                if (err.type === 'unavailable-id') {
                    this.hostRoom(onSuccess, onError);
                } else if (onError) {
                    onError(err.type || 'Error al crear sala');
                }
            });
        } catch (e) {
            console.error('[LAN] Failed to init Peer:', e);
            if (onError) onError('PeerJS no disponible');
        }
    },

    /**
     * Guest joins a room using the Host's code (e.g. CW-8492)
     */
    joinRoom(code, callback) {
        this.disconnect();
        this.isHost = false;
        const formattedCode = code.trim().toUpperCase();

        try {
            this.peer = new Peer({ debug: 1 });

            this.peer.on('open', (id) => {
                console.log('[LAN] Peer opened with ID:', id, '- Connecting to:', formattedCode);
                this.conn = this.peer.connect(formattedCode);

                this.conn.on('open', () => {
                    console.log('[LAN] Connected to Host:', formattedCode);
                    this.setupConnectionHandlers();
                    if (callback) callback(true);
                });

                this.conn.on('error', (err) => {
                    console.error('[LAN] Connection error:', err);
                    if (callback) callback(false, 'No se pudo conectar');
                });
            });

            this.peer.on('error', (err) => {
                console.error('[LAN] Peer error on join:', err);
                if (callback) callback(false, 'Sala no encontrada');
            });

        } catch (e) {
            console.error('[LAN] Join room error:', e);
            if (callback) callback(false, 'Error al conectar');
        }
    },

    setupConnectionHandlers() {
        if (!this.conn) return;

        this.conn.on('data', (data) => {
            console.log('[LAN] Received data:', data);
            if (!data) return;

            if (data.type === 'MOVE' && this.onMoveReceived) {
                this.onMoveReceived(data.move);
            } else if (data.type === 'START_MATCH' && this.onMatchStart) {
                this.onMatchStart(data.options);
            }
        });

        this.conn.on('close', () => {
            console.log('[LAN] Connection closed.');
            if (this.onStatusChange) this.onStatusChange('disconnected');
        });

        if (this.onStatusChange) this.onStatusChange('connected');
    },

    sendMove(moveData) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'MOVE', move: moveData });
        }
    },

    sendMatchStart(options) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'START_MATCH', options: options });
        }
    },

    disconnect() {
        if (this.conn) {
            try { this.conn.close(); } catch(e){}
            this.conn = null;
        }
        if (this.peer) {
            try { this.peer.destroy(); } catch(e){}
            this.peer = null;
        }
        this.roomCode = null;
    }
};
