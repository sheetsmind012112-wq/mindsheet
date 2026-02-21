import { useRef, useEffect } from "react";
import {
  Chart as ChartJS,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  RadarController,
  ScatterController,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register all Chart.js components we may need
ChartJS.register(
  BarController,
  LineController,
  PieController,
  DoughnutController,
  RadarController,
  ScatterController,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface ChartDisplayProps {
  config: Record<string, unknown>;
}

function ChartDisplay({ config }: ChartDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy previous chart instance
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    try {
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      // Clone config to avoid mutation and ensure responsive
      const chartConfig = JSON.parse(JSON.stringify(config));
      if (!chartConfig.options) chartConfig.options = {};
      chartConfig.options.responsive = true;
      chartConfig.options.maintainAspectRatio = true;

      chartRef.current = new ChartJS(ctx, chartConfig);
    } catch (err) {
      console.error("Failed to render chart:", err);
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [config]);

  return (
    <div className="mt-2 p-2 bg-white rounded border border-slate-100">
      <canvas ref={canvasRef} />
    </div>
  );
}

export default ChartDisplay;
