import { useEffect, useRef } from 'react';

export const MusicPlayer = ({ currentScreen }: { currentScreen: string }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      // Point this exactly to your file in public/sounds/
      const trackPath = '/sounds/game.mp3'; 
      
      // Only change/restart the music if the source isn't already set
      if (audioRef.current.src !== window.location.origin + trackPath) {
        audioRef.current.src = trackPath;
        audioRef.current.loop = true;
        audioRef.current.load(); // Forces the player to recognize the new file
      }
      
      audioRef.current.play().catch(() => {
        console.log("Music will start once you click anywhere on the page!");
      });
    }
  }, [currentScreen]); 

  return <audio ref={audioRef} />;
};