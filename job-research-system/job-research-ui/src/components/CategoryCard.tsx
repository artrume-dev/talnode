/**
 * CategoryCard Component
 *
 * Displays a single category analysis from AI job analysis
 * Shows score, stars, reasoning, and progress bar
 */

import { Star } from 'lucide-react';

interface CategoryCardProps {
  title: string;
  weight: string;
  score: number;
  stars: number;
  reasoning: string;
}

export function CategoryCard({ title, weight, score, stars, reasoning }: CategoryCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          <span className="text-sm text-gray-500">{weight} weight</span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{score}/100</div>
          <div className="flex items-center gap-1 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < stars
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-200 text-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all ${
            score >= 90
              ? 'bg-green-500'
              : score >= 75
              ? 'bg-blue-500'
              : score >= 60
              ? 'bg-yellow-500'
              : score >= 40
              ? 'bg-orange-500'
              : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>

      <p className="text-sm text-gray-700 leading-relaxed">{reasoning}</p>
    </div>
  );
}
