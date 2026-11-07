import { useEffect, useState } from 'react';
import { useGame } from './store';
import { CustomScreen, GalleryScreen } from './ui/CustomScreens';
import { GameScreen } from './ui/GameScreen';
import { HomeScreen, LobbyScreen } from './ui/MenuScreens';
import { isMuted, setMuted } from './ui/sfx';

const ROOM_PARAM = new URLSearchParams(location.search).get('room')?.toUpperCase().slice(0, 5) ?? '';

export function App() {
  const screen = useGame((s) => s.screen);
  const notice = useGame((s) => s.notice);
  const setNotice = useGame((s) => s.setNotice);
  const [muted, setMutedState] = useState(isMuted());

  useEffect(() => {
    useGame.getState().init();
  }, []);

  function toggleMute() {
    setMuted(!muted);
    setMutedState(!muted);
  }

  return (
    <div className="app">
      <button className="icon-btn" style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 30 }} onClick={toggleMute} title="Sound">
        {muted ? '🔇' : '🔊'}
      </button>
      {screen === 'home' && <HomeScreen initialCode={ROOM_PARAM} />}
      {screen === 'lobby' && <LobbyScreen />}
      {screen === 'game' && <GameScreen />}
      {screen === 'custom' && <CustomScreen />}
      {screen === 'gallery' && <GalleryScreen />}
      {notice && (
        <div className="notice">
          <span>{notice}</span>
          <button className="btn small secondary" onClick={() => setNotice(null)}>
            OK
          </button>
        </div>
      )}
    </div>
  );
}
