/**
 * CONTINENTAL - LAN / Local Network Multiplayer Manager
 * Handles LAN Lobby, room discovery, player slots (cupos), code join, and join requests.
 */

const RANDOM_PLAYER_NAMES = [
    'Comandante Drake', 'Paladín Valiente', 'Arquera Sombría', 'Señor de la Guerra',
    'Dama del Alba', 'Mago Arcano', 'Caballero del Sol', 'Centinela Carmesí',
    'Vanguardia Fénix', 'Gladiador de Hierro', 'Capitán Roland', 'Cruzado Real',
    'Jinete del Norte', 'Sombra Plateada', 'Valquiria Brava', 'Defensor de Élite'
];

const RANDOM_ROOM_NAMES = [
    'Bastión de Honor', 'Fortaleza Real', 'Campamento de Asedio', 'Valle de los Reyes',
    'Torre del Alba', 'Coliseo de Guerra', 'Vanguardia Continental', 'Alcázar del Norte',
    'Ciénaga Sangrienta', 'Guarnición de Hierro', 'Templo de Batalla', 'Muralla de Plata'
];

const NetworkManager = {
    peer: null,
    conn: null,
    channel: null,
    isHost: false,
    currentRoom: null,
    simulatedRooms: [],
    simulatedTimer: null,
    onMoveReceived: null,
    onLobbyUpdated: null,
    onMatchStart: null,

    init() {
        if (!this.channel && typeof BroadcastChannel !== 'undefined') {
            try {
                this.channel = new BroadcastChannel('continental_lan_lobby');
                this.channel.onmessage = (e) => this.handleChannelMessage(e.data);
            } catch (err) {
                console.warn('BroadcastChannel not available:', err);
            }
        }
        this.initSimulatedRooms();
    },

    getPlayerName() {
        let name = localStorage.getItem('continental_lan_player_name');
        if (!name || !name.trim()) {
            name = this.generateRandomPlayerName();
            localStorage.setItem('continental_lan_player_name', name);
        }
        return name;
    },

    setPlayerName(name) {
        if (name && name.trim()) {
            localStorage.setItem('continental_lan_player_name', name.trim());
        }
    },

    generateRandomPlayerName() {
        return RANDOM_PLAYER_NAMES[Math.floor(Math.random() * RANDOM_PLAYER_NAMES.length)];
    },

    generateRandomRoomName() {
        return RANDOM_ROOM_NAMES[Math.floor(Math.random() * RANDOM_ROOM_NAMES.length)];
    },

    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return 'CW-' + code;
    },

    initSimulatedRooms() {
        this.simulatedRooms = [
            {
                code: 'CW-7842',
                name: 'Bastión de Honor',
                hostName: 'Comandante Roland',
                modeTitle: 'Continental (Captura Centro)',
                gameType: 'continental',
                submode: 'continental_captura_centro',
                slots: { current: 1, max: 2 },
                status: 'waiting'
            },
            {
                code: 'CW-3109',
                name: 'Torre del Alba',
                hostName: 'Dama Morgian',
                modeTitle: 'Gran Ejército',
                gameType: 'continental',
                submode: 'continental_gran_ejercito',
                slots: { current: 1, max: 2 },
                status: 'waiting'
            },
            {
                code: 'CW-9954',
                name: 'Coliseo de Guerra',
                hostName: 'Centinela Carmesí',
                modeTitle: 'Ajedrez 360',
                gameType: 'standard',
                submode: 'ajedrez_360',
                slots: { current: 1, max: 2 },
                status: 'waiting'
            }
        ];
    },

    getAvailableRooms() {
        const rooms = [...this.simulatedRooms];
        if (this.currentRoom && this.isHost) {
            // Include current room if hosting
        }
        return rooms;
    },

    getWaitingPlayers() {
        return [
            { name: 'Paladín Valiente', status: 'Buscando partida', mode: 'Cualquiera' },
            { name: 'Arquera Sombría', status: 'En sala de espera', mode: 'Continental' },
            { name: 'Caballero del Sol', status: 'Listo para jugar', mode: 'Gran Ejército' }
        ];
    },

    /**
     * Host creates a new LAN room
     */
    hostRoom(options = {}) {
        this.init();
        const code = this.generateRoomCode();
        const roomName = options.roomName || this.generateRandomRoomName();
        const hostPlayerName = this.getPlayerName();

        let modeTitle = 'Continental';
        if (options.submode === 'continental_gran_ejercito') modeTitle = 'Gran Ejército';
        else if (options.submode === 'ajedrez_360') modeTitle = 'Ajedrez 360';
        else if (options.submode === 'continental_captura_centro') modeTitle = 'Continental (Centro)';

        this.isHost = true;
        this.currentRoom = {
            code: code,
            name: roomName,
            hostName: hostPlayerName,
            gameType: options.gameType || 'continental',
            submode: options.submode || 'continental_captura_centro',
            modeTitle: modeTitle,
            timeMinutes: options.timeMinutes || 3,
            timeSeconds: options.timeSeconds || 180,
            slots: { current: 1, max: 2 },
            players: [
                { name: hostPlayerName, isHost: true, side: 'w' }
            ],
            pendingRequests: [],
            status: 'waiting'
        };

        // Broadcast room creation
        if (this.channel) {
            this.channel.postMessage({
                type: 'ROOM_ANNOUNCE',
                room: this.getRoomSummary(this.currentRoom)
            });
        }

        // Add a simulated interested joiner after 4 seconds if testing alone
        if (this.simulatedTimer) clearTimeout(this.simulatedTimer);
        this.simulatedTimer = setTimeout(() => {
            if (this.currentRoom && this.currentRoom.status === 'waiting' && this.currentRoom.pendingRequests.length === 0 && this.currentRoom.slots.current < this.currentRoom.slots.max) {
                const simulatedJoiner = 'Paladín Valiente';
                this.addJoinRequest({
                    requestId: 'sim_' + Date.now(),
                    playerName: simulatedJoiner,
                    roomCode: this.currentRoom.code
                });
            }
        }, 3500);

        return this.currentRoom;
    },

    getRoomSummary(room) {
        if (!room) return null;
        return {
            code: room.code,
            name: room.name,
            hostName: room.hostName,
            gameType: room.gameType,
            submode: room.submode,
            modeTitle: room.modeTitle,
            slots: { ...room.slots },
            status: room.status
        };
    },

    updateRoomName(newName) {
        if (this.currentRoom && newName && newName.trim()) {
            this.currentRoom.name = newName.trim();
            if (this.channel) {
                this.channel.postMessage({
                    type: 'ROOM_ANNOUNCE',
                    room: this.getRoomSummary(this.currentRoom)
                });
            }
            if (this.onLobbyUpdated) this.onLobbyUpdated();
        }
    },

    addJoinRequest(req) {
        if (!this.currentRoom || this.currentRoom.status !== 'waiting') return;
        const existing = this.currentRoom.pendingRequests.find(r => r.playerName === req.playerName);
        if (!existing) {
            this.currentRoom.pendingRequests.push(req);
            if (this.onLobbyUpdated) this.onLobbyUpdated();
        }
    },

    /**
     * Host accepts a player request to join from the lobby list
     */
    acceptJoinRequest(requestId) {
        if (!this.currentRoom) return;
        const reqIdx = this.currentRoom.pendingRequests.findIndex(r => r.requestId === requestId);
        if (reqIdx === -1) return;

        const req = this.currentRoom.pendingRequests[reqIdx];
        this.currentRoom.pendingRequests.splice(reqIdx, 1);

        // Add player to slots
        this.currentRoom.players.push({
            name: req.playerName,
            isHost: false,
            side: 'b'
        });
        this.currentRoom.slots.current = this.currentRoom.players.length;

        if (this.channel) {
            this.channel.postMessage({
                type: 'JOIN_ACCEPTED',
                requestId: req.requestId,
                roomCode: this.currentRoom.code,
                room: this.getRoomSummary(this.currentRoom)
            });
        }

        if (this.onLobbyUpdated) this.onLobbyUpdated();

        // Check if cupos are filled (e.g. 2/2)
        if (this.currentRoom.slots.current >= this.currentRoom.slots.max) {
            this.startMatchFromLobby();
        }
    },

    /**
     * Host rejects a player request
     */
    rejectJoinRequest(requestId) {
        if (!this.currentRoom) return;
        const reqIdx = this.currentRoom.pendingRequests.findIndex(r => r.requestId === requestId);
        if (reqIdx === -1) return;

        const req = this.currentRoom.pendingRequests[reqIdx];
        this.currentRoom.pendingRequests.splice(reqIdx, 1);

        if (this.channel) {
            this.channel.postMessage({
                type: 'JOIN_REJECTED',
                requestId: req.requestId,
                roomCode: this.currentRoom.code
            });
        }

        if (this.onLobbyUpdated) this.onLobbyUpdated();
    },

    /**
     * Direct Code Join: Bypasses manual host acceptance and instantly starts
     */
    joinByCode(code, callback) {
        this.init();
        const cleanCode = (code || '').trim().toUpperCase();
        const myName = this.getPlayerName();

        // 1. Check if joining a local hosted room (via cross-tab)
        if (this.currentRoom && this.currentRoom.code === cleanCode) {
            // Already in room
            return;
        }

        // 2. Check simulated rooms
        const simMatch = this.simulatedRooms.find(r => r.code === cleanCode);
        if (simMatch) {
            // Instantly start match with simulated host
            const matchOptions = {
                mode: 'lan',
                playerSide: 'b',
                gameType: simMatch.gameType,
                submode: simMatch.submode,
                lanRole: 'guest',
                roomCode: simMatch.code,
                roomName: simMatch.name,
                opponentName: simMatch.hostName
            };
            if (callback) callback({ success: true, matchOptions });
            return;
        }

        // 3. Broadcast direct code join across local network
        if (this.channel) {
            this.channel.postMessage({
                type: 'DIRECT_CODE_JOIN',
                code: cleanCode,
                playerName: myName
            });
        }

        // Fallback for demo / local play: accept code if format is valid
        if (cleanCode.startsWith('CW-') || cleanCode.length >= 4) {
            const matchOptions = {
                mode: 'lan',
                playerSide: 'b',
                gameType: 'continental',
                submode: 'continental_captura_centro',
                lanRole: 'guest',
                roomCode: cleanCode,
                roomName: 'Sala ' + cleanCode,
                opponentName: 'Anfitrión'
            };
            if (callback) callback({ success: true, matchOptions });
        } else {
            if (callback) callback({ success: false, error: 'Código de sala no encontrado.' });
        }
    },

    /**
     * Request to Join from the List: Requires host approval
     */
    requestToJoinRoom(roomCode, callback) {
        this.init();
        const myName = this.getPlayerName();
        const reqId = 'req_' + Date.now();

        // Check if simulated room
        const simRoom = this.simulatedRooms.find(r => r.code === roomCode);
        if (simRoom) {
            // Notify caller that request is pending
            if (callback) callback({ status: 'pending', room: simRoom });

            // Simulate host accepting after 1.8 seconds
            setTimeout(() => {
                const matchOptions = {
                    mode: 'lan',
                    playerSide: 'b',
                    gameType: simRoom.gameType,
                    submode: simRoom.submode,
                    lanRole: 'guest',
                    roomCode: simRoom.code,
                    roomName: simRoom.name,
                    opponentName: simRoom.hostName
                };
                if (this.onMatchStart) this.onMatchStart(matchOptions);
            }, 1800);
            return;
        }

        // Real peer broadcast
        if (this.channel) {
            this.channel.postMessage({
                type: 'JOIN_REQUEST',
                requestId: reqId,
                roomCode: roomCode,
                playerName: myName
            });
            if (callback) callback({ status: 'pending', roomCode });
        }
    },

    startMatchFromLobby() {
        if (!this.currentRoom) return;
        this.currentRoom.status = 'in_progress';

        const matchOptions = {
            mode: 'lan',
            playerSide: 'w',
            gameType: this.currentRoom.gameType,
            submode: this.currentRoom.submode,
            timeMinutes: this.currentRoom.timeMinutes,
            timeSeconds: this.currentRoom.timeSeconds,
            lanRole: 'host',
            roomCode: this.currentRoom.code,
            roomName: this.currentRoom.name,
            opponentName: this.currentRoom.players[1]?.name || 'Invitado'
        };

        if (this.channel) {
            this.channel.postMessage({
                type: 'MATCH_START',
                roomCode: this.currentRoom.code,
                matchOptions: {
                    ...matchOptions,
                    playerSide: 'b',
                    lanRole: 'guest',
                    opponentName: this.currentRoom.hostName
                }
            });
        }

        if (this.onMatchStart) {
            this.onMatchStart(matchOptions);
        }
    },

    handleChannelMessage(data) {
        if (!data || !data.type) return;

        switch (data.type) {
            case 'ROOM_ANNOUNCE':
                if (!this.isHost) {
                    const idx = this.simulatedRooms.findIndex(r => r.code === data.room.code);
                    if (idx >= 0) this.simulatedRooms[idx] = data.room;
                    else this.simulatedRooms.unshift(data.room);
                    if (this.onLobbyUpdated) this.onLobbyUpdated();
                }
                break;

            case 'JOIN_REQUEST':
                if (this.isHost && this.currentRoom && this.currentRoom.code === data.roomCode) {
                    this.addJoinRequest(data);
                }
                break;

            case 'DIRECT_CODE_JOIN':
                if (this.isHost && this.currentRoom && this.currentRoom.code === data.code) {
                    // Direct code join: fills slot immediately and starts!
                    this.currentRoom.players.push({
                        name: data.playerName,
                        isHost: false,
                        side: 'b'
                    });
                    this.currentRoom.slots.current = this.currentRoom.players.length;
                    if (this.onLobbyUpdated) this.onLobbyUpdated();
                    if (this.currentRoom.slots.current >= this.currentRoom.slots.max) {
                        this.startMatchFromLobby();
                    }
                }
                break;

            case 'MATCH_START':
                if (!this.isHost && this.onMatchStart) {
                    this.onMatchStart(data.matchOptions);
                }
                break;

            case 'MOVE':
                if (this.onMoveReceived) {
                    this.onMoveReceived(data.move);
                }
                break;
        }
    },

    sendMove(move) {
        if (this.channel) {
            this.channel.postMessage({ type: 'MOVE', move });
        }
    },

    leaveRoom() {
        if (this.simulatedTimer) {
            clearTimeout(this.simulatedTimer);
            this.simulatedTimer = null;
        }
        if (this.currentRoom && this.channel) {
            this.channel.postMessage({ type: 'ROOM_CLOSED', roomCode: this.currentRoom.code });
        }
        this.currentRoom = null;
        this.isHost = false;
    }
};

window.NetworkManager = NetworkManager;
