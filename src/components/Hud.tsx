import type { GamePhase, GameStats } from '../types/game'

type HudProps = {
  phase: GamePhase
  stats: GameStats
  onPlay: () => void
  onRestart: () => void
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function Hud({ phase, stats, onPlay, onRestart }: HudProps) {
  const isLaunch = phase === 'launch'
  const isLost = phase === 'lost'

  return (
    <section className="hud" aria-live="polite">
      <div className="brand">
        <p className="kicker">storm night 01</p>
        <h1>Shelter</h1>
      </div>

      {isLaunch ? (
        <button className="play-button" type="button" onClick={onPlay}>
          <span className="play-icon" aria-hidden="true" />
          Play
        </button>
      ) : isLost ? (
        <div className="loss-panel">
          <p>Storm breached</p>
          <button className="play-button" type="button" onClick={onRestart}>
            <span className="play-icon" aria-hidden="true" />
            Again
          </button>
        </div>
      ) : (
        <div className="status-panel">
          <span>Time: {formatTime(stats.elapsedSeconds)}</span>
          <span>Threats: {stats.hazardCount}</span>
          <span>Mouse repels</span>
        </div>
      )}
    </section>
  )
}
