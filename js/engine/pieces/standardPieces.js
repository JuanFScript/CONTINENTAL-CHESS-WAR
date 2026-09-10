/**
 * CONTINENTAL - Standard Chess Pieces Implementation
 * Loads high-resolution piece images from the assets/pieces/ directory.
 */

(function registerStandardPieces() {
    function getPieceImagePath(type, color) {
        const prefix = color === 'w' ? 'w' : 'b';
        const code = prefix + type.toUpperCase();
        return `assets/pieces/${code}.svg`;
    }

    // 1. PAWN (p)
    PieceRegistry.register('p', {
        name: { es: 'Peón', en: 'Pawn' },
        symbol: '♟',
        value: 1,
        getImageUrl: (color) => getPieceImagePath('p', color),
        category: 'standard',
        description: {
            es: 'Avanza 1 casilla hacia adelante (2 en su primer movimiento). Captura en diagonal.',
            en: 'Moves 1 square forward (2 on first move). Captures diagonally.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const dir = color === 'w' ? -1 : 1;
            const startRow = color === 'w' ? 6 : 1;

            const fRow = r + dir;
            if (board.isInBounds(fRow, c) && board.isEmpty(fRow, c)) {
                moves.push({ r: fRow, c, type: 'normal' });
                const f2Row = r + 2 * dir;
                if (r === startRow && board.isEmpty(f2Row, c)) {
                    moves.push({ r: f2Row, c, type: 'pawn-double' });
                }
            }

            [-1, 1].forEach(dc => {
                const targetC = c + dc;
                if (board.isInBounds(fRow, targetC)) {
                    const targetPiece = board.getPiece(fRow, targetC);
                    if (targetPiece && targetPiece.color !== color) {
                        moves.push({ r: fRow, c: targetC, type: 'capture' });
                    }
                    if (gameRules && gameRules.enPassantTarget) {
                        if (gameRules.enPassantTarget.r === fRow && gameRules.enPassantTarget.c === targetC) {
                            moves.push({ r: fRow, c: targetC, type: 'en-passant' });
                        }
                    }
                }
            });

            return moves;
        }
    });

    // 2. KNIGHT (n)
    PieceRegistry.register('n', {
        name: { es: 'Caballo', en: 'Knight' },
        symbol: '♞',
        value: 3,
        getImageUrl: (color) => getPieceImagePath('n', color),
        category: 'standard',
        description: {
            es: 'Se mueve en forma de "L" (2 casillas en una dirección y 1 en perpendicular). Salta piezas.',
            en: 'Moves in an "L" shape (2 squares one way, 1 perpendicular). Can jump over pieces.'
        },
        getMoves: (r, c, board, color) => {
            const moves = [];
            const offsets = [
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2], [1, 2], [2, -1], [2, 1]
            ];
            offsets.forEach(([dr, dc]) => {
                const tr = r + dr;
                const tc = c + dc;
                if (board.isInBounds(tr, tc)) {
                    const p = board.getPiece(tr, tc);
                    if (!p) moves.push({ r: tr, c: tc, type: 'normal' });
                    else if (p.color !== color) moves.push({ r: tr, c: tc, type: 'capture' });
                }
            });
            return moves;
        }
    });

    // 3. BISHOP (b)
    PieceRegistry.register('b', {
        name: { es: 'Alfil', en: 'Bishop' },
        symbol: '♝',
        value: 3,
        getImageUrl: (color) => getPieceImagePath('b', color),
        category: 'standard',
        description: {
            es: 'Se desplaza en diagonal cualquier número de casillas.',
            en: 'Moves diagonally any number of unoccupied squares.'
        },
        getMoves: (r, c, board, color) => {
            return generateRayMoves(r, c, board, color, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
        }
    });

    // 4. ROOK (r)
    PieceRegistry.register('r', {
        name: { es: 'Torre', en: 'Rook' },
        symbol: '♜',
        value: 5,
        getImageUrl: (color) => getPieceImagePath('r', color),
        category: 'standard',
        description: {
            es: 'Se desplaza en líneas rectas horizontales y verticales.',
            en: 'Moves horizontally and vertically any number of unoccupied squares.'
        },
        getMoves: (r, c, board, color) => {
            return generateRayMoves(r, c, board, color, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
        }
    });

    // 5. QUEEN (q)
    PieceRegistry.register('q', {
        name: { es: 'Reina', en: 'Queen' },
        symbol: '♛',
        value: 9,
        getImageUrl: (color) => getPieceImagePath('q', color),
        category: 'standard',
        description: {
            es: 'Combina el movimiento de la Torre y el Alfil.',
            en: 'Combines Rook and Bishop movement patterns.'
        },
        getMoves: (r, c, board, color) => {
            return generateRayMoves(r, c, board, color, [
                [-1, 0], [1, 0], [0, -1], [0, 1],
                [-1, -1], [-1, 1], [1, -1], [1, 1]
            ]);
        }
    });

    // 6. KING (k)
    PieceRegistry.register('k', {
        name: { es: 'Rey', en: 'King' },
        symbol: '♚',
        value: 100,
        getImageUrl: (color) => getPieceImagePath('k', color),
        category: 'standard',
        description: {
            es: 'Se mueve 1 casilla en cualquier dirección.',
            en: 'Moves 1 square in any direction.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const dirs = [
                [-1, 0], [1, 0], [0, -1], [0, 1],
                [-1, -1], [-1, 1], [1, -1], [1, 1]
            ];
            dirs.forEach(([dr, dc]) => {
                const tr = r + dr;
                const tc = c + dc;
                if (board.isInBounds(tr, tc)) {
                    const p = board.getPiece(tr, tc);
                    if (!p) moves.push({ r: tr, c: tc, type: 'normal' });
                    else if (p.color !== color) moves.push({ r: tr, c: tc, type: 'capture' });
                }
            });

            if (gameRules && gameRules.getCastlingMoves) {
                moves.push(...gameRules.getCastlingMoves(color, board));
            }
            return moves;
        }
    });

    function generateRayMoves(r, c, board, color, directions) {
        const moves = [];
        directions.forEach(([dr, dc]) => {
            let tr = r + dr;
            let tc = c + dc;
            while (board.isInBounds(tr, tc)) {
                const p = board.getPiece(tr, tc);
                if (!p) {
                    moves.push({ r: tr, c: tc, type: 'normal' });
                } else {
                    if (p.color !== color) moves.push({ r: tr, c: tc, type: 'capture' });
                    break;
                }
                tr += dr;
                tc += dc;
            }
        });
        return moves;
    }
})();
