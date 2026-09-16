/**
 * CONTINENTAL - Game Rules Engine
 * Evaluates move legality, check, checkmate, stalemate, castling, and en-passant.
 */

class RulesEngine {
    constructor(board, options = {}) {
        this.board = board;
        this.isContinental = !!options.isContinental;
        this.activeColor = 'w';
        this.enPassantTarget = null; // { r, c }
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.capturedPieces = { w: [], b: [] }; // Pieces captured by White/Black
        this.positionHistory = [];
    }

    reset() {
        this.activeColor = 'w';
        this.enPassantTarget = null;
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.capturedPieces = { w: [], b: [] };
        this.positionHistory = [];
    }

    /**
     * Calculate Army Points for a player in Continental mode
     * Peón: 1 pt, Élite: 2 pts, Comandante: 3 pts (Rey: 6 pts)
     */
    getArmyPoints(color) {
        let total = 0;
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) {
                const piece = this.board.getPiece(r, c);
                if (piece && piece.color === color) {
                    const reg = PieceRegistry.get(piece.type);
                    const tier = reg ? reg.tier : 'peones';
                    const isKing = (piece.type === 'c_rey' || piece.type === 'k');

                    if (piece.promoted) {
                        if (tier === 'comandantes' || isKing || piece.type === 'q') {
                            total += 3;
                        } else if (tier === 'elites' || ['r', 'b', 'n'].includes(piece.type)) {
                            total += 2;
                        } else {
                            total += 2;
                        }
                    } else if (isKing) {
                        total += 6;
                    } else if (tier === 'comandantes') {
                        total += 3;
                    } else if (tier === 'elites') {
                        total += 2;
                    } else {
                        total += 1;
                    }
                }
            }
        }
        return total;
    }

    /**
     * Check Continental Victory Condition
     * Principal: Start a turn with >= 6 points while opponent has <= 5 points
     * Secundario: Opponent has 0 pieces remaining
     */
    checkContinentalVictory() {
        if (!this.isContinental) return null;

        const whitePts = this.getArmyPoints('w');
        const blackPts = this.getArmyPoints('b');

        const active = this.activeColor;
        const opponent = active === 'w' ? 'b' : 'w';

        const activePts = active === 'w' ? whitePts : blackPts;
        const opponentPts = active === 'w' ? blackPts : whitePts;

        // Secondary: Elimination
        if (whitePts === 0) {
            return {
                winner: 'b',
                reason: 'elimination',
                message: '¡VICTORIA POR ANIQUILACIÓN! Negras eliminaron a todas las tropas enemigas.'
            };
        }
        if (blackPts === 0) {
            return {
                winner: 'w',
                reason: 'elimination',
                message: '¡VICTORIA POR ANIQUILACIÓN! Blancas eliminaron a todas las tropas enemigas.'
            };
        }

        // Principal: >= 6 points vs <= 5 points at start of turn
        if (activePts >= 6 && opponentPts <= 5) {
            return {
                winner: active,
                reason: 'points',
                activePts,
                opponentPts,
                message: `¡VICTORIA CONTINENTAL! ${active === 'w' ? 'Blancas' : 'Negras'} iniciaron su turno con ${activePts} puntos frente a ${opponentPts} puntos del enemigo.`
            };
        }

        return null;
    }

    /**
     * Check if square (r, c) is attacked by opponent of `byColor`
     */
    isSquareAttacked(r, c, attackerColor, board = this.board) {
        if (this.isContinental) return false;
        for (let row = 0; row < board.rows; row++) {
            for (let col = 0; col < board.cols; col++) {
                const piece = board.getPiece(row, col);
                if (piece && piece.color === attackerColor) {
                    const reg = PieceRegistry.get(piece.type);
                    if (reg) {
                        const moves = reg.getMoves(row, col, board, attackerColor, { enPassantTarget: null });
                        if (moves.some(m => m.r === r && m.c === c)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    /**
     * Check if `color`'s King is in check
     */
    isKingInCheck(color, board = this.board) {
        if (this.isContinental) return false;
        const kingPos = board.findKing(color);
        if (!kingPos) return false;
        const opponentColor = color === 'w' ? 'b' : 'w';
        return this.isSquareAttacked(kingPos.r, kingPos.c, opponentColor, board);
    }

    /**
     * Get ALL legal moves for a piece at (r, c)
     */
    getLegalMoves(r, c) {
        const piece = this.board.getPiece(r, c);
        if (!piece || piece.color !== this.activeColor) return [];

        const reg = PieceRegistry.get(piece.type);
        if (!reg) return [];

        // Raw candidate moves generated by piece definition
        const candidateMoves = reg.getMoves(r, c, this.board, piece.color, this);

        // In Continental mode: King can be eaten, no checkmate, no king-check filtering!
        if (this.isContinental) {
            return candidateMoves.filter(m => !m.type || !m.type.startsWith('castling'));
        }

        const legalMoves = [];
        candidateMoves.forEach(move => {
            const testBoard = this.board.clone();
            let special = null;
            if (move.type === 'en-passant') {
                special = { type: 'en-passant' };
            } else if (move.type === 'castling-ks') {
                special = { type: 'castling', rookFromC: 7, rookToC: 5 };
            } else if (move.type === 'castling-qs') {
                special = { type: 'castling', rookFromC: 0, rookToC: 3 };
            }

            testBoard.makeMove(r, c, move.r, move.c, special);
            if (!this.isKingInCheck(piece.color, testBoard)) {
                legalMoves.push(move);
            }
        });

        return legalMoves;
    }

    /**
     * Get castling candidate moves for King
     */
    getCastlingMoves(color, board = this.board) {
        if (this.isContinental) return [];
        const moves = [];
        const r = color === 'w' ? 7 : 0;
        const king = board.getPiece(r, 4);

        if (!king || king.moved || this.isKingInCheck(color, board)) return moves;
        const enemyColor = color === 'w' ? 'b' : 'w';

        // Kingside castling (Short enroque)
        const rookKS = board.getPiece(r, 7);
        if (rookKS && !rookKS.moved && board.isEmpty(r, 5) && board.isEmpty(r, 6)) {
            if (!this.isSquareAttacked(r, 5, enemyColor, board) && !this.isSquareAttacked(r, 6, enemyColor, board)) {
                moves.push({ r, c: 6, type: 'castling-ks' });
            }
        }

        // Queenside castling (Long enroque)
        const rookQS = board.getPiece(r, 0);
        if (rookQS && !rookQS.moved && board.isEmpty(r, 1) && board.isEmpty(r, 2) && board.isEmpty(r, 3)) {
            if (!this.isSquareAttacked(r, 2, enemyColor, board) && !this.isSquareAttacked(r, 3, enemyColor, board)) {
                moves.push({ r, c: 2, type: 'castling-qs' });
            }
        }

        return moves;
    }

    /**
     * Get all legal moves for active color across the board
     */
    getAllLegalMoves(color = this.activeColor) {
        const allMoves = [];
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) {
                const p = this.board.getPiece(r, c);
                if (p && p.color === color) {
                    const prevColor = this.activeColor;
                    this.activeColor = color;
                    const moves = this.getLegalMoves(r, c);
                    this.activeColor = prevColor;

                    moves.forEach(m => allMoves.push({ from: { r, c }, to: m }));
                }
            }
        }
        return allMoves;
    }

    /**
     * Execute turn move
     */
    executeMove(fromR, fromC, toR, toC, promotionType = null) {
        const legalMoves = this.getLegalMoves(fromR, fromC);
        const targetMove = legalMoves.find(m => m.r === toR && m.c === toC);
        if (!targetMove) return false;

        const piece = this.board.getPiece(fromR, fromC);
        let special = null;

        // Check Ranged Snipe Move
        if (targetMove.isRanged) {
            special = { type: 'ranged', isRanged: true };
        }

        // Check Pawn Double Step -> Set En Passant Target (only non-continental)
        if (!this.isContinental && targetMove.type === 'pawn-double') {
            const epRow = (fromR + toR) / 2;
            this.enPassantTarget = { r: epRow, c: fromC };
        } else if (targetMove.type === 'en-passant') {
            special = { type: 'en-passant' };
            this.enPassantTarget = null;
        } else {
            this.enPassantTarget = null;
        }

        if (targetMove.type === 'castling-ks') {
            special = { type: 'castling', rookFromC: 7, rookToC: 5 };
        } else if (targetMove.type === 'castling-qs') {
            special = { type: 'castling', rookFromC: 0, rookToC: 3 };
        }

        // Pawn Promotion
        const backRank = piece.color === 'w' ? 0 : (this.board.rows - 1);
        const isContinentalPawn = ['c_peon', 'c_dama', 'c_lobo', 'c_escudero', 'c_guardia'].includes(piece.type);
        if ((piece.type === 'p' || isContinentalPawn) && toR === backRank) {
            special = { type: 'promotion', promoteTo: promotionType || 'q' };
        }

        // Clear capturedLastTurn on all pieces of the active moving color
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) {
                const p = this.board.getPiece(r, c);
                if (p && p.color === this.activeColor) {
                    p.capturedLastTurn = false;
                }
            }
        }

        // Apply Move
        const moveRecord = this.board.makeMove(fromR, fromC, toR, toC, special);

        // Record Captured Piece & set capturedLastTurn
        if (moveRecord.captured) {
            this.capturedPieces[this.activeColor].push(moveRecord.captured);
            
            let attackerRow = toR;
            let attackerCol = toC;
            if (special && (special.type === 'ranged' || special.isRanged)) {
                attackerRow = fromR;
                attackerCol = fromC;
            }

            const movedPiece = this.board.getPiece(attackerRow, attackerCol);
            if (movedPiece && moveRecord.captured.color !== movedPiece.color) {
                movedPiece.capturedLastTurn = true;
            }
        }

        // Record position history for 3-fold repetition
        const posKey = this.board.grid.map(row => row.map(p => p ? `${p.color}${p.type}${p.facing || 0}` : '.').join('')).join('/') + `:${this.activeColor}`;
        this.positionHistory.push(posKey);
        const count = this.positionHistory.filter(k => k === posKey).length;
        const isRepetition = count >= 3;

        // Switch turn
        this.activeColor = this.activeColor === 'w' ? 'b' : 'w';
        if (this.activeColor === 'w') this.fullMoveNumber++;

        // Update Cañón cooldowns for the incoming active player
        for (let r = 0; r < this.board.rows; r++) {
            for (let c = 0; c < this.board.cols; c++) {
                const p = this.board.getPiece(r, c);
                if (p && p.color === this.activeColor && p.type === 'c_canon') {
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

        // Check Continental Victory
        const continentalWin = this.checkContinentalVictory();

        return {
            success: true,
            moveRecord,
            isContinentalWin: !!continentalWin,
            continentalWin,
            isRepetition,
            isCheck: this.isKingInCheck(this.activeColor),
            isCheckmate: !this.isContinental && this.isCheckmate(this.activeColor),
            isStalemate: !this.isContinental && this.isStalemate(this.activeColor)
        };
    }

    /**
     * Check if active color is in Checkmate
     */
    isCheckmate(color = this.activeColor) {
        return this.isKingInCheck(color) && this.getAllLegalMoves(color).length === 0;
    }

    /**
     * Check if active color is in Stalemate
     */
    isStalemate(color = this.activeColor) {
        return !this.isKingInCheck(color) && this.getAllLegalMoves(color).length === 0;
    }
}
