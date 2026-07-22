const answer = document.querySelector("#preview-answer");
document.querySelectorAll(".keypad button").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.textContent === "⌫") {
      answer.textContent = answer.textContent === "إجابتك..." ? answer.textContent : answer.textContent.slice(0, -1) || "إجابتك...";
      return;
    }
    answer.textContent = answer.textContent === "إجابتك..." ? button.textContent : answer.textContent + button.textContent;
  });
});

document.querySelector("#preview-play").addEventListener("click", (event) => {
  event.currentTarget.textContent = event.currentTarget.textContent === "▶" ? "Ⅱ" : "▶";
});

document.querySelector("#resume-preview").addEventListener("click", (event) => {
  event.currentTarget.textContent = "جاري فتح الدرس…";
  window.setTimeout(() => {
    event.currentTarget.textContent = "أكمل الدرس   ←";
  }, 900);
});
