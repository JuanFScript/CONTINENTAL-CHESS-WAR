/**
 * CONTINENTAL - Exclusive Continental Pieces Implementation
 * Registers all Continental-exclusive pieces (+PEONES, →ÉLITES, #COMANDANTES)
 * with exact movement rules, strict separation between Move (M) and Attack (A),
 * Defensor shield checks, Escudero retribution checks, and special abilities.
 */

(function registerContinentalPieces() {
    function isInBounds(r, c, board) {
        return board && board.isInBounds(r, c);
    }

    const COMPASS_8 = [
        { angle: 0,   dr: -1, dc: 0,  name: 'N' },
        { angle: 45,  dr: -1, dc: 1,  name: 'NE' },
        { angle: 90,  dr: 0,  dc: 1,  name: 'E' },
        { angle: 135, dr: 1,  dc: 1,  name: 'SE' },
        { angle: 180, dr: 1,  dc: 0,  name: 'S' },
        { angle: 225, dr: 1,  dc: -1, name: 'SW' },
        { angle: 270, dr: 0,  dc: -1, name: 'W' },
        { angle: 315, dr: -1, dc: -1, name: 'NW' }
    ];

    function getPieceFacing(piece) {
        if (!piece) return 0;
        if (piece.facing !== undefined) return piece.facing;
        return piece.color === 'w' ? 0 : 180;
    }

    function getDirVector(angle) {
        const a = ((angle % 360) + 360) % 360;
        const match = COMPASS_8.find(c => Math.abs(c.angle - a) < 15);
        return match ? { dr: match.dr, dc: match.dc } : { dr: -1, dc: 0 };
    }

    // Expose helpers globally
    PieceRegistry.COMPASS_8 = COMPASS_8;
    PieceRegistry.getPieceFacing = getPieceFacing;
    PieceRegistry.getDirVector = getDirVector;

    /**
     * Checks if an attacker can capture a target piece, respecting friendly fire and Defensor shield.
     */
    function canCaptureTarget(attackerColor, attackerPos, targetPiece, targetPos, board) {
        if (!targetPiece) return false;
        // Friendly pieces cannot be captured (unless attacker is Gigante)
        if (targetPiece.color === attackerColor) return false;

        // Check Defensor shield facing North, NE and NW (relative to facing angle)
        if (targetPiece.type === 'c_defensor') {
            const facing = getPieceFacing(targetPiece);
            const shieldAngles = [facing, (facing + 45) % 360, (facing + 315) % 360];
            for (const sa of shieldAngles) {
                const sDir = getDirVector(sa);
                if (attackerPos.r === targetPos.r + sDir.dr && attackerPos.c === targetPos.c + sDir.dc) {
                    return false; // Immune to captures from shielded squares!
                }
            }
        }
        return true;
    }

    function isDefenderShieldingAgainst(board, defPos, attackerPos) {
        if (!board) return false;
        const targetPiece = board.getPiece(defPos.r, defPos.c);
        if (!targetPiece || targetPiece.type !== 'c_defensor') return false;
        const facing = getPieceFacing(targetPiece);
        const shieldAngles = [facing, (facing + 45) % 360, (facing + 315) % 360];
        for (const sa of shieldAngles) {
            const sDir = getDirVector(sa);
            if (attackerPos.r === defPos.r + sDir.dr && attackerPos.c === defPos.c + sDir.dc) {
                return true;
            }
        }
        return false;
    }

    // Expose helpers globally
    PieceRegistry.canCaptureTarget = canCaptureTarget;
    PieceRegistry.isDefenderShieldingAgainst = isDefenderShieldingAgainst;
    if (typeof window !== 'undefined') {
        window.canCaptureTarget = canCaptureTarget;
        window.isDefenderShieldingAgainst = isDefenderShieldingAgainst;
    }

    /**
     * Helper for Lobo (Wolf) Pack Surge mechanics
     */
    const WolfPackHelper = {
        getRearWolves(board, fromPos, color) {
            const dir = (color === 'w' ? -1 : 1);
            const rearR = fromPos.r - dir;
            const rightC = fromPos.c + 1;
            const leftC = fromPos.c - 1;
            const rearWolves = [];

            // 1. Right rear wolf FIRST
            if (board.isInBounds(rearR, rightC)) {
                const pRight = board.getPiece(rearR, rightC);
                if (pRight && pRight.type === 'c_lobo' && pRight.color === color) {
                    rearWolves.push({ r: rearR, c: rightC, side: 'derecha' });
                }
            }

            // 2. Left rear wolf SECOND
            if (board.isInBounds(rearR, leftC)) {
                const pLeft = board.getPiece(rearR, leftC);
                if (pLeft && pLeft.type === 'c_lobo' && pLeft.color === color) {
                    rearWolves.push({ r: rearR, c: leftC, side: 'izquierda' });
                }
            }

            return rearWolves;
        },

        canAdvanceWolf(board, wolfPos, color) {
            const dir = (color === 'w' ? -1 : 1);
            const targetR = wolfPos.r + dir;
            const targetC = wolfPos.c;

            if (!board.isInBounds(targetR, targetC)) {
                return { canAdvance: false, reason: 'out_of_bounds' };
            }

            const targetPiece = board.getPiece(targetR, targetC);
            if (!targetPiece) {
                return { canAdvance: true, isCapture: false, targetPiece: null };
            }

            if (targetPiece.color === color) {
                return { canAdvance: false, reason: 'blocked_by_friendly' };
            }

            const canCap = canCaptureTarget(color, wolfPos, targetPiece, { r: targetR, c: targetC }, board);
            if (canCap) {
                return { canAdvance: true, isCapture: true, targetPiece };
            } else {
                return { canAdvance: false, reason: 'shielded' };
            }
        }
    };

    PieceRegistry.WolfPackHelper = WolfPackHelper;
    if (typeof window !== 'undefined') window.WolfPackHelper = WolfPackHelper;

    // =========================================================================
    // +PEONES (5 Piezas)
    // =========================================================================

    // 1. PEÓN (CONTINENTAL)
    // M: 1 adelante (sólo mover). A: 1 en diagonal adelante (sólo comer).
    PieceRegistry.register('c_peon', {
        name: { es: 'Peón (Continental)', en: 'Pawn (Continental)' },
        symbol: '♟',
        value: 1,
        category: 'continental',
        tier: 'peones',
        tags: ['Continental'],
        moveSummary: {
            m: '1 casilla hacia adelante (sólo mover a casilla vacía)',
            a: '1 casilla en diagonal hacia adelante (sólo para comer)',
            e: 'Sin avance doble'
        },
        description: {
            es: 'Infantería básica continental. M: Avanza 1 casilla hacia adelante sólo si está vacía. A: Come 1 casilla en diagonal hacia adelante.',
            en: 'Basic continental infantry. M: Moves 1 square forward only if empty. A: Captures 1 square diagonally forward.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const dir = color === 'w' ? -1 : 1;

            // M: 1 adelante (sólo a casilla vacía)
            const fRow = r + dir;
            if (isInBounds(fRow, c, board) && board.isEmpty(fRow, c)) {
                moves.push({ r: fRow, c, type: 'normal' });
            }

            // A: 1 en diagonal adelante (sólo si hay pieza enemiga para comer)
            [-1, 1].forEach(dc => {
                const tc = c + dc;
                if (isInBounds(fRow, tc, board)) {
                    const p = board.getPiece(fRow, tc);
                    if (p && canCaptureTarget(color, { r, c }, p, { r: fRow, c: tc }, board)) {
                        moves.push({ r: fRow, c: tc, type: 'capture' });
                    }
                }
            });

            return moves;
        }
    });

    // 2. DAMAS
    // M y A: 1 en diagonal adelante.
    PieceRegistry.register('c_dama', {
        name: { es: 'Damas', en: 'Checkers' },
        symbol: '🔘',
        value: 1,
        category: 'continental',
        tier: 'peones',
        tags: ['Continental', 'Diagonal'],
        moveSummary: {
            m: '1 en diagonal hacia adelante (casilla vacía)',
            a: '1 en diagonal hacia adelante (capturar enemiga)',
            e: 'Mueve y come exclusivamente en diagonal'
        },
        description: {
            es: 'Inspirada en el clásico juego de Damas. M y A: Se desplaza y captura 1 casilla en diagonal hacia adelante.',
            en: 'Inspired by Checkers. M and A: Moves and captures 1 square diagonally forward.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const dir = color === 'w' ? -1 : 1;
            const fRow = r + dir;

            [-1, 1].forEach(dc => {
                const tc = c + dc;
                if (isInBounds(fRow, tc, board)) {
                    if (board.isEmpty(fRow, tc)) {
                        moves.push({ r: fRow, c: tc, type: 'normal' });
                    } else {
                        const p = board.getPiece(fRow, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: fRow, c: tc }, board)) {
                            moves.push({ r: fRow, c: tc, type: 'capture' });
                        }
                    }
                }
            });

            return moves;
        }
    });

    // 3. LOBOS
    // M y A 1 hacia adelante. E: Caza en manada (popups consecutivos para avanzar lobos detrás).
    PieceRegistry.register('c_lobo', {
        name: { es: 'Lobos', en: 'Wolves' },
        symbol: '🐺',
        value: 2,
        category: 'continental',
        tier: 'peones',
        tags: ['Continental', 'Manada'],
        moveSummary: {
            m: '1 hacia adelante (casilla vacía)',
            a: '1 hacia adelante (capturar enemiga)',
            e: 'Caza en manada: al mover, pregunta al jugador si desea avanzar a los lobos aliados situados en diagonal atrás'
        },
        description: {
            es: 'Depredadores en manada. M y A: 1 casilla hacia adelante. E: Al avanzar, genera pop-ups para avanzar en cadena a los lobos aliados ubicados en diagonal hacia atrás.',
            en: 'Pack hunters. M and A: 1 square forward. E: When moving, triggers chain popups to advance friendly wolves diagonally behind.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const dir = color === 'w' ? -1 : 1;
            const f1 = r + dir;

            if (isInBounds(f1, c, board)) {
                if (board.isEmpty(f1, c)) {
                    moves.push({ r: f1, c, type: 'normal' });
                } else {
                    const p1 = board.getPiece(f1, c);
                    if (p1 && canCaptureTarget(color, { r, c }, p1, { r: f1, c }, board)) {
                        moves.push({ r: f1, c, type: 'capture' });
                    }
                }
            }

            return moves;
        }
    });

    // 4. ESCUDEROS
    // M: 1 adelante. E: puede comer cualquier enemiga pieza adyacente que haya comido una pieza en el turno anterior.
    PieceRegistry.register('c_escudero', {
        name: { es: 'Escuderos', en: 'Squires' },
        symbol: '🛡️',
        value: 2,
        category: 'continental',
        tier: 'peones',
        tags: ['Continental', 'Retribución'],
        moveSummary: {
            m: '1 casilla hacia adelante (sólo mover a casilla vacía)',
            a: 'Sólo piezas enemigas adyacentes que hayan comido en el turno anterior',
            e: 'Venganza: no puede atacar por iniciativa propia, sólo castigar piezas enemigas (incluso atacantes a distancia) que destruyeron a un aliado el turno previo'
        },
        description: {
            es: 'Defensor de primera línea. M: Avanza 1 casilla hacia adelante si está vacía. E: Retribución: Sólo puede comer a una pieza enemiga adyacente (en sus 3 casillas frontales o 2 laterales) si esa pieza enemiga destruyó una unidad de tu equipo en el turno anterior (aplica también contra ataques a distancia de Arqueros, Cañones o Gigantes).',
            en: 'Frontline protector. M: Moves 1 square forward if empty. E: Retribution: Can only capture an adjacent enemy piece (in its 3 front or 2 side squares) if it destroyed an allied unit on the previous turn (also works against ranged attacks from Archers, Cannons, or Giants).'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const dir = color === 'w' ? -1 : 1;

            // M: 1 adelante (sólo si está vacía)
            const fRow = r + dir;
            if (isInBounds(fRow, c, board) && board.isEmpty(fRow, c)) {
                moves.push({ r: fRow, c, type: 'normal' });
            }

            // A: Retribución en las 3 casillas adelante y 2 a los costados (SÓLO si la enemiga comió en el turno anterior)
            const offsets = [
                [dir, -1], [dir, 0], [dir, 1], // Adelante
                [0, -1],             [0, 1]    // Costados
            ];
            offsets.forEach(([dr, dc]) => {
                const tr = r + dr;
                const tc = c + dc;
                if (isInBounds(tr, tc, board)) {
                    const p = board.getPiece(tr, tc);
                    if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                        const isTestMode = (typeof window !== 'undefined' && window.CONTINENTAL_TEST_MODE) || (typeof localStorage !== 'undefined' && localStorage.getItem('continental_test_mode') === 'true');
                        const canRetribute = p.capturedLastTurn === true || (isTestMode && p.usedAbilityLastTurn === true);
                        if (canRetribute) {
                            moves.push({ r: tr, c: tc, type: 'capture' });
                        }
                    }
                }
            });

            return moves;
        }
    });

    // 5. GUARDIAS
    // M y A: 1 adelante y 1 atras.
    PieceRegistry.register('c_guardia', {
        name: { es: 'Guardias', en: 'Guards' },
        symbol: '💂',
        value: 2,
        category: 'continental',
        tier: 'peones',
        tags: ['Continental'],
        moveSummary: {
            m: '1 adelante y 1 atrás (casilla vacía)',
            a: '1 adelante y 1 atrás (capturar enemiga)',
            e: 'Defensa de retaguardia: protege y defiende la pieza ubicada detrás de él pudiendo contraatacar y retroceder'
        },
        description: {
            es: 'Soldado de guardia disciplinado. M y A: Se mueve y captura 1 casilla hacia adelante y 1 casilla hacia atrás, defendiendo activamente a la pieza que tiene detrás.',
            en: 'Disciplined sentry. M and A: Moves and captures 1 square forward and 1 square backward, actively defending the piece behind it.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const dir = color === 'w' ? -1 : 1;

            [dir, -dir].forEach(step => {
                const tr = r + step;
                if (isInBounds(tr, c, board)) {
                    if (board.isEmpty(tr, c)) {
                        moves.push({ r: tr, c, type: 'normal' });
                    } else {
                        const p = board.getPiece(tr, c);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c }, board)) {
                            moves.push({ r: tr, c, type: 'capture' });
                        }
                    }
                }
            });

            return moves;
        }
    });

    // =========================================================================
    // →ELITES (10 Piezas)
    // =========================================================================

    // 6. TORRE (CONTINENTAL)
    // 3 como Torre
    PieceRegistry.register('c_torre', {
        name: { es: 'Torre (Continental)', en: 'Rook (Continental)' },
        symbol: '🏰',
        value: 4,
        category: 'continental',
        tier: 'elites',
        tags: ['Continental', 'Alcance 3'],
        moveSummary: {
            m: 'Hasta 3 casillas en línea recta ortogonal',
            a: 'Hasta 3 casillas en línea recta ortogonal',
            e: 'Alcance limitado a 3 casillas'
        },
        description: {
            es: 'Versión Continental de la Torre. M y A: Se mueve y captura hasta 3 casillas en línea recta ortogonal (4 direcciones).',
            en: 'Continental version of the Rook. M and A: Moves and captures up to 3 squares in orthogonal lines (4 directions).'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

            dirs.forEach(([dr, dc]) => {
                for (let step = 1; step <= 3; step++) {
                    const tr = r + dr * step;
                    const tc = c + dc * step;
                    if (!isInBounds(tr, tc, board)) break;
                    if (board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    } else {
                        const p = board.getPiece(tr, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                            moves.push({ r: tr, c: tc, type: 'capture' });
                        }
                        break;
                    }
                }
            });

            return moves;
        }
    });

    // 7. ALFIL (CONTINENTAL)
    // 3 como alfil.
    PieceRegistry.register('c_alfil', {
        name: { es: 'Alfil (Continental)', en: 'Bishop (Continental)' },
        symbol: '♗',
        value: 3,
        category: 'continental',
        tier: 'elites',
        tags: ['Continental', 'Alcance 3'],
        moveSummary: {
            m: 'Hasta 3 casillas en diagonal',
            a: 'Hasta 3 casillas en diagonal',
            e: 'Alcance limitado a 3 casillas'
        },
        description: {
            es: 'Versión Continental del Alfil. M y A: Se mueve y captura hasta 3 casillas en diagonal (4 direcciones).',
            en: 'Continental version of the Bishop. M and A: Moves and captures up to 3 squares diagonally (4 directions).'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

            dirs.forEach(([dr, dc]) => {
                for (let step = 1; step <= 3; step++) {
                    const tr = r + dr * step;
                    const tc = c + dc * step;
                    if (!isInBounds(tr, tc, board)) break;
                    if (board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    } else {
                        const p = board.getPiece(tr, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                            moves.push({ r: tr, c: tc, type: 'capture' });
                        }
                        break;
                    }
                }
            });

            return moves;
        }
    });

    // 8. CABALLO (CONTINENTAL)
    // Como caballo
    PieceRegistry.register('c_caballo', {
        name: { es: 'Caballo (Continental)', en: 'Knight (Continental)' },
        symbol: '♞',
        value: 3,
        category: 'continental',
        tier: 'elites',
        tags: ['Continental', 'Salto'],
        moveSummary: {
            m: 'Salto en L de Caballo estándar',
            a: 'Salto en L de Caballo estándar',
            e: 'Salta sobre piezas'
        },
        description: {
            es: 'Caballero clásico adaptado al modo Continental. M y A: Salta en forma de "L" (2 casillas en una dirección y 1 en perpendicular), saltando piezas intermedias.',
            en: 'Classic Knight adapted to Continental. M and A: Leaps in an "L" shape (2 squares in one direction and 1 perpendicular), jumping over pieces.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const offsets = [
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2],  [1, 2],  [2, -1],  [2, 1]
            ];

            offsets.forEach(([dr, dc]) => {
                const tr = r + dr;
                const tc = c + dc;
                if (isInBounds(tr, tc, board)) {
                    if (board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    } else {
                        const p = board.getPiece(tr, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                            moves.push({ r: tr, c: tc, type: 'capture' });
                        }
                    }
                }
            });

            return moves;
        }
    });

    // 9. SOLDADO
    // 2 Como torre, 1 como alfil.
    PieceRegistry.register('c_soldado', {
        name: { es: 'Soldado', en: 'Soldier' },
        symbol: '⚔️',
        value: 4,
        category: 'continental',
        tier: 'elites',
        tags: ['Continental'],
        moveSummary: {
            m: 'Hasta 2 como Torre + 1 como Alfil',
            a: 'Hasta 2 como Torre + 1 como Alfil',
            e: 'Excelente maniobrabilidad mixta a corta distancia'
        },
        description: {
            es: 'Guerrero de combate cercano versátil. M y A: Se mueve y captura hasta 2 casillas en línea recta (ortogonal) y 1 casilla en diagonal.',
            en: 'Versatile close-combat fighter. M and A: Moves and captures up to 2 squares in orthogonal lines and 1 square diagonally.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];

            // 2 como Torre (bloqueable)
            const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            orthoDirs.forEach(([dr, dc]) => {
                for (let step = 1; step <= 2; step++) {
                    const tr = r + dr * step;
                    const tc = c + dc * step;
                    if (!isInBounds(tr, tc, board)) break;
                    if (board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    } else {
                        const p = board.getPiece(tr, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                            moves.push({ r: tr, c: tc, type: 'capture' });
                        }
                        break;
                    }
                }
            });

            // 1 como Alfil
            const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
            diagDirs.forEach(([dr, dc]) => {
                const tr = r + dr;
                const tc = c + dc;
                if (isInBounds(tr, tc, board)) {
                    if (board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    } else {
                        const p = board.getPiece(tr, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                            moves.push({ r: tr, c: tc, type: 'capture' });
                        }
                    }
                }
            });

            return moves;
        }
    });

    // 10. MERCENARIO
    // 2 Como alfil, 1 como torre.
    PieceRegistry.register('c_mercenario', {
        name: { es: 'Mercenario', en: 'Mercenary' },
        symbol: '🗡️',
        value: 4,
        category: 'continental',
        tier: 'elites',
        tags: ['Continental'],
        moveSummary: {
            m: 'Hasta 2 como Alfil + 1 como Torre',
            a: 'Hasta 2 como Alfil + 1 como Torre',
            e: 'Mayor agilidad en diagonales'
        },
        description: {
            es: 'Espadachín ágil y letal. M y A: Se mueve y captura hasta 2 casillas en diagonal y 1 casilla en línea recta ortogonal.',
            en: 'Agile skirmisher. M and A: Moves and captures up to 2 squares diagonally and 1 square in orthogonal lines.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];

            // 2 como Alfil (bloqueable)
            const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
            diagDirs.forEach(([dr, dc]) => {
                for (let step = 1; step <= 2; step++) {
                    const tr = r + dr * step;
                    const tc = c + dc * step;
                    if (!isInBounds(tr, tc, board)) break;
                    if (board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    } else {
                        const p = board.getPiece(tr, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                            moves.push({ r: tr, c: tc, type: 'capture' });
                        }
                        break;
                    }
                }
            });

            // 1 como Torre
            const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            orthoDirs.forEach(([dr, dc]) => {
                const tr = r + dr;
                const tc = c + dc;
                if (isInBounds(tr, tc, board)) {
                    if (board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    } else {
                        const p = board.getPiece(tr, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                            moves.push({ r: tr, c: tc, type: 'capture' });
                        }
                    }
                }
            });

            return moves;
        }
    });

    // 11. ELEFANTE
    // Caballo + 1 como alfil. No salta.
    PieceRegistry.register('c_elefante', {
        name: { es: 'Elefante', en: 'Elephant' },
        symbol: '🐘',
        value: 5,
        category: 'continental',
        tier: 'elites',
        tags: ['Continental', 'Sin Salto'],
        moveSummary: {
            m: 'Caballo (sin saltar) + 1 como Alfil',
            a: 'Caballo (sin saltar) + 1 como Alfil',
            e: 'No salta: la casilla diagonal intermedia del movimiento de Caballo debe estar despejada'
        },
        description: {
            es: 'Bestia de guerra pesada. M y A: Movimiento de Caballo pero con trayectoria bloqueable (no puede saltar sobre piezas intermedias, bloqueado por diagonal), más 1 casilla en diagonal.',
            en: 'Heavy war beast. M and A: Knight movement with blockable path (blocked if intermediate diagonal is occupied), plus 1 square diagonally.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];

            // Caballo sin saltar: intermediate step MUST be empty
            // (Bloqueado por casilla diagonal intermedia, no ortogonal)
            const knightSteps = [
                { dr: -2, dc: -1, stepR: -1, stepC: -1 },
                { dr: -2, dc: 1,  stepR: -1, stepC: 1 },
                { dr: 2,  dc: -1, stepR: 1,  stepC: -1 },
                { dr: 2,  dc: 1,  stepR: 1,  stepC: 1 },
                { dr: -1, dc: -2, stepR: -1, stepC: -1 },
                { dr: 1,  dc: -2, stepR: 1,  stepC: -1 },
                { dr: -1, dc: 2,  stepR: -1, stepC: 1 },
                { dr: 1,  dc: 2,  stepR: 1,  stepC: 1 }
            ];

            knightSteps.forEach(({ dr, dc, stepR, stepC }) => {
                const tr = r + dr;
                const tc = c + dc;
                const midR = r + stepR;
                const midC = c + stepC;

                if (isInBounds(tr, tc, board)) {
                    // Check if intermediate square is empty (cannot leap over)
                    if (board.isEmpty(midR, midC)) {
                        if (board.isEmpty(tr, tc)) {
                            moves.push({ r: tr, c: tc, type: 'normal' });
                        } else {
                            const p = board.getPiece(tr, tc);
                            if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                                moves.push({ r: tr, c: tc, type: 'capture' });
                            }
                        }
                    }
                }
            });

            // 1 como Alfil
            const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
            diagDirs.forEach(([dr, dc]) => {
                const tr = r + dr;
                const tc = c + dc;
                if (isInBounds(tr, tc, board)) {
                    if (board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    } else {
                        const p = board.getPiece(tr, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                            moves.push({ r: tr, c: tc, type: 'capture' });
                        }
                    }
                }
            });

            return moves;
        }
    });

    // 12. PIQUETERO
    // Caballo + 1 como torre. No salta.
    PieceRegistry.register('c_piquetero', {
        name: { es: 'Piquetero', en: 'Pikeman' },
        symbol: '🔱',
        value: 5,
        category: 'continental',
        tier: 'elites',
        tags: ['Continental', 'Sin Salto'],
        moveSummary: {
            m: 'Caballo (sin saltar) + 1 como Torre',
            a: 'Caballo (sin saltar) + 1 como Torre',
            e: 'No salta: la casilla ortogonal intermedia del Caballo debe estar despejada'
        },
        description: {
            es: 'Infantería pesada con picas largas. M y A: Movimiento de Caballo con trayectoria bloqueable (sin saltar piezas), más 1 casilla en línea recta ortogonal.',
            en: 'Heavy infantry with long pikes. M and A: Knight movement with blockable path (cannot jump pieces), plus 1 square orthogonally.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];

            // Caballo sin saltar
            const knightSteps = [
                { dr: -2, dc: -1, stepR: -1, stepC: 0 },
                { dr: -2, dc: 1,  stepR: -1, stepC: 0 },
                { dr: 2,  dc: -1, stepR: 1,  stepC: 0 },
                { dr: 2,  dc: 1,  stepR: 1,  stepC: 0 },
                { dr: -1, dc: -2, stepR: 0,  stepC: -1 },
                { dr: 1,  dc: -2, stepR: 0,  stepC: -1 },
                { dr: -1, dc: 2,  stepR: 0,  stepC: 1 },
                { dr: 1,  dc: 2,  stepR: 0,  stepC: 1 }
            ];

            knightSteps.forEach(({ dr, dc, stepR, stepC }) => {
                const tr = r + dr;
                const tc = c + dc;
                const midR = r + stepR;
                const midC = c + stepC;

                if (isInBounds(tr, tc, board)) {
                    if (board.isEmpty(midR, midC)) {
                        if (board.isEmpty(tr, tc)) {
                            moves.push({ r: tr, c: tc, type: 'normal' });
                        } else {
                            const p = board.getPiece(tr, tc);
                            if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                                moves.push({ r: tr, c: tc, type: 'capture' });
                            }
                        }
                    }
                }
            });

            // 1 como Torre
            const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            orthoDirs.forEach(([dr, dc]) => {
                const tr = r + dr;
                const tc = c + dc;
                if (isInBounds(tr, tc, board)) {
                    if (board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    } else {
                        const p = board.getPiece(tr, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                            moves.push({ r: tr, c: tc, type: 'capture' });
                        }
                    }
                }
            });

            return moves;
        }
    });

    // 13. ARQUERO
    // M: 1 como torre (sólo casilla vacía). E: Dispara en vez de comer. A: Caballo + 2 como torre - 1 como torre.
    PieceRegistry.register('c_arquero', {
        name: { es: 'Arquero', en: 'Archer' },
        symbol: '🏹',
        value: 5,
        category: 'continental',
        tier: 'elites',
        tags: ['Continental', 'Disparo a Distancia'],
        moveSummary: {
            m: '1 como Torre (sólo mover a casilla vacía)',
            a: 'Caballo + distancia 2 como Torre (sin distancia 1)',
            e: 'Dispara en vez de comer: elimina a la pieza enemiga sin moverse de su casilla (⚠️ Modo Prueba altera su funcionamiento)'
        },
        description: {
            es: 'Unidad de ataque a distancia. M: Avanza 1 casilla como Torre sólo si está vacía. A / E: Disparo a distancia: elimina piezas enemigas sin desplazarse en casillas de Caballo y a distancia 2 como Torre. (⚠️ En Modo de Prueba: Se vuelve una unidad Octogonal, mueve 1 casilla en cruz y dispara a 3 casillas de frente).',
            en: 'Ranged sniper unit. M: Moves 1 square orthogonally without capturing. A / E: Ranged snipe: eliminates enemies without moving at Knight squares and distance-2 orthogonal squares. (⚠️ Test Mode: Becomes Octogonal, moves 1 square in a cross, shoots 3 squares forward).'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];

            // =========================================================================
            // MODO DE PRUEBA: ARQUERO OCTOGONAL
            // Mueve como cañón (1 adelante y 1 atrás en su orientación, sólo casilla vacía)
            // Ataca a 3 casillas de frente a distancia (Disparo a distancia)
            // =========================================================================
            if (typeof window !== 'undefined' && window.CONTINENTAL_TEST_MODE) {
                const thisPiece = board.getPiece(r, c);
                const facing = getPieceFacing(thisPiece);
                const fwd = getDirVector(facing);
                const bwd = { dr: -fwd.dr, dc: -fwd.dc };
                const left = getDirVector(facing + 270);
                const right = getDirVector(facing + 90);
                [fwd, bwd, left, right].forEach(step => {
                    const tr = r + step.dr;
                    const tc = c + step.dc;
                    if (isInBounds(tr, tc, board) && board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    }
                });

                // Ataque: 3 casillas frontales según su orientación (Disparo a distancia: no se mueve)
                const ARCHER_TEST_ATTACKS = {
                    0:   [ [-2, -1], [-2, 0], [-2, 1] ],
                    45:  [ [-2, 1],  [-2, 2], [-1, 2] ],
                    90:  [ [-1, 2],  [0, 2],  [1, 2] ],
                    135: [ [1, 2],   [2, 2],  [2, 1] ],
                    180: [ [2, 1],   [2, 0],  [2, -1] ],
                    225: [ [2, -1],  [2, -2], [1, -2] ],
                    270: [ [1, -2],  [0, -2], [-1, -2] ],
                    315: [ [-1, -2], [-2, -2],[-2, -1] ]
                };

                const normFacing = ((facing % 360) + 360) % 360;
                const matchAngle = Object.keys(ARCHER_TEST_ATTACKS).find(a => Math.abs(Number(a) - normFacing) < 22.5) ?? 0;
                const offsets = ARCHER_TEST_ATTACKS[matchAngle] || ARCHER_TEST_ATTACKS[0];

                offsets.forEach(([dr, dc]) => {
                    const tr = r + dr;
                    const tc = c + dc;
                    if (isInBounds(tr, tc, board)) {
                        const p = board.getPiece(tr, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                            moves.push({ r: tr, c: tc, type: 'capture', isRanged: true, isSpecialAttackTarget: true });
                        }
                    }
                });

                return moves;
            }

            // Modo Oficial Normal:
            // M: 1 como torre (sólo a casilla vacía, NO puede comer a distancia 1)
            const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            orthoDirs.forEach(([dr, dc]) => {
                const tr = r + dr;
                const tc = c + dc;
                if (isInBounds(tr, tc, board) && board.isEmpty(tr, tc)) {
                    moves.push({ r: tr, c: tc, type: 'normal' });
                }
            });

            // A: Caballo + 2 como torre - 1 como torre (Disparo a distancia: SÓLO si hay enemiga)
            const knightOffsets = [
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2],  [1, 2],  [2, -1],  [2, 1]
            ];
            knightOffsets.forEach(([dr, dc]) => {
                const tr = r + dr;
                const tc = c + dc;
                if (isInBounds(tr, tc, board)) {
                    const p = board.getPiece(tr, tc);
                    if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                        moves.push({ r: tr, c: tc, type: 'capture', isRanged: true, isSpecialAttackTarget: true });
                    }
                }
            });

            // 2 como torre (distancia 2 exacta)
            orthoDirs.forEach(([dr, dc]) => {
                const tr = r + dr * 2;
                const tc = c + dc * 2;
                if (isInBounds(tr, tc, board)) {
                    const p = board.getPiece(tr, tc);
                    if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                        moves.push({ r: tr, c: tc, type: 'capture', isRanged: true, isSpecialAttackTarget: true });
                    }
                }
            });

            return moves;
        }
    });

    // 14. DEFENSOR
    // Octagonal. M: como rey (sólo casilla vacía). E: Protege hacia Norte, Nor-Este y Nor-Oeste.
    PieceRegistry.register('c_defensor', {
        name: { es: 'Defensor', en: 'Defender' },
        symbol: '🔰',
        value: 5,
        category: 'continental',
        tier: 'elites',
        octogonal: true,
        tags: ['Continental', 'Octogonal', 'Escudo Frontal'],
        moveSummary: {
            m: 'Como Rey (1 casilla en cualquier dirección a casilla vacía)',
            a: 'Puede comer en 5 direcciones (lados y atrás). No puede atacar donde apunta su escudo',
            e: 'Escudo invulnerable: inmune a capturas de piezas enemigas adyacentes a las que apunta con sus flechas'
        },
        description: {
            es: 'Guardián acorazado con escudo frontal. M: Se mueve como Rey a cualquier casilla vecina vacía. A: Ataca a piezas enemigas adyacentes, excepto en las 3 direcciones que protege su escudo. E: Escudo: Inmune a ser comido por piezas enemigas adyacentes ubicadas en las direcciones hacia donde apuntan sus flechas.',
            en: 'Shielded sentinel. M: Moves like a King to empty adjacent squares. A: Captures adjacent enemy units, except in its 3 shield directions. E: Shield: Immune to captures from adjacent enemies in the direction of its arrows.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const thisPiece = board.getPiece(r, c);
            const facing = getPieceFacing(thisPiece);
            const shieldAngles = [facing, (facing + 45) % 360, (facing + 315) % 360];
            const shieldOffsets = shieldAngles.map(a => getDirVector(a));

            const allAdj = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],           [0, 1],
                [1, -1],  [1, 0],  [1, 1]
            ];

            allAdj.forEach(([dr, dc]) => {
                const tr = r + dr;
                const tc = c + dc;
                if (isInBounds(tr, tc, board)) {
                    const isShieldDir = shieldOffsets.some(so => so.dr === dr && so.dc === dc);

                    if (board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    } else if (!isShieldDir) {
                        const p = board.getPiece(tr, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                            moves.push({ r: tr, c: tc, type: 'capture' });
                        }
                    }
                }
            });

            return moves;
        }
    });

    // 15. CAÑÓN
    // Octagonal. M: 1 adelante y 1 atrás en su orientación (sólo casilla vacía). E: Bombardeo frontal múltiple (destruye todas las piezas en 3 casillas, no 2 turnos seguidos).
    PieceRegistry.register('c_canon', {
        name: { es: 'Cañón', en: 'Cannon' },
        symbol: '💣',
        value: 6,
        category: 'continental',
        tier: 'elites',
        octogonal: true,
        tags: ['Continental', 'Octogonal', 'Bombardeo en Línea'],
        moveSummary: {
            m: '1 adelante y 1 atrás en su orientación (a casilla vacía)',
            a: 'Bombardeo frontal: destruye TODAS las piezas en su rango (hasta 3 casillas, Defensor adyacente sobrevive de frente)',
            e: 'Cooldown: no puede disparar 2 turnos seguidos. Flecha roja cuando está listo, gris en recarga'
        },
        description: {
            es: 'Artillería pesada devastadora. M: Avanza 1 adelante o 1 atrás según hacia dónde apunte. E: Bombardeo frontal: Destruye simultáneamente a TODAS las piezas (aliadas y enemigas) en su línea de visión hasta 3 casillas. (Un Defensor enemigo adyacente sobrevive de frente al disparo). Cooldown de 1 turno.',
            en: 'Heavy siege artillery. M: Moves 1 square forward or backward along its facing axis. E: Frontal blast: Obliterates ALL pieces (friendly or enemy) in its path up to 3 squares. (An adjacent defending Defender survives the blast). 1-turn cooldown.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const thisPiece = board.getPiece(r, c);
            const facing = getPieceFacing(thisPiece);
            const fwd = getDirVector(facing);
            const bwd = { dr: -fwd.dr, dc: -fwd.dc };

            // M: 1 adelante y 1 atrás (sólo mover a casilla vacía)
            [fwd, bwd].forEach(step => {
                const tr = r + step.dr;
                const tc = c + step.dc;
                if (isInBounds(tr, tc, board) && board.isEmpty(tr, tc)) {
                    moves.push({ r: tr, c: tc, type: 'normal' });
                }
            });

            // E: Rayo destructor si NO está en cooldown (marca casillas ocupadas con objetivo de rayo rojo)
            const isOnCooldown = thisPiece && (thisPiece.justFired === true || thisPiece.cooldownActive === true || thisPiece.usedBeamLastTurn === true || thisPiece.beamCooldown > 0);
            if (!isOnCooldown) {
                for (let s = 1; s <= 3; s++) {
                    const tr = r + fwd.dr * s;
                    const tc = c + fwd.dc * s;
                    if (!isInBounds(tr, tc, board)) break;
                    if (!board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'canon-beam-target', isCanonBeamTarget: true });
                    }
                }
            }

            return moves;
        }
    });

    PieceRegistry.fireCanonBeam = function(board, r, c) {
        const piece = board.getPiece(r, c);
        if (!piece || piece.type !== 'c_canon') return { destroyed: [] };
        const facing = getPieceFacing(piece);
        const fwd = getDirVector(facing);
        const destroyed = [];

        for (let s = 1; s <= 3; s++) {
            const tr = r + fwd.dr * s;
            const tc = c + fwd.dc * s;
            if (!board.isInBounds(tr, tc)) break;
            const target = board.getPiece(tr, tc);
            if (target) {
                // Check Defensor adjacent shield block
                if (s === 1 && target.type === 'c_defensor') {
                    const defFacing = getPieceFacing(target);
                    const shieldAngles = [defFacing, (defFacing + 45) % 360, (defFacing + 315) % 360];
                    const shieldOffsets = shieldAngles.map(a => getDirVector(a));
                    const attackDirFromDef = { dr: -fwd.dr, dc: -fwd.dc };
                    const isDefending = shieldOffsets.some(so => so.dr === attackDirFromDef.dr && so.dc === attackDirFromDef.dc);
                    if (isDefending) {
                        // El Defensor sobrevive al rayo (pero no frena el resto del disparo)
                        continue;
                    }
                }
                destroyed.push({ r: tr, c: tc, piece: target });
                board.setPiece(tr, tc, null);
            }
        }

        piece.justFired = true;
        piece.usedBeamLastTurn = true;
        piece.cooldownActive = false;
        return { destroyed };
    };

    // =========================================================================
    // #COMANDANTES (5 Piezas)
    // =========================================================================

    // 16. REY (CONTINENTAL)
    // E: Vale 6 puntos. Cuando en el modo no importan los puntos, empieza con 4 puntos más de tropas.
    PieceRegistry.register('c_rey', {
        name: { es: 'Rey (Continental)', en: 'King (Continental)' },
        symbol: '♚',
        value: 6,
        category: 'continental',
        tier: 'comandantes',
        tags: ['Continental', '6 Puntos', '+4 Tropas de inicio'],
        moveSummary: {
            m: '1 casilla en cualquier dirección',
            a: '1 casilla en cualquier dirección',
            e: 'Vale 6 puntos. En modos sin puntuación, comienza con +4 puntos de tropas de refuerzo'
        },
        description: {
            es: 'Comandante supremo. M y A: 1 casilla en cualquier dirección. E: Su valor es de 6 puntos. En partidas donde los puntos no se usen como objetivo, concede 4 puntos extra de tropas iniciales.',
            en: 'Supreme commander. M and A: 1 square in any direction. E: Worth 6 points. In modes without points, starts with 4 extra troop points.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const offsets = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],           [0, 1],
                [1, -1],  [1, 0],  [1, 1]
            ];

            offsets.forEach(([dr, dc]) => {
                const tr = r + dr;
                const tc = c + dc;
                if (isInBounds(tr, tc, board)) {
                    if (board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    } else {
                        const p = board.getPiece(tr, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                            moves.push({ r: tr, c: tc, type: 'capture' });
                        }
                    }
                }
            });

            return moves;
        }
    });

    // 17. REINA (CONTINENTAL)
    // 3 como torre + 3 como alfil.
    PieceRegistry.register('c_reina', {
        name: { es: 'Reina (Continental)', en: 'Queen (Continental)' },
        symbol: '♛',
        value: 7,
        category: 'continental',
        tier: 'comandantes',
        tags: ['Continental', 'Alcance 3'],
        moveSummary: {
            m: 'Hasta 3 casillas en cualquier dirección',
            a: 'Hasta 3 casillas en cualquier dirección',
            e: '3 como Torre + 3 como Alfil (ortogonal y diagonal)'
        },
        description: {
            es: 'Comandante de asalto supremo. M y A: Se desplaza y captura hasta 3 casillas en las 8 direcciones (ortogonales y diagonales).',
            en: 'Supreme assault commander. M and A: Moves and captures up to 3 squares in all 8 directions (orthogonal and diagonal).'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const thisPiece = board.getPiece(r, c);
            const allDirs = [
                [-1, 0], [1, 0], [0, -1], [0, 1],
                [-1, -1], [-1, 1], [1, -1], [1, 1]
            ];

            allDirs.forEach(([dr, dc]) => {
                for (let step = 1; step <= 3; step++) {
                    const tr = r + dr * step;
                    const tc = c + dc * step;
                    if (!isInBounds(tr, tc, board)) break;
                    
                    if (board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    } else {
                        const p = board.getPiece(tr, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                            moves.push({ r: tr, c: tc, type: 'capture' });
                        }
                        break;
                    }
                }
            });

            return moves;
        }
    });

    // 18. DRAGÓN
    // Octagonal. 7 saltos frontales orientados según su facing (1 fwd, 2 fwd, 3 fwd, saltos de caballo a los costados, y 3 fwd + 1 costado).
    PieceRegistry.register('c_dragon', {
        name: { es: 'Dragón', en: 'Dragon' },
        symbol: '🐉',
        value: 9,
        category: 'continental',
        tier: 'comandantes',
        octogonal: true,
        tags: ['Continental', 'Octogonal', 'Vuelo / Salto Frontal'],
        moveSummary: {
            m: '7 saltos frontales en su orientación: 1, 2 y 3 adelante, saltos de caballo frontal, 3 adelante + 1 lateral',
            a: '7 saltos frontales (mismo patrón para capturar)',
            e: 'Vuelo total: salta por encima de cualquier obstáculo según su orientación'
        },
        description: {
            es: 'Bestia mítica de devastación aérea. M y A: Salta por encima de cualquier obstáculo a 7 posiciones frontales según hacia dónde apunte: 1, 2 y 3 casillas adelante, saltos de caballo frontal (2 adelante y 1 lateral), y 3 adelante y 1 lateral.',
            en: 'Mythical beast of aerial devastation. M and A: Leaps over any obstacle to 7 forward positions based on its facing.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const thisPiece = board.getPiece(r, c);
            const facing = getPieceFacing(thisPiece);

            function getDragonLeaps(angle) {
                const a = ((angle % 360) + 360) % 360;
                if (a === 45) { // NE: c5(-1,1), c6(-1,2), d5(-2,1), d6(-2,2), d7(-2,3), e6(-3,2)
                    return [[-1, 1], [-1, 2], [-2, 1], [-2, 2], [-2, 3], [-3, 2]];
                } else if (a === 135) { // SE
                    return [[1, 1], [1, 2], [2, 1], [2, 2], [2, 3], [3, 2]];
                } else if (a === 225) { // SW
                    return [[1, -1], [1, -2], [2, -1], [2, -2], [2, -3], [3, -2]];
                } else if (a === 315) { // NW
                    return [[-1, -1], [-1, -2], [-2, -1], [-2, -2], [-2, -3], [-3, -2]];
                } else if (a === 90) { // E
                    return [[0, 1], [0, 2], [0, 3], [-1, 2], [1, 2], [-1, 3], [1, 3]];
                } else if (a === 180) { // S
                    return [[1, 0], [2, 0], [3, 0], [2, -1], [2, 1], [3, -1], [3, 1]];
                } else if (a === 270) { // W
                    return [[0, -1], [0, -2], [0, -3], [-1, -2], [1, -2], [-1, -3], [1, -3]];
                } else { // 0 (N)
                    return [[-1, 0], [-2, 0], [-3, 0], [-2, -1], [-2, 1], [-3, -1], [-3, 1]];
                }
            }

            const relativeLeaps = getDragonLeaps(facing);

            relativeLeaps.forEach(([dr, dc]) => {
                const tr = r + dr;
                const tc = c + dc;
                if (isInBounds(tr, tc, board)) {
                    if (board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    } else {
                        const p = board.getPiece(tr, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                            moves.push({ r: tr, c: tc, type: 'capture' });
                        }
                    }
                }
            });

            return moves;
        }
    });

    // 19. GIGANTE
    // M y A: como rey. E: Puede comer piezas aliadas o enemigas, o arrojarlas a otra casilla en rango (aplastando si hay pieza).
    PieceRegistry.register('c_gigante', {
        name: { es: 'Gigante', en: 'Giant' },
        symbol: '🗿',
        value: 8,
        category: 'continental',
        tier: 'comandantes',
        tags: ['Continental', 'Canibalismo', 'Aplastamiento', 'Lanzamiento'],
        moveSummary: {
            m: 'Como Rey (1 casilla en cualquier dirección a casilla vacía)',
            a: 'Como Rey (puede comer enemigas Y piezas propias)',
            e: 'Fuerza colosal: al seleccionar una pieza adyacente puede elegir Devorarla o Arrojarla a 1 casilla de distancia alrededor de ella. Si arroja una pieza sobre otra, ambas mueren.'
        },
        description: {
            es: 'Titán de fuerza colosal. M: 1 casilla vacía en cualquier dirección. E: Al interactuar con una pieza adyacente (aliada o enemiga) puede elegir Devorarla o Arrojarla por el aire. Si lanza la pieza sobre una casilla ocupada, la pieza lanzada y la pieza impactada mueren aplastradas mutuamente. Al lanzar, el Gigante no se mueve.',
            en: 'Colossal titan. M: 1 empty square in any direction. E: Can Devour adjacent pieces or Throw them 1 square away. If thrown onto another piece, both the thrown piece and the target piece are destroyed. The Giant does not move when throwing.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const offsets = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1],           [0, 1],
                [1, -1],  [1, 0],  [1, 1]
            ];

            offsets.forEach(([dr, dc]) => {
                const tr = r + dr;
                const tc = c + dc;
                if (isInBounds(tr, tc, board)) {
                    if (board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    } else {
                        const p = board.getPiece(tr, tc);
                        if (p) {
                            const canTarget = (p.color === color) || canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board);
                            if (canTarget) {
                                moves.push({ r: tr, c: tc, type: 'capture', isGiganteAction: true, isSpecialAttackTarget: true });
                            }
                        }
                    }
                }
            });

            return moves;
        }
    });

    PieceRegistry.throwGigantePiece = function(board, fromPos, targetPos, landingPos) {
        const targetPiece = board.getPiece(targetPos.r, targetPos.c);
        if (!targetPiece) return { success: false };

        const squashedPiece = board.getPiece(landingPos.r, landingPos.c);
        board.setPiece(targetPos.r, targetPos.c, null);
        board.setPiece(landingPos.r, landingPos.c, targetPiece);

        return {
            success: true,
            thrownPiece: targetPiece,
            squashedPiece
        };
    };

    // 20. MAGO
    // Octagonal. Puede alternar entre Forma Soldado y Forma Mercenario. E: Puede disparar a distancia o desplazarse para comer.
    PieceRegistry.register('c_mago', {
        name: { es: 'Mago', en: 'Mage' },
        symbol: '🧙',
        value: 8,
        category: 'continental',
        tier: 'comandantes',
        octogonal: true,
        tags: ['Continental', 'Octogonal', 'Hechizo a Distancia', 'Posturas'],
        moveSummary: {
            m: 'Forma Soldado (2 como Torre + 1 Alfil) o Forma Mercenario (2 como Alfil + 1 Torre)',
            a: 'Puede elegir entre disparar a distancia sin moverse o desplazarse para comer',
            e: 'Magia arcana: alterna posturas de combate y dispara hechizos'
        },
        description: {
            es: 'Maestro de las artes místicas. Rota únicamente entre Forma de Soldado (2 ortogonal + 1 diagonal) y Forma de Mercenario (2 diagonal + 1 ortogonal). E: Al atacar puede disparar su magia eliminando al objetivo sin moverse o desplazarse a su casilla.',
            en: 'Master of mystical arts. Switches between Soldier Stance and Mercenary Stance. Can snipe at range without moving or move to capture.'
        },
        getMoves: (r, c, board, color, gameRules) => {
            const moves = [];
            const thisPiece = board.getPiece(r, c);
            const stance = thisPiece?.stance || 'soldier';

            const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

            const primaryDirs = stance === 'soldier' ? orthoDirs : diagDirs;
            const secondaryDirs = stance === 'soldier' ? diagDirs : orthoDirs;

            // Hasta 2 en direcciones primarias
            primaryDirs.forEach(([dr, dc]) => {
                for (let step = 1; step <= 2; step++) {
                    const tr = r + dr * step;
                    const tc = c + dc * step;
                    if (!isInBounds(tr, tc, board)) break;
                    if (board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    } else {
                        const p = board.getPiece(tr, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                            moves.push({ r: tr, c: tc, type: 'capture', canShoot: true, isSpecialAttackTarget: true });
                        }
                        break;
                    }
                }
            });

            // 1 en direcciones secundarias
            secondaryDirs.forEach(([dr, dc]) => {
                const tr = r + dr;
                const tc = c + dc;
                if (isInBounds(tr, tc, board)) {
                    if (board.isEmpty(tr, tc)) {
                        moves.push({ r: tr, c: tc, type: 'normal' });
                    } else {
                        const p = board.getPiece(tr, tc);
                        if (p && canCaptureTarget(color, { r, c }, p, { r: tr, c: tc }, board)) {
                            moves.push({ r: tr, c: tc, type: 'capture', canShoot: true, isSpecialAttackTarget: true });
                        }
                    }
                }
            });

            return moves;
        }
    });

})();
