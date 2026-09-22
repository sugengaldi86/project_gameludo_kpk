'use client'

import { Dices } from 'lucide-react'

const faceDots: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
}

export function DicePanel({ dice, rolling, disabled = false, onRoll }: { dice: number; rolling: boolean; disabled?: boolean; onRoll: () => void }) {
  const unavailable = disabled && !rolling
  return <div className="dice-control"><div className={`dice-stage ${rolling ? 'is-rolling' : ''}`} aria-label={rolling ? 'Dadu sedang dilempar' : `Dadu menunjukkan angka ${dice}`}><div className="dice"><div className="dice-face">{faceDots[dice].map((dot) => <i className={`dice-dot dot-${dot}`} key={dot} />)}</div><span className="dice-shine" /></div><span className="dice-shadow" /></div><div className="dice-copy"><span className="eyebrow">DADU DIGITAL</span><strong>{rolling ? 'Dadu sedang terbang...' : unavailable ? 'Selesaikan tahap sekarang' : 'Siap melempar?'}</strong><p>{rolling ? 'Tunggu sampai dadu berhenti' : unavailable ? 'Dadu aktif kembali pada awal giliran' : 'Jawab soal sebelum pion melangkah'}</p></div><button className="roll-button" onClick={onRoll} disabled={rolling || disabled}><Dices />{rolling ? 'Melempar...' : 'Lempar Dadu'}<span>Enter</span></button></div>
}
