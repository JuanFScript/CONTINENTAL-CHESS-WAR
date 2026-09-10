/**
 * CONTINENTAL - LAN / Local Network Multiplayer Manager
 * Enables two devices on the same Wi-Fi network or locally to play chess using PeerJS / WebRTC.
 */

const NetworkManager = {
    peer: null,
    conn: null,
    isHost: false,
    roomCode: null,
    onMoveReceived: null,
    onConnected: null,
    onDisconnected: null,

    /**
     * Generate random 5-character room code
     */
    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },

    /**
     * Host a new LAN match room
     */
    hostRoom(onReady) {
        this.roomCode = 'CW-' + this.generateRoomCode();
        this.isHost = true;

        if (typeof Peer === 'undefined') {
            console.warn('PeerJS library not loaded; falling back to simulated local network session.');
            if (onReady) onReady(this.roomCode);
            return;
        }

        try {
            this.peer = new Peer(this.roomCode);

            this.peer.on('open', (id) => {
                console.log('Host room open with ID:', id);
                if (onReady) onReady(this.roomCode);
            });

            this.peer.on('connection', (connection) => {
                this.conn = connection;
                this.setupConnectionHandlers();
                if (this.onConnected) this.onConnected();
            });

            this.peer.on('error', (err) => {
                console.error('PeerJS Host error:', err);
            });
        } catch (e) {
            console.error('Failed to init PeerJS host:', e);
            if (onReady) onReady(this.roomCode);
        }
    },

    /**
     * Join an existing LAN room code
     */
    joinRoom(code, onJoined) {
        this.roomCode = code.toUpperCase();
        this.isHost = false;

        if (typeof Peer === 'undefined') {
            if (onJoined) onJoined(true);
            return;
        }

        try {
            this.peer = new Peer();

            this.peer.on('open', () => {
                this.conn = this.peer.connect(this.roomCode);
                this.setupConnectionHandlers();
                if (onJoined) onJoined(true);
            });

            this.peer.on('error', (err) => {
                console.error('PeerJS Join error:', err);
                if (onJoined) onJoined(false, err.message);
            });
        } catch (e) {
            console.error('Failed to join PeerJS room:', e);
            if (onJoined) onJoined(false, e.message);
        }
    },

    setupConnectionHandlers() {
        if (!this.conn) return;

        this.conn.on('data', (data) => {
            console.log('LAN Data received:', data);
            if (data.type === 'MOVE' && this.onMoveReceived) {
                this.onMoveReceived(data.move);
            }
        });

        this.conn.on('close', () => {
            if (this.onDisconnected) this.onDisconnected();
        });
    },

    /**
     * Send move data over LAN
     */
    sendMove(move) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'MOVE', move });
        }
    },

    /**
     * Disconnect peer
     */
    disconnect() {
        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
        this.conn = null;
        this.peer = null;
    }
};
