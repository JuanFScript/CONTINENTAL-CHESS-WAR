/**
 * CONTINENTAL - Real LAN / WebRTC PeerJS Multiplayer Manager
 * Handles real P2P connections, Multi-Device Room Discovery (PC ↔ Mobile),
 * Join Requests (Accept/Reject), Heartbeat (every 15s), Turn/Move Sync,
 * Clock Sync, Rematch Sync, and Board Integrity Check.
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
    onPassTurnReceived: null,
    onDraftPickReceived: null,
    onDraftVerifyReceived: null,
    onPopupPauseReceived: null,
    onClockSyncReceived: null,
    onGameOverCheckReceived: null,
    onRematchRequestReceived: null,
    onRematchConfirmReceived: null,
    onRematchCancelReceived: null,
    onSurrenderReceived: null,
    onStatusChange: null,
    onMatchStart: null,
    onRoomSettingsReceived: null,
    onConnectionLost: null,
    onHostLeft: null,
    onJoinRequest: null,
    onGiganteThrowReceived: null,
    onCanonBeamReceived: null,
    onMagoAttackReceived: null,
    onWolfSurgeReceived: null,
    onReinforcementWaitingReceived: null,
    onReinforcementPlaceReceived: null,
    onReinforcementDoneReceived: null,
    onDrawRequestReceived: null,
    onDrawResponseReceived: null,
    onDrawBidReceived: null,

    init() {
        this.playerName = localStorage.getItem('continental_player_name') || this.generateRandomPlayerName();
    },

    generateRandomPlayerName() {
        let titles = ['Comandante', 'General', 'Estratega', 'Rey', 'Caballero', 'Arquero', 'Mago', 'Capitán', 'Guardián', 'Lobo'];
        
        try {
            if (typeof PieceRegistry !== 'undefined' && PieceRegistry.registry) {
                const continentalPieces = Array.from(PieceRegistry.registry.values())
                    .filter(p => p.category === 'continental');
                if (continentalPieces.length > 0) {
                    const lang = (typeof I18n !== 'undefined' && I18n.currentLang) ? I18n.currentLang : 'es';
                    titles = continentalPieces.map(p => {
                        let nameObj = p.name || {};
                        let name = nameObj[lang] || nameObj.es || 'Pieza';
                        // Remove "(Continental)" from names like "Peón (Continental)"
                        return name.replace(/\s*\(Continental\)\s*/gi, '').trim();
                    });
                }
            }
        } catch(e) {
            console.error('Error fetching piece names:', e);
        }

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

    // =========================================================================
    // MULTI-DEVICE DISCOVERY (HiveMQ MQTT WebSockets + Local BroadcastChannel)
    // =========================================================================

    mqttClient: null,
    mqttTopic: 'continental_chess_war/lobby/v86',
    isDiscovering: false,

    initMqttDiscovery() {
        if (typeof Paho === 'undefined' || !Paho.MQTT) {
            console.warn('[Discovery] Paho MQTT library not available');
            return;
        }
        if (this.mqttClient && this.mqttClient.isConnected && this.mqttClient.isConnected()) return;

        try {
            const clientId = 'cw_' + Math.random().toString(16).substring(2, 10);
            this.mqttClient = new Paho.MQTT.Client('broker.hivemq.com', 8884, '/mqtt', clientId);

            this.mqttClient.onConnectionLost = (responseObject) => {
                if (responseObject.errorCode !== 0) {
                    console.log('[Discovery] MQTT connection lost:', responseObject.errorMessage);
                    setTimeout(() => {
                        if (this.isDiscovering || (this.isHost && this.roomCode)) {
                            this.initMqttDiscovery();
                        }
                    }, 3000);
                }
            };

            this.mqttClient.onMessageArrived = (message) => {
                try {
                    const data = JSON.parse(message.payloadString);
                    this.handleRoomAnnouncement(data);
                } catch (e) {
                    // Ignore parse errors
                }
            };

            this.mqttClient.connect({
                useSSL: true,
                timeout: 5,
                keepAliveInterval: 30,
                cleanSession: true,
                onSuccess: () => {
                    console.log('[Discovery] Connected to HiveMQ MQTT Broker');
                    try {
                        this.mqttClient.subscribe(this.mqttTopic, { qos: 0 });
                    } catch(e){}
                },
                onFailure: (err) => {
                    console.warn('[Discovery] MQTT connect failed:', err);
                }
            });
        } catch (e) {
            console.warn('[Discovery] MQTT init error:', e);
        }
    },

    startDiscovery(onRoomsUpdated) {
        this.onRoomsDiscovered = onRoomsUpdated;
        this.isDiscovering = true;
        this.discoveredRooms.clear();

        // 1. Multi-device discovery via MQTT WebSockets
        this.initMqttDiscovery();

        // 2. Local BroadcastChannel for same-device/browser tabs
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

        // 3. Discovery cleanup interval: expire rooms after 10s of local silence (immune to device clock differences)
        if (this.discoveryCleanupInterval) clearInterval(this.discoveryCleanupInterval);
        this.discoveryCleanupInterval = setInterval(() => {
            const now = Date.now();
            let changed = false;
            for (const [code, room] of this.discoveredRooms.entries()) {
                if (now - (room.localReceivedAt || now) > 10000) {
                    this.discoveredRooms.delete(code);
                    changed = true;
                }
            }
            if (changed && this.onRoomsDiscovered) {
                this.onRoomsDiscovered(Array.from(this.discoveredRooms.values()));
            }
        }, 2000);
    },

    stopDiscovery() {
        this.isDiscovering = false;
        if (this.discoveryCleanupInterval) {
            clearInterval(this.discoveryCleanupInterval);
            this.discoveryCleanupInterval = null;
        }
    },

    broadcastRoomAnnouncement(roomInfo) {
        if (!this.roomCode) return;

        const payload = {
            code: this.roomCode,
            hostName: this.playerName,
            gameType: roomInfo?.gameType || 'continental',
            submode: roomInfo?.submode || 'continental_normal',
            timeType: roomInfo?.timeType || (roomInfo?.timeMinutes ? String(roomInfo.timeMinutes) : '10'),
            time: roomInfo?.timeMinutes !== undefined ? roomInfo.timeMinutes : 10,
            timeMinutes: roomInfo?.timeMinutes !== undefined ? roomInfo.timeMinutes : 10,
            timeSeconds: roomInfo?.timeSeconds !== undefined ? roomInfo.timeSeconds : ((roomInfo?.timeMinutes || 10) * 60),
            centerTurns: roomInfo?.centerTurns || 3,
            centerConsecutive: roomInfo?.centerConsecutive !== undefined ? roomInfo.centerConsecutive : true,
            isFriendly: roomInfo?.isFriendly || roomInfo?.sandboxMode || false,
            sandboxMode: roomInfo?.isFriendly || roomInfo?.sandboxMode || false,
            timestamp: Date.now()
        };

        // Broadcast over Local BroadcastChannel
        if (this.broadcastChannel) {
            try { this.broadcastChannel.postMessage(payload); } catch(e){}
        }

        // Broadcast over HiveMQ MQTT WebSockets
        if (this.mqttClient && this.mqttClient.isConnected && this.mqttClient.isConnected()) {
            try {
                const message = new Paho.MQTT.Message(JSON.stringify(payload));
                message.destinationName = this.mqttTopic;
                message.qos = 0;
                this.mqttClient.send(message);
            } catch (e) {}
        } else {
            this.initMqttDiscovery();
        }
    },

    handleRoomAnnouncement(data) {
        if (!data || !data.code || data.code === this.roomCode) return;

        // If the room was closed by the host, immediately purge it from the list
        if (data.closed) {
            if (this.discoveredRooms.delete(data.code)) {
                if (this.onRoomsDiscovered) {
                    this.onRoomsDiscovered(Array.from(this.discoveredRooms.values()));
                }
            }
            return;
        }

        // Track local receipt timestamp (immune to device clock differences)
        data.localReceivedAt = Date.now();
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

        this.currentRoomOptions = roomOptions;

        try {
            this.peer = new Peer(code, { debug: 1 });

            this.peer.on('open', (id) => {
                console.log('[LAN] Host room created with ID:', id);
                if (onSuccess) onSuccess(id);

                this.initMqttDiscovery();

                // Start broadcasting room presence every 3s
                if (this.hostBroadcastInterval) clearInterval(this.hostBroadcastInterval);
                this.hostBroadcastInterval = setInterval(() => {
                    this.broadcastRoomAnnouncement(this.currentRoomOptions || roomOptions);
                }, 3000);
                this.broadcastRoomAnnouncement(this.currentRoomOptions || roomOptions);
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
                                setTimeout(() => connection.close(), 500);
                            }
                        };

                        if (this.onJoinRequest) {
                            this.onJoinRequest(request);
                        } else {
                            request.accept();
                        }
                    } else {
                        this.handleIncomingData(data);
                    }
                });

                connection.on('error', (err) => {
                    console.error('[LAN] Host incoming connection error:', err);
                });
            });

            this.peer.on('error', (err) => {
                console.error('[LAN] Host Peer error:', err);
                if (onError) onError(err.type || 'Error al iniciar sala');
            });
        } catch (e) {
            console.error('[LAN] Host room exception:', e);
            if (onError) onError('PeerJS no disponible');
        }
    },

    updateRoomOptions(newOptions) {
        this.currentRoomOptions = { ...this.currentRoomOptions, ...newOptions };
        if (this.isHost && this.roomCode) {
            this.broadcastRoomAnnouncement(this.currentRoomOptions);
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

        if (data.type !== 'PING' && data.type !== 'PONG' && typeof DebugLogger !== 'undefined') {
            DebugLogger.log('RED', `Recibido [${data.type}]`);
        }

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

            case 'PASS_TURN':
                if (this.onPassTurnReceived) this.onPassTurnReceived(data);
                break;

            case 'DRAFT_PICK':
                if (this.onDraftPickReceived) this.onDraftPickReceived(data);
                break;

            case 'DRAFT_VERIFY':
                if (this.onDraftVerifyReceived) this.onDraftVerifyReceived(data);
                break;

            case 'POPUP_PAUSE':
                if (this.onPopupPauseReceived) this.onPopupPauseReceived(data);
                break;

            case 'CLOCK_SYNC':
                if (this.onClockSyncReceived) this.onClockSyncReceived(data);
                break;

            case 'GAME_OVER_CHECK':
                if (this.onGameOverCheckReceived) this.onGameOverCheckReceived(data);
                break;

            case 'REMATCH_REQUEST':
                if (this.onRematchRequestReceived) this.onRematchRequestReceived(data);
                break;

            case 'REMATCH_CONFIRM':
                if (this.onRematchConfirmReceived) this.onRematchConfirmReceived(data);
                break;

            case 'REMATCH_CANCEL':
                if (this.onRematchCancelReceived) this.onRematchCancelReceived(data);
                break;

            case 'HOST_LEFT':
                if (this.onHostLeft) this.onHostLeft(data);
                break;

            case 'ROOM_SETTINGS':
                if (this.onRoomSettingsReceived) this.onRoomSettingsReceived(data.settings);
                break;

            case 'START_MATCH':
                if (this.onMatchStart) this.onMatchStart(data.options);
                break;

            case 'SURRENDER':
                if (this.onSurrenderReceived) this.onSurrenderReceived(data);
                break;

            case 'GIGANTE_THROW':
                if (this.onGiganteThrowReceived) this.onGiganteThrowReceived(data);
                break;

            case 'CANON_BEAM':
                if (this.onCanonBeamReceived) this.onCanonBeamReceived(data);
                break;

            case 'MAGO_ATTACK':
                if (this.onMagoAttackReceived) this.onMagoAttackReceived(data);
                break;

            case 'WOLF_SURGE':
                if (this.onWolfSurgeReceived) this.onWolfSurgeReceived(data);
                break;

            case 'REINFORCEMENT_WAITING':
                if (this.onReinforcementWaitingReceived) this.onReinforcementWaitingReceived(data);
                break;

            case 'REINFORCEMENT_PLACE':
                if (this.onReinforcementPlaceReceived) this.onReinforcementPlaceReceived(data);
                break;

            case 'REINFORCEMENT_DONE':
                if (this.onReinforcementDoneReceived) this.onReinforcementDoneReceived(data);
                break;

            case 'DRAW_REQUEST':
                if (this.onDrawRequestReceived) this.onDrawRequestReceived(data);
                break;

            case 'DRAW_RESPONSE':
                if (this.onDrawResponseReceived) this.onDrawResponseReceived(data);
                break;

            case 'DRAW_BID':
                if (this.onDrawBidReceived) this.onDrawBidReceived(data);
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
            if (typeof DebugLogger !== 'undefined') {
                DebugLogger.log('RED', `Enviando [MOVE]: (${moveData?.fromR},${moveData?.fromC}) ➔ (${moveData?.toR},${moveData?.toC})`);
            }
            this.conn.send({ type: 'MOVE', move: moveData });
        }
    },

    sendPassTurn(data) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'PASS_TURN', ...data });
        }
    },

    sendDraftPick(draftStep, pieceType) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'DRAFT_PICK', draftStep, chosenType: pieceType, pieceType: pieceType });
        }
    },

    sendDraftVerify(signature) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'DRAFT_VERIFY', signature });
        }
    },

    sendPopupPause(payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'POPUP_PAUSE', ...payload });
        }
    },

    sendClockSync(payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'CLOCK_SYNC', ...payload });
        }
    },

    sendGameOverCheck(payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'GAME_OVER_CHECK', ...payload });
        }
    },

    sendRematchRequest() {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'REMATCH_REQUEST' });
        }
    },

    sendRematchConfirm(options) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'REMATCH_CONFIRM', options });
        }
    },

    sendRematchCancel(reason) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'REMATCH_CANCEL', reason });
        }
    },

    sendRoomSettings(settings) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'ROOM_SETTINGS', settings });
        }
    },

    sendMatchStart(options) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'START_MATCH', options: options });
        }
    },

    sendSurrender(playerName) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'SURRENDER', playerName: playerName || this.playerName });
        }
    },

    sendGiganteThrow(payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'GIGANTE_THROW', ...payload });
        }
    },

    sendCanonBeam(payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'CANON_BEAM', ...payload });
        }
    },

    sendMagoAttack(payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'MAGO_ATTACK', ...payload });
        }
    },

    sendWolfSurge(payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'WOLF_SURGE', ...payload });
        }
    },

    sendReinforcementWaiting(payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'REINFORCEMENT_WAITING', ...payload });
        }
    },

    sendReinforcementPlace(payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'REINFORCEMENT_PLACE', ...payload });
        }
    },

    sendReinforcementDone(payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'REINFORCEMENT_DONE', ...payload });
        }
    },

    sendDrawRequest(payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'DRAW_REQUEST', ...payload });
        }
    },

    sendDrawResponse(payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'DRAW_RESPONSE', ...payload });
        }
    },

    sendDrawBid(payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'DRAW_BID', ...payload });
        }
    },

    disconnect() {
        this.stopHeartbeat();
        if (this.hostBroadcastInterval) {
            clearInterval(this.hostBroadcastInterval);
            this.hostBroadcastInterval = null;
        }

        // If we were hosting, broadcast that room is closed so all devices drop it immediately
        if (this.isHost && this.roomCode) {
            const closePayload = { code: this.roomCode, closed: true, timestamp: Date.now() };
            if (this.broadcastChannel) {
                try { this.broadcastChannel.postMessage(closePayload); } catch(e){}
            }
            if (this.mqttClient && this.mqttClient.isConnected && this.mqttClient.isConnected()) {
                try {
                    const message = new Paho.MQTT.Message(JSON.stringify(closePayload));
                    message.destinationName = this.mqttTopic;
                    message.qos = 0;
                    this.mqttClient.send(message);
                } catch(e){}
            }
        }

        if (this.conn) {
            if (this.isHost && this.conn.open) {
                try {
                    this.conn.send({ type: 'HOST_LEFT', reason: 'El anfitrión abandonó la sala.' });
                } catch(e){}
            }
            try { this.conn.close(); } catch(e){}
            this.conn = null;
        }
        if (this.peer) {
            try { this.peer.destroy(); } catch(e){}
            this.peer = null;
        }
        this.roomCode = null;
        this.isHost = false;
        this.pendingJoinRequests = [];
    }
};

NetworkManager.init();
