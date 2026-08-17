const profile = JSON.parse(localStorage.getItem("ai-course-profile") || "{}");
document.querySelectorAll(".profile-name").forEach((element) => {
  element.textContent = profile.name || "受講生A";
});

const weeks = [
  [1, 1, 1, 1, 2],
  [2, 2, 3, 3, 3],
  [4, 4, 4, 4, 5],
  [5, 5, 6, 6, 6],
  [7, 7, 8, 8, 8],
  [9, 9, 10, 10, 10]
];
const moduleDayCount = {};

document.getElementById("week-grid").innerHTML = weeks.map((days, weekIndex) => {
  const dayItems = days.map((moduleId, dayIndex) => {
    moduleDayCount[moduleId] = (moduleDayCount[moduleId] || 0) + 1;
    const calendarDay = weekIndex * 5 + dayIndex + 1;
    const plan = COURSE_PLAN[moduleId];
    const lesson = plan.days[moduleDayCount[moduleId] - 1];

    return `<a class="day-item day-link" href="daily.html?day=${calendarDay}">
      <b>DAY ${String(calendarDay).padStart(2, "0")}</b>
      <span>${plan.title}<small>${lesson}</small></span>
      <em>6時間</em><i data-lucide="chevron-right"></i>
    </a>`;
  }).join("");

  const firstPlan = COURSE_PLAN[days[0]];
  return `<article class="week-card"><header><div><p class="kicker">WEEK ${weekIndex + 1}</p><h2>第${weekIndex + 1}週</h2></div><span>5日間 / 30時間</span></header>${dayItems}<a class="button outline" href="task.html?module=${days[0]}">この週の最初のモジュールを開く<i data-lucide="arrow-right"></i></a></article>`;
}).join("");

lucide.createIcons();
