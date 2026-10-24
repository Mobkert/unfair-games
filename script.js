const HOLD_MS = 2000;
const FLIGHT_MS = 800;
const splash = document.querySelector("#splash");

const dismiss = () => {
  if (!splash.isConnected) return;
  splash.remove();
};

window.setTimeout(() => {
  if (!splash.isConnected) return;
  splash.classList.add("is-leaving");
}, HOLD_MS);

splash.addEventListener("animationend", (event) => {
  const mark = splash.querySelector(".splash-mark");
  if (event.target !== mark) return;
  if (event.animationName !== "fly-away" && event.animationName !== "splash-fade") return;
  dismiss();
});

window.setTimeout(dismiss, HOLD_MS + FLIGHT_MS + 120);
