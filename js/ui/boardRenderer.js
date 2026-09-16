/**
 * CONTINENTAL - Mobile Touch Board Renderer
 * Renders high-res chessboard matrix, algebraic notation labels, and piece image assets from 'Imagenes de las piezas'.
 */

class BoardRenderer {
    constructor(containerElement, boardEngine, options = {}) {
        this.container = containerElement;
        this.board = boardEngine;
        this.options = options;
        this.selectedSquare = null;
        this.validMoves = [];
        this.enemySelectedSquare = null;
        this.enemyValidMoves = [];
        this.enemyPieceName = '';
        this.lastMove = null;
        this.onSquareClick = options.onSquareClick || null;
        this.flipped = false;
    }

    getActiveColor() {
        if (this.options && typeof this.options.getActiveColor === 'function') {
            return this.options.getActiveColor();
        }
        if (this.options && this.options.rulesEngine) {
            return this.options.rulesEngine.activeColor;
        }
        if (typeof window !== 'undefined' && window.gameController && window.gameController.rulesEngine) {
            return window.gameController.rulesEngine.activeColor;
        }
        return 'w';
    }

    render() {
        this.container.innerHTML = '';

        const boardGrid = document.createElement('div');
        boardGrid.className = 'chess-board-grid';
        boardGrid.style.gridTemplateColumns = `repeat(${this.board.cols}, 1fr)`;
        boardGrid.style.gridTemplateRows = `repeat(${this.board.rows}, 1fr)`;

        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const continentalRanks = ['g', 'f', 'e', 'd', 'c', 'b', 'a'];

        for (let rIdx = 0; rIdx < this.board.rows; rIdx++) {
            for (let cIdx = 0; cIdx < this.board.cols; cIdx++) {
                const r = this.flipped ? (this.board.rows - 1 - rIdx) : rIdx;
                const c = this.flipped ? (this.board.cols - 1 - cIdx) : cIdx;

                const isLight = (r + c) % 2 === 0;
                const square = document.createElement('div');
                square.className = `board-square ${isLight ? 'square-light' : 'square-dark'}`;
                square.dataset.row = r;
                square.dataset.col = c;

                // Algebraic rank coordinate notation (on left column)
                if (cIdx === 0) {
                    const rankLabel = document.createElement('span');
                    rankLabel.className = 'coordinate-label rank-label';
                    if (this.board.rows === 7) {
                        rankLabel.textContent = continentalRanks[r];
                    } else {
                        rankLabel.textContent = (this.board.rows - r).toString();
                    }
                    square.appendChild(rankLabel);
                }

                // Algebraic file coordinate notation (on bottom row)
                if (rIdx === this.board.rows - 1) {
                    const fileLabel = document.createElement('span');
                    fileLabel.className = 'coordinate-label file-label';
                    if (this.board.cols === 7) {
                        fileLabel.textContent = (c + 1).toString();
                    } else {
                        fileLabel.textContent = files[c];
                    }
                    square.appendChild(fileLabel);
                }

                // Center square shading for 7x7 Continental board (square d4 / (3,3))
                if (this.board.rows === 7 && r === 3 && c === 3) {
                    square.classList.add('square-center-highlight');
                }

                // Selection highlight (Friendly)
                if (this.selectedSquare && this.selectedSquare.r === r && this.selectedSquare.c === c) {
                    square.classList.add('square-selected');
                }

                // Selection highlight (Enemy - Light Gray)
                if (this.enemySelectedSquare && this.enemySelectedSquare.r === r && this.enemySelectedSquare.c === c) {
                    square.classList.add('square-enemy-selected');
                }

                // Last move origin & destination highlight
                if (this.lastMove) {
                    if ((this.lastMove.from.r === r && this.lastMove.from.c === c) ||
                        (this.lastMove.to.r === r && this.lastMove.to.c === c)) {
                        square.classList.add('square-last-move');
                    }
                }

                // Valid target move highlights (Friendly)
                const moveTarget = this.validMoves.find(m => m.r === r && m.c === c);
                if (moveTarget) {
                    if (moveTarget.isCanonBeamTarget) {
                        square.classList.add('square-valid-canon-beam');
                    } else if (moveTarget.isSpecialAttackTarget) {
                        square.classList.add('square-valid-special-attack');
                    } else if (moveTarget.type === 'throw-target' || moveTarget.type === 'throw-landing') {
                        square.classList.add('square-valid-throw-target');
                    } else if (moveTarget.type === 'capture') {
                        square.classList.add('square-valid-capture');
                    } else {
                        square.classList.add('square-valid-move');
                    }
                }

                // Valid target move highlights (Enemy - Light Gray)
                const enemyMoveTarget = this.enemyValidMoves.find(m => m.r === r && m.c === c);
                if (enemyMoveTarget) {
                    if (enemyMoveTarget.type === 'capture') {
                        square.classList.add('square-enemy-capture');
                    } else {
                        square.classList.add('square-enemy-move');
                    }
                }

                // Piece Image Asset Rendering (Always <img> elements)
                const piece = this.board.getPiece(r, c);
                if (piece) {
                    const pieceEl = document.createElement('div');
                    pieceEl.className = `chess-piece piece-${piece.color}`;
                    
                    const code = `${piece.color}${piece.type.toUpperCase()}`; // wK, wQ, wR...
                    const spanishMap = {
                        'wK': 'rey_blanco', 'bK': 'rey_negro',
                        'wQ': 'reina_blanca', 'bQ': 'reina_negra',
                        'wR': 'torre_blanca', 'bR': 'torre_negra',
                        'wB': 'alfil_blanco', 'bB': 'alfil_negro',
                        'wN': 'caballo_blanco', 'bN': 'caballo_negro',
                        'wP': 'peon_blanco', 'bP': 'peon_negro',
                        'wC_PEON': 'peon_blanco', 'bC_PEON': 'peon_negro',
                        'wC_TORRE': 'torre_blanca', 'bC_TORRE': 'torre_negra',
                        'wC_ALFIL': 'alfil_blanco', 'bC_ALFIL': 'alfil_negro',
                        'wC_CABALLO': 'caballo_blanco', 'bC_CABALLO': 'caballo_negro',
                        'wC_REY': 'rey_blanco', 'bC_REY': 'rey_negro',
                        'wC_REINA': 'reina_blanca', 'bC_REINA': 'reina_negra',

                        // Continental Exclusive Pieces
                        'wC_DAMA': 'dama_blanca', 'bC_DAMA': 'dama_negra',
                        'wC_LOBO': 'lobo_blanco', 'bC_LOBO': 'lobo_negro',
                        'wC_ESCUDERO': 'escudero_blanco', 'bC_ESCUDERO': 'escudero_negro',
                        'wC_GUARDIA': 'guardia_blanco', 'bC_GUARDIA': 'guardia_negro',
                        'wC_SOLDADO': 'soldado_blanco', 'bC_SOLDADO': 'soldado_negro',
                        'wC_MERCENARIO': 'mercenario_blanco', 'bC_MERCENARIO': 'mercenario_negro',
                        'wC_ELEFANTE': 'elefante_blanco', 'bC_ELEFANTE': 'elefante_negro',
                        'wC_PIQUETERO': 'piquetero_blanco', 'bC_PIQUETERO': 'piquetero_negro',
                        'wC_ARQUERO': 'arquero_blanco', 'bC_ARQUERO': 'arquero_negro',
                        'wC_DEFENSOR': 'defensor_blanco', 'bC_DEFENSOR': 'defensor_negro',
                        'wC_CANON': 'canon_blanco', 'bC_CANON': 'canon_negro',
                        'wC_DRAGON': 'dragon_blanco', 'bC_DRAGON': 'dragon_negro',
                        'wC_GIGANTE': 'gigante_blanco', 'bC_GIGANTE': 'gigante_negro',
                        'wC_MAGO': 'mago_blanco', 'bC_MAGO': 'mago_negro'
                    };
                    const esName = spanishMap[code] || code;
                    const style = localStorage.getItem('continental_piece_style') || 'default';
                    const reg = typeof PieceRegistry !== 'undefined' ? PieceRegistry.get(piece.type) : null;

                    if (!spanishMap[code] && reg && reg.symbol) {
                        const symEl = document.createElement('span');
                        symEl.className = 'piece-custom-symbol';
                        symEl.textContent = reg.symbol;
                        pieceEl.appendChild(symEl);
                    } else {
                        const imgEl = document.createElement('img');
                        imgEl.className = 'piece-img';
                        imgEl.alt = `${piece.color} ${piece.type}`;
                        imgEl.src = `Imagenes de las piezas/${esName}_${style}.svg?v=73`;

                        imgEl.onerror = function() {
                            if (!this.dataset.fb1) {
                                this.dataset.fb1 = 'true';
                                this.src = `imagenes-de-las-piezas/${esName}_${style}.svg?v=73`;
                            } else if (!this.dataset.fb2) {
                                this.dataset.fb2 = 'true';
                                this.src = `Imagenes de las piezas/${code}_${style}.svg?v=73`;
                            } else if (!this.dataset.fb3) {
                                this.dataset.fb3 = 'true';
                                this.src = `imagenes-de-las-piezas/${code}_${style}.svg?v=73`;
                            } else if (!this.dataset.fb4) {
                                this.dataset.fb4 = 'true';
                                this.src = `Imagenes de las piezas/${esName}_default.svg?v=73`;
                            } else if (!this.dataset.fb5) {
                                this.dataset.fb5 = 'true';
                                this.src = `imagenes-de-las-piezas/${esName}_default.svg?v=73`;
                            } else if (!this.dataset.fb6) {
                                this.dataset.fb6 = 'true';
                                this.src = `Imagenes de las piezas/${code}.svg?v=73`;
                            } else if (!this.dataset.fb7) {
                                this.dataset.fb7 = 'true';
                                this.src = `imagenes-de-las-piezas/${code}.svg?v=73`;
                            } else if (!this.dataset.fb8) {
                                this.dataset.fb8 = 'true';
                                this.style.display = 'none';
                                const fallbackSym = reg ? reg.symbol : piece.type;
                                const symSpan = document.createElement('span');
                                symSpan.className = 'piece-custom-symbol';
                                symSpan.textContent = fallbackSym;
                                pieceEl.appendChild(symSpan);
                            }
                        };

                        pieceEl.appendChild(imgEl);
                    }
                    square.appendChild(pieceEl);
                    this.renderOctoArrows(piece, square);
                }

                // Click / Tap listener
                square.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (this.onSquareClick) {
                        this.onSquareClick(r, c);
                    }
                });

                boardGrid.appendChild(square);
            }
        }

        this.container.appendChild(boardGrid);

        // Toast overlay for Enemy Piece Info
        if (this.enemySelectedSquare && this.enemyPieceName) {
            const toast = document.createElement('div');
            toast.className = 'board-enemy-info-toast';
            toast.innerHTML = `👁️ <span class="enemy-toast-name">${this.enemyPieceName}</span> <span class="enemy-toast-tag">(Enemigo)</span>`;
            this.container.appendChild(toast);
        }
    }

    renderOctoArrows(piece, squareEl) {
        if (!piece || typeof PieceRegistry === 'undefined') return;
        const reg = PieceRegistry.get(piece.type);
        if (!reg) return;

        // Check if piece is Octogonal (has octogonal property or Octo tag)
        const isOcto = reg.octogonal || (reg.tags && reg.tags.some(t => String(t).toLowerCase().includes('octo')));
        if (!isOcto) return;

        const isWhite = piece.color === 'w';
        const facing = (piece.facing !== undefined) ? piece.facing : (isWhite ? 0 : 180);

        // Configure arrow properties per piece type
        let colorHex = '#f59e0b'; // Default Amarillo (Yellow/Amber) for Dragón, Mago and custom Octo
        let typePattern = 'forward'; // 'forward', 'defensor_left', 'mago'

        if (piece.type === 'c_canon') {
            if (piece.justFired) {
                colorHex = '#6b7280'; // Gris inmediatamente tras disparar
            } else if (piece.cooldownActive) {
                colorHex = '#f59e0b'; // Amarillo durante el turno de recarga y aviso previo al rival
            } else {
                colorHex = '#ef4444'; // Rojo (cargado/listo para disparar, se mantiene rojo sin cambiar)
            }
            typePattern = 'forward';
        } else if (piece.type === 'c_defensor') {
            colorHex = '#3b82f6'; // Blue for Defensor shield
            typePattern = 'defensor_front_fan';
        } else if (piece.type === 'c_dragon') {
            colorHex = '#f59e0b'; // Amarillo para el dragón
            typePattern = 'forward';
        } else if (piece.type === 'c_arquero') {
            colorHex = '#f59e0b'; // Amarillo para el arquero en modo de prueba
            typePattern = 'forward';
        } else if (piece.type === 'c_mago') {
            colorHex = '#f59e0b'; // Yellow for Mago
            typePattern = 'mago';
        }

        const renderFacing = this.flipped ? (facing + 180) % 360 : facing;

        // SVG overlay for arrows inside square
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'octo-arrow-overlay');
        svg.setAttribute('viewBox', '0 0 45 45');

        let pathsHtml = '';

        if (typePattern === 'forward') {
            pathsHtml = `
                <g transform="rotate(${renderFacing} 22.5 22.5)">
                    <path d="M 19.5,6 L 22.5,2 L 25.5,6" stroke="${colorHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    <line x1="22.5" y1="2" x2="22.5" y2="12" stroke="${colorHex}" stroke-width="2" stroke-linecap="round"/>
                </g>
            `;
        } else if (typePattern === 'defensor_front_fan') {
            pathsHtml = `
                <g transform="rotate(${renderFacing} 22.5 22.5)">
                    <!-- Norte (Top) -->
                    <path d="M 19.5,6 L 22.5,2 L 25.5,6" stroke="${colorHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    <!-- Nor-Este (Top-Right) -->
                    <path d="M 37,8 L 40,5 L 39,10" stroke="${colorHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    <!-- Nor-Oeste (Top-Left) -->
                    <path d="M 8,8 L 5,5 L 10,6" stroke="${colorHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </g>
            `;
        } else if (typePattern === 'mago') {
            const isMercenary = piece.stance === 'mercenary';
            if (isMercenary) {
                pathsHtml = `
                    <g transform="rotate(${renderFacing + 45} 22.5 22.5)">
                        <path d="M 19.5,5 L 22.5,2 L 25.5,5" stroke="${colorHex}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        <path d="M 19.5,40 L 22.5,43 L 25.5,40" stroke="${colorHex}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        <path d="M 5,19.5 L 2,22.5 L 5,25.5" stroke="${colorHex}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        <path d="M 40,19.5 L 43,22.5 L 40,25.5" stroke="${colorHex}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    </g>
                `;
            } else {
                pathsHtml = `
                    <g transform="rotate(${renderFacing} 22.5 22.5)">
                        <path d="M 19.5,5 L 22.5,2 L 25.5,5" stroke="${colorHex}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        <path d="M 19.5,40 L 22.5,43 L 25.5,40" stroke="${colorHex}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        <path d="M 5,19.5 L 2,22.5 L 5,25.5" stroke="${colorHex}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        <path d="M 40,19.5 L 43,22.5 L 40,25.5" stroke="${colorHex}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    </g>
                `;
            }
        }

        svg.innerHTML = pathsHtml;
        squareEl.appendChild(svg);
    }

    setSelected(square, moves = []) {
        this.selectedSquare = square;
        this.validMoves = moves;
        this.enemySelectedSquare = null;
        this.enemyValidMoves = [];
        this.enemyPieceName = '';
        this.render();
    }

    setEnemySelected(square, moves = [], pieceName = '') {
        this.selectedSquare = null;
        this.validMoves = [];
        this.enemySelectedSquare = square;
        this.enemyValidMoves = moves;
        this.enemyPieceName = pieceName;
        this.render();
    }

    setLastMove(move) {
        this.lastMove = move;
    }

    clearSelection() {
        this.selectedSquare = null;
        this.validMoves = [];
        this.enemySelectedSquare = null;
        this.enemyValidMoves = [];
        this.enemyPieceName = '';
        this.render();
    }
}
