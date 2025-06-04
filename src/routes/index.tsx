import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";

export const Route = createFileRoute("/")({
  component: FlappyBird,
});

interface Bird {
  x: number;
  y: number;
  velocity: number;
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const BIRD_SIZE = 20;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const GRAVITY = 0.5;
const JUMP_FORCE = -8;
const PIPE_SPEED = 2;

function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();

  const [gameState, setGameState] = useState<"start" | "playing" | "gameOver">("start");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const [bird, setBird] = useState<Bird>({
    x: 100,
    y: GAME_HEIGHT / 2,
    velocity: 0,
  });

  const [pipes, setPipes] = useState<Pipe[]>([]);

  // Initialize high score from localStorage
  useEffect(() => {
    const savedHighScore = localStorage.getItem("flappyBirdHighScore");
    if (savedHighScore) {
      setHighScore(Number.parseInt(savedHighScore, 10));
    }
  }, []);

  // Save high score to localStorage
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("flappyBirdHighScore", score.toString());
    }
  }, [score, highScore]);

  const jump = useCallback(() => {
    if (gameState === "start") {
      setGameState("playing");
      setBird((prev) => ({ ...prev, velocity: JUMP_FORCE }));
    } else if (gameState === "playing") {
      setBird((prev) => ({ ...prev, velocity: JUMP_FORCE }));
    }
  }, [gameState]);

  const resetGame = useCallback(() => {
    setBird({
      x: 100,
      y: GAME_HEIGHT / 2,
      velocity: 0,
    });
    setPipes([]);
    setScore(0);
    setGameState("start");
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [jump]);

  // Collision detection
  const checkCollision = useCallback((bird: Bird, pipes: Pipe[]) => {
    // Check ground and ceiling collision
    if (bird.y + BIRD_SIZE >= GAME_HEIGHT || bird.y <= 0) {
      return true;
    }

    // Check pipe collision
    for (const pipe of pipes) {
      if (
        bird.x + BIRD_SIZE > pipe.x &&
        bird.x < pipe.x + PIPE_WIDTH &&
        (bird.y < pipe.topHeight || bird.y + BIRD_SIZE > pipe.bottomY)
      ) {
        return true;
      }
    }

    return false;
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const gameLoop = () => {
      setBird((prevBird) => {
        const newBird = {
          ...prevBird,
          y: prevBird.y + prevBird.velocity,
          velocity: prevBird.velocity + GRAVITY,
        };

        setPipes((prevPipes) => {
          const newPipes = prevPipes
            .map((pipe) => ({
              ...pipe,
              x: pipe.x - PIPE_SPEED,
            }))
            .filter((pipe) => pipe.x + PIPE_WIDTH > 0);

          // Add new pipe
          if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < GAME_WIDTH - 200) {
            const topHeight = Math.random() * (GAME_HEIGHT - PIPE_GAP - 100) + 50;
            newPipes.push({
              x: GAME_WIDTH,
              topHeight,
              bottomY: topHeight + PIPE_GAP,
              passed: false,
            });
          }

          // Check for score increment
          newPipes.forEach((pipe) => {
            if (!pipe.passed && pipe.x + PIPE_WIDTH < newBird.x) {
              pipe.passed = true;
              setScore((prev) => prev + 1);
            }
          });

          // Check collision
          if (checkCollision(newBird, newPipes)) {
            setGameState("gameOver");
          }

          return newPipes;
        });

        return newBird;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, checkCollision]);

  // Render game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw pipes
    ctx.fillStyle = "#32CD32";
    pipes.forEach((pipe) => {
      // Top pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, GAME_HEIGHT - pipe.bottomY);

      // Pipe caps
      ctx.fillStyle = "#228B22";
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, PIPE_WIDTH + 10, 20);
      ctx.fillRect(pipe.x - 5, pipe.bottomY, PIPE_WIDTH + 10, 20);
      ctx.fillStyle = "#32CD32";
    });

    // Draw bird
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(bird.x + BIRD_SIZE / 2, bird.y + BIRD_SIZE / 2, BIRD_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    // Bird eye
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(bird.x + BIRD_SIZE / 2 + 5, bird.y + BIRD_SIZE / 2 - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Bird beak
    ctx.fillStyle = "#FF8C00";
    ctx.beginPath();
    ctx.moveTo(bird.x + BIRD_SIZE, bird.y + BIRD_SIZE / 2);
    ctx.lineTo(bird.x + BIRD_SIZE + 8, bird.y + BIRD_SIZE / 2 - 2);
    ctx.lineTo(bird.x + BIRD_SIZE + 8, bird.y + BIRD_SIZE / 2 + 2);
    ctx.closePath();
    ctx.fill();

    // Draw ground
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(0, GAME_HEIGHT - 20, GAME_WIDTH, 20);
  }, [bird, pipes]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-400 to-blue-600 p-4">
      <div className="p-6 bg-white/90 backdrop-blur-sm shadow-2xl rounded-lg">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🐦 Flappy Bird</h1>
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-semibold">Score: {score}</div>
            <div className="text-lg font-semibold">Best: {highScore}</div>
          </div>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className="border-2 border-gray-800 rounded-lg cursor-pointer"
            onClick={jump}
          />

          {gameState === "start" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-lg">
              <div className="text-white text-center">
                <h2 className="text-2xl font-bold mb-4">Ready to Fly?</h2>
                <p className="mb-4">Click or press SPACE to flap</p>
                <button 
                  onClick={jump}
                  className="btn btn-primary btn-lg"
                >
                  Start Game
                </button>
              </div>
            </div>
          )}

          {gameState === "gameOver" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-lg">
              <div className="text-white text-center">
                <h2 className="text-2xl font-bold mb-2">Game Over!</h2>
                <p className="text-lg mb-2">Score: {score}</p>
                {score === highScore && score > 0 && (
                  <p className="text-yellow-400 mb-4">🎉 New High Score! 🎉</p>
                )}
                <button 
                  onClick={resetGame}
                  className="btn btn-primary btn-lg"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Click the game area or press SPACE to flap</p>
          <p>Avoid the pipes and try to get a high score!</p>
        </div>
      </div>
    </div>
  );
}
