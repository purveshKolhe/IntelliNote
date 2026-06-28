## 1. The Core Pomodoro Engine

The engine handles the fundamental time-blocking mechanics and session states.

* **Adaptive Interval Engine:**
* Custom durations for Focus sessions, Short Breaks, and Long Breaks.
* Configurable target cycles before a Long Break is triggered.


* **Session State Control Logic:**
* Manual and automatic transitions between Focus and Break periods.
* Manual session skipping and early completion.


* **Audio and Notification Dispatcher:**
* Custom triggers for session starts, session completions, and countdown warnings.

* **Daily Target Quota:**
* Setting and updating a daily goal for completed Pomodoros (e.g., "Target: 8 sessions today").


## 2. Advanced Task & To-Do Management

This subsystem manages the lifecycle and organization of actionable items.

* **Hierarchical Task Structuring:**
* Support for standalone tasks, parent projects, and nested sub-tasks.


* **Task State Lifecycle:**
* Status tracking: Pending, In Progress, Completed, and Archived.


* **Taxonomy & Metadata:**
* Custom tags, labels, and project categorizations for multi-dimensional filtering.



## 3. Habit Formation & Tracking Ecosystem

Unlike tasks, habits track repetitive behaviors over time without a definitive "Done" state.

* **Habit Definition Logic:**
* Tracking types: Positive habits (building a routine) vs. Negative habits (breaking a vice).
* Frequency parameters: Daily, specific days of the week, or a set number of times per month.


* **Streak Mechanics:**
* Calculation of current streaks, historical best streaks, and total completion consistency rates. Use checkboxes. 



## 4. Analytics & Insights Engine

The data processing core that translates raw logs into meaningful productivity intelligence.

* **Time-Distribution Analytics:**
* Calculations comparing time spent across projects, tags, .


* **Temporal Productivity Curves:**
* Analysis tracking performance metrics by time of day and day of the week to map peak focus windows.


* **Correlation Processing:**
* Cross-referencing habit completion rates with Pomodoro output (e.g., "Do days with completed morning meditation habits yield higher afternoon Pomodoro volumes?").


* **Focus Integrity Scoring:**
* A calculated index score for each session based on length, distraction logs, and whether the session was finished successfully.


* **Comparative Periodical Metrics:**
* Computing rate-of-change metrics between historical periods (e.g., week-over-week focus duration fluctuations).

A separate analytics tab with a lot of wonderful analytics for students to know about their habits and stuff.