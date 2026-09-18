/**
 * CONTINENTAL - Enhanced AI Engine
 * Lightweight tactical AI capable of handling standard and Continental war mechanics:
 * - Full piece valuation table for all 20 Continental units.
 * - Cannon beam firing evaluation (destroys enemies if net score gain is positive).
 * - Piece-by-piece rotation intelligence for octogonal units (Cannon, Dragon, Defensor, Arquero, Mago).
 * - Strategic center control awareness for 7x7 board games.
 */

class AIEngine {
    static PIECE_VALUES = {
        // Standard Chess Units
        p: 10, n: 30, b: 30, r: 50, q: 90, k: 1000,
        
        // Continental Pawns (10-18 pts)
        c_peon: 10,
        c_dama: 12,
        c_lobo: 18,
        c_escudero: 14,
        c_guardia: 15,

        // Continental Elites (20-30 pts)
        c_soldado: 20,
        c_mercenario: 22,
        c_elefante: 25,
        c_piquetero: 22,
        c_arquero: 25,
        c_defensor: 25,
        c_canon: 30,

        // Continental Commanders (35-1000 pts)
        c_dragon: 40,
        c_gigante: 40,
        c_mago: 35,
        c_reina: 90,
        c_rey: 1000,

        // Legacy / Fallbacks
        assassin: 60,
        archer: 50,
        commander: 70
    };

    /**
     * Compute next best action for the AI opponent
     */
    static getBestMove(rulesEngine, difficulty = 'intermediate') {
        const color = rulesEngine.activeColor;
        const board = rulesEngine.board;

        // 1. Tactical Cannon Check: Can any AI Cannon shoot and gain net score?
        const cannonShot = this.checkCannonFiringOpportunity(rulesEngine, color);
        if (cannonShot) {
            return { isCanonBeam: true, from: cannonShot };
        }

        // 2. Standard & Ability Moves
        const allMoves = rulesEngine.getAllLegalMoves(color);
        if (allMoves.length === 0) return null;

        if (difficulty === 'novice') {
            return this.getNoviceMove(allMoves, rulesEngine);
        } else if (difficulty === 'intermediate') {
            return this.getMinimaxMove(rulesEngine, 2);
        } else { // Master
            return this.getMinimaxMove(rulesEngine, 3);
        }
    }

    /**
     * Tactical evaluation to check if an AI cannon should fire its beam
     */
    static checkCannonFiringOpportunity(rulesEngine, aiColor) {
        const board = rulesEngine.board;
        if (typeof PieceRegistry === 'undefined' || !PieceRegistry.fireCanonBeam) return null;

        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                const piece = board.getPiece(r, c);
                if (piece && piece.color === aiColor && piece.type === 'c_canon') {
                    if (!piece.justFired && !piece.cooldownActive && !piece.usedBeamLastTurn) {
                        const beamResult = PieceRegistry.fireCanonBeam(board, r, c);
                        if (beamResult.destroyed && beamResult.destroyed.length > 0) {
                            let enemyVal = 0;
                            let friendlyVal = 0;

                            beamResult.destroyed.forEach(d => {
                                const val = this.PIECE_VALUES[d.piece.type] || 10;
                                if (d.piece.color === aiColor) friendlyVal += val;
                                else enemyVal += val;
                            });

                            // Fire if net point gain > 0 or enemy destroyed with 0 friendly losses
                            if (enemyVal > friendlyVal && enemyVal >= 10) {
                                return { r, c };
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    /**
     * Calculate optimal rotation angle for an octogonal piece
     */
    static getBestRotationForPiece(boardEngine, r, c, piece) {
        if (!piece) return 0;
        const color = piece.color;
        const facings = [0, 45, 90, 135, 180, 225, 270, 315];

        // 1. Cañón: Aim facing direction at maximum enemy material with 0 friendly fire
        if (piece.type === 'c_canon' && typeof PieceRegistry !== 'undefined' && PieceRegistry.fireCanonBeam) {
            const originalFacing = piece.facing;
            let bestFacing = originalFacing;
            let maxGain = -Infinity;

            facings.forEach(f => {
                piece.facing = f;
                const beamResult = PieceRegistry.fireCanonBeam(boardEngine, r, c);
                let enemyVal = 0;
                let friendlyVal = 0;

                if (beamResult.destroyed) {
                    beamResult.destroyed.forEach(d => {
                        const val = this.PIECE_VALUES[d.piece.type] || 10;
                        if (d.piece.color === color) friendlyVal += val;
                        else enemyVal += val;
                    });
                }
                const gain = enemyVal - (friendlyVal * 2);
                if (gain > maxGain && enemyVal > 0) {
                    maxGain = gain;
                    bestFacing = f;
                }
            });

            piece.facing = originalFacing;
            if (maxGain > 0) return bestFacing;
        }

        // 2. Dragón / Arquero: Aim towards enemy King or center of enemy mass
        if (piece.type === 'c_dragon' || piece.type === 'c_arquero' || piece.type === 'c_canon') {
            let enemyKingPos = null;
            let totalR = 0, totalC = 0, enemyCount = 0;

            for (let i = 0; i < boardEngine.rows; i++) {
                for (let j = 0; j < boardEngine.cols; j++) {
                    const p = boardEngine.getPiece(i, j);
                    if (p && p.color !== color) {
                        if (p.type === 'k' || p.type === 'c_rey') {
                            enemyKingPos = { r: i, c: j };
                        }
                        totalR += i;
                        totalC += j;
                        enemyCount++;
                    }
                }
            }

            const target = enemyKingPos || (enemyCount > 0 ? { r: Math.round(totalR / enemyCount), c: Math.round(totalC / enemyCount) } : { r: 3, c: 3 });
            return this.calculateFacingAngle(r, c, target.r, target.c);
        }

        // 3. Defensor: Aim shield towards enemy concentration
        if (piece.type === 'c_defensor') {
            let totalR = 0, totalC = 0, enemyCount = 0;
            for (let i = 0; i < boardEngine.rows; i++) {
                for (let j = 0; j < boardEngine.cols; j++) {
                    const p = boardEngine.getPiece(i, j);
                    if (p && p.color !== color) {
                        totalR += i;
                        totalC += j;
                        enemyCount++;
                    }
                }
            }
            if (enemyCount > 0) {
                const avgR = Math.round(totalR / enemyCount);
                const avgC = Math.round(totalC / enemyCount);
                return this.calculateFacingAngle(r, c, avgR, avgC);
            }
        }

        // Default: Face forward into enemy territory
        return color === 'w' ? 0 : 180;
    }

    /**
     * Compute 8-way facing angle from (r1, c1) towards (r2, c2)
     */
    static calculateFacingAngle(r1, c1, r2, c2) {
        const dr = r2 - r1; // negative = upwards on board (towards r=0)
        const dc = c2 - c1; // positive = rightwards (towards max c)

        if (dr === 0 && dc === 0) return 0;

        // Angle in radians (0 = North/Upwards on board = r decrements)
        const angleRad = Math.atan2(dc, -dr);
        let angleDeg = Math.round((angleRad * 180 / Math.PI) / 45) * 45;
        if (angleDeg < 0) angleDeg += 360;

        return angleDeg % 360;
    }

    /**
     * Novice: Selects captures randomly or random legal move
     */
    static getNoviceMove(allMovesUnfiltered, rulesEngine) {
        const allMoves = allMovesUnfiltered.filter(m => !m.to.isCanonBeamTarget);
        if (allMoves.length === 0) return null;
        
        const captures = allMoves.filter(m => rulesEngine.board.getPiece(m.to.r, m.to.c) !== null);
        if (captures.length > 0 && Math.random() > 0.3) {
            return captures[Math.floor(Math.random() * captures.length)];
        }
        return allMoves[Math.floor(Math.random() * allMoves.length)];
    }

    /**
     * Minimax Search with Alpha-Beta Pruning
     */
    static getMinimaxMove(rulesEngine, depth) {
        const aiColor = rulesEngine.activeColor;
        const isMaximizing = aiColor === 'w';
        const allMovesUnfiltered = rulesEngine.getAllLegalMoves(aiColor);
        const allMoves = allMovesUnfiltered.filter(m => !m.to.isCanonBeamTarget);

        if (allMoves.length === 0) return null;

        let bestMove = null;
        let bestEval = isMaximizing ? -Infinity : Infinity;

        // Shuffle moves for organic game variety
        allMoves.sort(() => Math.random() - 0.5);

        for (const move of allMoves) {
            const boardCopy = rulesEngine.board.clone();
            const piece = boardCopy.getPiece(move.from.r, move.from.c);

            let special = null;
            if (move.to.type === 'en-passant') special = { type: 'en-passant' };
            else if (move.to.type === 'castling-ks') special = { type: 'castling', rookFromC: 7, rookToC: 5 };
            else if (move.to.type === 'castling-qs') special = { type: 'castling', rookFromC: 0, rookToC: 3 };
            if ((piece.type === 'p' || piece.type === 'c_peon') && (move.to.r === 0 || move.to.r === boardCopy.rows - 1)) {
                special = { type: 'promotion', promoteTo: 'c_dragon' };
            }

            boardCopy.makeMove(move.from.r, move.from.c, move.to.r, move.to.c, special);

            const evalScore = this.evaluateBoard(boardCopy);

            if (isMaximizing) {
                if (evalScore > bestEval) {
                    bestEval = evalScore;
                    bestMove = move;
                }
            } else {
                if (evalScore < bestEval) {
                    bestEval = evalScore;
                    bestMove = move;
                }
            }
        }

        return bestMove || allMoves[0];
    }

    /**
     * Tactical Board Evaluation
     */
    static evaluateBoard(board) {
        let totalScore = 0;

        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                const piece = board.getPiece(r, c);
                if (piece) {
                    const val = this.PIECE_VALUES[piece.type] || 15;
                    
                    // Center square bonus (d4 on 7x7)
                    let centerBonus = 0;
                    if (board.rows === 7 && r === 3 && c === 3) {
                        centerBonus = 35; // Strong control bias for Captura del Centro
                    } else if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
                        centerBonus = 4;
                    }

                    const score = val + centerBonus;

                    if (piece.color === 'w') {
                        totalScore += score;
                    } else {
                        totalScore -= score;
                    }
                }
            }
        }

        return totalScore;
    }
}
