interface BonusesDisplayProps {
  wounds: number
  radiationResist: number
  bonusLives: number
}

export default function BonusesDisplay({ wounds, radiationResist, bonusLives }: BonusesDisplayProps) {
  return (
    <div className="bg-pda-case border-2 border-pda-primary p-4 mb-4">
      <h3 className="text-pda-phosphor font-bold mb-3">TOTAL BONUSES</h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-pda-text/70 text-xs mb-1">WOUNDS</div>
          <div className="text-pda-highlight text-xl font-bold">
            {wounds > 0 ? `+${wounds}` : wounds}
          </div>
        </div>
        <div>
          <div className="text-pda-text/70 text-xs mb-1">RAD RESIST</div>
          <div className="text-pda-highlight text-xl font-bold">
            {radiationResist}%
          </div>
        </div>
        <div>
          <div className="text-pda-text/70 text-xs mb-1">BONUS LIVES</div>
          <div className="text-pda-highlight text-xl font-bold">
            {bonusLives > 0 ? `+${bonusLives}` : bonusLives}
          </div>
        </div>
      </div>
    </div>
  )
}
