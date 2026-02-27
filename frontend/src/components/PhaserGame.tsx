import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { EmberScene } from '../scenes/EmberScene';

interface Props {
  triggerSuccess?: boolean;
  triggerFailure?: boolean;
}

let gameInstance: Phaser.Game | null = null;

const PhaserGame: React.FC<Props> = ({ triggerSuccess, triggerFailure }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<EmberScene | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameInstance) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: containerRef.current.clientWidth || 600,
      height: 220,
      backgroundColor: '#0a0a0f',
      pixelArt: true,
      antialias: false,
      roundPixels: true,
      scene: [EmberScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
      },
    };

    gameInstance = new Phaser.Game(config);

    gameInstance.events.once('ready', () => {
      sceneRef.current = gameInstance!.scene.getScene('EmberScene') as EmberScene;
    });

    return () => {
      gameInstance?.destroy(true);
      gameInstance = null;
      sceneRef.current = null;
    };
  }, []);

  // Trigger animations from outside
  useEffect(() => {
    if (triggerSuccess && sceneRef.current) {
      sceneRef.current.events.emit('submission_success');
    }
  }, [triggerSuccess]);

  useEffect(() => {
    if (triggerFailure && sceneRef.current) {
      sceneRef.current.events.emit('submission_failure');
    }
  }, [triggerFailure]);

  return (
    <div
      ref={containerRef}
      id="phaser-container"
      style={{
        width: '100%',
        height: '220px',
        overflow: 'hidden',
        border: '4px solid var(--pixel-border)',
        boxSizing: 'border-box',
        imageRendering: 'pixelated',
      }}
    />
  );
};

export default PhaserGame;