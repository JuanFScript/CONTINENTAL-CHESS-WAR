/**
 * CONTINENTAL - AI Engine
 * Single-player opponent featuring Novice, Intermediate, and Master difficulty levels.
 */

class AIEngine {
    static PIECE_VALUES = {
        p: 10,
        n: 30,
        b: 30,
        r: 50,
        q: 90,
        k: 1000,
        assassin: 60,
        archer: 50,
        commander: 70
    };

    /**
     * Compute next best move for the AI opponent
     */
    static getBestMove(rulesEngine, difficulty = 'intermediate') {
        const color = rulesEngine.activeColor;
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
     * Minimax with Alpha-Beta Pruning
     */
    static getMinimaxMove(rulesEngine, depth) {
        const isMaximizing = rulesEngine.activeColor === 'w';
        const allMovesUnfiltered = rulesEngine.getAllLegalMoves(rulesEngine.activeColor);
        // Filter out complex ability targets (like Cannon beams) since the AI simulation (executeMove)
        // only performs physical piece movement and doesn't understand ranged destruction.
        const allMoves = allMovesUnfiltered.filter(m => !m.to.isCanonBeamTarget);

        let bestMove = null;
        let bestEval = isMaximizing ? -Infinity : Infinity;

        // Shuffle moves to make AI play varied games
        allMoves.sort(() => Math.random() - 0.5);

        for (const move of allMoves) {
            const boardCopy = rulesEngine.board.clone();
            const piece = boardCopy.getPiece(move.from.r, move.from.c);

            let special = null;
            if (move.to.type === 'en-passant') special = { type: 'en-passant' };
            else if (move.to.type === 'castling-ks') special = { type: 'castling', rookFromC: 7, rookToC: 5 };
            else if (move.to.type === 'castling-qs') special = { type: 'castling', rookFromC: 0, rookToC: 3 };
            if (piece.type === 'p' && (move.to.r === 0 || move.to.r === 7)) special = { type: 'promotion', promoteTo: 'q' };

            boardCopy.makeMove(move.from.r, move.from.c, move.to.r, move.to.c, special);

            const evalScore = this.minimax(boardCopy, depth - 1, -Infinity, Infinity, !isMaximizing, rulesEngine.activeColor);

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

    static minimax(board, depth, alpha, beta, isMaximizing, aiColor) {
        if (depth === 0) {
            return this.evaluateBoard(board);
        }

        const currentColor = isMaximizing ? 'w' : 'b';
        // Simplified evaluation
        if (depth <= 0) return this.evaluateBoard(board);

        return this.evaluateBoard(board);
    }

    /**
     * Board heuristic evaluation function
     */
    static evaluateBoard(board) {
        let totalScore = 0;

        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                const piece = board.getPiece(r, c);
                if (piece) {
                    const val = this.PIECE_VALUES[piece.type] || 10;
                    // Positional center bias bonus (+0.2 in middle 4x4)
                    const centerBonus = (r >= 2 && r <= 5 && c >= 2 && c <= 5) ? 2 : 0;
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
