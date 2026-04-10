import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line, Radar } from "react-chartjs-2";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Tooltip,
);

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: "#cbd5e1",
      },
    },
  },
  scales: {
    x: {
      ticks: { color: "#94a3b8" },
      grid: { color: "rgba(148, 163, 184, 0.08)" },
    },
    y: {
      ticks: { color: "#94a3b8" },
      grid: { color: "rgba(148, 163, 184, 0.08)" },
    },
  },
};

export function AccuracyTrendChart({ weeklyAccuracy }) {
  const data = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Accuracy",
        data: weeklyAccuracy,
        fill: true,
        tension: 0.35,
        borderColor: "#34d399",
        backgroundColor: "rgba(52, 211, 153, 0.12)",
        pointBackgroundColor: "#22d3ee",
        pointBorderColor: "#ffffff",
      },
    ],
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Weekly learning momentum</CardTitle>
        <CardDescription>Track how accuracy changes as the student keeps practicing.</CardDescription>
      </CardHeader>
      <CardContent className="h-[260px] sm:h-[300px]">
        <Line data={data} options={baseOptions} />
      </CardContent>
    </Card>
  );
}

export function AccuracyGauge({ accuracy }) {
  const data = {
    labels: ["Accuracy", "Remaining"],
    datasets: [
      {
        data: [accuracy, Math.max(100 - accuracy, 0)],
        backgroundColor: ["#10b981", "rgba(148, 163, 184, 0.16)"],
        borderWidth: 0,
      },
    ],
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Current accuracy</CardTitle>
        <CardDescription>A quick snapshot of overall quiz performance.</CardDescription>
      </CardHeader>
      <CardContent className="h-[260px] sm:h-[300px]">
        <Doughnut
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            plugins: {
              legend: {
                labels: { color: "#cbd5e1" },
              },
            },
          }}
        />
      </CardContent>
    </Card>
  );
}

export function TopicBarChart({ topicBreakdown }) {
  if (!topicBreakdown.length) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Topic performance</CardTitle>
          <CardDescription>Identify strong and weak areas across subjects.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[260px] items-center justify-center text-center text-sm text-slate-400 sm:h-[300px]">
          Topic insights will appear here after the student submits quizzes.
        </CardContent>
      </Card>
    );
  }

  const data = {
    labels: topicBreakdown.map((entry) => entry.topic),
    datasets: [
      {
        label: "Topic accuracy",
        data: topicBreakdown.map((entry) => Math.round(entry.accuracy)),
        borderRadius: 12,
        backgroundColor: ["#10b981", "#06b6d4", "#f59e0b", "#818cf8", "#f97316"],
      },
    ],
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Topic performance</CardTitle>
        <CardDescription>Identify strong and weak areas across subjects.</CardDescription>
      </CardHeader>
      <CardContent className="h-[260px] sm:h-[300px]">
        <Bar data={data} options={baseOptions} />
      </CardContent>
    </Card>
  );
}

export function SkillRadarChart({ topicBreakdown }) {
  if (!topicBreakdown.length) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Skill radar</CardTitle>
          <CardDescription>Visualize balance across the student learning journey.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[260px] items-center justify-center text-center text-sm text-slate-400 sm:h-[300px]">
          The radar view will unlock after the first few quiz results.
        </CardContent>
      </Card>
    );
  }

  const data = {
    labels: topicBreakdown.map((entry) => entry.topic),
    datasets: [
      {
        label: "Skill coverage",
        data: topicBreakdown.map((entry) => Math.round(entry.accuracy)),
        borderColor: "#22d3ee",
        backgroundColor: "rgba(34, 211, 238, 0.18)",
      },
    ],
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Skill radar</CardTitle>
        <CardDescription>Visualize balance across the student learning journey.</CardDescription>
      </CardHeader>
      <CardContent className="h-[260px] sm:h-[300px]">
        <Radar
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: { color: "#cbd5e1" },
              },
            },
            scales: {
              r: {
                angleLines: { color: "rgba(148, 163, 184, 0.2)" },
                grid: { color: "rgba(148, 163, 184, 0.12)" },
                pointLabels: { color: "#e2e8f0" },
                ticks: {
                  color: "#94a3b8",
                  backdropColor: "transparent",
                },
              },
            },
          }}
        />
      </CardContent>
    </Card>
  );
}
