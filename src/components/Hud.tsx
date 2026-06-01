import type { GamePhase, GameStats } from '../types/game'
import type { InputMode } from '../types/input'

type HudProps = {
  phase: GamePhase
  stats: GameStats
  hasStormBurst: boolean
  isMuted: boolean
  inputMode: InputMode
  needsHandSetup: boolean
  isHandCameraReady: boolean
  handCameraError: boolean
  showIntro: boolean
  needsAudioChoice: boolean
  onChooseAudio: (choice: 'sound' | 'muted') => void
  onDismissIntro: () => void
  onOpenIntro: () => void
  onInputModeChange: (mode: InputMode) => void
  onStartHandsGame: () => void
  onCancelHandSetup: () => void
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
  inputMode,
  needsHandSetup,
  isHandCameraReady,
  handCameraError,
  showIntro,
  needsAudioChoice,
  onChooseAudio,
  onDismissIntro,
  onOpenIntro,
  onInputModeChange,
  onStartHandsGame,
  onCancelHandSetup,
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
        <div className="launch-controls">
          <div className="input-selector" role="radiogroup" aria-label="Control mode">
            <button
              type="button"
              role="radio"
              aria-checked={inputMode === 'mouse'}
              onClick={() => onInputModeChange('mouse')}
            >
              Mouse
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={inputMode === 'hands'}
              onClick={() => onInputModeChange('hands')}
            >
              Hands
            </button>
          </div>
          <div className="launch-actions">
            <button className="play-button" type="button" onClick={onPlay}>
              <span className="play-icon" aria-hidden="true" />
              Play
            </button>
            <button className="faq-button" type="button" onClick={onOpenIntro}>
              FAQ
            </button>
          </div>
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
            <p>Move your mouse, or your hand in Hands mode, near falling junk to push it away.</p>
            <p>Survive as long as you can. The storm gets stronger over time.</p>
            <div className="intro-powers" aria-label="Superpowers">
              <p>Superpowers</p>
              <ul>
                <li><strong>N Burst:</strong> press N once per game to clear the screen.</li>
                <li><strong>Umbrella:</strong> pick it up for a short shield.</li>
                <li><strong>Flare Gun:</strong> pick it up to laser random hazards. Each pickup hits one more target.</li>
              </ul>
            </div>
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

      {needsHandSetup && (
        <div className="hand-setup" role="dialog" aria-modal="true" aria-labelledby="hand-setup-title">
          <p className="intro-kicker">Hands mode</p>
          <h2 id="hand-setup-title">Allow camera access</h2>
          <p>
            Hands mode needs your browser camera permission. Approve the camera prompt, then start the game.
          </p>
          {handCameraError && <p className="hand-setup-error">Camera permission was blocked or unavailable.</p>}
          <div className="hand-setup-actions">
            <button type="button" onClick={onCancelHandSetup}>
              Cancel
            </button>
            <button type="button" onClick={onStartHandsGame} disabled={!isHandCameraReady}>
              {isHandCameraReady ? 'Start' : 'Waiting'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
