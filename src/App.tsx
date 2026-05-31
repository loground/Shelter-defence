import { useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Hud } from './components/Hud';
import type { GamePhase, GameStats } from './types/game';
import './App.css';

const initialStats: GameStats = {
  elapsedSeconds: 0,
  hazardCount: 0,
};

function App() {
  const [phase, setPhase] = useState<GamePhase>('launch');
  const [runId, setRunId] = useState(0);
  const [stats, setStats] = useState<GameStats>(initialStats);
  const isLaunch = phase === 'launch';

  function startGame() {
    setStats(initialStats);
    setRunId((currentRunId) => currentRunId + 1);
    setPhase('playing');
  }

  function restartGame() {
    setPhase('launch');
    setStats(initialStats);
  }

  return (
    <main
      className={`shell ${isLaunch ? 'is-launch' : 'is-playing'} ${phase === 'lost' ? 'is-lost' : ''}`}>
      <GameCanvas
        phase={phase}
        runId={runId}
        onLose={() => setPhase('lost')}
        onStatsChange={setStats}
      />
      <Hud phase={phase} stats={stats} onPlay={startGame} onRestart={restartGame} />
    </main>
  );
}

export default App;
