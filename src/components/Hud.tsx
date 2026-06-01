import type { GamePhase, GameStats } from '../types/game'

type HudProps = {
  phase: GamePhase
  stats: GameStats
  hasStormBurst: boolean
  isMuted: boolean
  showIntro: boolean
  needsAudioChoice: boolean
  onChooseAudio: (choice: 'sound' | 'muted') => void
  onDismissIntro: () => void
  onOpenIntro: () => void
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
  showIntro,
  needsAudioChoice,
  onChooseAudio,
  onDismissIntro,
  onOpenIntro,
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
        <div className="launch-actions">
          <button className="play-button" type="button" onClick={onPlay}>
            <span className="play-icon" aria-hidden="true" />
            Play
          </button>
          <button className="faq-button" type="button" onClick={onOpenIntro}>
            FAQ
          </button>
        </div>
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

      {!showIntro && needsAudioChoice && (
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

      {showIntro && (
        <div className="game-intro" role="dialog" aria-modal="true" aria-labelledby="game-intro-title">
          <p className="intro-kicker">Storm briefing</p>
          <h2 id="game-intro-title">Save the shelter from the storm</h2>
          <div className="intro-copy">
            <p>Move your mouse near approaching items to push them away before they hit the shelter.</p>
            <p>Press N once per game to clear every item on screen when the storm gets crowded.</p>
            <p>Collect glowing umbrellas with your mouse to shield the shelter for a few seconds. While the shield is active, items that touch the shelter are cleared.</p>
            <p>Pick up flare guns to fire lasers from the shelter at random hazards. The first flare destroys one hazard, the second destroys two, and each later flare gets stronger.</p>
            <p>The storm builds over time, so keep moving and protect the center.</p>
          </div>
          <div className="intro-actions">
            {needsAudioChoice ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onChooseAudio('sound')
                    onDismissIntro()
                  }}
                >
                  Sound On
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChooseAudio('muted')
                    onDismissIntro()
                  }}
                >
                  Muted
                </button>
              </>
            ) : (
              <button type="button" onClick={onDismissIntro}>
                Got It
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
