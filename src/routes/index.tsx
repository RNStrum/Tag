import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-blue-600 flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-6xl font-bold text-white mb-4">🐦 Flappy Bird</h1>
        <p className="text-xl text-blue-100">Press SPACE or click to fly!</p>
      </div>
      <FlappyBirdGame />
    </div>
  );
}

function FlappyBirdGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('flappyBirdHighScore');
    return saved ? parseInt(saved) : 0;
  });

  const gameLoopRef = useRef<number>();
  const gameDataRef = useRef({
    bird: { x: 100, y: 250, velocity: 0 },
    pipes: [] as Array<{ x: number; topHeight: number; passed: boolean }>,
    frameCount: 0,
  });

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 500;
  const BIRD_SIZE = 30;
  const PIPE_WIDTH = 60;
  const PIPE_GAP = 150;
  const GRAVITY = 0.5;
  const JUMP_STRENGTH = -10;
  const PIPE_SPEED = 3;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleJump();
      }
    };

    const handleClick = () => {
      handleJump();
    };

    window.addEventListener('keydown', handleKeyPress);
    canvas.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      canvas.removeEventListener('click', handleClick);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState]);

  const handleJump = () => {
    if (gameState === 'start') {
      startGame();
    } else if (gameState === 'playing') {
      gameDataRef.current.bird.velocity = JUMP_STRENGTH;
    } else if (gameState === 'gameOver') {
      resetGame();
    }
  };

  const startGame = () => {
    setGameState('playing');
    gameDataRef.current = {
      bird: { x: 100, y: 250, velocity: 0 },
      pipes: [],
      frameCount: 0,
    };
    setScore(0);
    gameLoop();
  };

  const resetGame = () => {
    setGameState('start');
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
  };

  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'playing') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameData = gameDataRef.current;
    gameData.frameCount++;

    // Update bird
    gameData.bird.velocity += GRAVITY;
    gameData.bird.y += gameData.bird.velocity;

    // Generate pipes
    if (gameData.frameCount % 120 === 0) {
      const topHeight = Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 100) + 50;
      gameData.pipes.push({
        x: CANVAS_WIDTH,
        topHeight,
        passed: false,
      });
    }

    // Update pipes
    gameData.pipes.forEach((pipe, index) => {
      pipe.x -= PIPE_SPEED;
      
      // Check if bird passed pipe for scoring
      if (!pipe.passed && pipe.x + PIPE_WIDTH < gameData.bird.x) {
        pipe.passed = true;
        setScore(prev => prev + 1);
      }
    });

    // Remove off-screen pipes
    gameData.pipes = gameData.pipes.filter(pipe => pipe.x > -PIPE_WIDTH);

    // Check collisions
    const birdLeft = gameData.bird.x;
    const birdRight = gameData.bird.x + BIRD_SIZE;
    const birdTop = gameData.bird.y;
    const birdBottom = gameData.bird.y + BIRD_SIZE;

    // Ground and ceiling collision
    if (birdBottom >= CANVAS_HEIGHT || birdTop <= 0) {
      endGame();
      return;
    }

    // Pipe collision
    for (const pipe of gameData.pipes) {
      if (birdRight > pipe.x && birdLeft < pipe.x + PIPE_WIDTH) {
        if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + PIPE_GAP) {
          endGame();
          return;
        }
      }
    }

    // Draw everything
    draw(ctx);

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  const endGame = () => {
    setGameState('gameOver');
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('flappyBirdHighScore', score.toString());
    }
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const gameData = gameDataRef.current;
    
    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw pipes
    ctx.fillStyle = '#32CD32';
    gameData.pipes.forEach(pipe => {
      // Top pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.topHeight + PIPE_GAP, PIPE_WIDTH, CANVAS_HEIGHT - pipe.topHeight - PIPE_GAP);
    });

    // Draw bird
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(gameData.bird.x, gameData.bird.y, BIRD_SIZE, BIRD_SIZE);
    
    // Bird eye
    ctx.fillStyle = '#000';
    ctx.fillRect(gameData.bird.x + 20, gameData.bird.y + 8, 4, 4);

    // Draw score
    ctx.fillStyle = '#FFF';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="not-prose bg-white p-4 rounded-lg shadow-lg">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-2 border-gray-300 rounded cursor-pointer"
        />
        
        {gameState === 'start' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded">
            <div className="text-center text-white">
              <h2 className="text-4xl font-bold mb-4">Ready to Fly?</h2>
              <p className="text-xl mb-2">Press SPACE or click to start</p>
              <p className="text-lg">High Score: {highScore}</p>
            </div>
          </div>
        )}
        
        {gameState === 'gameOver' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded">
            <div className="text-center text-white">
              <h2 className="text-4xl font-bold mb-4">Game Over!</h2>
              <p className="text-2xl mb-2">Score: {score}</p>
              <p className="text-xl mb-4">High Score: {highScore}</p>
              <p className="text-lg">Press SPACE or click to play again</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="text-white text-center">
        <p className="text-lg">Current Score: <span className="font-bold">{score}</span></p>
        <p className="text-md opacity-75">High Score: {highScore}</p>
      </div>
    </div>
  );
}
