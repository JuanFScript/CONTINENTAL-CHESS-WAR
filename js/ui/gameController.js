/**
 * CONTINENTAL - Game Controller
 * Controls live chess match flow, touch interactions, dual clock timers, AI turns, and end conditions.
 */

class GameController {
    constructor(boardContainer, hudContainer) {
        this.boardContainer = boardContainer;
        this.hudContainer = hudContainer;

        this.boardEngine = new BoardEngine(8, 8);
        this.rulesEngine = new RulesEngine(this.boardEngine);
        this.boardRenderer = new BoardRenderer(this.boardContainer, this.boardEngine, {
            rulesEngine: this.rulesEngine,
            onSquareClick: (r, c) => this.handleSquareClick(r, c)
        });

        this.matchOptions = null;
        this.selectedSquare = null;
        this.selectedLegalMoves = [];
        this.isGameOver = false;

        this.whiteTime = 600;
        this.blackTime = 600;
        this.clockTimer = null;
        this.isClockPaused = false;

        this.wolfQueue = [];
        this.isWolfPromptActive = false;
        this.activeWolfPrompt = null;

        // Continental Specific Mechanics
        this.isDrafting = false;
        this.draftStep = 0;
        this.isThrowMode = false;
        this.throwData = null;
        this.drawCount = 0;
        this.reinforcementsBank = { w: 0, b: 0 };
    }

    startMatch(options) {
        this.closeBoardInspector();
        document.querySelectorAll('.floating-popup-wrapper').forEach(el => el.remove());
        document.querySelectorAll('.modal-overlay').forEach(el => {
            if (el.id !== 'match-setup-modal') el.remove();
        });

        this.clearWolfPopup();
        this.wolfQueue = [];
        this.isWolfPromptActive = false;
        this.activeWolfPrompt = null;
        this.isThrowMode = false;
        this.throwData = null;
        this.isReinforcementMode = false;
        this.reinforcementData = null;
        this.drawCount = 0;
        this.reinforcementsBank = { w: 0, b: 0 };

        this.moveHistoryStack = [];
        this.matchOptions = options;
        this.isGameOver = false;
        this.opponentLeftHandled = false;
        this.isClockPaused = false;
        this.selectedSquare = null;
        this.selectedLegalMoves = [];
        this.centerStreak = { w: 0, b: 0 };

        const isContinental = (options.gameType === 'continental' || (options.submode && options.submode.startsWith('continental_')));
        const rows = isContinental ? 7 : 8;
        const cols = isContinental ? 7 : 8;

        this.boardEngine = new BoardEngine(rows, cols);
        this.rulesEngine = new RulesEngine(this.boardEngine, { isContinental });
        this.boardRenderer = new BoardRenderer(this.boardContainer, this.boardEngine, {
            rulesEngine: this.rulesEngine,
            onSquareClick: (r, c) => this.handleSquareClick(r, c)
        });

        this.rulesEngine.reset();

        const timeSec = options.timeSeconds !== undefined ? options.timeSeconds : (options.timeMinutes || 0) * 60;
        this.whiteTime = timeSec;
        this.blackTime = timeSec;

        this.boardRenderer.flipped = ((options.mode === 'ai' || options.mode === 'lan') && options.playerSide === 'b');

        if (options.mode === 'lan' && typeof NetworkManager !== 'undefined') {
            NetworkManager.onMoveReceived = (moveData) => {
                if (moveData && moveData.fromR !== undefined) {
                    this.performRegularMove(moveData.fromR, moveData.fromC, moveData.toR, moveData.toC, moveData.promotionType, true, moveData.facing, moveData.stance);
                    if (moveData.activeColorAfter) {
                        this.rulesEngine.activeColor = moveData.activeColorAfter;
                    }
                    if (moveData.whiteTime !== undefined) this.whiteTime = moveData.whiteTime;
                    if (moveData.blackTime !== undefined) this.blackTime = moveData.blackTime;
                    this.updateClockDisplay();
                    this.renderHUD();
                }
            };

            NetworkManager.onPassTurnReceived = (data) => {
                if (data && data.rotatedPiece) {
                    const p = this.boardEngine.getPiece(data.rotatedPiece.r, data.rotatedPiece.c);
                    if (p) {
                        if (data.rotatedPiece.facing !== undefined) {
                            p.facing = data.rotatedPiece.facing;
                        }
                        if (data.rotatedPiece.stance !== undefined) {
                            p.stance = data.rotatedPiece.stance;
                        }
                    }
                }
                this.saveStateSnapshot();
                if (data && data.activeColorAfter) {
                    this.rulesEngine.activeColor = data.activeColorAfter;
                } else {
                    this.rulesEngine.activeColor = this.rulesEngine.activeColor === 'w' ? 'b' : 'w';
                }
                if (this.rulesEngine.activeColor === 'w') this.rulesEngine.fullMoveNumber++;
                if (data?.whiteTime !== undefined) this.whiteTime = data.whiteTime;
                if (data?.blackTime !== undefined) this.blackTime = data.blackTime;
                this.updateClockDisplay();
                this.finalizeTurn({ success: true, moveRecord: { passed: true } });
            };

            NetworkManager.onPopupPauseReceived = (data) => {
                const secs = data?.seconds || 5;
                this.pauseClockTemporarily(secs, true);
                if (data?.whiteTime !== undefined) this.whiteTime = data.whiteTime;
                if (data?.blackTime !== undefined) this.blackTime = data.blackTime;
                this.updateClockDisplay();
            };

            NetworkManager.onClockSyncReceived = (data) => {
                if (data?.whiteTime !== undefined) this.whiteTime = data.whiteTime;
                if (data?.blackTime !== undefined) this.blackTime = data.blackTime;
                this.updateClockDisplay();
            };

            NetworkManager.onGameOverCheckReceived = (data) => {
                if (!this.isGameOver) {
                    const reason = data?.reason || 'Fin de partida reportado por el rival';
                    this.endMatch(reason);
                }
            };

            NetworkManager.onRematchRequestReceived = () => {
                this.showRematchOfferModal();
            };

            NetworkManager.onRematchConfirmReceived = () => {
                this.closeRematchModals();
                const newSide = this.matchOptions.playerSide === 'w' ? 'b' : 'w';
                this.startMatch({
                    ...this.matchOptions,
                    playerSide: newSide
                });
            };

            NetworkManager.onRematchCancelReceived = (data) => {
                this.closeRematchModals();
                this.showRematchCancelledToast(data?.reason || 'El rival rechazó la revancha o salió al menú.');
            };

            NetworkManager.onDraftPickReceived = (data) => {
                if (this.isDrafting && this.draftSteps && this.draftSteps[this.draftStep]) {
                    const step = this.draftSteps[this.draftStep];
                    const chosenType = data.chosenType || data.pieceType;
                    step.apply(chosenType, this.boardEngine);
                    AudioManager.playMove();
                    this.boardRenderer.render();
                    this.closeDraftWaitingModal();
                    this.draftStep++;
                    this.processNextDraftStep();
                }
            };

            NetworkManager.onDraftVerifyReceived = (data) => {
                const mySignature = this.boardEngine.getBoardSignature();
                if (mySignature !== data.signature) {
                    console.error('[LAN SYNC ERROR] Board signatures mismatch!', mySignature, data.signature);
                    alert('❌ Error de sincronización: Los tableros no coinciden. La partida se cerrará.');
                    this.exitGame('menu', { skipConfirm: true });
                } else {
                    console.log('[LAN SYNC SUCCESS] Board signatures verified perfectly!');
                    this.onDraftVerificationSuccess();
                }
            };

            NetworkManager.onGiganteThrowReceived = (data) => {
                this.saveStateSnapshot();
                const { fromR, fromC, targetR, targetC, landingR, landingC } = data;
                const thrownPiece = this.boardEngine.getPiece(targetR, targetC);
                this.boardEngine.setPiece(targetR, targetC, null);
                const squashedPiece = this.boardEngine.getPiece(landingR, landingC);
                const gig = this.boardEngine.getPiece(fromR, fromC);

                if (squashedPiece) {
                    AudioManager.playCapture();
                    this.rulesEngine.capturedPieces[this.rulesEngine.activeColor].push(squashedPiece);
                    if (thrownPiece) this.rulesEngine.capturedPieces[this.rulesEngine.activeColor].push(thrownPiece);
                    this.boardEngine.setPiece(landingR, landingC, null);
                    for (let r = 0; r < this.boardEngine.rows; r++) {
                        for (let c = 0; c < this.boardEngine.cols; c++) {
                            const p = this.boardEngine.getPiece(r, c);
                            if (p && p.color === this.rulesEngine.activeColor) p.capturedLastTurn = false;
                        }
                    }
                    if (gig) gig.capturedLastTurn = true;
                } else {
                    AudioManager.playMove();
                    this.boardEngine.setPiece(landingR, landingC, thrownPiece);
                }

                if (data.activeColorAfter) {
                    this.rulesEngine.activeColor = data.activeColorAfter;
                } else {
                    this.rulesEngine.activeColor = this.rulesEngine.activeColor === 'w' ? 'b' : 'w';
                }
                if (this.rulesEngine.activeColor === 'w') this.rulesEngine.fullMoveNumber++;
                if (data.whiteTime !== undefined) this.whiteTime = data.whiteTime;
                if (data.blackTime !== undefined) this.blackTime = data.blackTime;
                this.boardRenderer.render();
                this.updateClockDisplay();
                this.finalizeTurn({ success: true, moveRecord: { piece: gig || thrownPiece, captured: squashedPiece } });
            };

            NetworkManager.onCanonBeamReceived = (data) => {
                this.saveStateSnapshot();
                const { r, c, facing } = data;
                const piece = this.boardEngine.getPiece(r, c);
                if (piece) {
                    if (facing !== undefined && facing !== null) piece.facing = facing;
                    const beamResult = PieceRegistry.fireCanonBeam(this.boardEngine, r, c);
                    if (beamResult.destroyed.length > 0) {
                        AudioManager.playCapture();
                        beamResult.destroyed.forEach(d => {
                            this.rulesEngine.capturedPieces[piece.color].push(d.piece);
                        });
                        for (let i = 0; i < this.boardEngine.rows; i++) {
                            for (let j = 0; j < this.boardEngine.cols; j++) {
                                const p = this.boardEngine.getPiece(i, j);
                                if (p && p.color === piece.color) p.capturedLastTurn = false;
                            }
                        }
                        piece.capturedLastTurn = true;
                    } else {
                        AudioManager.playMove();
                    }
                }

                if (data.activeColorAfter) {
                    this.rulesEngine.activeColor = data.activeColorAfter;
                } else {
                    this.rulesEngine.activeColor = this.rulesEngine.activeColor === 'w' ? 'b' : 'w';
                }
                if (this.rulesEngine.activeColor === 'w') this.rulesEngine.fullMoveNumber++;
                if (data.whiteTime !== undefined) this.whiteTime = data.whiteTime;
                if (data.blackTime !== undefined) this.blackTime = data.blackTime;
                this.boardRenderer.render();
                this.updateClockDisplay();
                this.finalizeTurn({ success: true, moveRecord: { piece } });
            };

            NetworkManager.onMagoAttackReceived = (data) => {
                this.saveStateSnapshot();
                const { fromR, fromC, toR, toC, facing, stance } = data;
                const piece = this.boardEngine.getPiece(fromR, fromC);
                const targetPiece = this.boardEngine.getPiece(toR, toC);
                if (targetPiece && piece) {
                    this.rulesEngine.capturedPieces[piece.color].push(targetPiece);
                    this.boardEngine.setPiece(toR, toC, null);
                    AudioManager.playCapture();
                    if (facing !== undefined && facing !== null) piece.facing = facing;
                    if (stance) piece.stance = stance;
                }
                if (data.activeColorAfter) {
                    this.rulesEngine.activeColor = data.activeColorAfter;
                } else {
                    this.rulesEngine.activeColor = this.rulesEngine.activeColor === 'w' ? 'b' : 'w';
                }
                if (this.rulesEngine.activeColor === 'w') this.rulesEngine.fullMoveNumber++;
                if (data.whiteTime !== undefined) this.whiteTime = data.whiteTime;
                if (data.blackTime !== undefined) this.blackTime = data.blackTime;
                this.boardRenderer.render();
                this.updateClockDisplay();
                this.finalizeTurn({ success: true, moveRecord: { piece, captured: targetPiece } });
            };

            NetworkManager.onWolfSurgeReceived = (data) => {
                if (data && data.wolfAdvances && data.wolfAdvances.length > 0) {
                    data.wolfAdvances.forEach(adv => {
                        const wolfPiece = this.boardEngine.getPiece(adv.fromR, adv.fromC);
                        const targetPiece = this.boardEngine.getPiece(adv.toR, adv.toC);
                        this.boardEngine.setPiece(adv.fromR, adv.fromC, null);
                        this.boardEngine.setPiece(adv.toR, adv.toC, {
                            type: 'c_lobo',
                            color: adv.color || wolfPiece?.color || 'w',
                            moved: true,
                            capturedLastTurn: !!targetPiece
                        });
                        if (targetPiece) {
                            this.rulesEngine.capturedPieces[adv.color || 'w'].push(targetPiece);
                            AudioManager.playCapture();
                        } else {
                            AudioManager.playMove();
                        }
                    });
                    this.boardRenderer.render();
                }
            };

            NetworkManager.onReinforcementWaitingReceived = (data) => {
                this.showReinforcementWaitingModal(data.side);
            };

            NetworkManager.onReinforcementPlaceReceived = (data) => {
                const { row, col, unitType, side } = data;
                this.boardEngine.setPiece(row, col, {
                    type: unitType,
                    color: side,
                    facing: side === 'w' ? 0 : 180
                });
                AudioManager.playMove();
                this.boardRenderer.render();
                this.renderHUD();
            };

            NetworkManager.onReinforcementDoneReceived = (data) => {
                this.closeReinforcementWaitingModal();
                if (data.bankedPoints !== undefined && data.side) {
                    this.reinforcementsBank[data.side] = data.bankedPoints;
                }
                this.boardRenderer.render();
                this.renderHUD();
                if (this.pendingReinforcementNextStep) {
                    const next = this.pendingReinforcementNextStep;
                    this.pendingReinforcementNextStep = null;
                    next();
                }
            };

            NetworkManager.onDrawRequestReceived = (data) => {
                this.handleDrawProposalReceivedFromOpponent(data);
            };

            NetworkManager.onDrawResponseReceived = (data) => {
                this.handleDrawProposalResponseFromOpponent(data);
            };

            NetworkManager.onDrawBidReceived = (data) => {
                if (this.handleDrawBidReceived) {
                    this.handleDrawBidReceived(data);
                }
            };

            NetworkManager.onConnectionLost = () => {
                if (this.isGameOver || this.opponentLeftHandled) return;
                this.handleOpponentLeftOrSurrendered('🏆 ¡Victoria por Desconexión!\nSe ha perdido la conexión con el rival.');
            };

            NetworkManager.onSurrenderReceived = (data) => {
                if (this.isGameOver || this.opponentLeftHandled) return;
                const surrendereeName = (data && data.playerName) ? data.playerName : 'El rival';
                this.handleOpponentLeftOrSurrendered(`🏆 ¡${surrendereeName} ha abandonado la partida!\n¡Eres el ganador!`);
            };
        }

        this.stopClock();
        this.renderHUD();

        if (options.gameType === 'continental') {
            this.boardEngine.setupContinentalDraft(options.submode);
            this.boardRenderer.render();
            this.startContinentalDraft();
        } else if (options.submode === 'ajedrez_360') {
            this.boardEngine.setupFischerRandom();
            this.boardRenderer.render();
            if (timeSec > 0) this.startClock();
            if (options.mode === 'ai' && options.playerSide === 'b' && this.rulesEngine.activeColor === 'w') {
                setTimeout(() => this.triggerAIMove(), 500);
            }
        } else if (options.submode === 'continental_gran_ejercito') {
            this.boardEngine.setupGranEjercito();
            this.boardRenderer.render();
            if (timeSec > 0) this.startClock();
            if (options.mode === 'ai' && options.playerSide === 'b' && this.rulesEngine.activeColor === 'w') {
                setTimeout(() => this.triggerAIMove(), 500);
            }
        } else {
            this.boardEngine.setupStandard();
            this.boardRenderer.render();
            if (timeSec > 0) this.startClock();
            if (options.mode === 'ai' && options.playerSide === 'b' && this.rulesEngine.activeColor === 'w') {
                setTimeout(() => this.triggerAIMove(), 500);
            }
        }
    }

    handleSquareClick(r, c) {
        if (this.isGameOver || this.isWolfPromptActive || this.isDrafting) return;

        // Check Throw Landing Selection Mode (Gigante Throw)
        if (this.isThrowMode && this.throwData) {
            this.executeGiganteThrowLanding(r, c);
            return;
        }

        // Check Reinforcement Placement Mode (Must run before turn check so Black can place reinforcements in Gran Ejército)
        if (this.isReinforcementMode && this.reinforcementData) {
            this.executeReinforcementPlacement(r, c);
            return;
        }

        if (this.matchOptions.mode === 'ai') {
            if (this.rulesEngine.activeColor !== this.matchOptions.playerSide) {
                return;
            }
        }

        if (this.matchOptions.mode === 'lan') {
            if (this.rulesEngine.activeColor !== this.matchOptions.playerSide) {
                const clickedPiece = this.boardEngine.getPiece(r, c);
                if (clickedPiece) {
                    this.showEnemyPieceInfo(clickedPiece, r, c);
                }
                return;
            }
        }

        const clickedPiece = this.boardEngine.getPiece(r, c);

        // Priority 1: If a piece is ALREADY selected and (r, c) is a valid move/ability target (e.g. Gigante ability)
        if (this.selectedSquare) {
            const moveTarget = this.selectedLegalMoves.find(m => m.r === r && m.c === c);
            if (moveTarget) {
                this.executeUserMove(this.selectedSquare.r, this.selectedSquare.c, r, c, moveTarget);
                return;
            }
        }

        // Priority 2: If clicking a friendly piece of active color, select it
        if (clickedPiece && clickedPiece.color === this.rulesEngine.activeColor) {
            this.selectedSquare = { r, c };
            this.selectedLegalMoves = this.rulesEngine.getLegalMoves(r, c);
            this.boardRenderer.setSelected(this.selectedSquare, this.selectedLegalMoves);
            this.renderHUD();
            return;
        }

        // Priority 3: If clicking an enemy piece, show enemy info & valid moves in light gray
        if (clickedPiece && clickedPiece.color !== this.rulesEngine.activeColor) {
            this.showEnemyPieceInfo(clickedPiece, r, c);
            return;
        }

        this.selectedSquare = null;
        this.selectedLegalMoves = [];
        this.boardRenderer.clearSelection();
        this.renderHUD();
    }

    showEnemyPieceInfo(piece, r, c) {
        if (!piece) return;
        const reg = PieceRegistry.get(piece.type);
        const lang = typeof I18n !== 'undefined' ? I18n.currentLang : 'es';
        const pieceName = reg ? (reg.name[lang] || reg.name.es) : piece.type;

        // Get enemy piece legal moves
        const enemyMoves = this.rulesEngine.getLegalMoves(r, c, piece.color);

        this.selectedSquare = null;
        this.selectedLegalMoves = [];
        this.boardRenderer.setEnemySelected({ r, c }, enemyMoves, pieceName);
    }

    // =========================================================================
    // CONTINENTAL DRAFTING PHASE
    // =========================================================================

    startContinentalDraft() {
        this.isDrafting = true;
        this.draftStep = 0;

        const PAWNS = [
            { type: 'c_peon', name: 'Peón Continental', symbol: '♟' },
            { type: 'c_dama', name: 'Damas', symbol: '👑' },
            { type: 'c_lobo', name: 'Lobos', symbol: '🐺' },
            { type: 'c_escudero', name: 'Escuderos', symbol: '🛡️' },
            { type: 'c_guardia', name: 'Guardias', symbol: '💂' }
        ];

        const ELITES = [
            { type: 'c_torre', name: 'Torre', symbol: '🏰' },
            { type: 'c_alfil', name: 'Alfil', symbol: '♗' },
            { type: 'c_caballo', name: 'Caballo', symbol: '♞' },
            { type: 'c_soldado', name: 'Soldado', symbol: '⚔️' },
            { type: 'c_mercenario', name: 'Mercenario', symbol: '🗡️' },
            { type: 'c_elefante', name: 'Elefante', symbol: '🐘' },
            { type: 'c_piquetero', name: 'Piquetero', symbol: '🔱' },
            { type: 'c_arquero', name: 'Arquero', symbol: '🏹' },
            { type: 'c_defensor', name: 'Defensor', symbol: '🔰' },
            { type: 'c_canon', name: 'Cañón', symbol: '💣' }
        ];

        const COMMANDERS = [
            { type: 'c_rey', name: 'Rey', symbol: '♚' },
            { type: 'c_reina', name: 'Reina', symbol: '♛' },
            { type: 'c_dragon', name: 'Dragón', symbol: '🐉' },
            { type: 'c_gigante', name: 'Gigante', symbol: '🗿' },
            { type: 'c_mago', name: 'Mago', symbol: '🧙' }
        ];

        this.draftSteps = [
            { side: 'w', title: '⚪ Blancas: Elige el tipo de Peón', options: PAWNS, apply: (type, b) => { [1,2,3,4,5].forEach(c => b.setPiece(5, c, { type, color: 'w', facing: 0 })); } },
            { side: 'b', title: '⚫ Negras: Elige el tipo de Peón', options: PAWNS, apply: (type, b) => { [1,2,3,4,5].forEach(c => b.setPiece(1, c, { type, color: 'b', facing: 180 })); } },
            { side: 'w', title: '⚪ Blancas: Élite a la derecha del comandante (a5)', options: ELITES, apply: (type, b) => { b.setPiece(6, 4, { type, color: 'w', facing: 0 }); } },
            { side: 'b', title: '⚫ Negras: Élite a la derecha del comandante (g3)', options: ELITES, apply: (type, b) => { b.setPiece(0, 2, { type, color: 'b', facing: 180 }); } },
            { side: 'w', title: '⚪ Blancas: Élite a la izquierda del comandante (a3)', options: ELITES, apply: (type, b) => { b.setPiece(6, 2, { type, color: 'w', facing: 0 }); } },
            { side: 'b', title: '⚫ Negras: Élite a la izquierda del comandante (g5)', options: ELITES, apply: (type, b) => { b.setPiece(0, 4, { type, color: 'b', facing: 180 }); } },
            { side: 'w', title: '⚪ Blancas: Élite 2 casillas a la derecha (a6)', options: ELITES, apply: (type, b) => { b.setPiece(6, 5, { type, color: 'w', facing: 0 }); } },
            { side: 'b', title: '⚫ Negras: Élite 2 casillas a la derecha (g2)', options: ELITES, apply: (type, b) => { b.setPiece(0, 1, { type, color: 'b', facing: 180 }); } },
            { side: 'w', title: '⚪ Blancas: Élite 2 casillas a la izquierda (a2)', options: ELITES, apply: (type, b) => { b.setPiece(6, 1, { type, color: 'w', facing: 0 }); } },
            { side: 'b', title: '⚫ Negras: Élite 2 casillas a la izquierda (g6)', options: ELITES, apply: (type, b) => { b.setPiece(0, 5, { type, color: 'b', facing: 180 }); } },
            { side: 'w', title: '⚪ Blancas: Elige el Comandante (a4)', options: COMMANDERS, apply: (type, b) => { b.setPiece(6, 3, { type, color: 'w', facing: 0 }); } },
            { side: 'b', title: '⚫ Negras: Elige el Comandante (g4)', options: COMMANDERS, apply: (type, b) => { b.setPiece(0, 3, { type, color: 'b', facing: 180 }); } }
        ];

        this.processNextDraftStep();
    }

    processNextDraftStep() {
        if (this.draftStep >= this.draftSteps.length) {
            this.isDrafting = false;
            this.closeDraftWaitingModal();

            // If in LAN mode, perform board integrity verification before starting match!
            if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
                const mySignature = this.boardEngine.getBoardSignature();
                NetworkManager.sendDraftVerify(mySignature);
                this.showDraftVerifyingModal();
                return;
            }

            this.finalizeDraftAndStartGame();
            return;
        }

        const step = this.draftSteps[this.draftStep];
        const isAI = (this.matchOptions.mode === 'ai' && step.side !== this.matchOptions.playerSide);

        if (isAI) {
            setTimeout(() => {
                const randomChoice = step.options[Math.floor(Math.random() * step.options.length)];
                step.apply(randomChoice.type, this.boardEngine);
                AudioManager.playMove();
                this.boardRenderer.render();
                this.draftStep++;
                this.processNextDraftStep();
            }, 350);
            return;
        }

        // LAN Mode: Only the player of current side can pick! Opponent sees waiting modal.
        if (this.matchOptions?.mode === 'lan') {
            const isMyTurn = (step.side === this.matchOptions.playerSide);
            if (!isMyTurn) {
                this.showDraftWaitingModal(step);
                return;
            }
        }

        this.closeDraftWaitingModal();
        this.openDraftChoiceModal(step, (chosenType) => {
            step.apply(chosenType, this.boardEngine);
            AudioManager.playMove();
            this.boardRenderer.render();

            if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
                NetworkManager.sendDraftPick(this.draftStep, chosenType);
            }

            this.draftStep++;
            this.processNextDraftStep();
        });
    }

    showDraftWaitingModal(step) {
        this.closeDraftWaitingModal();
        const sideName = step.side === 'w' ? 'Blancas ⚪' : 'Negras ⚫';
        const modal = document.createElement('div');
        modal.id = 'modal-draft-waiting';
        modal.className = 'modal-overlay modal-active';
        modal.style.zIndex = '9998';
        modal.innerHTML = `
            <div class="modal-card animate-pop-in" style="text-align: center; padding: 24px; max-width: 360px; background: rgba(16, 42, 32, 0.95); border: 2px solid rgba(52, 211, 153, 0.4); border-radius: 14px; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
                <div style="font-size: 2.2rem; margin-bottom: 10px;">⏳</div>
                <h3 style="font-family: var(--font-heading); color: #fff; font-size: 1.15rem; margin-bottom: 6px;">Esperando al Rival</h3>
                <p style="font-size: 0.9rem; color: #a7f3d0; margin-bottom: 14px;">
                    El rival está eligiendo su pieza para <strong>${sideName}</strong>...
                </p>
                <div class="loading-spinner" style="margin: 0 auto 16px auto; width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #10b981; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                
                <div style="display: flex; gap: 8px; justify-content: center; margin-top: 10px;">
                    <button id="btn-draft-view-board" class="action-btn secondary-btn" style="flex: 1; padding: 8px; font-size: 0.85rem; font-weight: bold; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff;">
                        👁️ Mirar Tablero
                    </button>
                    <button id="btn-draft-resign-menu" class="action-btn secondary-btn" style="flex: 1; padding: 8px; font-size: 0.85rem; font-weight: bold; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5;">
                        🚪 Salir / Rendirse
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#btn-draft-view-board')?.addEventListener('click', () => {
            this.openBoardInspector({
                title: `⏳ Esperando rival (${sideName})...`,
                modalElement: modal,
                showResign: true
            });
        });

        modal.querySelector('#btn-draft-resign-menu')?.addEventListener('click', () => {
            this.exitGame('menu');
        });
    }

    closeDraftWaitingModal() {
        const modal = document.getElementById('modal-draft-waiting');
        if (modal) modal.remove();
        this.closeBoardInspector();
    }

    showDraftVerifyingModal() {
        const existing = document.getElementById('modal-draft-verifying');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-draft-verifying';
        modal.className = 'modal-overlay modal-active';
        modal.style.zIndex = '9998';
        modal.innerHTML = `
            <div class="modal-card animate-pop-in" style="text-align: center; padding: 24px; max-width: 360px; background: rgba(16, 42, 32, 0.95); border: 2px solid rgba(52, 211, 153, 0.4); border-radius: 14px; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
                <div style="font-size: 2.2rem; margin-bottom: 10px;">🔍</div>
                <h3 style="font-family: var(--font-heading); color: #fff; font-size: 1.15rem; margin-bottom: 6px;">Sincronizando Tableros</h3>
                <p style="font-size: 0.9rem; color: #a7f3d0; margin-bottom: 14px;">
                    Verificando que la configuración de piezas sea idéntica en ambos celulares...
                </p>
                <div class="loading-spinner" style="margin: 0 auto 16px auto; width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #10b981; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                
                <div style="display: flex; gap: 8px; justify-content: center; margin-top: 10px;">
                    <button id="btn-verify-view-board" class="action-btn secondary-btn" style="flex: 1; padding: 8px; font-size: 0.85rem; font-weight: bold; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff;">
                        👁️ Mirar Tablero
                    </button>
                    <button id="btn-verify-resign-menu" class="action-btn secondary-btn" style="flex: 1; padding: 8px; font-size: 0.85rem; font-weight: bold; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5;">
                        🚪 Salir / Rendirse
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#btn-verify-view-board')?.addEventListener('click', () => {
            this.openBoardInspector({
                title: '🔍 Verificando tableros...',
                modalElement: modal,
                showResign: true
            });
        });

        modal.querySelector('#btn-verify-resign-menu')?.addEventListener('click', () => {
            this.exitGame('menu');
        });
    }

    onDraftVerificationSuccess() {
        const modal = document.getElementById('modal-draft-verifying');
        if (modal) modal.remove();
        this.closeBoardInspector();
        this.finalizeDraftAndStartGame();
    }

    showFloatingWaitingBar(label, onReopen) {
        this.openBoardInspector({
            title: label,
            onReopen: onReopen,
            showResign: true
        });
    }

    closeFloatingWaitingBar() {
        this.closeBoardInspector();
    }

    finalizeDraftAndStartGame() {
        if (this.matchOptions?.submode === 'continental_captura_centro') {
            const wCom = this.boardEngine.getPiece(6, 3);
            if (wCom && wCom.type === 'c_rey') this.reinforcementsBank.w += 4;
            
            const bCom = this.boardEngine.getPiece(0, 3);
            if (bCom && bCom.type === 'c_rey') this.reinforcementsBank.b += 4;
        }

        this.boardRenderer.render();
        this.renderHUD();
        AudioManager.playVictory();

        if (this.matchOptions?.submode === 'continental_gran_ejercito') {
            this.startUnifiedReinforcementFlow({
                side: 'w',
                points: 4,
                isSequentialTwoPlayer: true,
                onComplete: () => {
                    this.boardRenderer.render();
                    this.renderHUD();
                    if (this.whiteTime > 0) this.startClock();
                    if (this.matchOptions.mode === 'ai' && this.matchOptions.playerSide === 'b' && this.rulesEngine.activeColor === 'w') {
                        setTimeout(() => this.triggerAIMove(), 1000);
                    }
                }
            });
            return;
        }

        if (this.whiteTime > 0) this.startClock();
        
        this.checkPendingReinforcements(() => {
            if (this.matchOptions.mode === 'ai' && this.matchOptions.playerSide === 'b' && this.rulesEngine.activeColor === 'w') {
                setTimeout(() => this.triggerAIMove(), 1000);
            }
        });
    }

    showConnectionLostModal() {
        const existing = document.getElementById('modal-conn-lost');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-conn-lost';
        modal.className = 'modal-overlay modal-active';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal-card animate-pop-in" style="text-align: center; padding: 24px; max-width: 360px; background: rgba(30, 20, 20, 0.95); border: 2px solid #ef4444; border-radius: 14px;">
                <div style="font-size: 2.2rem; margin-bottom: 10px;">⚠️</div>
                <h3 style="font-family: var(--font-heading); color: #fff; font-size: 1.2rem; margin-bottom: 6px;">Conexión Perdida</h3>
                <p style="font-size: 0.9rem; color: #fca5a5; margin-bottom: 16px;">
                    Se ha perdido la conexión en tiempo real con el rival.
                </p>
                <button id="btn-conn-lost-menu" class="action-btn primary-btn" style="width: 100%; background: #ef4444;">
                    Volver al Menú Principal
                </button>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#btn-conn-lost-menu')?.addEventListener('click', () => {
            modal.remove();
            this.exitGame('menu', { skipConfirm: true });
        });
    }

    createModalHeaderHtml(side = null) {
        const isWhite = side === 'w';
        const isBlack = side === 'b';
        let sideBadgeHtml = '';
        if (isWhite) {
            sideBadgeHtml = `
                <div style="background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.35); color: #ffffff; padding: 5px 14px; border-radius: 20px; font-weight: bold; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 0 12px rgba(255,255,255,0.25); margin-bottom: 8px;">
                    <span>⚪</span> <span>SELECCIÓN: TURNO DE LAS BLANCAS</span>
                </div>
            `;
        } else if (isBlack) {
            sideBadgeHtml = `
                <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(168, 85, 247, 0.6); color: #e9d5ff; padding: 5px 14px; border-radius: 20px; font-weight: bold; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 0 12px rgba(168,85,247,0.35); margin-bottom: 8px;">
                    <span>⚫</span> <span>SELECCIÓN: TURNO DE LAS NEGRAS</span>
                </div>
            `;
        }

        const hasClock = (this.matchOptions && (this.matchOptions.timeMinutes > 0 || this.matchOptions.timeSeconds > 0));
        const clockText = hasClock
            ? `<div class="modal-live-clock" style="font-size: 0.8rem; background: rgba(0,0,0,0.45); padding: 4px 12px; border-radius: 12px; color: #a7f3d0; border: 1px solid rgba(255,255,255,0.12); margin-bottom: 10px; display: inline-block; font-weight: bold;">
                ⏱️ Tiempo restante — ⚪ ${this.formatTime(this.whiteTime)} | ⚫ ${this.formatTime(this.blackTime)}
               </div>`
            : '';

        return `
            <div class="modal-header-section" style="width: 100%; text-align: center; margin-bottom: 8px;">
                ${sideBadgeHtml}
                ${clockText}
            </div>
        `;
    }

    openBoardInspector({ title = '🔍 Viendo Tablero', badgeHtml = '', modalElement = null, onReopen = null, showResign = true, onResign = null }) {
        this.closeBoardInspector();

        // 1. Ocultar modal previo si existe
        if (modalElement) {
            modalElement.style.display = 'none';
        }

        // 2. Bloqueador de pantalla completa que impide clics en HUD (Opciones, Rendirse, Pasar, Menú) y casillas
        const blocker = document.createElement('div');
        blocker.id = 'board-inspection-blocker';
        blocker.style.position = 'fixed';
        blocker.style.inset = '0';
        blocker.style.width = '100vw';
        blocker.style.height = '100vh';
        blocker.style.zIndex = '99995';
        blocker.style.background = 'rgba(0,0,0,0.01)';
        blocker.style.pointerEvents = 'all';
        blocker.style.touchAction = 'none';

        const stopEvent = (e) => {
            e.stopPropagation();
            e.preventDefault();
        };
        ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click'].forEach(evt => {
            blocker.addEventListener(evt, stopEvent, true);
        });
        document.body.appendChild(blocker);

        // 3. Barra flotante superior unificada
        const bar = document.createElement('div');
        bar.id = 'board-inspection-bar';
        bar.style.position = 'fixed';
        bar.style.top = '15px';
        bar.style.left = '50%';
        bar.style.transform = 'translateX(-50%)';
        bar.style.zIndex = '99999';
        bar.style.background = 'rgba(15, 23, 42, 0.95)';
        bar.style.backdropFilter = 'blur(12px)';
        bar.style.border = '1px solid rgba(52, 211, 153, 0.5)';
        bar.style.borderRadius = '30px';
        bar.style.padding = '8px 18px';
        bar.style.boxShadow = '0 8px 30px rgba(0,0,0,0.8)';
        bar.style.display = 'flex';
        bar.style.gap = '10px';
        bar.style.alignItems = 'center';
        bar.style.maxWidth = '92vw';
        bar.style.flexWrap = 'wrap';
        bar.style.justifyContent = 'center';

        bar.innerHTML = `
            <span style="font-size: 0.85rem; color: #a7f3d0; font-weight: bold; white-space: nowrap;">${title}</span>
            ${badgeHtml ? badgeHtml : ''}
            <button id="btn-inspector-reopen" style="padding: 6px 14px; border-radius: 20px; background: #10b981; color: white; border: none; font-weight: bold; font-size: 0.8rem; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                👁️ Reabrir
            </button>
            ${showResign ? `
                <button id="btn-inspector-resign" style="padding: 6px 14px; border-radius: 20px; background: rgba(239, 68, 68, 0.3); color: #fca5a5; border: 1px solid #ef4444; font-weight: bold; font-size: 0.8rem; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                    🚪 Salir
                </button>
            ` : ''}
        `;

        document.body.appendChild(bar);

        document.getElementById('btn-inspector-reopen')?.addEventListener('click', () => {
            this.closeBoardInspector();
            if (onReopen) {
                onReopen();
            } else if (modalElement) {
                modalElement.style.display = 'flex';
            }
        });

        if (showResign) {
            document.getElementById('btn-inspector-resign')?.addEventListener('click', () => {
                this.closeBoardInspector();
                if (onResign) {
                    onResign();
                } else {
                    this.exitGame('menu');
                }
            });
        }
    }

    closeBoardInspector() {
        document.getElementById('board-inspection-blocker')?.remove();
        document.getElementById('board-inspection-bar')?.remove();
        document.getElementById('modal-board-inspection-bar')?.remove();
        document.getElementById('modal-board-inspection-blocker')?.remove();
        document.getElementById('waiting-inspector-bar')?.remove();
        document.getElementById('game-over-inspector-bar')?.remove();
    }

    attachBoardInspectionBehavior(modal, sideName = 'Elección de Piezas', reinforcementPoints = null) {
        const viewBoardBtn = modal.querySelector('.btn-modal-view-board');
        if (!viewBoardBtn) return;

        viewBoardBtn.addEventListener('click', () => {
            let badgeHtml = '';
            if (reinforcementPoints !== null) {
                badgeHtml = `<span style="background: rgba(245, 158, 11, 0.25); border: 1.5px solid #f59e0b; border-radius: 12px; padding: 2px 8px; font-size: 0.8rem; font-weight: bold; color: #fef3c7;">🛡️ Refuerzos: <strong style="color: #fbbf24;">${reinforcementPoints}</strong></span>`;
            }
            this.openBoardInspector({
                title: `🔍 Viendo Tablero (${sideName})`,
                badgeHtml: badgeHtml,
                modalElement: modal,
                showResign: false
            });
        });
    }

    showBoardInspectionOverlay(modal, sideName, reinforcementPoints = null) {
        let badgeHtml = '';
        if (reinforcementPoints !== null) {
            badgeHtml = `<span style="background: rgba(245, 158, 11, 0.25); border: 1.5px solid #f59e0b; border-radius: 12px; padding: 2px 8px; font-size: 0.8rem; font-weight: bold; color: #fef3c7;">🛡️ Refuerzos: <strong style="color: #fbbf24;">${reinforcementPoints}</strong></span>`;
        }
        this.openBoardInspector({
            title: `🔍 Viendo Tablero (${sideName})`,
            badgeHtml: badgeHtml,
            modalElement: modal,
            showResign: false
        });
    }

    mountModal(modal) {
        if (this.matchOptions?.isTutorial) {
            const sandboxPanel = this.boardContainer?.closest('.tut-sandbox-panel') || this.boardContainer?.parentElement;
            if (sandboxPanel) {
                sandboxPanel.style.position = 'relative';
                modal.style.position = 'absolute';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
                modal.style.borderRadius = '14px';
                modal.style.zIndex = '100';
                sandboxPanel.appendChild(modal);
                return;
            }
        }
        document.body.appendChild(modal);
    }

    openDraftChoiceModal(step, callback) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay modal-active';
        modal.id = 'modal-draft-choice';

        const headerHtml = this.createModalHeaderHtml(step.side);

        modal.innerHTML = `
            <div class="modal-card glass-panel text-center animate-pop-in" style="max-width: 440px;">
                ${headerHtml}
                <h3 style="margin-bottom: 6px;">${step.title}</h3>
                <p style="font-size: 0.85rem; color: #9ca3af; margin-bottom: 16px;">Selecciona la unidad para reclutar en tu ejército</p>
                <div class="draft-choice-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; max-height: 45vh; overflow-y: auto; margin-bottom: 12px;">
                    ${step.options.map(opt => `
                        <button class="draft-opt-btn" data-type="${opt.type}" style="padding: 12px 6px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); color: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                            <span style="font-size: 1.8rem;">${opt.symbol}</span>
                            <span style="font-size: 0.8rem; font-weight: bold;">${opt.name}</span>
                        </button>
                    `).join('')}
                </div>
                <div style="display: flex; gap: 8px; margin-top: 10px;">
                    <button class="btn-modal-view-board action-btn secondary-btn small-btn" style="flex: 1; background: rgba(255,255,255,0.12);">
                        👁️ Ver Tablero
                    </button>
                    <button class="btn-modal-cancel-draft action-btn secondary-btn small-btn" style="flex: 1; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5;">
                        ⬅️ Volver al Menú
                    </button>
                </div>
            </div>
        `;

        this.mountModal(modal);
        this.attachBoardInspectionBehavior(modal, step.side === 'w' ? 'Blancas' : 'Negras');

        modal.querySelector('.btn-modal-cancel-draft')?.addEventListener('click', () => {
            this.exitGame('menu');
        });

        modal.querySelectorAll('.draft-opt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const choice = btn.dataset.type;
                modal.remove();
                callback(choice);
            });
        });
    }

    // =========================================================================
    // CLOCK CONTROL & PAUSE HELPER
    // =========================================================================

    pauseClockTemporarily(maxSeconds = 5, isRemote = false) {
        this.isClockPaused = true;

        if (!isRemote && this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
            NetworkManager.sendPopupPause({
                seconds: maxSeconds,
                whiteTime: this.whiteTime,
                blackTime: this.blackTime
            });
        }

        const resumeTimer = setTimeout(() => {
            this.isClockPaused = false;
        }, maxSeconds * 1000);

        return () => {
            clearTimeout(resumeTimer);
            this.isClockPaused = false;
        };
    }

    startClock() {
        if (this.clockTimer) clearInterval(this.clockTimer);
        this.clockTimer = setInterval(() => {
            if (this.isGameOver || this.isClockPaused || (this.matchOptions.timeMinutes === 0 && !this.matchOptions.timeSeconds)) return;

            if (this.rulesEngine.activeColor === 'w') {
                this.whiteTime = Math.max(0, this.whiteTime - 1);
                if (this.whiteTime === 0) {
                    this.endMatch(`${I18n.get('timeoutNotice')} ${I18n.get('winText')} ${I18n.get('blackPlayer')}`);
                }
            } else {
                this.blackTime = Math.max(0, this.blackTime - 1);
                if (this.blackTime === 0) {
                    this.endMatch(`${I18n.get('timeoutNotice')} ${I18n.get('winText')} ${I18n.get('whitePlayer')}`);
                }
            }
            this.updateClockDisplay();
        }, 1000);
    }

    stopClock() {
        if (this.clockTimer) {
            clearInterval(this.clockTimer);
            this.clockTimer = null;
        }
    }

    formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    updateClockDisplay() {
        const wClock = document.getElementById('clock-white');
        const bClock = document.getElementById('clock-black');
        if (wClock) wClock.textContent = this.formatTime(this.whiteTime);
        if (bClock) bClock.textContent = this.formatTime(this.blackTime);

        // Update live modal clocks
        document.querySelectorAll('.modal-live-clock').forEach(el => {
            el.innerHTML = `⏱️ Tiempo restante — ⚪ ${this.formatTime(this.whiteTime)} | ⚫ ${this.formatTime(this.blackTime)}`;
        });
    }

    // =========================================================================
    // SANDBOX / UNDO SNAPSHOT ENGINE
    // =========================================================================

    saveStateSnapshot() {
        if (!this.boardEngine || !this.rulesEngine) return;
        const snapshot = {
            boardGrid: this.boardEngine.cloneGrid(),
            activeColor: this.rulesEngine.activeColor,
            fullMoveNumber: this.rulesEngine.fullMoveNumber,
            halfMoveClock: this.rulesEngine.halfMoveClock,
            capturedPieces: {
                w: [...this.rulesEngine.capturedPieces.w.map(p => ({ ...p }))],
                b: [...this.rulesEngine.capturedPieces.b.map(p => ({ ...p }))]
            },
            positionHistory: [...this.rulesEngine.positionHistory],
            lastMove: this.boardRenderer?.lastMove ? JSON.parse(JSON.stringify(this.boardRenderer.lastMove)) : null,
            centerStreak: { ...this.centerStreak },
            reinforcementsBank: { ...this.reinforcementsBank }
        };
        if (!this.moveHistoryStack) this.moveHistoryStack = [];
        this.moveHistoryStack.push(snapshot);
    }

    undoMove() {
        if (!this.moveHistoryStack || this.moveHistoryStack.length === 0) return;

        const isAI = (this.matchOptions?.mode === 'ai');
        let snapshot = this.moveHistoryStack.pop();

        // If playing against AI and turn reverted to AI's turn, pop previous state to give turn back to human player
        if (isAI && this.moveHistoryStack.length > 0 && snapshot && snapshot.activeColor !== this.matchOptions.playerSide) {
            snapshot = this.moveHistoryStack.pop();
        }

        if (!snapshot) return;

        this.boardEngine.restoreGrid(snapshot.boardGrid);
        this.rulesEngine.activeColor = snapshot.activeColor;
        this.rulesEngine.fullMoveNumber = snapshot.fullMoveNumber;
        this.rulesEngine.halfMoveClock = snapshot.halfMoveClock;
        this.rulesEngine.capturedPieces = snapshot.capturedPieces;
        this.rulesEngine.positionHistory = snapshot.positionHistory;
        this.centerStreak = snapshot.centerStreak;
        this.reinforcementsBank = snapshot.reinforcementsBank;
        this.boardRenderer.lastMove = snapshot.lastMove;

        this.isGameOver = false;
        this.selectedSquare = null;
        this.selectedLegalMoves = [];
        this.boardRenderer.clearSelection();
        this.boardRenderer.render();
        this.renderHUD();
    }

    // =========================================================================
    // INTERACTION & MOVES
    // =========================================================================

    executeUserMove(fromR, fromC, toR, toC, moveTarget = null) {
        this.saveStateSnapshot();
        const piece = this.boardEngine.getPiece(fromR, fromC);
        if (!piece) return;

        // 1. Mago Spell Choice (Shoot vs Eat)
        if (piece.type === 'c_mago' && moveTarget && moveTarget.type === 'capture') {
            this.openMagoAttackChoicePopup(fromR, fromC, toR, toC, (choice) => {
                if (choice === 'shoot') {
                    const targetPiece = this.boardEngine.getPiece(toR, toC);
                    if (targetPiece) {
                        this.rulesEngine.capturedPieces[piece.color].push(targetPiece);
                        this.boardEngine.setPiece(toR, toC, null);
                        AudioManager.playCapture();
                        this.boardRenderer.render();
                        this.openRotationPopup(fromR, fromC, () => {
                            this.rulesEngine.activeColor = this.rulesEngine.activeColor === 'w' ? 'b' : 'w';
                            if (this.rulesEngine.activeColor === 'w') this.rulesEngine.fullMoveNumber++;
                            if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
                                NetworkManager.sendMagoAttack({
                                    fromR,
                                    fromC,
                                    toR,
                                    toC,
                                    choice: 'shoot',
                                    facing: piece.facing,
                                    stance: piece.stance,
                                    activeColorAfter: this.rulesEngine.activeColor,
                                    whiteTime: this.whiteTime,
                                    blackTime: this.blackTime
                                });
                            }
                            this.finalizeTurn({ success: true, moveRecord: { piece, captured: targetPiece } });
                        });
                    }
                } else if (choice === 'cancel') {
                    // Do nothing
                } else {
                    this.performRegularMove(fromR, fromC, toR, toC);
                }
            });
            return;
        }

        // 2. Gigante Action Choice (Eat vs Throw vs Swap)
        if (piece.type === 'c_gigante' && moveTarget && moveTarget.isGiganteAction) {
            this.openGiganteActionPopup(fromR, fromC, toR, toC, (choice) => {
                if (choice === 'throw') {
                    this.activateGiganteThrowLandingMode(fromR, fromC, toR, toC);
                } else if (choice === 'cancel') {
                    // Do nothing, just return to selection
                } else {
                    this.performRegularMove(fromR, fromC, toR, toC);
                }
            });
            return;
        }
        // 3. Cañón Beam Action
        if (piece.type === 'c_canon' && moveTarget && moveTarget.isCanonBeamTarget) {
            this.fireSelectedCanonBeam();
            return;
        }

        this.performRegularMove(fromR, fromC, toR, toC);
    }

    performRegularMove(fromR, fromC, toR, toC, promotionType = null, isRemote = false, remoteFacing = null, remoteStance = null) {
        const piece = this.boardEngine.getPiece(fromR, fromC);
        if (!piece) return;
        const backRank = piece.color === 'w' ? 0 : (this.boardEngine.rows - 1);
        const isContinentalPawn = ['c_peon', 'c_dama', 'c_lobo', 'c_escudero', 'c_guardia'].includes(piece.type);

        if ((piece.type === 'p' || isContinentalPawn) && toR === backRank && !promotionType && !isRemote) {
            this.openPromotionModal(piece.color, (selectedType) => {
                this.performRegularMove(fromR, fromC, toR, toC, selectedType, isRemote, remoteFacing, remoteStance);
            });
            return;
        }

        if (typeof DebugLogger !== 'undefined') {
            const tag = isRemote ? 'RED' : 'JUEGO';
            DebugLogger.log(tag, `Mover [${piece.color}] ${piece.type}: (${fromR},${fromC}) ➔ (${toR},${toC})`);
        }

        const result = this.rulesEngine.executeMove(fromR, fromC, toR, toC, promotionType, isRemote);
        if (result && result.success) {
            this.consecutiveNoMovesPasses = 0;
            if (result.moveRecord?.special?.type === 'promotion') {
                const promoteType = result.moveRecord.special.promoteTo;
                if (promoteType === 'c_rey' || promoteType === 'k') {
                    if (this.matchOptions?.submode && this.matchOptions.submode.includes('captura_centro')) {
                        const side = piece.color;
                        this.reinforcementsBank[side] = (this.reinforcementsBank[side] || 0) + 4;
                        this.showQuickToast('👑 ¡Promoción a Rey! +4 Puntos de Refuerzo agregados.');
                    }
                }
            }

            if (result.moveRecord.captured) AudioManager.playCapture();
            else AudioManager.playMove();

            if (result.isCheck) AudioManager.playCheck();

            this.boardRenderer.setLastMove({ from: { r: fromR, c: fromC }, to: { r: toR, c: toC } });
            this.selectedSquare = null;
            this.selectedLegalMoves = [];
            this.boardRenderer.clearSelection();

            let pieceAfterMoveRow = toR;
            let pieceAfterMoveCol = toC;
            if (result.moveRecord && result.moveRecord.special && (result.moveRecord.special.type === 'ranged' || result.moveRecord.special.isRanged)) {
                pieceAfterMoveRow = fromR;
                pieceAfterMoveCol = fromC;
            }
            const movedPiece = this.boardEngine.getPiece(pieceAfterMoveRow, pieceAfterMoveCol);

            if (isRemote && movedPiece) {
                if (remoteFacing !== null && remoteFacing !== undefined) movedPiece.facing = remoteFacing;
                if (remoteStance !== null && remoteStance !== undefined) movedPiece.stance = remoteStance;
            }

            const sendMoveNetworkSync = () => {
                if (!isRemote && this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
                    const currentPiece = this.boardEngine.getPiece(pieceAfterMoveRow, pieceAfterMoveCol);
                    NetworkManager.sendMove({
                        fromR,
                        fromC,
                        toR,
                        toC,
                        promotionType,
                        facing: currentPiece ? currentPiece.facing : null,
                        stance: currentPiece ? currentPiece.stance : null,
                        activeColorAfter: this.rulesEngine.activeColor,
                        whiteTime: this.whiteTime,
                        blackTime: this.blackTime,
                        moveNumber: this.rulesEngine.fullMoveNumber
                    });
                }
            };

            // Check Lobo Pack Surge (only for active local player)
            if (!isRemote && piece.type === 'c_lobo') {
                const rearWolves = PieceRegistry.WolfPackHelper
                    ? PieceRegistry.WolfPackHelper.getRearWolves(this.boardEngine, { r: fromR, c: fromC }, piece.color)
                    : [];

                if (rearWolves.length > 0) {
                    this.wolfQueue = [...rearWolves];
                    this.isWolfPromptActive = true;
                    this.processNextWolfPopup(result);
                    sendMoveNetworkSync();
                    return;
                }
            }

            // Check Octogonal Rotation Popup (only for active local player)
            const reg = movedPiece ? PieceRegistry.get(movedPiece.type) : null;
            const isOcto = !isRemote && reg && (
                reg.octogonal || 
                (reg.tags && reg.tags.some(t => String(t).toLowerCase().includes('octo'))) ||
                (typeof window !== 'undefined' && window.CONTINENTAL_TEST_MODE && movedPiece.type === 'c_arquero')
            );

            if (isOcto) {
                this.boardRenderer.render(); // Render piece movement first so the popup anchors correctly to the piece's new position
                this.openRotationPopup(pieceAfterMoveRow, pieceAfterMoveCol, () => {
                    sendMoveNetworkSync();
                    this.finalizeTurn(result);
                });
            } else {
                sendMoveNetworkSync();
                this.finalizeTurn(result);
            }
        }
    }

    // =========================================================================
    // POPUPS: FLOATING ACTION POPUPS (ROTATION, MAGO, GIGANTE, CAÑÓN)
    // =========================================================================

    showFloatingPopup(options) {
        const { title, subtitle, html, square, maxWidth = '320px', onInit } = options;

        const wrapper = document.createElement('div');
        wrapper.className = 'floating-popup-wrapper';
        wrapper.style.position = 'fixed';
        wrapper.style.top = '0';
        wrapper.style.left = '0';
        wrapper.style.width = '100vw';
        wrapper.style.height = '100vh';
        wrapper.style.zIndex = '9999';
        wrapper.style.pointerEvents = 'none';

        const card = document.createElement('div');
        card.className = 'floating-popup-card animate-pop-in';
        card.style.pointerEvents = 'auto';
        card.style.position = 'fixed';
        card.style.maxWidth = maxWidth;
        card.style.background = 'rgba(15, 23, 42, 0.35)';
        card.style.backdropFilter = 'none';
        card.style.webkitBackdropFilter = 'none';
        card.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        card.style.borderRadius = '14px';
        card.style.padding = '14px';
        card.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.6)';
        card.style.color = '#ffffff';
        card.style.textShadow = '0 1px 4px rgba(0, 0, 0, 0.9)';
        card.style.textAlign = 'center';

        card.innerHTML = `
            <button class="close-floating-btn" style="position: absolute; top: 6px; right: 10px; background: transparent; border: none; color: #9ca3af; font-size: 1.2rem; font-weight: bold; cursor: pointer; line-height: 1; text-shadow: none;">&times;</button>
            ${title ? `<h3 style="margin-bottom: 4px; font-size: 1.05rem; color: #ffffff; padding-right: 15px;">${title}</h3>` : ''}
            ${subtitle ? `<p style="font-size: 0.82rem; color: #9ca3af; margin-bottom: 12px; line-height: 1.3;">${subtitle}</p>` : ''}
            ${html || ''}
        `;

        wrapper.appendChild(card);
        document.body.appendChild(wrapper);

        if (square) {
            this.boardRenderer.setSelected({ r: square.r, c: square.c }, []);
        }

        let positioned = false;
        if (square) {
            const squareEl = this.boardContainer?.querySelector(`.board-square[data-row="${square.r}"][data-col="${square.c}"]`);
            if (squareEl) {
                const rect = squareEl.getBoundingClientRect();
                const cardWidth = card.offsetWidth || Math.min(parseInt(maxWidth, 10) || 280, window.innerWidth - 32);
                const cardHeight = card.offsetHeight || 160;

                let left = rect.left + (rect.width / 2) - (cardWidth / 2);
                let top = rect.top - cardHeight - 10;

                if (top < 10) {
                    top = rect.bottom + 10;
                }

                left = Math.max(10, Math.min(left, window.innerWidth - cardWidth - 10));
                top = Math.max(10, Math.min(top, window.innerHeight - cardHeight - 10));

                card.style.left = `${left}px`;
                card.style.top = `${top}px`;
                card.style.transform = 'none';
                positioned = true;
            }
        }

        if (!positioned) {
            card.style.left = '50%';
            card.style.top = '50%';
            card.style.transform = 'translate(-50%, -50%)';
        }

        const close = () => {
            wrapper.remove();
            if (square) {
                this.boardRenderer.clearSelection();
                this.boardRenderer.render();
            }
        };

        const closeBtn = card.querySelector('.close-floating-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                close();
                if (options.onCloseClick) {
                    options.onCloseClick();
                }
            });
        }

        if (onInit) {
            onInit(card, close);
        }

        return close;
    }

    openRotationPopup(r, c, callback) {
        const piece = this.boardEngine.getPiece(r, c);
        if (!piece) { if (callback) callback(); return; }

        const isAI = (this.matchOptions?.mode === 'ai' && piece.color !== this.matchOptions.playerSide);
        if (isAI) {
            if (piece.type === 'c_mago') {
                piece.stance = (Math.random() > 0.5) ? 'soldier' : 'mercenary';
            }
            if (callback) callback();
            return;
        }

        const unpause = this.pauseClockTemporarily(5);

        if (piece.type === 'c_mago') {
            this.openMagoStancePopup(r, c, () => {
                unpause();
                if (callback) callback();
            });
            return;
        }

        const getVisAngle = (base) => this.boardRenderer.flipped ? (base + 180) % 360 : base;

        const dirs = [
            { angle: getVisAngle(315), label: '↖ NW' },
            { angle: getVisAngle(0),   label: '⬆ N' },
            { angle: getVisAngle(45),  label: '↗ NE' },
            { angle: getVisAngle(270), label: '⬅ W' },
            { angle: piece.facing || (piece.color === 'w' ? 0 : 180), label: '🔄 Mantener' },
            { angle: getVisAngle(90),  label: '➡ E' },
            { angle: getVisAngle(225), label: '↙ SW' },
            { angle: getVisAngle(180), label: '⬇ S' },
            { angle: getVisAngle(135), label: '↘ SE' }
        ];

        const html = `
            <div class="rotation-dial-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                ${dirs.map(d => `
                    <button class="rotation-dir-btn" data-angle="${d.angle}" style="padding: 10px 2px; font-size: 0.85rem; font-weight: bold; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.12); color: white; cursor: pointer; transition: background 0.2s;">
                        ${d.label}
                    </button>
                `).join('')}
            </div>
        `;

        this.showFloatingPopup({
            title: '🔄 Rotar Pieza',
            square: { r, c },
            maxWidth: '260px',
            html: html,
            onCloseClick: () => {
                unpause();
                if (callback) callback();
            },
            onInit: (card, close) => {
                card.querySelectorAll('.rotation-dir-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        piece.facing = parseInt(btn.dataset.angle, 10);
                        close();
                        unpause();
                        if (callback) callback();
                    });
                    btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(255,255,255,0.25)');
                    btn.addEventListener('mouseleave', () => btn.style.background = 'rgba(255,255,255,0.12)');
                });
            }
        });
    }

    openMagoStancePopup(r, c, callback) {
        const piece = this.boardEngine.getPiece(r, c);
        const html = `
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="btn-mago-stance" data-stance="soldier" style="padding: 12px 8px; border-radius: 8px; background: #2563eb; color: white; border: none; font-weight: bold; cursor: pointer; flex: 1;">
                    ⚔️ Forma Soldado<br><span style="font-size: 0.75rem; font-weight: normal;">(2 Ortogonal + 1 Diagonal)</span>
                </button>
                <button class="btn-mago-stance" data-stance="mercenary" style="padding: 12px 8px; border-radius: 8px; background: #d97706; color: white; border: none; font-weight: bold; cursor: pointer; flex: 1;">
                    🗡️ Forma Mercenario<br><span style="font-size: 0.75rem; font-weight: normal;">(2 Diagonal + 1 Ortogonal)</span>
                </button>
            </div>
        `;

        this.showFloatingPopup({
            title: '🧙 Postura del Mago',
            subtitle: 'Elige la forma de combate del Mago',
            square: { r, c },
            maxWidth: '340px',
            html: html,
            onCloseClick: () => {
                if (callback) callback('cancel');
            },
            onInit: (card, close) => {
                card.querySelectorAll('.btn-mago-stance').forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (piece) piece.stance = btn.dataset.stance;
                        close();
                        if (callback) callback();
                    });
                });
            }
        });
    }

    openMagoAttackChoicePopup(fromR, fromC, toR, toC, callback) {
        const unpause = this.pauseClockTemporarily(5);
        const html = `
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="btn-mago-shoot" style="padding: 12px; border-radius: 8px; background: #9333ea; color: white; border: none; font-weight: bold; cursor: pointer; flex: 1;">
                    🏹 Disparar Hechizo<br><span style="font-size: 0.75rem; font-weight: normal;">(A distancia, no te mueves)</span>
                </button>
                <button id="btn-mago-eat" style="padding: 12px; border-radius: 8px; background: #dc2626; color: white; border: none; font-weight: bold; cursor: pointer; flex: 1;">
                    ⚔️ Comer<br><span style="font-size: 0.75rem; font-weight: normal;">(Te desplazas a la casilla)</span>
                </button>
            </div>
        `;

        this.showFloatingPopup({
            title: '🧙‍♂️ Hechizo del Mago',
            subtitle: '¿Cómo deseas eliminar a la pieza enemiga?',
            square: { r: fromR, c: fromC },
            maxWidth: '330px',
            html: html,
            onCloseClick: () => {
                unpause();
                callback('cancel');
            },
            onInit: (card, close) => {
                card.querySelector('#btn-mago-shoot')?.addEventListener('click', () => {
                    close();
                    unpause();
                    callback('shoot');
                });
                card.querySelector('#btn-mago-eat')?.addEventListener('click', () => {
                    close();
                    unpause();
                    callback('eat');
                });
            }
        });
    }

    openGiganteActionPopup(fromR, fromC, targetR, targetC, callback) {
        const unpause = this.pauseClockTemporarily(5);
        const gigPiece = this.boardEngine.getPiece(fromR, fromC);

        // Check if an enemy Defensor is defending against this Gigante
        let isDefendedByDefensor = false;
        const targetPiece = this.boardEngine.getPiece(targetR, targetC);
        if (targetPiece && targetPiece.type === 'c_defensor' && targetPiece.color !== gigPiece.color) {
            if (PieceRegistry.isDefenderShieldingAgainst && PieceRegistry.isDefenderShieldingAgainst(this.boardEngine, { r: targetR, c: targetC }, { r: fromR, c: fromC })) {
                isDefendedByDefensor = true;
            }
        }

        const throwBtnHtml = isDefendedByDefensor ? `
            <button id="btn-gigante-throw-disabled" disabled style="padding: 12px; border-radius: 8px; background: #4b5563; color: #9ca3af; border: none; font-weight: bold; cursor: not-allowed; flex: 1; opacity: 0.6;">
                🛡️ Arrojar Bloqueado<br><span style="font-size: 0.72rem; font-weight: normal;">(Escudo de Defensor)</span>
            </button>
        ` : `
            <button id="btn-gigante-throw" style="padding: 12px; border-radius: 8px; background: #f59e0b; color: white; border: none; font-weight: bold; cursor: pointer; flex: 1;">
                ☄️ Arrojar<br><span style="font-size: 0.75rem; font-weight: normal;">(Lanzar)</span>
            </button>
        `;

        const html = `
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="btn-gigante-eat" style="padding: 12px; border-radius: 8px; background: #dc2626; color: white; border: none; font-weight: bold; cursor: pointer; flex: 1;">
                    🥩 Devorar<br><span style="font-size: 0.75rem; font-weight: normal;">(Comer)</span>
                </button>
                ${throwBtnHtml}
            </div>
        `;

        this.showFloatingPopup({
            title: '🗿 Fuerza del Gigante',
            subtitle: 'Elige la acción sobre la pieza adyacente:',
            square: { r: fromR, c: fromC },
            maxWidth: '380px',
            html: html,
            onCloseClick: () => {
                unpause();
                callback('cancel');
            },
            onInit: (card, close) => {
                card.querySelector('#btn-gigante-eat')?.addEventListener('click', () => {
                    close();
                    unpause();
                    callback('eat');
                });
                card.querySelector('#btn-gigante-throw')?.addEventListener('click', () => {
                    close();
                    unpause();
                    callback('throw');
                });
            }
        });
    }

    activateGiganteThrowLandingMode(fromR, fromC, targetR, targetC) {
        const gigPiece = this.boardEngine.getPiece(fromR, fromC);
        const targetPiece = this.boardEngine.getPiece(targetR, targetC);
        
        if (targetPiece && targetPiece.type === 'c_defensor' && targetPiece.color !== gigPiece.color) {
            if (PieceRegistry.isDefenderShieldingAgainst && PieceRegistry.isDefenderShieldingAgainst(this.boardEngine, { r: targetR, c: targetC }, { r: fromR, c: fromC })) {
                return;
            }
        }

        this.isThrowMode = true;
        
        const thrownPiece = this.boardEngine.getPiece(targetR, targetC);
        this.throwData = { fromR, fromC, targetR, targetC, thrownPiece };

        const landingMoves = [];
        // 1-square radius around the grabbed piece (targetR, targetC)
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const tr = targetR + dr;
                const tc = targetC + dc;
                if (this.boardEngine.isInBounds(tr, tc) && !(tr === targetR && tc === targetC) && !(tr === fromR && tc === fromC)) {
                    landingMoves.push({ r: tr, c: tc, type: 'throw-target' });
                }
            }
        }

        this.selectedSquare = { r: targetR, c: targetC };
        this.selectedLegalMoves = landingMoves;
        this.boardRenderer.setSelected(this.selectedSquare, landingMoves);
    }

    executeGiganteThrowLanding(landingR, landingC) {
        if (!this.throwData) return;
        const { fromR, fromC, targetR, targetC, thrownPiece } = this.throwData;
        const isValid = this.selectedLegalMoves.some(m => m.r === landingR && m.c === landingC);
        if (!isValid) return;

        // Remove the thrown piece from its original square
        this.boardEngine.setPiece(targetR, targetC, null);

        const squashedPiece = this.boardEngine.getPiece(landingR, landingC);
        const gig = this.boardEngine.getPiece(fromR, fromC);
        
        if (squashedPiece) {
            // Both the thrown piece and the squashed piece die!
            AudioManager.playCapture();
            this.rulesEngine.capturedPieces[this.rulesEngine.activeColor].push(squashedPiece);
            this.rulesEngine.capturedPieces[this.rulesEngine.activeColor].push(thrownPiece);
            this.boardEngine.setPiece(landingR, landingC, null);

            // Escudero retribution: clear capturedLastTurn on active color pieces and mark Gigante
            for (let r = 0; r < this.boardEngine.rows; r++) {
                for (let c = 0; c < this.boardEngine.cols; c++) {
                    const p = this.boardEngine.getPiece(r, c);
                    if (p && p.color === this.rulesEngine.activeColor) {
                        p.capturedLastTurn = false;
                    }
                }
            }
            if (gig) {
                gig.capturedLastTurn = true;
            }
        } else {
            // Thrown piece lands safely
            AudioManager.playMove();
            this.boardEngine.setPiece(landingR, landingC, thrownPiece);
        }

        this.isThrowMode = false;
        this.throwData = null;
        this.selectedSquare = null;
        this.selectedLegalMoves = [];
        this.boardRenderer.clearSelection();

        this.rulesEngine.activeColor = this.rulesEngine.activeColor === 'w' ? 'b' : 'w';
        if (this.rulesEngine.activeColor === 'w') this.rulesEngine.fullMoveNumber++;

        if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
            NetworkManager.sendGiganteThrow({
                fromR,
                fromC,
                targetR,
                targetC,
                landingR,
                landingC,
                activeColorAfter: this.rulesEngine.activeColor,
                whiteTime: this.whiteTime,
                blackTime: this.blackTime
            });
        }

        this.finalizeTurn({ success: true, moveRecord: { piece: gig || thrownPiece, captured: squashedPiece } });
    }

    fireSelectedCanonBeam() {
        if (!this.selectedSquare) return;
        const { r, c } = this.selectedSquare;
        const piece = this.boardEngine.getPiece(r, c);
        if (!piece || piece.type !== 'c_canon') return;

        this.saveStateSnapshot();

        const beamResult = PieceRegistry.fireCanonBeam(this.boardEngine, r, c);
        if (beamResult.destroyed.length > 0) {
            AudioManager.playCapture();
            let killedEnemy = false;
            beamResult.destroyed.forEach(d => {
                this.rulesEngine.capturedPieces[piece.color].push(d.piece);
                if (d.piece.color !== piece.color) {
                    killedEnemy = true;
                }
            });

            if (killedEnemy) {
                // Clear capturedLastTurn on active color pieces
                for (let i = 0; i < this.boardEngine.rows; i++) {
                    for (let j = 0; j < this.boardEngine.cols; j++) {
                        const p = this.boardEngine.getPiece(i, j);
                        if (p && p.color === piece.color) {
                            p.capturedLastTurn = false;
                        }
                    }
                }
                piece.capturedLastTurn = true;
            }
        } else {
            AudioManager.playMove();
        }

        this.selectedSquare = null;
        this.selectedLegalMoves = [];
        this.boardRenderer.clearSelection();
        this.boardRenderer.render(); // Update visual state before popup

        this.openRotationPopup(r, c, () => {
            this.rulesEngine.activeColor = this.rulesEngine.activeColor === 'w' ? 'b' : 'w';
            if (this.rulesEngine.activeColor === 'w') this.rulesEngine.fullMoveNumber++;

            // Update Cañón cooldowns for incoming active player
            for (let i = 0; i < this.boardEngine.rows; i++) {
                for (let j = 0; j < this.boardEngine.cols; j++) {
                    const p = this.boardEngine.getPiece(i, j);
                    if (p && p.color === this.rulesEngine.activeColor && p.type === 'c_canon') {
                        if (p.cooldownActive) {
                            p.cooldownActive = false;
                            p.usedBeamLastTurn = false;
                            p.justFired = false;
                        } else if (p.usedBeamLastTurn || p.justFired) {
                            p.justFired = false;
                            p.cooldownActive = true;
                        }
                    }
                }
            }

            if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
                NetworkManager.sendCanonBeam({
                    r,
                    c,
                    facing: piece.facing,
                    activeColorAfter: this.rulesEngine.activeColor,
                    whiteTime: this.whiteTime,
                    blackTime: this.blackTime
                });
            }

            this.finalizeTurn({ success: true, moveRecord: { piece } });
        });
    }

    getSquareCoordLabel(r, c) {
        if (this.boardEngine.rows === 7) {
            const ranks = ['g', 'f', 'e', 'd', 'c', 'b', 'a'];
            const rank = ranks[r] || 'a';
            const file = (c + 1).toString();
            return `${rank}${file}`;
        } else {
            const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            const file = files[c] || 'a';
            const rank = (this.boardEngine.rows - r).toString();
            return `${file}${rank}`;
        }
    }

    openPassAndRotateModal() {
        if (this.matchOptions?.mode === 'lan' && this.rulesEngine.activeColor !== this.matchOptions.playerSide) {
            return;
        }
        if (this.matchOptions?.mode === 'ai' && this.rulesEngine.activeColor !== this.matchOptions.playerSide) {
            return;
        }

        const unpause = this.pauseClockTemporarily(5);
        const myOctoPieces = [];

        for (let r = 0; r < this.boardEngine.rows; r++) {
            for (let c = 0; c < this.boardEngine.cols; c++) {
                const p = this.boardEngine.getPiece(r, c);
                if (p && p.color === this.rulesEngine.activeColor) {
                    const reg = PieceRegistry.get(p.type);
                    const isOcto = reg && (
                        reg.octogonal || 
                        (reg.tags && reg.tags.some(t => String(t).toLowerCase().includes('octo'))) ||
                        (typeof window !== 'undefined' && window.CONTINENTAL_TEST_MODE && p.type === 'c_arquero')
                    );
                    if (isOcto) {
                        myOctoPieces.push({ r, c, piece: p, name: reg.name.es, symbol: reg.symbol });
                    }
                }
            }
        }

        let contentHtml = '';
        if (myOctoPieces.length === 0) {
            contentHtml = `
                <p style="font-size: 0.85rem; color: #9ca3af; margin-bottom: 14px;">No tienes piezas octogonales para rotar.</p>
                <button class="action-btn primary-btn btn-confirm-pass" style="width: 100%; margin-bottom: 8px;">⏳ Solo Pasar Turno</button>
            `;
        } else {
            contentHtml = `
                <p style="font-size: 0.85rem; color: #9ca3af; margin-bottom: 14px;">Elige una pieza para rotar antes de ceder el turno:</p>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${myOctoPieces.map((op, idx) => `
                        <button class="btn-select-pass-rot" data-idx="${idx}" style="padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08); color: white; font-weight: bold; cursor: pointer;">
                            ${op.symbol} ${op.name} (${this.getSquareCoordLabel(op.r, op.c)})
                        </button>
                    `).join('')}
                </div>
            `;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay modal-active';
        modal.innerHTML = `
            <div class="modal-card glass-panel text-center animate-pop-in" style="max-width: 340px;">
                <h3 style="margin-bottom: 6px;">⏳ Pasar Turno</h3>
                ${contentHtml}
                <div style="margin-top: 15px;">
                    <button class="action-btn secondary-btn btn-cancel-pass-rot" style="width: 100%;">Cancelar</button>
                </div>
            </div>
        `;
        this.mountModal(modal);

        modal.querySelector('.btn-cancel-pass-rot').addEventListener('click', () => {
            modal.remove();
            unpause();
        });

        if (myOctoPieces.length === 0) {
            modal.querySelector('.btn-confirm-pass').addEventListener('click', () => {
                modal.remove();
                unpause();
                this.saveStateSnapshot();
                const nextColor = this.rulesEngine.activeColor === 'w' ? 'b' : 'w';
                if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
                    NetworkManager.sendPassTurn({
                        rotatedPiece: null,
                        activeColorAfter: nextColor,
                        whiteTime: this.whiteTime,
                        blackTime: this.blackTime
                    });
                }
                this.rulesEngine.activeColor = nextColor;
                if (this.rulesEngine.activeColor === 'w') this.rulesEngine.fullMoveNumber++;
                this.finalizeTurn({ success: true, moveRecord: { passed: true } });
            });
        } else {
            modal.querySelectorAll('.btn-select-pass-rot').forEach(btn => {
                btn.addEventListener('click', () => {
                    const selected = myOctoPieces[parseInt(btn.dataset.idx, 10)];
                    modal.remove();
                    unpause();
                    this.saveStateSnapshot();
                    this.openRotationPopup(selected.r, selected.c, () => {
                        const nextColor = this.rulesEngine.activeColor === 'w' ? 'b' : 'w';
                        if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
                            NetworkManager.sendPassTurn({
                                rotatedPiece: { r: selected.r, c: selected.c, facing: selected.piece.facing, stance: selected.piece.stance },
                                activeColorAfter: nextColor,
                                whiteTime: this.whiteTime,
                                blackTime: this.blackTime
                            });
                        }
                        this.rulesEngine.activeColor = nextColor;
                        if (this.rulesEngine.activeColor === 'w') this.rulesEngine.fullMoveNumber++;
                        this.finalizeTurn({ success: true, moveRecord: { piece: selected.piece } });
                    });
                });
            });
        }
    }

    // =========================================================================
    // DRAW & REINFORCEMENTS NEGOTIATION
    // =========================================================================

    handleDrawOrReinforcementRequest() {
        if (this.matchOptions?.mode === 'lan') {
            const proposingSide = this.matchOptions.playerSide;
            const proposingName = (typeof NetworkManager !== 'undefined' ? NetworkManager.playerName : '') || (proposingSide === 'w' ? 'Blancas' : 'Negras');
            if (typeof NetworkManager !== 'undefined') {
                NetworkManager.sendDrawRequest({ proposingSide, proposingName });
            }
            this.showDrawProposalWaitingModal();
            return;
        }

        const proposingSide = this.rulesEngine.activeColor;
        const recipientSide = proposingSide === 'w' ? 'b' : 'w';
        const proposingName = proposingSide === 'w' ? 'Blancas' : 'Negras';
        const recipientName = recipientSide === 'w' ? 'Blancas' : 'Negras';

        const unpause = this.pauseClockTemporarily(5);
        const isRecipientAI = (this.matchOptions?.mode === 'ai' && recipientSide !== this.matchOptions.playerSide);

        const modal = document.createElement('div');
        modal.className = 'modal-overlay modal-active';
        
        const headerHtml = this.createModalHeaderHtml(recipientSide);

        modal.innerHTML = `
            <div class="modal-card glass-panel text-center animate-pop-in" style="max-width: 420px;">
                ${headerHtml}
                <h3>🤝 Solicitud de Tablas y Refuerzos</h3>
                <p style="font-size: 0.9rem; color: #a7f3d0; margin-top: 8px; margin-bottom: 12px; line-height: 1.4;">
                    El jugador <strong>${proposingName}</strong> propone negociar Tablas y recibir Puntos de Refuerzo.
                </p>
                <p style="font-size: 0.82rem; color: #9ca3af; margin-bottom: 16px;">
                    ¿Aceptas la solicitud para entrar a la negociación de puntos?
                </p>
                <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                    <button id="btn-draw-req-accept" class="action-btn primary-btn" style="flex: 1; background: #16a34a;">
                        ✅ Aceptar Propuesta
                    </button>
                    <button id="btn-draw-req-reject" class="action-btn secondary-btn" style="flex: 1; background: #dc2626;">
                        ❌ Rechazar
                    </button>
                </div>
                <button class="btn-modal-view-board action-btn secondary-btn small-btn" style="width: 100%; background: rgba(255,255,255,0.12);">
                    👁️ Ver Tablero
                </button>
            </div>
        `;

        this.mountModal(modal);
        this.attachBoardInspectionBehavior(modal, recipientName);

        const onAccept = () => {
            modal.remove();
            unpause();
            this.openDrawNegotiationModal();
        };

        const onReject = () => {
            modal.remove();
            unpause();
            this.showQuickToast(`❌ ${recipientName} no aceptó la propuesta de tablas y refuerzos.`);
        };

        if (isRecipientAI) {
            setTimeout(() => {
                if (Math.random() < 0.8) {
                    onAccept();
                } else {
                    onReject();
                }
            }, 800);
            return;
        }

        document.getElementById('btn-draw-req-accept')?.addEventListener('click', onAccept);
        document.getElementById('btn-draw-req-reject')?.addEventListener('click', onReject);
    }

    showDrawProposalWaitingModal() {
        const existing = document.getElementById('modal-draw-proposal-waiting');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'modal-draw-proposal-waiting';
        modal.className = 'modal-overlay modal-active';
        modal.style.zIndex = '9998';
        modal.innerHTML = `
            <div class="modal-card animate-pop-in" style="text-align: center; padding: 24px; max-width: 360px; background: rgba(15, 23, 42, 0.95); border: 2px solid rgba(59, 130, 246, 0.5); border-radius: 14px; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
                <div style="font-size: 2.2rem; margin-bottom: 8px;">🤝</div>
                <h3 style="font-family: var(--font-heading); color: #fff; font-size: 1.15rem; margin-bottom: 6px;">Propuesta Enviada</h3>
                <p style="font-size: 0.88rem; color: #93c5fd; margin-bottom: 14px; line-height: 1.4;">
                    Esperando que el rival responda a la solicitud de Tablas y Refuerzos...
                </p>
                <div class="loading-spinner" style="margin: 0 auto 16px auto; width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <button class="btn-modal-view-board action-btn secondary-btn small-btn" style="width: 100%; background: rgba(255,255,255,0.12);">
                    👁️ Ver Tablero
                </button>
            </div>
        `;
        this.mountModal(modal);
        this.attachBoardInspectionBehavior(modal, 'Oferta de Tablas');
    }

    handleDrawProposalReceivedFromOpponent(data) {
        const proposingName = data?.proposingName || 'El rival';
        const unpause = this.pauseClockTemporarily(5);

        const modal = document.createElement('div');
        modal.id = 'modal-draw-opponent-proposal';
        modal.className = 'modal-overlay modal-active';
        modal.innerHTML = `
            <div class="modal-card glass-panel text-center animate-pop-in" style="max-width: 400px; padding: 22px;">
                <div style="font-size: 2.5rem; margin-bottom: 8px;">🤝</div>
                <h3 style="margin-bottom: 8px; font-size: 1.2rem;">Solicitud de Tablas y Refuerzos</h3>
                <p style="font-size: 0.9rem; color: #a7f3d0; margin-bottom: 12px; line-height: 1.4;">
                    El jugador <strong>${proposingName}</strong> propone negociar Tablas y recibir Puntos de Refuerzo.
                </p>
                <p style="font-size: 0.82rem; color: #9ca3af; margin-bottom: 16px;">
                    ¿Aceptas la solicitud para entrar a la negociación de refuerzos?
                </p>
                <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                    <button id="btn-lan-draw-accept" class="action-btn primary-btn" style="flex: 1; background: #16a34a; font-weight: bold;">
                        ✅ Aceptar Propuesta
                    </button>
                    <button id="btn-lan-draw-reject" class="action-btn secondary-btn" style="flex: 1; background: #dc2626; font-weight: bold;">
                        ❌ Rechazar
                    </button>
                </div>
                <button class="btn-modal-view-board action-btn secondary-btn small-btn" style="width: 100%; background: rgba(255,255,255,0.12);">
                    👁️ Ver Tablero
                </button>
            </div>
        `;
        this.mountModal(modal);
        this.attachBoardInspectionBehavior(modal, 'Tablas');

        modal.querySelector('#btn-lan-draw-accept')?.addEventListener('click', () => {
            modal.remove();
            unpause();
            if (typeof NetworkManager !== 'undefined') {
                NetworkManager.sendDrawResponse({ accepted: true });
            }
            this.openDrawNegotiationModal();
        });

        modal.querySelector('#btn-lan-draw-reject')?.addEventListener('click', () => {
            modal.remove();
            unpause();
            if (typeof NetworkManager !== 'undefined') {
                NetworkManager.sendDrawResponse({ accepted: false });
            }
        });
    }

    handleDrawProposalResponseFromOpponent(data) {
        document.getElementById('modal-draw-proposal-waiting')?.remove();
        if (data && data.accepted) {
            this.showQuickToast('✅ ¡El rival aceptó la propuesta de Tablas y Refuerzos!');
            this.openDrawNegotiationModal();
        } else {
            this.showQuickToast('❌ El rival rechazó la propuesta de Tablas y Refuerzos.');
        }
    }

    showQuickToast(msg) {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '80px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.zIndex = '999999';
        toast.style.background = 'rgba(15, 23, 42, 0.95)';
        toast.style.color = '#ffffff';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '25px';
        toast.style.border = '1px solid rgba(255,255,255,0.2)';
        toast.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)';
        toast.style.fontWeight = 'bold';
        toast.style.fontSize = '0.85rem';
        toast.style.pointerEvents = 'none';
        toast.textContent = msg;

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }

    openDrawNegotiationModal(onComplete) {
        this.drawCount++;
        if (this.drawCount >= 3) {
            this.endMatch('¡TABLAS DEFINITIVAS! Se ha alcanzado el límite de 3 empates en la partida.');
            if (onComplete) onComplete();
            return;
        }

        const unpause = this.pauseClockTemporarily(5);
        const maxPts = this.drawCount === 1 ? 8 : 4;
        const defaultPts = this.drawCount === 1 ? 4 : 2;

        let currentRound = 1;
        let lastProposal = null;
        const isLan = (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined');
        const mySide = this.matchOptions?.playerSide;

        const showWaitingModal = (sideToWait) => {
            const existing = document.getElementById('modal-draw-bid-waiting');
            if (existing) existing.remove();
            const sideName = sideToWait === 'w' ? 'Blancas' : 'Negras';
            const modal = document.createElement('div');
            modal.id = 'modal-draw-bid-waiting';
            modal.className = 'modal-overlay modal-active';
            modal.style.zIndex = '9998';
            modal.innerHTML = `
                <div class="modal-card animate-pop-in text-center" style="padding: 24px; max-width: 360px; background: rgba(15, 23, 42, 0.95); border: 2px solid rgba(59, 130, 246, 0.5); border-radius: 14px; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
                    <div style="font-size: 2.2rem; margin-bottom: 8px;">⏳</div>
                    <h3 style="font-family: var(--font-heading); color: #fff; font-size: 1.15rem; margin-bottom: 6px;">Negociación de Refuerzos</h3>
                    <p style="font-size: 0.88rem; color: #93c5fd; margin-bottom: 14px; line-height: 1.4;">
                        Esperando la oferta o respuesta de <strong>${sideName}</strong>...
                    </p>
                    <div class="loading-spinner" style="margin: 0 auto 16px auto; width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <button class="btn-modal-view-board action-btn secondary-btn small-btn" style="width: 100%; background: rgba(255,255,255,0.12);">
                        👁️ Ver Tablero
                    </button>
                </div>
            `;
            this.mountModal(modal);
            this.attachBoardInspectionBehavior(modal, 'Negociación');
        };

        const closeWaitingModal = () => {
            document.getElementById('modal-draw-bid-waiting')?.remove();
            this.closeBoardInspector();
        };

        if (isLan) {
            this.handleDrawBidReceived = (data) => {
                closeWaitingModal();
                if (data.action === 'accept') {
                    unpause();
                    this.showQuickToast(`🤝 ¡Acuerdo de ${data.points} puntos de refuerzo!`);
                    this.startReinforcementsPlacement(data.points, onComplete);
                } else if (data.action === 'pure_draw') {
                    unpause();
                    this.endMatch('Tablas acordadas mutuamente entre ambos bandos.');
                    if (onComplete) onComplete();
                } else if (data.action === 'propose') {
                    lastProposal = data.points;
                    currentRound = data.round || (currentRound + 1);
                    if (currentRound > 4) {
                        unpause();
                        this.showQuickToast(`🤝 4 rondas cumplidas: acuerdo automático de ${defaultPts} puntos.`);
                        this.startReinforcementsPlacement(defaultPts, onComplete);
                    } else {
                        runNegotiationRound(mySide);
                    }
                }
            };
        }

        const runNegotiationRound = (side) => {
            if (isLan && side !== mySide) {
                showWaitingModal(side);
                return;
            }

            const sideName = side === 'w' ? 'Blancas' : 'Negras';
            const modal = document.createElement('div');
            modal.className = 'modal-overlay modal-active';

            const headerHtml = this.createModalHeaderHtml(side);

            modal.innerHTML = `
                <div class="modal-card glass-panel text-center animate-pop-in" style="max-width: 420px;">
                    ${headerHtml}
                    <h3>🤝 Tablas y Refuerzos (${this.drawCount}ª Vez)</h3>
                    <p style="font-size: 0.82rem; color: #a7f3d0; margin-bottom: 8px; line-height: 1.4;">
                        💡 <strong>Los puntos que elijas son Puntos de Refuerzo</strong> que recibirán ambos bandos para convocar nuevas tropas al tablero.
                    </p>
                    <p style="font-size: 0.85rem; color: #9ca3af; margin-bottom: 12px;">Ronda ${currentRound} de 4 — Turno de ${sideName}</p>
                    ${lastProposal ? `
                        <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 6px; padding: 4px 10px; margin: 4px auto 12px auto; display: inline-block;">
                            <span style="font-size: 1.15rem; font-weight: bold; color: #fbbf24; text-shadow: 0 0 5px rgba(245, 158, 11, 0.5);">
                                🛡️ Propuesta del rival: ${lastProposal} Puntos
                            </span>
                        </div>
                    ` : ''}
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                            ${Array.from({ length: maxPts }, (_, i) => i + 1).map(num => `
                                <button class="btn-bid-num" data-num="${num}" style="width: 36px; height: 36px; border-radius: 6px; background: rgba(255,255,255,0.12); color: white; font-weight: bold; border: 1px solid rgba(255,255,255,0.2); cursor: pointer;">
                                    ${num}
                                </button>
                            `).join('')}
                        </div>
                        <div style="display: flex; gap: 8px; margin-top: 10px;">
                            ${lastProposal ? `<button id="btn-bid-accept" style="flex: 1; padding: 10px; border-radius: 8px; background: #16a34a; color: white; font-weight: bold; border: none; cursor: pointer;">✅ Aceptar ${lastProposal} Puntos</button>` : ''}
                            <button id="btn-bid-draw" style="flex: 1; padding: 10px; border-radius: 8px; background: #4b5563; color: white; font-weight: bold; border: none; cursor: pointer;">🤝 Pedir Tablas</button>
                        </div>
                        <button class="btn-modal-view-board action-btn secondary-btn small-btn" style="width: 100%; margin-top: 8px; background: rgba(255,255,255,0.12);">
                            👁️ Ver Tablero
                        </button>
                    </div>
                </div>
            `;
            this.mountModal(modal);
            this.attachBoardInspectionBehavior(modal, sideName);

            const isAI = (this.matchOptions?.mode === 'ai' && side !== this.matchOptions.playerSide);
            if (isAI) {
                setTimeout(() => {
                    modal.remove();
                    if (lastProposal) {
                        unpause();
                        this.startReinforcementsPlacement(lastProposal, onComplete);
                    } else {
                        lastProposal = defaultPts;
                        currentRound++;
                        runNegotiationRound(side === 'w' ? 'b' : 'w');
                    }
                }, 1000);
                return;
            }

            modal.querySelectorAll('.btn-bid-num').forEach(btn => {
                btn.addEventListener('click', () => {
                    const chosen = parseInt(btn.dataset.num, 10);
                    modal.remove();

                    if (lastProposal && chosen === lastProposal) {
                        if (isLan) NetworkManager.sendDrawBid({ action: 'accept', points: chosen, side });
                        unpause();
                        this.startReinforcementsPlacement(chosen, onComplete);
                    } else {
                        lastProposal = chosen;
                        currentRound++;
                        if (currentRound > 4) {
                            if (isLan) NetworkManager.sendDrawBid({ action: 'accept', points: defaultPts, side });
                            unpause();
                            this.startReinforcementsPlacement(defaultPts, onComplete);
                        } else {
                            if (isLan) NetworkManager.sendDrawBid({ action: 'propose', points: chosen, round: currentRound, side });
                            runNegotiationRound(side === 'w' ? 'b' : 'w');
                        }
                    }
                });
            });

            document.getElementById('btn-bid-accept')?.addEventListener('click', () => {
                modal.remove();
                if (isLan) NetworkManager.sendDrawBid({ action: 'accept', points: lastProposal, side });
                unpause();
                this.startReinforcementsPlacement(lastProposal, onComplete);
            });

            document.getElementById('btn-bid-draw')?.addEventListener('click', () => {
                modal.remove();
                if (isLan) NetworkManager.sendDrawBid({ action: 'pure_draw', side });
                unpause();
                this.endMatch('Tablas acordadas mutuamente entre ambos bandos.');
                if (onComplete) onComplete();
            });
        };

        runNegotiationRound('w');
    }

    startReinforcementsPlacement(points, onComplete) {
        this.startUnifiedReinforcementFlow({
            side: 'w',
            points: points,
            isSequentialTwoPlayer: true,
            onComplete: onComplete
        });
    }

    startUnifiedReinforcementFlow({ side, points, isSequentialTwoPlayer, onComplete }) {
        const isLan = (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined');
        const mySide = this.matchOptions?.playerSide;

        if (!isSequentialTwoPlayer) {
            // Single player reinforcement (e.g. King reinforcement in Captura el Centro)
            if (isLan) {
                if (side === mySide) {
                    NetworkManager.sendReinforcementWaiting({ side });
                    this.openPlacementModal(side, points, (remaining) => {
                        this.reinforcementsBank[side] = remaining;
                        NetworkManager.sendReinforcementDone({ side, bankedPoints: remaining });
                        this.boardRenderer.render();
                        this.renderHUD();
                        if (onComplete) onComplete();
                    });
                } else {
                    this.showReinforcementWaitingModal(side);
                    this.pendingReinforcementNextStep = () => {
                        this.boardRenderer.render();
                        this.renderHUD();
                        if (onComplete) onComplete();
                    };
                }
            } else {
                this.openPlacementModal(side, points, (remaining) => {
                    this.reinforcementsBank[side] = remaining;
                    this.boardRenderer.render();
                    this.renderHUD();
                    if (onComplete) onComplete();
                });
            }
            return;
        }

        // Sequential 2-player flow (White first, then Black)
        const runSide = (currSide, nextSide) => {
            if (isLan) {
                if (currSide === mySide) {
                    NetworkManager.sendReinforcementWaiting({ side: currSide });
                    this.openPlacementModal(currSide, points, (rem) => {
                        this.reinforcementsBank[currSide] += rem;
                        NetworkManager.sendReinforcementDone({ side: currSide, bankedPoints: this.reinforcementsBank[currSide] });
                        if (nextSide) {
                            runSide(nextSide, null);
                        } else {
                            this.boardRenderer.render();
                            this.renderHUD();
                            if (onComplete) onComplete();
                        }
                    });
                } else {
                    this.showReinforcementWaitingModal(currSide);
                    this.pendingReinforcementNextStep = () => {
                        if (nextSide) {
                            runSide(nextSide, null);
                        } else {
                            this.boardRenderer.render();
                            this.renderHUD();
                            if (onComplete) onComplete();
                        }
                    };
                }
            } else {
                this.openPlacementModal(currSide, points, (rem) => {
                    this.reinforcementsBank[currSide] += rem;
                    if (nextSide) {
                        runSide(nextSide, null);
                    } else {
                        this.boardRenderer.render();
                        this.renderHUD();
                        if (onComplete) onComplete();
                    }
                });
            }
        };

        runSide('w', 'b');
    }

    showReinforcementWaitingModal(side) {
        this.closeReinforcementWaitingModal();
        const sideName = side === 'w' ? 'Blancas ⚪' : 'Negras ⚫';
        const modal = document.createElement('div');
        modal.id = 'modal-reinforcement-waiting';
        modal.className = 'modal-overlay modal-active';
        modal.style.zIndex = '9998';
        modal.innerHTML = `
            <div class="modal-card animate-pop-in" style="text-align: center; padding: 24px; max-width: 360px; background: rgba(16, 42, 32, 0.95); border: 2px solid rgba(52, 211, 153, 0.4); border-radius: 14px; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
                <div style="font-size: 2.2rem; margin-bottom: 10px;">🛡️</div>
                <h3 style="font-family: var(--font-heading); color: #fff; font-size: 1.15rem; margin-bottom: 6px;">Refuerzos en Camino</h3>
                <p style="font-size: 0.9rem; color: #a7f3d0; margin-bottom: 14px;">
                    El rival está desplegando sus refuerzos para <strong>${sideName}</strong>...
                </p>
                <div class="loading-spinner" style="margin: 0 auto 16px auto; width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #10b981; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                
                <div style="display: flex; gap: 8px; justify-content: center; margin-top: 10px;">
                    <button id="btn-reinf-view-board" class="action-btn secondary-btn" style="flex: 1; padding: 8px; font-size: 0.85rem; font-weight: bold; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff;">
                        👁️ Mirar Tablero
                    </button>
                    <button id="btn-reinf-resign-menu" class="action-btn secondary-btn" style="flex: 1; padding: 8px; font-size: 0.85rem; font-weight: bold; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5;">
                        🚪 Salir / Rendirse
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#btn-reinf-view-board')?.addEventListener('click', () => {
            this.openBoardInspector({
                title: `🛡️ Despliegue de rival (${sideName})...`,
                modalElement: modal,
                showResign: true
            });
        });

        modal.querySelector('#btn-reinf-resign-menu')?.addEventListener('click', () => {
            this.exitGame('menu');
        });
    }

    closeReinforcementWaitingModal() {
        const modal = document.getElementById('modal-reinforcement-waiting');
        if (modal) modal.remove();
        this.closeBoardInspector();
    }

    openPlacementModal(side, points, callback) {
        let currentPoints = points;
        const row = side === 'w' ? 6 : 0;
        const sideName = side === 'w' ? 'Blancas (Fila A)' : 'Negras (Fila G)';
        const isAI = (this.matchOptions?.mode === 'ai' && side !== this.matchOptions.playerSide);

        if (!this.lastReinforcementChoices) {
            this.lastReinforcementChoices = { side: null, pieces: [] };
        }

        const currentChoices = [];

        const tryPlaceNext = () => {
            const emptyCols = [];
            for (let c = 0; c < this.boardEngine.cols; c++) {
                if (this.boardEngine.isEmpty(row, c)) emptyCols.push(c);
            }

            if (emptyCols.length === 0 || currentPoints <= 0) {
                this.lastReinforcementChoices = { side: side, pieces: currentChoices };
                callback(currentPoints);
                return;
            }

            const cats = this.getPieceCategories();
            
            if (isAI) {
                let options = [...cats.PAWNS];
                if (currentPoints >= 2) options.push(...cats.ELITES);
                
                const choice = options[Math.floor(Math.random() * options.length)];
                const col = emptyCols[0];
                this.boardEngine.setPiece(row, col, {
                    type: choice.type,
                    color: side,
                    facing: side === 'w' ? 0 : 180
                });
                currentChoices.push(choice);
                currentPoints -= choice.cost;
                tryPlaceNext();
                return;
            }

            const groups = [];
            groups.push({ label: 'Peones (1 pt)', items: cats.PAWNS });
            if (currentPoints >= 2) groups.push({ label: 'Élites (2 pts)', items: cats.ELITES });

            let previousChoicesHtml = '';
            if (this.lastReinforcementChoices.side && this.lastReinforcementChoices.side !== side && this.lastReinforcementChoices.pieces.length > 0) {
                const prevName = this.lastReinforcementChoices.side === 'w' ? 'Blancas' : 'Negras';
                previousChoicesHtml = `
                    <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 6px; margin-bottom: 12px;">
                        <span style="font-size: 0.75rem; color: #9ca3af;">Reclutamiento de ${prevName}:</span>
                        <div style="font-size: 1.2rem;">
                            ${this.lastReinforcementChoices.pieces.map(p => p.symbol).join(' ')}
                        </div>
                    </div>
                `;
            }

            this.openCategorizedPieceModal({
                side: side,
                title: `🛡️ Refuerzos: ${sideName}`,
                subtitle: `Puntos restantes: ${currentPoints}`,
                reinforcementPoints: currentPoints,
                description: `Elige una pieza, luego haz click en una casilla verde de la fila para ubicarla.` + previousChoicesHtml,
                showCost: true,
                groups: groups,
                allowPass: true,
                onPass: () => {
                    this.lastReinforcementChoices = { side: side, pieces: currentChoices };
                    callback(currentPoints);
                }
            }, (unitType, cost) => {
                const choiceDef = Object.values(cats).flat().find(p => p.type === unitType);
                if (choiceDef) currentChoices.push(choiceDef);

                // Always use interactive placement mode so player picks square on board
                this.activateReinforcementPlacementMode(row, emptyCols, unitType, side, cost, currentPoints, () => {
                    currentPoints -= cost;
                    this.boardRenderer.render();
                    tryPlaceNext();
                });
            });
        };

        tryPlaceNext();
    }

    activateReinforcementPlacementMode(row, emptyCols, unitType, side, cost, currentPoints, callback) {
        this.isReinforcementMode = true;
        this.reinforcementData = { row, emptyCols, unitType, side, cost, currentPoints, callback };

        const placementMoves = emptyCols.map(c => ({ r: row, c, type: 'throw-target' })); // reuse throw-target green dots
        
        this.selectedSquare = null;
        this.selectedLegalMoves = placementMoves;
        this.boardRenderer.setSelected(null, placementMoves);

        // Show floating notification banner with remaining reinforcement points
        document.getElementById('modal-reinforcement-placement-banner')?.remove();
        const banner = document.createElement('div');
        banner.id = 'modal-reinforcement-placement-banner';
        banner.style.position = 'fixed';
        banner.style.top = '15px';
        banner.style.left = '50%';
        banner.style.transform = 'translateX(-50%)';
        banner.style.zIndex = '99999';
        banner.style.background = 'rgba(15, 23, 42, 0.95)';
        banner.style.backdropFilter = 'blur(12px)';
        banner.style.border = '2px solid #f59e0b';
        banner.style.borderRadius = '20px';
        banner.style.padding = '6px 14px';
        banner.style.boxShadow = '0 6px 18px rgba(0,0,0,0.6)';
        banner.style.display = 'flex';
        banner.style.gap = '10px';
        banner.style.alignItems = 'center';
        const remainingAfter = (currentPoints !== undefined && cost !== undefined) ? (currentPoints - cost) : 0;
        banner.innerHTML = `
            <span style="font-size: 0.8rem; color: #93c5fd; font-weight: bold;">Ubica tu unidad</span>
            <span style="background: rgba(245, 158, 11, 0.2); border-radius: 8px; padding: 2px 8px; font-size: 0.8rem; color: #fef3c7; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                🛡️ Restan: <strong style="font-size: 1.15rem; color: #fbbf24; font-weight: 900;">${remainingAfter}</strong> pts
            </span>
        `;
        document.body.appendChild(banner);
    }

    executeReinforcementPlacement(r, c) {
        document.getElementById('modal-reinforcement-placement-banner')?.remove();
        const { row, emptyCols, unitType, side, cost, currentPoints, callback } = this.reinforcementData;
        if (r !== row || !emptyCols.includes(c)) return;

        this.boardEngine.setPiece(row, c, {
            type: unitType,
            color: side,
            facing: side === 'w' ? 0 : 180
        });

        if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
            const remPoints = (currentPoints !== undefined && cost !== undefined) ? (currentPoints - cost) : 0;
            NetworkManager.sendReinforcementPlace({
                row,
                col: c,
                unitType,
                side,
                cost,
                remainingPoints: remPoints
            });
        }

        this.isReinforcementMode = false;
        this.reinforcementData = null;
        this.selectedSquare = null;
        this.selectedLegalMoves = [];
        this.boardRenderer.clearSelection();
        
        callback();
    }

    checkPendingReinforcements(onComplete) {
        const active = this.rulesEngine.activeColor;
        if (this.reinforcementsBank[active] <= 0) {
            if (onComplete) onComplete();
            return;
        }

        const row = active === 'w' ? 6 : 0;
        let hasEmpty = false;
        for (let c = 0; c < this.boardEngine.cols; c++) {
            if (this.boardEngine.isEmpty(row, c)) { hasEmpty = true; break; }
        }

        if (hasEmpty) {
            this.startUnifiedReinforcementFlow({
                side: active,
                points: this.reinforcementsBank[active],
                isSequentialTwoPlayer: false,
                onComplete
            });
        } else {
            if (onComplete) onComplete();
        }
    }

    // =========================================================================
    // TURN RESOLUTION & VICTORY CHECKS
    // =========================================================================

    finalizeTurn(result) {
        if (this.matchOptions?.alwaysWhiteTurn) {
            this.rulesEngine.activeColor = 'w';
        }

        this.boardRenderer.flipped = ((this.matchOptions?.mode === 'ai' || this.matchOptions?.mode === 'lan') && this.matchOptions?.playerSide === 'b');
        this.boardRenderer.render();
        this.updateMatchState(result, () => {
            if (this.isGameOver) return;

            if (this.matchOptions?.alwaysWhiteTurn) {
                this.rulesEngine.activeColor = 'w';
                this.boardRenderer.render();
                return;
            }

            if (this.checkNoLegalMovesPass()) {
                return;
            }

            this.checkPendingReinforcements(() => {
                if (this.matchOptions.mode === 'ai' && this.rulesEngine.activeColor !== this.matchOptions.playerSide) {
                    setTimeout(() => this.triggerAIMove(), 400);
                }
            });
        });
    }

    checkNoLegalMovesPass() {
        if (this.isGameOver) return false;
        const active = this.rulesEngine.activeColor;
        const other = active === 'w' ? 'b' : 'w';

        // Do not intercept if standard checkmate applies
        if (!this.rulesEngine.isContinental && this.rulesEngine.isCheckmate(active)) {
            return false;
        }

        const activeMoves = this.rulesEngine.getAllLegalMoves(active);
        if (activeMoves.length === 0) {
            const otherMoves = this.rulesEngine.getAllLegalMoves(other);
            if (otherMoves.length === 0) {
                const msg = '¡EMPATE! Ninguno de los dos jugadores tiene movimientos legales disponibles.';
                if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
                    NetworkManager.sendGameOverCheck({ winner: 'draw', reason: msg });
                }
                this.endMatch(msg);
                return true;
            }

            this.consecutiveNoMovesPasses = (this.consecutiveNoMovesPasses || 0) + 1;
            if (this.consecutiveNoMovesPasses >= 4) {
                const msg = '¡EMPATE! Se alcanzaron pases automáticos sin movimientos disponibles.';
                if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
                    NetworkManager.sendGameOverCheck({ winner: 'draw', reason: msg });
                }
                this.endMatch(msg);
                return true;
            }

            const activeName = active === 'w' ? 'Blancas' : 'Negras';
            this.showQuickToast(`⚠️ ¡${activeName} no tiene movimientos disponibles! Se pasa el turno.`);

            this.rulesEngine.activeColor = other;
            if (other === 'w') this.rulesEngine.fullMoveNumber++;

            if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
                NetworkManager.sendPassTurn({
                    rotatedPiece: null,
                    activeColorAfter: other,
                    whiteTime: this.whiteTime,
                    blackTime: this.blackTime
                });
            }

            this.boardRenderer.flipped = ((this.matchOptions?.mode === 'ai' || this.matchOptions?.mode === 'lan') && this.matchOptions?.playerSide === 'b');
            this.boardRenderer.render();
            this.renderHUD();

            if (this.checkNoLegalMovesPass()) {
                return true;
            }

            this.checkPendingReinforcements(() => {
                if (this.matchOptions.mode === 'ai' && this.rulesEngine.activeColor !== this.matchOptions.playerSide) {
                    setTimeout(() => this.triggerAIMove(), 400);
                }
            });

            return true;
        }

        this.consecutiveNoMovesPasses = 0;
        return false;
    }

    checkCenterControl() {
        const rows = this.boardEngine.rows;
        const cols = this.boardEngine.cols;
        const centerSquares = (rows === 7 && cols === 7)
            ? [{ r: 3, c: 3 }]
            : [{ r: 3, c: 3 }, { r: 3, c: 4 }, { r: 4, c: 3 }, { r: 4, c: 4 }];

        const whiteHasCenter = centerSquares.some(sq => {
            const p = this.boardEngine.getPiece(sq.r, sq.c);
            return p && p.color === 'w';
        });

        const blackHasCenter = centerSquares.some(sq => {
            const p = this.boardEngine.getPiece(sq.r, sq.c);
            return p && p.color === 'b';
        });

        if (!this.centerStreak) this.centerStreak = { w: 0, b: 0 };

        if (whiteHasCenter) {
            this.centerStreak.w++;
            this.centerStreak.b = 0;
        } else if (blackHasCenter) {
            this.centerStreak.b++;
            this.centerStreak.w = 0;
        } else {
            this.centerStreak.w = 0;
            this.centerStreak.b = 0;
        }

        const requiredTurns = this.matchOptions?.centerTurns || 3;

        if (this.centerStreak.w >= requiredTurns) {
            const msg = `¡VICTORIA POR CAPTURA DEL CENTRO! Blancas dominaron el centro durante ${requiredTurns} turnos consecutivos.`;
            if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
                NetworkManager.sendGameOverCheck({ winner: 'w', reason: msg });
            }
            this.endMatch(msg);
        } else if (this.centerStreak.b >= requiredTurns) {
            const msg = `¡VICTORIA POR CAPTURA DEL CENTRO! Negras dominaron el centro durante ${requiredTurns} turnos consecutivos.`;
            if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
                NetworkManager.sendGameOverCheck({ winner: 'b', reason: msg });
            }
            this.endMatch(msg);
        }
    }

    updateMatchState(result, onComplete) {
        if (!this.matchOptions?.disableVictory && this.matchOptions?.submode && this.matchOptions.submode.includes('captura_centro')) {
            this.checkCenterControl();
        }

        this.renderHUD();
        if (this.isGameOver) {
            if (onComplete) onComplete();
            return;
        }

        if (this.matchOptions?.disableVictory) {
            if (onComplete) onComplete();
            return;
        }

        if (this.rulesEngine.isContinental) {
            const isCapturaCentro = this.matchOptions?.submode && this.matchOptions.submode.includes('captura_centro');
            if (!isCapturaCentro) {
                const continentalWin = this.rulesEngine.checkContinentalVictory();
                if (continentalWin) {
                    if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
                        NetworkManager.sendGameOverCheck({ winner: continentalWin.winner, reason: continentalWin.message });
                    }
                    this.endMatch(continentalWin.message);
                    if (onComplete) onComplete();
                    return;
                }
            }
        }

        if (result && result.isRepetition) {
            this.openDrawNegotiationModal(onComplete);
            return;
        }

        if (result && result.isCheckmate) {
            const winner = result.moveRecord.piece.color === 'w' ? I18n.get('whitePlayer') : I18n.get('blackPlayer');
            const msg = `${I18n.get('checkmateNotice')} ${I18n.get('winText')} ${winner}`;
            if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
                NetworkManager.sendGameOverCheck({ winner: result.moveRecord.piece.color, reason: msg });
            }
            this.endMatch(msg);
        } else if (result && result.isStalemate) {
            const msg = `${I18n.get('stalemateNotice')}`;
            if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined') {
                NetworkManager.sendGameOverCheck({ winner: 'draw', reason: msg });
            }
            this.endMatch(msg);
        }

        if (onComplete) onComplete();
    }

    triggerAIMove() {
        if (this.isGameOver) return;

        const bestMove = AIEngine.getBestMove(this.rulesEngine, this.matchOptions.difficulty);
        if (bestMove) {
            const { from, to } = bestMove;
            const result = this.rulesEngine.executeMove(from.r, from.c, to.r, to.c, 'q');
            if (result && result.success) {
                if (result.moveRecord.captured) AudioManager.playCapture();
                else AudioManager.playMove();

                if (result.isCheck) AudioManager.playCheck();

                this.boardRenderer.setLastMove({ from: { r: from.r, c: from.c }, to: { r: to.r, c: to.c } });
                this.finalizeTurn(result);
            }
        }
    }

    checkCenterControl() {
        let centerColor = null;
        if (this.boardEngine.rows === 7) {
            const piece = this.boardEngine.getPiece(3, 3);
            if (piece) centerColor = piece.color;
        } else {
            const centerSquares = [{r: 3, c: 3}, {r: 3, c: 4}, {r: 4, c: 3}, {r: 4, c: 4}];
            const pieces = centerSquares.map(sq => this.boardEngine.getPiece(sq.r, sq.c));
            if (pieces.every(p => p && p.color === 'w')) centerColor = 'w';
            else if (pieces.every(p => p && p.color === 'b')) centerColor = 'b';
        }

        const targetTurns = this.matchOptions?.centerTurns || parseInt(localStorage.getItem('continental_center_turns') || '3', 10);
        const isConsecutive = this.matchOptions?.centerConsecutive !== undefined ? this.matchOptions.centerConsecutive : (localStorage.getItem('continental_center_consecutive') !== 'false');

        if (centerColor === 'w') {
            this.centerStreak.w += 1;
            if (isConsecutive) this.centerStreak.b = 0;
        } else if (centerColor === 'b') {
            this.centerStreak.b += 1;
            if (isConsecutive) this.centerStreak.w = 0;
        } else if (isConsecutive) {
            this.centerStreak.w = 0;
            this.centerStreak.b = 0;
        }

        const modeTag = isConsecutive ? 'seguidos' : 'acumulados';
        if (this.centerStreak.w >= targetTurns) {
            this.endMatch(`¡VICTORIA POR CAPTURA DEL CENTRO! Las Blancas domaron la casilla central por ${targetTurns} turnos ${modeTag}.`);
        } else if (this.centerStreak.b >= targetTurns) {
            this.endMatch(`¡VICTORIA POR CAPTURA DEL CENTRO! Las Negras domaron la casilla central por ${targetTurns} turnos ${modeTag}.`);
        }
    }

    // =========================================================================
    // LOBO POPUP
    // =========================================================================

    processNextWolfPopup(moveResult) {
        this.clearWolfPopup();

        if (!this.wolfQueue || this.wolfQueue.length === 0) {
            this.isWolfPromptActive = false;
            this.activeWolfPrompt = null;
            if (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined' && this.activeWolfAdvances && this.activeWolfAdvances.length > 0) {
                NetworkManager.sendWolfSurge({ wolfAdvances: this.activeWolfAdvances });
                this.activeWolfAdvances = [];
            }
            this.finalizeTurn(moveResult);
            return;
        }

        const nextWolf = this.wolfQueue.shift();
        const wolfPiece = this.boardEngine.getPiece(nextWolf.r, nextWolf.c);
        if (!wolfPiece || wolfPiece.type !== 'c_lobo') {
            this.processNextWolfPopup(moveResult);
            return;
        }

        const advanceCheck = PieceRegistry.WolfPackHelper
            ? PieceRegistry.WolfPackHelper.canAdvanceWolf(this.boardEngine, nextWolf, wolfPiece.color)
            : { canAdvance: true, isCapture: false };

        if (!advanceCheck.canAdvance) {
            this.processNextWolfPopup(moveResult);
            return;
        }

        this.isWolfPromptActive = true;
        this.activeWolfPrompt = nextWolf;
        this.renderWolfPopup(nextWolf, advanceCheck, moveResult);
    }

    renderWolfPopup(wolfPos, advanceCheck, moveResult) {
        this.boardRenderer.render();

        const html = `
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 10px;">
                <button class="action-btn primary-btn small-btn" id="btn-game-wolf-yes" style="flex: 1; padding: 10px; background: #16a34a; font-weight: bold; border: none; border-radius: 8px; color: white; cursor: pointer;">✅ Sí</button>
                <button class="action-btn danger-btn small-btn" id="btn-game-wolf-no" style="flex: 1; padding: 10px; background: #dc2626; font-weight: bold; border: none; border-radius: 8px; color: white; cursor: pointer;">❌ No</button>
            </div>
        `;

        this.closeWolfPopup = this.showFloatingPopup({
            title: `🐺 Manada de Lobos`,
            subtitle: advanceCheck.isCapture ? '⚔️ ¿Deseas avanzar y comer a la pieza enemiga?' : '🐾 ¿Deseas avanzar 1 paso adelante?',
            square: wolfPos,
            maxWidth: '280px',
            html: html,
            onCloseClick: () => {
                this.closeWolfPopup = null;
                this.handleWolfResponse(false, wolfPos, moveResult);
            },
            onInit: (card, close) => {
                card.querySelector('#btn-game-wolf-yes')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    close();
                    this.closeWolfPopup = null;
                    this.handleWolfResponse(true, wolfPos, moveResult);
                });
                card.querySelector('#btn-game-wolf-no')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    close();
                    this.closeWolfPopup = null;
                    this.handleWolfResponse(false, wolfPos, moveResult);
                });
            }
        });
    }

    handleWolfResponse(accepted, wolfPos, moveResult) {
        if (accepted) {
            const wolfPiece = this.boardEngine.getPiece(wolfPos.r, wolfPos.c);
            if (wolfPiece) {
                const dir = (wolfPiece.color === 'w' ? -1 : 1);
                const targetR = wolfPos.r + dir;
                const targetC = wolfPos.c;
                const targetPiece = this.boardEngine.getPiece(targetR, targetC);

                this.boardEngine.setPiece(wolfPos.r, wolfPos.c, null);
                this.boardEngine.setPiece(targetR, targetC, { 
                    type: 'c_lobo', 
                    color: wolfPiece.color, 
                    moved: true, 
                    capturedLastTurn: !!targetPiece 
                });

                this.activeWolfAdvances = this.activeWolfAdvances || [];
                this.activeWolfAdvances.push({
                    fromR: wolfPos.r,
                    fromC: wolfPos.c,
                    toR: targetR,
                    toC: targetC,
                    color: wolfPiece.color,
                    captured: !!targetPiece
                });

                if (targetPiece) {
                    this.rulesEngine.capturedPieces[wolfPiece.color].push(targetPiece);
                    AudioManager.playCapture();
                } else {
                    AudioManager.playMove();
                }

                const chainWolves = PieceRegistry.WolfPackHelper
                    ? PieceRegistry.WolfPackHelper.getRearWolves(this.boardEngine, { r: wolfPos.r, c: wolfPos.c }, wolfPiece.color)
                    : [];

                if (chainWolves.length > 0) {
                    this.wolfQueue.push(...chainWolves);
                }
            }
        }

        this.processNextWolfPopup(moveResult);
    }

    clearWolfPopup() {
        if (this.closeWolfPopup) {
            this.closeWolfPopup();
            this.closeWolfPopup = null;
        }
        document.querySelectorAll('.floating-popup-wrapper').forEach(el => el.remove());
        if (this.boardContainer) {
            this.boardContainer.querySelectorAll('.wolf-prompt-target').forEach(el => el.classList.remove('wolf-prompt-target'));
        }
    }

    // =========================================================================
    // HUD & ACTIONS
    // =========================================================================

    renderHUD() {
        const isWhiteTurn = this.rulesEngine.activeColor === 'w';
        const isCheck = this.rulesEngine.isKingInCheck(this.rulesEngine.activeColor);

        const wCaptured = this.rulesEngine.capturedPieces.w;
        const bCaptured = this.rulesEngine.capturedPieces.b;

        let submodeBadge = '';
        if (this.matchOptions?.submode === 'continental_captura_centro') {
            const targetTurns = this.matchOptions?.centerTurns || parseInt(localStorage.getItem('continental_center_turns') || '3', 10);
            const isConsecutive = this.matchOptions?.centerConsecutive !== undefined ? this.matchOptions.centerConsecutive : (localStorage.getItem('continental_center_consecutive') !== 'false');
            const tag = isConsecutive ? 'Seg' : 'Acum';
            submodeBadge = `🎯 Centro (${tag}): ⚪${this.centerStreak?.w || 0}/${targetTurns} | ⚫${this.centerStreak?.b || 0}/${targetTurns}`;
        } else if (this.matchOptions?.submode === 'continental_gran_ejercito') {
            const wPts = this.rulesEngine.getArmyPoints('w');
            const bPts = this.rulesEngine.getArmyPoints('b');
            submodeBadge = `🛡️ Gran Ejército: ⚪${wPts} pts | ⚫${bPts} pts (Meta: ≥6 vs ≤5)`;
        } else if (this.rulesEngine.isContinental) {
            const wPts = this.rulesEngine.getArmyPoints('w');
            const bPts = this.rulesEngine.getArmyPoints('b');
            submodeBadge = `⚔️ Continental: ⚪${wPts} pts | ⚫${bPts} pts (Meta: ≥6 vs ≤5)`;
        } else if (this.matchOptions?.submode === 'ajedrez_360') {
            submodeBadge = `🎲 Ajedrez 360`;
        } else {
            submodeBadge = `👑 Clásico`;
        }

        const isSandbox = (this.matchOptions?.isSandbox || this.matchOptions?.sandboxMode || false);
        const undoBtn = (isSandbox && this.moveHistoryStack && this.moveHistoryStack.length > 0)
            ? `<button id="btn-game-undo" class="action-btn secondary-btn small-btn" style="background: rgba(16, 185, 129, 0.25); border: 1px solid #10b981; color: #a7f3d0; font-weight: bold;">↩️ Deshacer</button>`
            : '';

        const hudHtml = `
            <div class="game-hud glass-panel">
                <div class="player-bar ${!isWhiteTurn ? 'turn-active' : ''}">
                    <div class="player-info">
                        <span class="player-avatar">♚</span>
                        <span class="player-name" data-i18n="blackPlayer">${I18n.get('blackPlayer')}</span>
                        ${this.reinforcementsBank?.b > 0 ? `
                            <span class="badge-reinforcements" style="background: rgba(245, 158, 11, 0.25); border: 1px solid #f59e0b; color: #fbbf24; font-weight: bold; padding: 2px 8px; border-radius: 6px; font-size: 0.85rem; margin-left: 6px; display: inline-flex; align-items: center; gap: 4px;">
                                🛡️ Banco: <strong style="font-size: 1.15rem; color: #fff; font-weight: 900;">${this.reinforcementsBank.b}</strong> pts
                            </span>
                        ` : ''}
                        <div class="captured-tray">${bCaptured.map(p => PieceRegistry.get(p.type)?.symbol || '').join(' ')}</div>
                    </div>
                    <div id="clock-black" class="timer-badge">${this.formatTime(this.blackTime)}</div>
                </div>

                <div class="status-banner ${isCheck ? 'status-check' : ''}" style="padding: 6px 12px; border-radius: 8px; font-weight: bold; background: ${isWhiteTurn ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.45)'}; border: 1px solid ${isWhiteTurn ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)'}; display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 4px 0;">
                    <span class="submode-pill-hud">${submodeBadge}</span>
                    <div style="font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
                        ${isCheck ? `<span style="color: #ef4444; font-weight: 900; animation: pulse 1.5s infinite;">⚠️ ¡JAQUE!</span>` : ''}
                        <span>${isWhiteTurn ? '⚪ Turno de Blancas' : '⚫ Turno de Negras'}</span>
                    </div>
                </div>

                <div class="player-bar ${isWhiteTurn ? 'turn-active' : ''}">
                    <div class="player-info">
                        <span class="player-avatar">♔</span>
                        <span class="player-name" data-i18n="whitePlayer">${I18n.get('whitePlayer')}</span>
                        ${this.reinforcementsBank?.w > 0 ? `
                            <span class="badge-reinforcements" style="background: rgba(245, 158, 11, 0.25); border: 1px solid #f59e0b; color: #fbbf24; font-weight: bold; padding: 2px 8px; border-radius: 6px; font-size: 0.85rem; margin-left: 6px; display: inline-flex; align-items: center; gap: 4px;">
                                🛡️ Banco: <strong style="font-size: 1.15rem; color: #fff; font-weight: 900;">${this.reinforcementsBank.w}</strong> pts
                            </span>
                        ` : ''}
                        <div class="captured-tray">${wCaptured.map(p => PieceRegistry.get(p.type)?.symbol || '').join(' ')}</div>
                    </div>
                    <div id="clock-white" class="timer-badge">${this.formatTime(this.whiteTime)}</div>
                </div>

                <div class="game-action-bar">
                    ${undoBtn}
                    <button id="btn-game-options" class="action-btn secondary-btn small-btn">⚙️ Opciones</button>
                    ${this.rulesEngine.isContinental && !this.isGameOver ? `
                        <button id="btn-game-pass-rotate" class="action-btn secondary-btn small-btn" 
                            ${(this.matchOptions?.mode === 'lan' && this.rulesEngine.activeColor !== this.matchOptions?.playerSide) ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
                            ⏭️ Pasar y Rotar
                        </button>` : ''}
                    ${!this.isGameOver ? `<button id="btn-game-resign" class="action-btn secondary-btn small-btn" data-i18n="btnResign">${I18n.get('btnResign')}</button>` : ''}
                    ${!this.isGameOver ? `<button id="btn-game-draw" class="action-btn secondary-btn small-btn" data-i18n="btnOfferDraw">${I18n.get('btnOfferDraw')}</button>` : ''}
                    <button id="btn-game-exit" class="action-btn secondary-btn small-btn" data-i18n="btnMenu">${I18n.get('btnMenu')}</button>
                </div>
            </div>
        `;

        this.hudContainer.innerHTML = hudHtml;

        document.getElementById('btn-game-options')?.addEventListener('click', () => {
            this.openInGameOptionsModal();
        });

        if (!this.isGameOver) {
            document.getElementById('btn-game-undo')?.addEventListener('click', () => {
                this.undoMove();
            });
            document.getElementById('btn-game-pass-rotate')?.addEventListener('click', () => {
                this.openPassAndRotateModal();
            });

            document.getElementById('btn-game-resign')?.addEventListener('click', () => {
                this.exitGame('resign');
            });

            document.getElementById('btn-game-draw')?.addEventListener('click', () => {
                if (this.rulesEngine.isContinental) {
                    this.handleDrawOrReinforcementRequest();
                } else {
                    this.endMatch(I18n.get('drawText'));
                }
            });
        }

        document.getElementById('btn-game-exit')?.addEventListener('click', () => {
            this.exitGame('menu');
        });
    }

    openInGameOptionsModal() {
        const isLan = this.matchOptions?.mode === 'lan';
        let unpause = null;
        if (!isLan && !this.isGameOver) {
            unpause = this.pauseClockTemporarily(999999);
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay modal-active';
        modal.id = 'modal-in-game-options';
        modal.style.zIndex = '99999';

        const isFlipped = this.boardRenderer.flipped;

        modal.innerHTML = `
            <div class="modal-card animate-pop-in" style="max-width: 360px; padding: 22px; text-align: center; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 14px; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0; font-size: 1.2rem; color: #fff;">⚙️ Opciones de Partida</h3>
                    <button class="btn-close-options" style="background: transparent; border: none; color: #9ca3af; font-size: 1.4rem; cursor: pointer;">&times;</button>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px; text-align: left;">
                    <label style="display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; color: #e2e8f0; cursor: pointer;">
                        <span>🔊 Efectos de Sonido</span>
                        <input type="checkbox" id="chk-game-sfx" ${typeof AudioManager !== 'undefined' && AudioManager.muted ? '' : 'checked'} style="width: 20px; height: 20px; accent-color: #3b82f6; cursor: pointer;">
                    </label>

                    <label style="display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; color: #e2e8f0; cursor: pointer;">
                        <span>🔄 Invertir Tablero</span>
                        <input type="checkbox" id="chk-game-flip" ${isFlipped ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #3b82f6; cursor: pointer;">
                    </label>

                    <label style="display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; color: #38bdf8; cursor: pointer;">
                        <span>🐞 Modo Debug (Consola)</span>
                        <input type="checkbox" id="chk-game-debug" ${typeof DebugLogger !== 'undefined' && DebugLogger.enabled ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #0284c7; cursor: pointer;">
                    </label>
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${!this.isGameOver ? `
                        <button id="btn-opt-resign" class="action-btn secondary-btn" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; font-weight: bold;">
                            🏳️ Rendirse
                        </button>
                    ` : ''}
                    <button id="btn-opt-exit-menu" class="action-btn secondary-btn">
                        🚪 Volver al Menú Principal
                    </button>
                    <button id="btn-opt-continue" class="action-btn primary-btn" style="margin-top: 4px;">
                        ▶️ Continuar Partida
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => {
            modal.remove();
            if (unpause) unpause();
        };

        modal.querySelector('.btn-close-options')?.addEventListener('click', closeModal);
        modal.querySelector('#btn-opt-continue')?.addEventListener('click', closeModal);

        modal.querySelector('#chk-game-sfx')?.addEventListener('change', (e) => {
            if (typeof AudioManager !== 'undefined') {
                AudioManager.muted = !e.target.checked;
            }
        });

        modal.querySelector('#chk-game-flip')?.addEventListener('change', (e) => {
            this.boardRenderer.flipped = e.target.checked;
            this.boardRenderer.render();
        });

        modal.querySelector('#chk-game-debug')?.addEventListener('change', (e) => {
            if (typeof DebugLogger !== 'undefined') {
                DebugLogger.setEnabled(e.target.checked);
            }
        });

        modal.querySelector('#btn-opt-resign')?.addEventListener('click', () => {
            closeModal();
            this.exitGame('resign');
        });

        modal.querySelector('#btn-opt-exit-menu')?.addEventListener('click', () => {
            closeModal();
            this.exitGame('menu');
        });
    }

    /**
     * Unified exit and surrender handler for ALL game states and UI triggers.
     * action: 'menu' | 'resign' | 'disconnect'
     * options: { skipConfirm?: boolean, reason?: string }
     */
    exitGame(action = 'menu', options = {}) {
        const isLan = this.matchOptions?.mode === 'lan';
        const isOngoingMatch = !this.isGameOver;

        // If LAN match and user initiated exit/resign, require confirmation unless skipConfirm is true
        if (isLan && isOngoingMatch && !options.skipConfirm && (action === 'menu' || action === 'resign')) {
            this.showLanConfirmExitModal(action);
            return;
        }

        if (action === 'disconnect') {
            if (this.opponentLeftHandled || this.isGameOver) return;
            this.handleOpponentLeftOrSurrendered('🏆 ¡Victoria por Desconexión!\nSe ha perdido la conexión con el rival.');
            return;
        }

        // Clean up all possible modals, popups, and floating overlays
        document.getElementById('modal-lan-confirm-exit')?.remove();
        document.getElementById('modal-in-game-options')?.remove();
        if (action !== 'disconnect') {
            document.getElementById('game-over-modal')?.remove();
        }
        document.getElementById('game-over-inspector-bar')?.remove();
        document.getElementById('modal-conn-lost')?.remove();
        document.getElementById('modal-draft-waiting')?.remove();
        document.getElementById('modal-draft-verifying')?.remove();
        document.getElementById('modal-rematch-waiting')?.remove();
        document.getElementById('modal-rematch-offer')?.remove();
        this.closeFloatingWaitingBar();
        this.clearWolfPopup();
        document.querySelectorAll('.modal-overlay').forEach(el => {
            if (el.id !== 'match-setup-modal' && el.id !== 'game-over-modal') el.remove();
        });

        // Stop game clock and mark game as finished
        this.stopClock();
        this.isGameOver = true;
        this.isDrafting = false;
        this.isReinforcementMode = false;

        // In LAN mode, notify opponent and gracefully disconnect
        if (isLan && typeof NetworkManager !== 'undefined') {
            if (isOngoingMatch) {
                NetworkManager.sendSurrender();
            }
            NetworkManager.sendRematchCancel({ reason: 'Jugador abandonó la partida' });
            setTimeout(() => {
                NetworkManager.disconnect();
            }, 250);
        }

        if (action === 'resign') {
            const resignMessage = options.reason || 'Te has rendido de la partida.';
            this.endMatch(resignMessage);
        } else {
            // Action 'menu' -> Go to main menu cleanly
            if (typeof MenuController !== 'undefined') {
                MenuController.switchView('main-menu');
            }
        }
    }

    handleOpponentLeftOrSurrendered(message) {
        if (this.opponentLeftHandled) return;
        this.opponentLeftHandled = true;
        this.isGameOver = true;
        this.isDrafting = false;
        this.isReinforcementMode = false;
        this.stopClock();

        this.closeDraftWaitingModal();
        this.closeRematchModals();
        this.closeBoardInspector();
        this.closeFloatingWaitingBar();
        this.clearWolfPopup();

        document.getElementById('modal-draft-choice')?.remove();
        document.getElementById('modal-draft-waiting')?.remove();
        document.getElementById('modal-draft-verifying')?.remove();
        document.getElementById('modal-reinforcement-waiting')?.remove();
        document.getElementById('modal-draw-request')?.remove();
        document.getElementById('modal-draw-waiting')?.remove();
        document.getElementById('modal-conn-lost')?.remove();
        document.getElementById('modal-lan-confirm-exit')?.remove();
        document.getElementById('modal-in-game-options')?.remove();

        const mySide = this.matchOptions?.playerSide || 'w';
        const winnerText = mySide === 'w' ? '¡Ganan las Blancas!' : '¡Ganan las Negras!';
        const fullMessage = `${message}\n${winnerText}`;

        AudioManager.playVictory();
        this.endMatch(fullMessage);
    }

    showLanConfirmExitModal(actionType) {
        const existing = document.getElementById('modal-lan-confirm-exit');
        if (existing) existing.remove();

        const isResign = actionType === 'resign';
        const titleText = isResign ? '⚠️ ¿Rendirse y Abandonar Partida?' : '⚠️ ¿Salir al Menú Principal?';
        const bodyText = isResign
            ? 'Estás jugando una partida multijugador LAN. Si te rindes, la partida se dará por terminada y el rival ganará.'
            : 'Estás en una partida multijugador LAN activa. Si vuelves al menú principal, abandonarás la partida y el rival ganará.';
        const confirmBtnText = isResign ? '🏳️ Sí, rendirme' : '🚪 Sí, salir al menú';

        const modal = document.createElement('div');
        modal.id = 'modal-lan-confirm-exit';
        modal.className = 'modal-overlay modal-active';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal-card animate-pop-in" style="text-align: center; padding: 22px; max-width: 360px; background: rgba(26, 15, 15, 0.95); border: 2px solid #ef4444; border-radius: 14px; box-shadow: 0 0 30px rgba(239, 68, 68, 0.4);">
                <div style="font-size: 2.2rem; margin-bottom: 8px;">⚠️</div>
                <h3 style="font-family: var(--font-heading); color: #fff; font-size: 1.15rem; margin-bottom: 8px;">${titleText}</h3>
                <p style="font-size: 0.88rem; color: #fca5a5; line-height: 1.4; margin-bottom: 16px;">
                    ${bodyText}
                </p>
                <div style="display: flex; gap: 10px;">
                    <button id="btn-cancel-exit-lan" class="action-btn secondary-btn" style="flex: 1; padding: 10px; font-weight: bold;">
                        Cancelar
                    </button>
                    <button id="btn-confirm-exit-lan" class="action-btn primary-btn" style="flex: 1; padding: 10px; font-weight: bold; background: #ef4444; border-color: #dc2626; color: #fff;">
                        ${confirmBtnText}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#btn-cancel-exit-lan')?.addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('#btn-confirm-exit-lan')?.addEventListener('click', () => {
            modal.remove();
            this.exitGame(actionType, { skipConfirm: true });
        });
    }

    getPieceCategories() {
        return {
            PAWNS: [
                { type: 'c_peon', name: 'Peón', cost: 1, symbol: '♟' },
                { type: 'c_dama', name: 'Damas', cost: 1, symbol: '👑' },
                { type: 'c_lobo', name: 'Lobo', cost: 1, symbol: '🐺' },
                { type: 'c_escudero', name: 'Escudero', cost: 1, symbol: '🛡️' },
                { type: 'c_guardia', name: 'Guardia', cost: 1, symbol: '💂' }
            ],
            ELITES: [
                { type: 'c_torre', name: 'Torre', cost: 2, symbol: '🏰' },
                { type: 'c_alfil', name: 'Alfil', cost: 2, symbol: '♗' },
                { type: 'c_caballo', name: 'Caballo', cost: 2, symbol: '♞' },
                { type: 'c_soldado', name: 'Soldado', cost: 2, symbol: '⚔️' },
                { type: 'c_mercenario', name: 'Mercenario', cost: 2, symbol: '🗡️' },
                { type: 'c_elefante', name: 'Elefante', cost: 2, symbol: '🐘' },
                { type: 'c_piquetero', name: 'Piquetero', cost: 2, symbol: '🔱' },
                { type: 'c_arquero', name: 'Arquero', cost: 2, symbol: '🏹' },
                { type: 'c_defensor', name: 'Defensor', cost: 2, symbol: '🔰' },
                { type: 'c_canon', name: 'Cañón', cost: 2, symbol: '💣' }
            ],
            COMMANDERS: [
                { type: 'c_rey', name: 'Rey', cost: 3, symbol: '♚' },
                { type: 'c_reina', name: 'Reina', cost: 3, symbol: '♛' },
                { type: 'c_dragon', name: 'Dragón', cost: 3, symbol: '🐉' },
                { type: 'c_gigante', name: 'Gigante', cost: 3, symbol: '🗿' },
                { type: 'c_mago', name: 'Mago', cost: 3, symbol: '🧙' }
            ]
        };
    }

    openCategorizedPieceModal(config, callback) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay modal-active';

        const headerHtml = this.createModalHeaderHtml(config.side || null);

        let groupsHtml = '';
        for (const group of config.groups) {
            groupsHtml += `
                <div style="margin-top: 12px; text-align: left;">
                    <h4 style="color: #60a5fa; font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 8px;">${group.label}</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px;">
                        ${group.items.map(opt => `
                            <button class="btn-place-unit" data-type="${opt.type}" data-cost="${opt.cost || 0}" style="padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: white; cursor: pointer; display: flex; flex-direction: column; align-items: center;">
                                <span style="font-size: 1.5rem;">${opt.symbol}</span>
                                <span style="font-size: 0.75rem; font-weight: bold; margin-top: 4px;">${opt.name}${config.showCost ? ` (${opt.cost} pt)` : ''}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        const isReinforcement = config.reinforcementPoints !== undefined;

        modal.innerHTML = `
            <div class="modal-card glass-panel text-center animate-pop-in" style="max-width: 500px; max-height: 85vh; overflow-y: auto;">
                ${headerHtml}
                <h3>${config.title}</h3>
                ${isReinforcement ? `
                    <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 6px; padding: 4px 10px; margin: 4px auto 12px auto; display: inline-block;">
                        <span style="font-size: 1.15rem; font-weight: bold; color: #fbbf24; text-shadow: 0 0 5px rgba(245, 158, 11, 0.5);">
                            🛡️ ${config.reinforcementPoints} ${config.reinforcementPoints === 1 ? 'punto restante' : 'puntos restantes'}
                        </span>
                    </div>
                ` : (config.subtitle ? `<p style="font-size: 0.85rem; color: #f59e0b; font-weight: bold; margin-bottom: 8px;">${config.subtitle}</p>` : '')}
                ${config.description ? `<p style="font-size: 0.8rem; color: #9ca3af; margin-bottom: 12px;">${config.description}</p>` : ''}
                ${groupsHtml}
                <div style="display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap;">
                    <button class="btn-modal-view-board action-btn secondary-btn small-btn" style="flex: 1; min-width: 130px; background: rgba(255,255,255,0.12);">
                        👁️ Ver Tablero
                    </button>
                    ${config.allowPass ? `<button id="btn-modal-bank-pass" class="action-btn primary-btn small-btn" style="flex: 1; min-width: 150px; background: #16a34a;">💰 Guardar Puntos en Banco (${isReinforcement ? config.reinforcementPoints : ''} pts)</button>` : ''}
                </div>
            </div>
        `;
        
        this.mountModal(modal);
        this.attachBoardInspectionBehavior(
            modal, 
            config.side === 'w' ? 'Blancas' : (config.side === 'b' ? 'Negras' : 'Elección'),
            isReinforcement ? config.reinforcementPoints : null
        );

        if (config.allowPass) {
            modal.querySelector('#btn-modal-bank-pass')?.addEventListener('click', () => {
                modal.remove();
                if (config.onPass) config.onPass();
            });
        }

        modal.querySelectorAll('.btn-place-unit').forEach(btn => {
            btn.addEventListener('click', () => {
                const unitType = btn.dataset.type;
                const cost = parseInt(btn.dataset.cost, 10);
                modal.remove();
                callback(unitType, cost);
            });
        });
    }

    openPromotionModal(color, callback) {
        if (this.rulesEngine.isContinental) {
            const cats = this.getPieceCategories();
            const groups = [
                { label: 'Élites', items: cats.ELITES },
                { label: 'Comandantes', items: cats.COMMANDERS }
            ];
            this.openCategorizedPieceModal({
                title: '✨ Promoción',
                description: 'Tu peón ha llegado a la última fila. Elige en qué convertirse:',
                showCost: false,
                groups: groups
            }, (unitType) => {
                callback(unitType);
            });
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay modal-active';
        modal.innerHTML = `
            <div class="modal-card glass-panel text-center">
                <h3 data-i18n="promotionTitle">${I18n.get('promotionTitle')}</h3>
                <p data-i18n="choosePiece">${I18n.get('choosePiece')}</p>
                <div class="promotion-grid">
                    <button class="promo-btn" data-piece="q">♛ <span data-i18n="queen">${I18n.get('queen')}</span></button>
                    <button class="promo-btn" data-piece="r">♜ <span data-i18n="rook">${I18n.get('rook')}</span></button>
                    <button class="promo-btn" data-piece="b">♝ <span data-i18n="bishop">${I18n.get('bishop')}</span></button>
                    <button class="promo-btn" data-piece="n">♞ <span data-i18n="knight">${I18n.get('knight')}</span></button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelectorAll('.promo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const choice = btn.dataset.piece;
                document.body.removeChild(modal);
                callback(choice);
            });
        });
    }

    endMatch(resultMessage) {
        this.isGameOver = true;
        this.stopClock();

        document.getElementById('modal-board-inspection-bar')?.remove();
        document.getElementById('modal-board-inspection-blocker')?.remove();
        document.querySelectorAll('.modal-overlay').forEach(el => {
            if (el.id !== 'match-setup-modal') el.remove();
        });
        this.isReinforcementMode = false;
        this.reinforcementData = null;

        this.renderHUD();
        AudioManager.playVictory();

        const msgLower = resultMessage.toLowerCase();
        let isWhiteWinner = msgLower.includes('blanca') || msgLower.includes('blanco') || msgLower.includes('white');
        let isBlackWinner = msgLower.includes('negra') || msgLower.includes('negro') || msgLower.includes('black');
        
        let bgColor = 'rgba(15, 23, 42, 0.95)'; // Default dark
        let borderColor = 'rgba(255, 255, 255, 0.1)';
        let titleColor = '#ffffff';
        let bannerHtml = '';

        if (isWhiteWinner) {
            bgColor = 'linear-gradient(135deg, #f8fafc, #cbd5e1)';
            borderColor = '#fbbf24'; // Gold
            titleColor = '#0f172a';
            bannerHtml = `<div style="background: #fbbf24; color: #78350f; font-weight: 900; font-size: 1.2rem; padding: 10px; text-transform: uppercase; letter-spacing: 2px; border-radius: 8px 8px 0 0; margin: -25px -25px 20px -25px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">♔ ¡GANAN LAS BLANCAS! ♔</div>`;
        } else if (isBlackWinner) {
            bgColor = 'linear-gradient(135deg, #1e293b, #020617)';
            borderColor = '#ef4444'; // Red
            titleColor = '#ffffff';
            bannerHtml = `<div style="background: #ef4444; color: #450a0a; font-weight: 900; font-size: 1.2rem; padding: 10px; text-transform: uppercase; letter-spacing: 2px; border-radius: 8px 8px 0 0; margin: -25px -25px 20px -25px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">♚ ¡GANAN LAS NEGRAS! ♚</div>`;
        } else {
            bannerHtml = `<div style="background: #64748b; color: #f8fafc; font-weight: 900; font-size: 1.2rem; padding: 10px; text-transform: uppercase; letter-spacing: 2px; border-radius: 8px 8px 0 0; margin: -25px -25px 20px -25px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">⚖️ EMPATE ⚖️</div>`;
        }

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay modal-active';
        overlay.id = 'game-over-modal';
        overlay.innerHTML = `
            <div class="modal-card animate-bounce" style="background: ${bgColor}; border: 4px solid ${borderColor}; padding: 25px; border-radius: 12px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
                ${bannerHtml}
                <div class="trophy-icon" style="font-size: 4rem; margin-bottom: 10px; drop-shadow: 0 4px 6px rgba(0,0,0,0.4);">🏆</div>
                <h2 style="color: ${titleColor}; font-size: 1.3rem; margin-bottom: 20px; line-height: 1.4; font-weight: bold; text-shadow: ${isWhiteWinner ? 'none' : '0 2px 4px rgba(0,0,0,0.5)'};">${resultMessage}</h2>
                <div class="modal-actions" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
                    <button id="btn-end-rematch" class="action-btn primary-btn" style="flex: 1; min-width: 110px; background: ${isWhiteWinner ? '#2563eb' : '#3b82f6'}; color: white; border: none;" data-i18n="btnRematch">${I18n.get('btnRematch')}</button>
                    <button id="btn-end-view-board" class="action-btn secondary-btn" style="flex: 1; min-width: 110px; background: rgba(0,0,0,0.2); color: ${titleColor}; border: 1px solid ${borderColor};" data-i18n="btnViewBoard">${I18n.get('btnViewBoard')}</button>
                    <button id="btn-end-menu" class="action-btn secondary-btn" style="flex: 1; min-width: 110px; background: rgba(0,0,0,0.2); color: ${titleColor}; border: 1px solid ${borderColor};" data-i18n="btnMenu">${I18n.get('btnMenu')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        if (this.opponentLeftHandled || (this.matchOptions?.mode === 'lan' && typeof NetworkManager !== 'undefined' && (!NetworkManager.conn || !NetworkManager.conn.open))) {
            const rematchBtn = overlay.querySelector('#btn-end-rematch');
            if (rematchBtn) rematchBtn.style.display = 'none';
        }

        document.getElementById('btn-end-rematch')?.addEventListener('click', () => {
            overlay.remove();
            if (this.matchOptions?.mode === 'lan') {
                if (typeof NetworkManager !== 'undefined') {
                    NetworkManager.sendRematchRequest();
                }
                this.showRematchWaitingModal();
            } else {
                this.startMatch(this.matchOptions);
            }
        });

        document.getElementById('btn-end-view-board')?.addEventListener('click', () => {
            overlay.style.display = 'none';
            this.showGameOverBoardInspector(overlay);
        });

        document.getElementById('btn-end-menu')?.addEventListener('click', () => {
            this.exitGame('menu', { skipConfirm: true });
        });
    }

    showRematchWaitingModal() {
        this.closeRematchModals();
        const modal = document.createElement('div');
        modal.id = 'modal-rematch-waiting';
        modal.className = 'modal-overlay modal-active';
        modal.style.zIndex = '9998';
        modal.innerHTML = `
            <div class="modal-card animate-pop-in" style="text-align: center; padding: 24px; max-width: 360px; background: rgba(15, 23, 42, 0.95); border: 2px solid rgba(59, 130, 246, 0.5); border-radius: 14px; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
                <div style="font-size: 2.2rem; margin-bottom: 10px;">🔄</div>
                <h3 style="font-family: var(--font-heading); color: #fff; font-size: 1.15rem; margin-bottom: 6px;">Pidiendo Revancha</h3>
                <p style="font-size: 0.9rem; color: #93c5fd; margin-bottom: 14px;">
                    Esperando que el rival acepte jugar otra partida...
                </p>
                <div class="loading-spinner" style="margin: 0 auto 16px auto; width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                
                <div style="display: flex; gap: 8px; justify-content: center; margin-top: 10px;">
                    <button id="btn-rematch-view-board" class="action-btn secondary-btn" style="flex: 1; padding: 8px; font-size: 0.85rem; font-weight: bold; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff;">
                        👁️ Mirar Tablero
                    </button>
                    <button id="btn-rematch-cancel" class="action-btn secondary-btn" style="flex: 1; padding: 8px; font-size: 0.85rem; font-weight: bold; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5;">
                        🚪 Cancelar / Menú
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#btn-rematch-view-board')?.addEventListener('click', () => {
            this.openBoardInspector({
                title: '🔄 Esperando revancha...',
                modalElement: modal,
                showResign: true,
                onResign: () => this.exitGame('menu', { skipConfirm: true })
            });
        });

        modal.querySelector('#btn-rematch-cancel')?.addEventListener('click', () => {
            this.exitGame('menu', { skipConfirm: true });
        });
    }

    showRematchOfferModal() {
        this.closeRematchModals();
        const modal = document.createElement('div');
        modal.id = 'modal-rematch-offer';
        modal.className = 'modal-overlay modal-active';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal-card animate-pop-in" style="text-align: center; padding: 24px; max-width: 360px; background: rgba(15, 23, 42, 0.95); border: 2px solid #3b82f6; border-radius: 14px; box-shadow: 0 10px 40px rgba(59, 130, 246, 0.5);">
                <div style="font-size: 2.5rem; margin-bottom: 8px;">⚔️</div>
                <h3 style="font-family: var(--font-heading); color: #fff; font-size: 1.2rem; margin-bottom: 8px;">¡Propuesta de Revancha!</h3>
                <p style="font-size: 0.9rem; color: #93c5fd; line-height: 1.4; margin-bottom: 18px;">
                    El rival te invita a jugar una nueva partida. ¿Aceptas el desafío?
                </p>
                <div style="display: flex; gap: 10px;">
                    <button id="btn-reject-rematch" class="action-btn secondary-btn" style="flex: 1; padding: 10px; font-weight: bold; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5;">
                        ❌ Rechazar
                    </button>
                    <button id="btn-accept-rematch" class="action-btn primary-btn" style="flex: 1; padding: 10px; font-weight: bold; background: #3b82f6; border: none; color: #fff;">
                        ✅ ¡Aceptar!
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#btn-reject-rematch')?.addEventListener('click', () => {
            this.exitGame('menu', { skipConfirm: true });
        });

        modal.querySelector('#btn-accept-rematch')?.addEventListener('click', () => {
            modal.remove();
            if (typeof NetworkManager !== 'undefined') {
                NetworkManager.sendRematchConfirm();
            }
            const newSide = this.matchOptions.playerSide === 'w' ? 'b' : 'w';
            this.startMatch({
                ...this.matchOptions,
                playerSide: newSide
            });
        });
    }

    closeRematchModals() {
        document.getElementById('modal-rematch-waiting')?.remove();
        document.getElementById('modal-rematch-offer')?.remove();
        this.closeBoardInspector();
    }

    showRematchCancelledToast(msg) {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '30px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = 'rgba(239, 68, 68, 0.95)';
        toast.style.color = '#fff';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '20px';
        toast.style.fontWeight = 'bold';
        toast.style.fontSize = '0.9rem';
        toast.style.zIndex = '99999';
        toast.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)';
        toast.textContent = `ℹ️ ${msg}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    showGameOverBoardInspector(overlay) {
        this.openBoardInspector({
            title: '🏆 Partida Finalizada',
            modalElement: overlay,
            showResign: true,
            onResign: () => this.exitGame('menu', { skipConfirm: true })
        });
    }
}
