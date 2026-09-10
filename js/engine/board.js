/**
 * CONTINENTAL - Board State Engine
 * Manages grid structure, piece placement, move application, and FEN parsing.
 * Supports configurable matrix dimensions (8x8 standard, extensible to custom NxM).
 */

class BoardEngine {
    constructor(rows = 8, cols = 8) {
        this.rows = rows;
        this.cols = cols;
        this.grid = Array(rows).fill(null).map(() => Array(cols).fill(null));
        this.history = [];
    }

    /**
     * Clear board
     */
    clear() {
        this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
        this.history = [];
    }

    /**
     * Check if (r, c) is within board boundaries
     */
    isInBounds(r, c) {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    /**
     * Get piece at (r, c)
     */
    getPiece(r, c) {
        if (!this.isInBounds(r, c)) return null;
        return this.grid[r][c];
    }

    /**
     * Check if square is empty
     */
    isEmpty(r, c) {
        return this.isInBounds(r, c) && this.grid[r][c] === null;
    }

    /**
     * Set piece at (r, c)
     */
    setPiece(r, c, piece) {
        if (this.isInBounds(r, c)) {
            this.grid[r][c] = piece;
        }
    }

    /**
     * Setup Continental Board for Turn-by-Turn Draft
     * Starts with an empty board (7x7) ready for sequential piece drafting.
     */
    setupContinentalDraft(submode = null) {
        this.clear();
    }

    /**
     * Setup starting board position (supports 8x8 and 7x7 Continental layouts)
     */
    setupStandard() {
        this.clear();
        if (this.rows === 7 && this.cols === 7) {
            // King in the exact center column (index 3)
            const backRank = ['r', 'n', 'b', 'k', 'q', 'b', 'r'];

            // Black pieces (rows 0 and 1)
            backRank.forEach((type, col) => {
                this.setPiece(0, col, { type, color: 'b', moved: false });
                this.setPiece(1, col, { type: 'p', color: 'b', moved: false });
            });

            // White pieces (rows 5 and 6)
            backRank.forEach((type, col) => {
                this.setPiece(5, col, { type: 'p', color: 'w', moved: false });
                this.setPiece(6, col, { type, color: 'w', moved: false });
            });
        } else {
            const backRank = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

            // Black pieces (rows 0 and 1)
            backRank.forEach((type, col) => {
                this.setPiece(0, col, { type, color: 'b', moved: false });
                this.setPiece(1, col, { type: 'p', color: 'b', moved: false });
            });

            // White pieces (rows 6 and 7)
            backRank.forEach((type, col) => {
                this.setPiece(6, col, { type: 'p', color: 'w', moved: false });
                this.setPiece(7, col, { type, color: 'w', moved: false });
            });
        }
    }

    /**
     * Setup Ajedrez 360 (Fischer Random 960)
     */
    setupFischerRandom() {
        this.clear();
        const emptyIndices = [0, 1, 2, 3, 4, 5, 6, 7];

        // Dark square bishop (even column index: 0, 2, 4, 6)
        const darkCols = [0, 2, 4, 6];
        const b1Col = darkCols[Math.floor(Math.random() * darkCols.length)];
        emptyIndices.splice(emptyIndices.indexOf(b1Col), 1);

        // Light square bishop (odd column index: 1, 3, 5, 7)
        const lightCols = [1, 3, 5, 7];
        const b2Col = lightCols[Math.floor(Math.random() * lightCols.length)];
        emptyIndices.splice(emptyIndices.indexOf(b2Col), 1);

        // Queen on random empty square
        const qIdx = Math.floor(Math.random() * emptyIndices.length);
        const qCol = emptyIndices.splice(qIdx, 1)[0];

        // Knights on 2 random empty squares
        const n1Idx = Math.floor(Math.random() * emptyIndices.length);
        const n1Col = emptyIndices.splice(n1Idx, 1)[0];
        const n2Idx = Math.floor(Math.random() * emptyIndices.length);
        const n2Col = emptyIndices.splice(n2Idx, 1)[0];

        // Remaining 3 empty squares must be assigned [Rook, King, Rook]
        emptyIndices.sort((a, b) => a - b);
        const r1Col = emptyIndices[0];
        const kCol = emptyIndices[1];
        const r2Col = emptyIndices[2];

        const backRank = Array(8);
        backRank[b1Col] = 'b';
        backRank[b2Col] = 'b';
        backRank[qCol] = 'q';
        backRank[n1Col] = 'n';
        backRank[n2Col] = 'n';
        backRank[r1Col] = 'r';
        backRank[kCol] = 'k';
        backRank[r2Col] = 'r';

        // Black pieces (rows 0 and 1)
        backRank.forEach((type, col) => {
            this.setPiece(0, col, { type, color: 'b', moved: false });
            this.setPiece(1, col, { type: 'p', color: 'b', moved: false });
        });

        // White pieces (rows 6 and 7)
        backRank.forEach((type, col) => {
            this.setPiece(6, col, { type: 'p', color: 'w', moved: false });
            this.setPiece(7, col, { type, color: 'w', moved: false });
        });
    }

    /**
     * Setup Continental - Gran Ejército (Reinforced Army)
     * Adds forward vanguard Knights + 2 extra Elites on the baseline rank.
     */
    setupGranEjercito() {
        this.setupStandard();
        if (this.rows === 7 && this.cols === 7) {
            // White forward vanguard Knights at c3 (row 4, col 2) and e3 (row 4, col 4)
            this.setPiece(4, 2, { type: 'c_caballo', color: 'w', moved: true });
            this.setPiece(4, 4, { type: 'c_caballo', color: 'w', moved: true });

            // White 2 Extra Elites on baseline rank 'a' (row 6, cols 0 and 6)
            this.setPiece(6, 0, { type: 'c_soldado', color: 'w', moved: false });
            this.setPiece(6, 6, { type: 'c_soldado', color: 'w', moved: false });

            // Black forward vanguard Knights at c5 (row 2, col 2) and e5 (row 2, col 4)
            this.setPiece(2, 2, { type: 'c_caballo', color: 'b', moved: true });
            this.setPiece(2, 4, { type: 'c_caballo', color: 'b', moved: true });

            // Black 2 Extra Elites on baseline rank 'g' (row 0, cols 0 and 6)
            this.setPiece(0, 0, { type: 'c_soldado', color: 'b', moved: false });
            this.setPiece(0, 6, { type: 'c_soldado', color: 'b', moved: false });
        } else {
            // 8x8 Standard: Vanguard Knights at row 5/row 2, plus 2 extra Bishops/Elites on row 6/row 1 or corners
            this.setPiece(5, 2, { type: 'n', color: 'w', moved: true });
            this.setPiece(5, 5, { type: 'n', color: 'w', moved: true });
            this.setPiece(6, 0, { type: 'b', color: 'w', moved: true });
            this.setPiece(6, 7, { type: 'b', color: 'w', moved: true });

            this.setPiece(2, 2, { type: 'n', color: 'b', moved: true });
            this.setPiece(2, 5, { type: 'n', color: 'b', moved: true });
            this.setPiece(1, 0, { type: 'b', color: 'b', moved: true });
            this.setPiece(1, 7, { type: 'b', color: 'b', moved: true });
        }
    }

    /**
     * Apply move to board state and push to history stack
     */
    makeMove(fromR, fromC, toR, toC, special = null) {
        const piece = this.getPiece(fromR, fromC);
        const captured = this.getPiece(toR, toC);

        const moveRecord = {
            from: { r: fromR, c: fromC },
            to: { r: toR, c: toC },
            piece: { ...piece },
            captured: captured ? { ...captured } : null,
            special: special
        };

        // Handle Special moves (Castling, En Passant, Promotion, Ranged Snipe)
        if (special && (special.type === 'ranged' || special.isRanged)) {
            // Ranged Attack: Target piece is eliminated, attacker stays at fromR, fromC!
            this.grid[toR][toC] = null;
            this.grid[fromR][fromC] = { ...piece, moved: true };
        } else if (special && special.type === 'castling') {
            const rookFromC = special.rookFromC;
            const rookToC = special.rookToC;
            const rook = this.getPiece(fromR, rookFromC);

            this.grid[fromR][fromC] = null;
            this.grid[toR][toC] = { ...piece, moved: true };
            this.grid[fromR][rookFromC] = null;
            this.grid[fromR][rookToC] = { ...rook, moved: true };
        } else if (special && special.type === 'en-passant') {
            const capturedPawnR = fromR; // Enemy pawn is on the same row as attacker
            const capturedPawnC = toC;
            moveRecord.captured = { ...this.getPiece(capturedPawnR, capturedPawnC) };

            this.grid[fromR][fromC] = null;
            this.grid[toR][toC] = { ...piece, moved: true };
            this.grid[capturedPawnR][capturedPawnC] = null;
        } else if (special && special.type === 'promotion') {
            this.grid[fromR][fromC] = null;
            this.grid[toR][toC] = { 
                type: special.promoteTo || 'q', 
                color: piece.color, 
                moved: true,
                facing: piece.facing ?? (piece.color === 'w' ? 0 : 180)
            };
        } else {
            // Normal move or capture
            this.grid[fromR][fromC] = null;
            this.grid[toR][toC] = { ...piece, moved: true };
        }

        this.history.push(moveRecord);
        return moveRecord;
    }

    /**
     * Revert the last move
     */
    undoMove() {
        if (this.history.length === 0) return null;
        const last = this.history.pop();

        if (last.special && (last.special.type === 'ranged' || last.special.isRanged)) {
            const { from, to, piece, captured } = last;
            this.grid[to.r][to.c] = captured;
            this.grid[from.r][from.c] = piece;
        } else if (last.special && last.special.type === 'castling') {
            const { from, to, piece, special } = last;
            this.grid[to.r][to.c] = null;
            this.grid[from.r][from.c] = piece;

            const rook = this.getPiece(from.r, special.rookToC);
            this.grid[from.r][special.rookToC] = null;
            this.grid[from.r][special.rookFromC] = { ...rook, moved: false };
        } else if (last.special && last.special.type === 'en-passant') {
            const { from, to, piece, captured } = last;
            this.grid[to.r][to.c] = null;
            this.grid[from.r][from.c] = piece;
            this.grid[from.r][to.c] = captured;
        } else {
            const { from, to, piece, captured } = last;
            this.grid[to.r][to.c] = captured;
            this.grid[from.r][from.c] = piece;
        }

        return last;
    }

    /**
     * Find coordinates of King for given color
     */
    findKing(color) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const p = this.grid[r][c];
                if (p && p.type === 'k' && p.color === color) {
                    return { r, c };
                }
            }
        }
        return null;
    }

    /**
     * Deep clone board instance
     */
    clone() {
        const copy = new BoardEngine(this.rows, this.cols);
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c]) {
                    copy.grid[r][c] = { ...this.grid[r][c] };
                }
            }
        }
        return copy;
    }
}
