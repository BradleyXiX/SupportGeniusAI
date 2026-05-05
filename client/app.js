async function send() {
  const input = document.getElementById("input").value;

  const res = await fetch("http://localhost:3000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: input })
  });

  const data = await res.json();

  document.getElementById("chat").innerHTML += `
    <p><b>You:</b> ${input}</p>
    <p><b>AI:</b> ${data.reply}</p>
  `;
}