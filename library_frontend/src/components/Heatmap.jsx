import { useMemo } from "react";
import "./Heatmap.css";

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Heatmap({ data = {} }) {
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const result = [];
    const labels = [];
    
    // Find the date for 52 weeks ago (starting on a Sunday)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (52 * 7));
    while (startDate.getDay() !== 0) {
      startDate.setDate(startDate.getDate() - 1);
    }

    let current = new Date(startDate);
    let lastMonth = -1;

    for (let w = 0; w < 53; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const iso = current.toISOString().split("T")[0];
        const val = data[iso] || 0;
        
        // Intensity levels (GitHub style)
        let level = 0;
        if (val > 0)    level = 1;
        if (val > 1800) level = 2; // 30 mins
        if (val > 3600) level = 3; // 1 hour
        if (val > 7200) level = 4; // 2 hours

        week.push({ date: new Date(current), iso, val, level });

        // Month labels
        if (current.getMonth() !== lastMonth && d === 0) {
          labels.push({ x: w, label: MONTHS[current.getMonth()] });
          lastMonth = current.getMonth();
        }
        
        current.setDate(current.getDate() + 1);
      }
      result.push(week);
    }
    return { weeks: result, monthLabels: labels };
  }, [data]);

  return (
    <div className="heatmap-container">
      <div className="heatmap-grid-wrap">
        <div className="heatmap-y-labels">
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
        </div>
        
        <div className="heatmap-svg-wrap">
          <div className="heatmap-months">
            {monthLabels.map((m, i) => (
              <span key={i} style={{ left: `${(m.x / 53) * 100}%` }}>{m.label}</span>
            ))}
          </div>
          
          <svg viewBox="0 0 715 100" className="heatmap-svg">
            {weeks.map((week, x) => (
              week.map((day, y) => (
                <rect
                  key={`${x}-${y}`}
                  x={x * 13.5}
                  y={y * 13.5}
                  width="11"
                  height="11"
                  rx="2"
                  className={`heatmap-rect level-${day.level}`}
                >
                  <title>{day.iso}: {Math.round(day.val / 60)} mins</title>
                </rect>
              ))
            ))}
          </svg>
        </div>
      </div>
      
      <div className="heatmap-footer">
        <span className="heatmap-legend-label">Less</span>
        <div className="heatmap-legend">
          <div className="heatmap-rect level-0" />
          <div className="heatmap-rect level-1" />
          <div className="heatmap-rect level-2" />
          <div className="heatmap-rect level-3" />
          <div className="heatmap-rect level-4" />
        </div>
        <span className="heatmap-legend-label">More</span>
      </div>
    </div>
  );
}
