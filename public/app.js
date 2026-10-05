const typewriter = document.querySelector("#typewriter");
const phrases = ["the words that matter", "a note that feels right", "your very first draft"];
let phraseIndex = 0;

function typeNextPhrase() {
  const phrase = phrases[phraseIndex % phrases.length];
  typewriter.textContent = "";
  let characterIndex = 0;
  const interval = window.setInterval(() => {
    typewriter.textContent += phrase[characterIndex];
    characterIndex += 1;
    if (characterIndex >= phrase.length) {
      window.clearInterval(interval);
      phraseIndex += 1;
      window.setTimeout(typeNextPhrase, 1900);
    }
  }, 58);
}
window.setTimeout(typeNextPhrase, 850);

const revealObserver = new IntersectionObserver((entries, observer) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }
}, { threshold: 0.14 });
document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const promptInput = document.querySelector("#prompt-input");
const characterCount = document.querySelector("#character-count");
const promptStatus = document.querySelector("#prompt-status");
const writeButton = document.querySelector("#write-button");
const draftOutput = document.querySelector("#draft-output");
const copyButton = document.querySelector("#copy-button");

promptInput.addEventListener("input", () => {
  characterCount.textContent = `${promptInput.value.length} / 3000`;
});

function makeDraft(prompt) {
  const cleanedPrompt = prompt.replace(/[.!?]+$/, "");
  return `Here’s a place to begin.\n\n${cleanedPrompt.charAt(0).toUpperCase()}${cleanedPrompt.slice(1)}. Let’s make it feel clear, thoughtful, and unmistakably yours.\n\nStart with what matters most. The rest can find its way from there.`;
}

writeButton.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();
  promptStatus.textContent = "";
  promptStatus.classList.remove("is-error");
  if (!prompt) {
    promptStatus.textContent = "Add a thought first. A sentence or two is plenty.";
    promptStatus.classList.add("is-error");
    promptInput.focus();
    return;
  }

  writeButton.disabled = true;
  writeButton.querySelector(".button-label").textContent = "Finding your words...";
  draftOutput.classList.add("has-draft");
  draftOutput.textContent = makeDraft(prompt);
  copyButton.disabled = false;

  try {
    const response = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Prompt could not be saved.");
    promptStatus.textContent = "Your prompt was saved. Make this first draft your own.";
  } catch (error) {
    promptStatus.textContent = error.message.includes("not configured")
      ? "Draft ready. Connect MongoDB to save prompts."
      : "Draft ready, but the prompt could not be saved. Check your MongoDB connection.";
    promptStatus.classList.add("is-error");
  } finally {
    writeButton.disabled = false;
    writeButton.querySelector(".button-label").textContent = "Find my words";
  }
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(draftOutput.textContent);
    copyButton.title = "Copied";
    window.setTimeout(() => { copyButton.title = "Copy draft"; }, 1400);
  } catch {
    promptStatus.textContent = "Clipboard access is unavailable in this browser.";
    promptStatus.classList.add("is-error");
  }
});

document.querySelectorAll(".billing-option").forEach((button) => {
  button.addEventListener("click", () => {
    const billing = button.dataset.billing;
    document.querySelectorAll(".billing-option").forEach((option) => {
      const isSelected = option === button;
      option.classList.toggle("is-selected", isSelected);
      option.setAttribute("aria-pressed", String(isSelected));
    });
    document.querySelectorAll(".price-amount").forEach((price) => {
      price.textContent = price.dataset[billing];
    });
  });
});