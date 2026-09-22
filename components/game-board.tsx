'use client'

import { Star } from 'lucide-react'
import { boardCells, getBoardCellClass } from '@/lib/game-data'

function Pawn({ color, small = false, canMove = false, onClick }: { color: string; small?: boolean; canMove?: boolean; onClick?: () => void }) {
  if (canMove) {
    return (
      <button 
        type="button"
        onClick={onClick}
        className={`pawn pawn-${color} ${small ? 'pawn-small' : ''} pawn-can-move`} 
        aria-label={`Pion ${color} bisa digerakkan`}
        style={{ border: 'none', padding: 0, outline: 'none', background: 'transparent' }}
      >
        <span className="pawn-head" />
        <span className="pawn-body" />
      </button>
    )
  }

  return (
    <span className={`pawn pawn-${color} ${small ? 'pawn-small' : ''}`} aria-label={`Pion ${color}`}>
      <span className="pawn-head" />
      <span className="pawn-body" />
    </span>
  )
}

const faceDots: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
}

function ArenaDice({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <div className={`arena-dice ${rolling ? 'arena-dice-rolling' : 'arena-dice-landed'}`} aria-label={rolling ? 'Dadu bergerak di arena' : `Dadu berhenti di angka ${value}`}>
      <div className="arena-dice-face">
        {faceDots[value].map((dot) => <i className={`dice-dot dot-${dot}`} key={dot} />)}
      </div>
      <span className="dice-shine" />
    </div>
  )
}

import { mainPath, startOffsets, homeTracks, basePositions } from '@/lib/ludo-path'
import { PawnState } from '@/lib/pawn-logic'

export function GameBoard({ dice = 4, rolling = false, activePawnColor, pawns = [], onPawnClick }: { dice?: number; rolling?: boolean; activePawnColor?: string; pawns?: PawnState[]; onPawnClick?: (pawnId: string) => void }) {
  // Helper to get CSS coordinates
  const getPawnStyle = (pawn: PawnState) => {
    let r = 0; let c = 0;
    if (pawn.status === 'base') {
      const pos = basePositions[pawn.color][pawn.position]
      r = pos.r; c = pos.c
    } else if (pawn.status === 'track') {
      const offset = startOffsets[pawn.color]
      const globalPos = (pawn.position + offset) % 52
      const pos = mainPath[globalPos]
      r = pos.r; c = pos.c
    } else if (pawn.status === 'home') {
      const pos = homeTracks[pawn.color][pawn.position]
      r = pos.r; c = pos.c
    } else {
      const pos = homeTracks[pawn.color][5]
      const finishOffsets = [
        { r: -0.16, c: -0.16 },
        { r: -0.16, c: 0.16 },
        { r: 0.16, c: -0.16 },
        { r: 0.16, c: 0.16 },
      ]
      const offset = finishOffsets[pawn.pawnNumber] || { r: 0, c: 0 }
      r = pos.r + offset.r
      c = pos.c + offset.c
    }

    return {
      left: `${(c + 0.5) * (100 / 15)}%`,
      top: `${(r + 0.5) * (100 / 15)}%`,
      transform: 'translate(-50%, -50%)',
      transition: 'left 0.4s ease-in-out, top 0.4s ease-in-out',
      position: 'absolute' as const,
      zIndex: pawn.status === 'base' ? 2 : pawn.status === 'finished' ? 8 : 10
    }
  }

  return (
    <div className="board-wrap">
      <div className="board" aria-label="Papan permainan Ludo 15 kali 15">
        <div className="base base-red" />
        <div className="base base-green" />
        <div className="base base-blue" />
        <div className="base base-yellow" />
        <div className="cells" aria-hidden="true">
          {boardCells.map((cell) => {
            const { isCenter, isPath, isSafe, isStar } = getBoardCellClass(cell)
            // Tampilkan icon '?' di kotak path biasa agar tahu itu kotak soal
            const showQuestionMark = isPath && !isCenter && !isStar
            return (
              <div key={cell} className={`board-cell ${isCenter ? 'center' : ''} ${isPath ? 'path' : ''} ${isSafe ? 'safe' : ''} ${isStar ? 'star' : ''}`}>
                {isStar && <Star />}
                {showQuestionMark && <span className="question-mark" style={{ opacity: 0.15, fontSize: '0.8rem', fontWeight: 900 }}>?</span>}
              </div>
            )
          })}
        </div>
        <div className="home-triangle home-blue" />
        <div className="home-triangle home-green" />
        <div className="home-triangle home-yellow" />
        <div className="home-triangle home-red" />
        
        {/* Render dynamic pawns */}
        {pawns.map(pawn => {
          const isMovable = activePawnColor === pawn.color && pawn.status !== 'finished' && (
            (pawn.status === 'base' && dice === 6) ||
            pawn.status === 'track' ||
            (pawn.status === 'home' && pawn.position + dice <= 5)
          )
          return (
            <div key={pawn.id} className="board-pawn" style={getPawnStyle(pawn)}>
              <Pawn 
                color={pawn.color} 
                canMove={isMovable} 
                onClick={() => isMovable && onPawnClick && onPawnClick(pawn.id)}
              />
            </div>
          )
        })}

        <div className="arena-dice-layer" aria-live="polite"><ArenaDice key={`${dice}-${rolling}`} value={dice} rolling={rolling} /></div>
      </div>
    </div>
  )
}
