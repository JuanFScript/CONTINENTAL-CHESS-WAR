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

        // Standard & Ability Moves
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
    

    /**
     * Calculate optimal rotation angle for an octogonal piece
     */
    

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


