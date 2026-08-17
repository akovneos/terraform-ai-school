if (!window.AICourseProgressSyncLoaded) {
  window.AICourseProgressSyncLoaded = true;
  const progressSync = document.createElement("script");
  progressSync.src = "progress-sync.js";
  document.head.append(progressSync);
}

const day = Number(new URLSearchParams(location.search).get("day")) || 1;
const lesson = DAILY_LESSONS.find((item) => item.day === day) || DAILY_LESSONS[0];
const profile = JSON.parse(localStorage.getItem("ai-course-profile") || "{}");
const dailyState = JSON.parse(localStorage.getItem("ai-course-daily") || "{}");

document.querySelectorAll(".profile-name").forEach((element) => {
  element.textContent = profile.name || "受講生A";
});
document.title = `DAY ${lesson.day}: ${lesson.title} | AI業務活用研修`;
document.getElementById("daily-kicker").textContent = `WEEK ${Math.ceil(lesson.day / 5)} / DAY ${String(lesson.day).padStart(2, "0")} / MODULE ${String(lesson.module).padStart(2, "0")}`;
document.getElementById("daily-title").textContent = lesson.title;
document.getElementById("daily-goal").textContent = `目標：${lesson.goal}`;
document.getElementById("daily-learn").innerHTML = lesson.learn.map((item) => `<li>${item}</li>`).join("");
document.getElementById("daily-task").textContent = lesson.task;
document.getElementById("daily-deliverable").textContent = lesson.deliverable;
document.getElementById("daily-checks").innerHTML = lesson.checks.map((item, index) => `<label class="daily-check"><input type="checkbox" data-check="${index}" ${dailyState[day]?.checks?.[index] ? "checked" : ""}/><span>${item}</span></label>`).join("");
document.getElementById("open-module").href = `task.html?module=${lesson.module}`;

document.getElementById("complete-day").addEventListener("click", () => {
  const checks = [...document.querySelectorAll("[data-check]")].map((box) => box.checked);
  const message = document.getElementById("completion-message");
  if (!checks.every(Boolean)) {
    message.textContent = "すべてのチェック項目を確認してください。";
    return;
  }

  dailyState[day] = { checks, completed: true };
  localStorage.setItem("ai-course-daily", JSON.stringify(dailyState));
  message.textContent = `DAY ${String(day).padStart(2, "0")} を完了しました。`;
});

lucide.createIcons();
