/**
 * CONTINENTAL - Real LAN / WebRTC PeerJS Multiplayer Manager
 * Handles real P2P connections, Room Discovery, Join Requests (Accept/Reject),
 * Heartbeat (every 15s), Draft Synchronization, and Board Integrity Check.
 */

const NetworkManager = {
    peer: null,
    conn: null,
    isHost: false,
    roomCode: null,
    playerName: '',
    heartbeatInterval: null,
    lastReceivedHeartbeat: 0,
    discoveryWs: null,
    discoveredRooms: new Map(),
    onRoomsDiscovered: null,
    pendingJoinRequests: [],

    // Game Event Handlers
    onMoveReceived: null,
    onDraftPickReceived: null,
    onDraftVerifyReceived: null,
    onStatusChange: null,
    onMatchStart: null,
    onConnectionLost: null,
    onJoinRequest: null, // Host receives join requests to accept/reject

    init() {
        this.playerName = localStorage.getItem('continental_player_name') || this.generateRandomPlayerName();
    },

    generateRandomPlayerName() {
        const titles = ['Comandante', 'General', 'Estratega', 'Rey', 'Caballero', 'Arquero', 'Mago', 'Capitán', 'Guardián', 'Lobo'];
        const randomNum = Math.floor(100 + Math.random() * 900);
        const randomTitle = titles[Math.floor(Math.random() * titles.length)];
        const name = `${randomTitle}_${randomNum}`;
        this.playerName = name;
        localStorage.setItem('continental_player_name', name);
        return name;
    },

    setPlayerName(name) {
        if (!name || !name.trim()) return;
        this.playerName = name.trim();
        localStorage.setItem('continental_player_name', this.playerName);
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
     * Start LAN Discovery to see open rooms in network
     */
    startDiscovery(onRoomsUpdated) {
        this.onRoomsDiscovered = onRoomsUpdated;
        this.discoveredRooms.clear();

        // Local BroadcastChannel for local/multi-tab/LAN discovery
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                if (!this.broadcastChannel) {
                    this.broadcastChannel = new BroadcastChannel('continental_lan_lobby');
                    this.broadcastChannel.onmessage = (e) => {
                        this.handleRoomAnnouncement(e.data);
                    };
                }
            } catch (err) {
                console.warn('[Discovery] BroadcastChannel not supported:', err);
            }
        }

        // Discovery cleanup interval (remove rooms older than 12s)
        if (this.discoveryCleanupInterval) clearInterval(this.discoveryCleanupInterval);
        this.discoveryCleanupInterval = setInterval(() => {
            const now = Date.now();
            let changed = false;
            for (const [code, room] of this.discoveredRooms.entries()) {
                if (now - room.timestamp > 12000) {
                    this.discoveredRooms.delete(code);
                    changed = true;
                }
            }
            if (changed && this.onRoomsDiscovered) {
                this.onRoomsDiscovered(Array.from(this.discoveredRooms.values()));
            }
        }, 3000);
    },

    stopDiscovery() {
        if (this.discoveryCleanupInterval) {
            clearInterval(this.discoveryCleanupInterval);
            this.discoveryCleanupInterval = null;
        }
    },

    broadcastRoomAnnouncement(roomInfo) {
        const payload = {
            code: this.roomCode,
            hostName: this.playerName,
            gameType: roomInfo.gameType || 'continental',
            submode: roomInfo.submode || 'continental_normal',
            time: roomInfo.timeMinutes || 10,
            timestamp: Date.now()
        };

        if (this.broadcastChannel) {
            try { this.broadcastChannel.postMessage(payload); } catch(e){}
        }
    },

    handleRoomAnnouncement(data) {
        if (!data || !data.code || data.code === this.roomCode) return;
        this.discoveredRooms.set(data.code, data);
        if (this.onRoomsDiscovered) {
            this.onRoomsDiscovered(Array.from(this.discoveredRooms.values()));
        }
    },

    /**
     * Host creates a room with real PeerJS ID (e.g. CW-8492)
     */
    hostRoom(roomOptions, onSuccess, onError) {
        this.disconnect();
        const code = this.generateCode();
        this.isHost = true;
        this.roomCode = code;
        this.pendingJoinRequests = [];

        try {
            this.peer = new Peer(code, { debug: 1 });

            this.peer.on('open', (id) => {
                console.log('[LAN] Host room created with ID:', id);
                if (onSuccess) onSuccess(id);

                // Start broadcasting room presence every 3s
                if (this.hostBroadcastInterval) clearInterval(this.hostBroadcastInterval);
                this.hostBroadcastInterval = setInterval(() => {
                    this.broadcastRoomAnnouncement(roomOptions);
                }, 3000);
                this.broadcastRoomAnnouncement(roomOptions);
            });

            this.peer.on('connection', (connection) => {
                console.log('[LAN] Incoming connection request from guest...');
                
                connection.on('data', (data) => {
                    if (data && data.type === 'JOIN_REQUEST') {
                        console.log('[LAN] Join request from:', data.guestName);
                        const request = {
                            guestName: data.guestName || 'Jugador Invitado',
                            connection: connection,
                            accept: () => {
                                this.conn = connection;
                                connection.send({ type: 'JOIN_RESPONSE', accepted: true, hostName: this.playerName });
                                this.setupConnectionHandlers();
                                if (this.hostBroadcastInterval) clearInterval(this.hostBroadcastInterval);
                                if (this.onStatusChange) this.onStatusChange('connected', data.guestName);
                            },
                            reject: (reason = 'El anfitrión rechazó la solicitud.') => {
                                connection.send({ type: 'JOIN_RESPONSE', accepted: false, reason: reason });
                                setTimeout(() => {
                                    try { connection.close(); } catch(e){}
                                }, 500);
                            }
                        };

                        if (this.onJoinRequest) {
                            this.onJoinRequest(request);
                        } else {
                            // Default auto-accept if no approval modal is attached
                            request.accept();
                        }
                    } else {
                        // Forward normal game data if already connected
                        this.handleIncomingData(data);
                    }
                });
            });

            this.peer.on('error', (err) => {
                console.error('[LAN] Peer error:', err);
                if (err.type === 'unavailable-id') {
                    this.hostRoom(roomOptions, onSuccess, onError);
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
     * Guest joins a room using Host's code (e.g. CW-8492)
     */
    joinRoom(code, callback) {
        this.disconnect();
        this.isHost = false;
        const formattedCode = code.trim().toUpperCase();
        this.roomCode = formattedCode;

        try {
            this.peer = new Peer({ debug: 1 });

            this.peer.on('open', (id) => {
                console.log('[LAN] Peer opened ID:', id, '-> Connecting to host:', formattedCode);
                this.conn = this.peer.connect(formattedCode, { reliable: true });

                const connectionTimeout = setTimeout(() => {
                    if (this.conn && !this.conn.open) {
                        if (callback) callback(false, 'Tiempo de espera agotado al conectar.');
                    }
                }, 10000);

                this.conn.on('open', () => {
                    clearTimeout(connectionTimeout);
                    console.log('[LAN] Connected to Host. Sending JOIN_REQUEST...');
                    this.conn.send({
                        type: 'JOIN_REQUEST',
                        guestName: this.playerName
                    });
                });

                this.conn.on('data', (data) => {
                    if (data && data.type === 'JOIN_RESPONSE') {
                        if (data.accepted) {
                            console.log('[LAN] Join request ACCEPTED by host:', data.hostName);
                            this.setupConnectionHandlers();
                            if (callback) callback(true, null, data.hostName);
                        } else {
                            console.log('[LAN] Join request REJECTED:', data.reason);
                            if (callback) callback(false, data.reason || 'Solicitud rechazada');
                            this.disconnect();
                        }
                    } else {
                        this.handleIncomingData(data);
                    }
                });

                this.conn.on('error', (err) => {
                    clearTimeout(connectionTimeout);
                    console.error('[LAN] Connection error:', err);
                    if (callback) callback(false, 'No se pudo conectar a la sala');
                });
            });

            this.peer.on('error', (err) => {
                console.error('[LAN] Peer error on join:', err);
                if (callback) callback(false, 'Sala no encontrada o fuera de línea');
            });

        } catch (e) {
            console.error('[LAN] Join room error:', e);
            if (callback) callback(false, 'Error al conectar');
        }
    },

    setupConnectionHandlers() {
        if (!this.conn) return;

        this.lastReceivedHeartbeat = Date.now();
        this.startHeartbeat();

        this.conn.on('close', () => {
            console.log('[LAN] Connection closed.');
            this.stopHeartbeat();
            if (this.onStatusChange) this.onStatusChange('disconnected');
            if (this.onConnectionLost) this.onConnectionLost();
        });

        if (this.onStatusChange) this.onStatusChange('connected');
    },

    handleIncomingData(data) {
        if (!data) return;
        this.lastReceivedHeartbeat = Date.now();

        switch (data.type) {
            case 'PING':
                if (this.conn && this.conn.open) {
                    this.conn.send({ type: 'PONG', timestamp: data.timestamp });
                }
                break;

            case 'PONG':
                // Heartbeat acknowledged
                break;

            case 'MOVE':
                if (this.onMoveReceived) this.onMoveReceived(data.move);
                break;

            case 'DRAFT_PICK':
                if (this.onDraftPickReceived) this.onDraftPickReceived(data);
                break;

            case 'DRAFT_VERIFY':
                if (this.onDraftVerifyReceived) this.onDraftVerifyReceived(data);
                break;

            case 'START_MATCH':
                if (this.onMatchStart) this.onMatchStart(data.options);
                break;

            case 'SURRENDER':
                if (this.onSurrenderReceived) this.onSurrenderReceived();
                break;
        }
    },

    /**
     * Heartbeat check every 15 seconds
     */
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.conn && this.conn.open) {
                const now = Date.now();
                // If no data or pong received in 35s, signal disconnect
                if (now - this.lastReceivedHeartbeat > 35000) {
                    console.warn('[LAN] Heartbeat timed out (>35s). Connection lost.');
                    this.stopHeartbeat();
                    if (this.onConnectionLost) this.onConnectionLost();
                    return;
                }
                this.conn.send({ type: 'PING', timestamp: now });
            }
        }, 15000);
    },

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    },

    sendMove(moveData) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'MOVE', move: moveData });
        }
    },

    sendDraftPick(stepIndex, chosenType) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'DRAFT_PICK', stepIndex, chosenType });
        }
    },

    sendDraftVerify(signature) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'DRAFT_VERIFY', signature });
        }
    },

    sendMatchStart(options) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'START_MATCH', options: options });
        }
    },

    disconnect() {
        this.stopHeartbeat();
        if (this.hostBroadcastInterval) {
            clearInterval(this.hostBroadcastInterval);
            this.hostBroadcastInterval = null;
        }
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

NetworkManager.init();

