# Pomodoro & Habits Tracker Features

## 1. Focus Timer Engine
- **Custom Duration Intervals**:
  - Focus session length.
  - Short break duration.
  - Long break duration.
- **Cycle Control**:
  - Configurable target cycles before triggering a long break.
  - Automatic or manual transitions between Focus and Break periods.
  - Ability to skip sessions or complete them early.
- **Audio Chime Synthesis**:
  - Web Audio API generated alerts (no static asset dependencies):
    - Session start chime.
    - Remaining warning ticks (final 3 seconds).
    - Session completion alarm.
  - Sound toggles.
- **Goal Setting**:
  - Configurable daily target quota for completed focus cycles.
  - Session progress tracker.
- **Desktop Alerts**:
  - System notification dispatching for completed focus and break intervals.

## 2. Hierarchical Task & Todo Tracker
- **Task Tree Structures**:
  - Standalone parent tasks and projects.
  - Unlimited nesting of sub-tasks under parent nodes.
- **Lifecycle Status States**:
  - Status tracking: Pending, In Progress, Completed, and Archived.
- **Taxonomy & Tags**:
  - User-defined labels and metadata tags for categorizing tasks.
  - Cumulative focus time logging per task (tracks total minutes/hours spent).

## 3. Habit Formation Tracker
- **Habit Types**:
  - Positive habits (building routine behaviors).
  - Negative habits (vice/addiction breaking).
- **Completion Logging**:
  - Interactive grid history covering the last 7 days.
- **Streak Calculations**:
  - Current consecutive day streaks.
  - Personal historical best streaks.
  - Consistency percentage index.

## 4. Analytics & Insights
- **Focus Integrity Index**:
  - Ratio of completed sessions compared to total sessions started on that day.
- **Time Distribution Charting**:
  - Visual breakdown (percentage/duration) of focus hours grouped by task tags.
- **Productivity Hour Curve**:
  - Peak daily efficiency detection (computes active performance by time-of-day).
- **Habit Completion Correlation**:
  - Statistical insights cross-referencing habit completions against total daily Pomodoro output.
- **Periodical Comparisons**:
  - Week-over-week productivity growth tracking.
