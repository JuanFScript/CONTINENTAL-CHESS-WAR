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
                const r = rIdx;
                const c = cIdx;

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
                    
                    const tex = (typeof GraphicsEngine !== 'undefined')
                        ? GraphicsEngine.getPieceTexture(piece.type, piece.color)
                        : { src: `Imagenes de las piezas/${piece.color}${piece.type.toUpperCase()}_default.svg?v=82`, fallbackSrc: '', symbolFallback: piece.type };

                    const imgEl = document.createElement('img');
                    imgEl.className = 'piece-img';
                    imgEl.alt = `${piece.color} ${piece.type}`;
                    imgEl.src = tex.src;

                    imgEl.onerror = function() {
                        if (this.dataset.failedOnce) {
                            this.style.display = 'none';
                            if (!this.parentElement.querySelector('.piece-custom-symbol')) {
                                const symSpan = document.createElement('span');
                                symSpan.className = 'piece-custom-symbol';
                                symSpan.textContent = tex.symbolFallback || '♟';
                                pieceEl.appendChild(symSpan);
                            }
                        } else {
                            this.dataset.failedOnce = 'true';
                            this.src = tex.fallbackSrc;
                        }
                    };

                    pieceEl.appendChild(imgEl);
                    square.appendChild(pieceEl);

                    if (typeof GraphicsEngine !== 'undefined') {
                        GraphicsEngine.renderArrowSvg(piece, square, this.flipped);
                    } else {
                        this.renderOctoArrows(piece, square);
                    }
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
        if (typeof GraphicsEngine !== 'undefined') {
            GraphicsEngine.renderArrowSvg(piece, squareEl, this.flipped);
            return;
        }
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

        const renderFacing = facing;

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
