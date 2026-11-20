// ==========================================================================
// SupportGeniusAI Scripted Marketing Examples Controller
// Deterministic Scripted Samples • Zero API Calls • textContent Only
// Governed by Task 06 & design.md
// ==========================================================================

export const EXAMPLES = {
  returns: {
    question: "What is your returns policy?",
    answer: "In this sample policy, you can return an unused item in its original packaging within 14 days of delivery."
  },
  shipping: {
    question: "How long does shipping take?",
    answer: "In this sample policy, standard delivery takes 3–5 business days after dispatch."
  },
  hours: {
    question: "What are your opening hours?",
    answer: "In this sample policy, the support team is available Monday to Friday, 9am–5pm."
  }
};

export function initExamples(container = document) {
  const buttons = container.querySelectorAll("[data-example]");
  const questionEl = container.querySelector("#sample-question");
  const answerEl = container.querySelector("#sample-answer");

  if (!buttons.length || !questionEl || !answerEl) return () => {};

  const handleSelect = (key) => {
    const data = EXAMPLES[key];
    if (!data) return;

    buttons.forEach((btn) => {
      const isSelected = btn.dataset.example === key;
      btn.classList.toggle("selected", isSelected);
      btn.setAttribute("aria-pressed", String(isSelected));
    });

    questionEl.textContent = data.question;
    answerEl.textContent = data.answer;
  };

  const handlers = [];
  buttons.forEach((btn) => {
    const onClick = () => handleSelect(btn.dataset.example);
    btn.addEventListener("click", onClick);
    handlers.push({ btn, onClick });
  });

  return () => {
    handlers.forEach(({ btn, onClick }) => {
      btn.removeEventListener("click", onClick);
    });
  };
}
