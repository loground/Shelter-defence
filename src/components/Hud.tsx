import type { GamePhase, GameStats } from '../types/game'

type HudProps = {
  phase: GamePhase
  stats: GameStats
  hasStormBurst: boolean
  isMuted: boolean
  needsAudioChoice: boolean
  onChooseAudio: (choice: 'sound' | 'muted') => void
  onToggleMute: () => void
  onPlay: () => void
  onRestart: () => void
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function Hud({
  phase,
  stats,
  hasStormBurst,
  isMuted,
  needsAudioChoice,
  onChooseAudio,
  onToggleMute,
  onPlay,
  onRestart,
}: HudProps) {
  const isLaunch = phase === 'launch'
  const isLost = phase === 'lost'

  return (
    <section className="hud" aria-live="polite">
      {!needsAudioChoice && (
        <button className="mute-button" type="button" onClick={onToggleMute} aria-pressed={isMuted}>
          {isMuted ? 'Sound Off' : 'Sound On'}
        </button>
      )}

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
          <div className="score-readout" aria-label="Final score">
            <span>{formatTime(stats.elapsedSeconds)}</span>
            <small>{stats.hazardCount} threats survived</small>
          </div>
          <button className="play-button" type="button" onClick={onRestart}>
            <span className="play-icon" aria-hidden="true" />
            Again
          </button>
        </div>
      ) : (
        <div className="status-panel">
          <span>Time: {formatTime(stats.elapsedSeconds)}</span>
          <span>Threats: {stats.hazardCount}</span>
          <span className={`power-status ${hasStormBurst ? 'is-ready' : 'is-spent'}`}>
            N Burst: {hasStormBurst ? 'Ready' : 'Spent'}
          </span>
        </div>
      )}

      {needsAudioChoice && (
        <div className="audio-choice" role="dialog" aria-modal="true" aria-labelledby="audio-choice-title">
          <p id="audio-choice-title">Sound</p>
          <div className="audio-choice-actions">
            <button type="button" onClick={() => onChooseAudio('sound')}>
              Sound On
            </button>
            <button type="button" onClick={() => onChooseAudio('muted')}>
              Muted
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
