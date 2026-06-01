import { useEffect, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Hud } from './components/Hud';
import type { GamePhase, GameStats } from './types/game';
import './App.css';

const initialStats: GameStats = {
  elapsedSeconds: 0,
  hazardCount: 0,
};

const MUSIC_VOLUME = 0.5;
const EFFECT_VOLUME = 0.5;
const AUDIO_CHOICE_KEY = 'shelter:audio-choice';

function getSavedAudioChoice() {
  if (typeof window === 'undefined') return null;

  const savedChoice = window.localStorage.getItem(AUDIO_CHOICE_KEY);
  if (savedChoice !== 'muted' && savedChoice !== 'sound') return null;
  return savedChoice;
}

function App() {
  const [phase, setPhase] = useState<GamePhase>('launch');
  const [runId, setRunId] = useState(0);
  const [stats, setStats] = useState<GameStats>(initialStats);
  const [blastId, setBlastId] = useState(0);
  const [hasStormBurst, setHasStormBurst] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [audioChoice, setAudioChoice] = useState<'sound' | 'muted' | null>(() => getSavedAudioChoice());
  const [isMuted, setIsMuted] = useState(() => getSavedAudioChoice() === 'muted');
  const mainMusic = useRef<HTMLAudioElement | null>(null);
  const gameMusic = useRef<HTMLAudioElement | null>(null);
  const nukeSound = useRef<HTMLAudioElement | null>(null);
  const isLaunch = phase === 'launch';

  useEffect(() => {
    mainMusic.current = new Audio('/sounds/main.mp3');
    gameMusic.current = new Audio('/sounds/game.mp3');
    nukeSound.current = new Audio('/sounds/nuke.mp3');

    for (const track of [mainMusic.current, gameMusic.current]) {
      track.loop = true;
      track.volume = MUSIC_VOLUME;
      track.preload = 'auto';
    }

    nukeSound.current.volume = EFFECT_VOLUME;
    nukeSound.current.preload = 'auto';

    return () => {
      mainMusic.current?.pause();
      gameMusic.current?.pause();
      nukeSound.current?.pause();
    };
  }, []);

  useEffect(() => {
    const tracks = [mainMusic.current, gameMusic.current, nukeSound.current];

    tracks.forEach((track) => {
      if (!track) return;
      track.muted = isMuted;
    });

    if (mainMusic.current) mainMusic.current.volume = MUSIC_VOLUME;
    if (gameMusic.current) gameMusic.current.volume = MUSIC_VOLUME;
    if (nukeSound.current) nukeSound.current.volume = EFFECT_VOLUME;
  }, [isMuted]);

  useEffect(() => {
    const menuTrack = mainMusic.current;
    const playTrack = gameMusic.current;
    if (!menuTrack || !playTrack) return;

    const activeTrack = phase === 'launch' ? menuTrack : phase === 'playing' ? playTrack : null;
    const inactiveTracks = [menuTrack, playTrack].filter((track) => track !== activeTrack);

    inactiveTracks.forEach((track) => {
      track.pause();
      track.currentTime = 0;
    });

    if (!audioChoice || !activeTrack || isMuted) return;

    activeTrack.volume = MUSIC_VOLUME;
    void activeTrack.play().catch(() => undefined);
  }, [audioChoice, isMuted, phase]);

  useEffect(() => {
    function unlockAudio() {
      const activeTrack = phase === 'launch' ? mainMusic.current : phase === 'playing' ? gameMusic.current : null;
      if (!audioChoice || !activeTrack || isMuted) return;

      activeTrack.volume = MUSIC_VOLUME;
      void activeTrack.play().catch(() => undefined);
    }

    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [audioChoice, isMuted, phase]);

  function chooseAudio(nextChoice: 'sound' | 'muted') {
    window.localStorage.setItem(AUDIO_CHOICE_KEY, nextChoice);
    setAudioChoice(nextChoice);
    setIsMuted(nextChoice === 'muted');
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'n' || phase !== 'playing' || !hasStormBurst || event.repeat) return;

      setHasStormBurst(false);
      setBlastId((currentBlastId) => currentBlastId + 1);

      if (!isMuted && nukeSound.current) {
        nukeSound.current.currentTime = 0;
        nukeSound.current.volume = EFFECT_VOLUME;
        void nukeSound.current.play().catch(() => undefined);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStormBurst, isMuted, phase]);

  function startGame() {
    setStats(initialStats);
    setRunId((currentRunId) => currentRunId + 1);
    setBlastId(0);
    setHasStormBurst(true);
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
        blastId={blastId}
        onLose={() => setPhase('lost')}
        onStatsChange={setStats}
      />
      <Hud
        phase={phase}
        stats={stats}
        hasStormBurst={hasStormBurst}
        isMuted={isMuted}
        showIntro={showIntro}
        needsAudioChoice={!audioChoice}
        onChooseAudio={chooseAudio}
        onDismissIntro={() => setShowIntro(false)}
        onOpenIntro={() => setShowIntro(true)}
        onToggleMute={() => setIsMuted((currentMuted) => !currentMuted)}
        onPlay={startGame}
        onRestart={restartGame}
      />
    </main>
  );
}

export default App;
