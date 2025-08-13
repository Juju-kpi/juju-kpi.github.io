document.addEventListener("DOMContentLoaded", async () => {
  const noteField = document.getElementById("note");
  const saveBtn = document.getElementById("saveBtn");
  const viewNotesBtn = document.getElementById("viewNotesBtn");
  const quickSummaryBtn = document.getElementById("quickSummaryBtn"); // Ajouté ici
  const loading = document.getElementById("loading");
  const pageInfo = document.getElementById("pageInfo");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const title = tab.title;
  const url = tab.url;

  pageInfo.textContent = `📝 ${title}`;

  saveBtn.addEventListener("click", () => {
    const noteText = noteField.value;
    if (!noteText.trim()) return;

    const note = {
      text: noteText,
      url,
      title,
      date: new Date().toISOString()
    };

    chrome.storage.local.get({ notes: [] }, (data) => {
      const notes = data.notes;
      notes.push(note);
      chrome.storage.local.set({ notes }, () => {
        noteField.value = "";
        alert("Note sauvegardée !");
      });
    });
  });

  viewNotesBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("notes.html") });
  });

// Gestion du bouton Résumé rapide :
quickSummaryBtn.addEventListener("click", async () => {
  loading.style.display = "block";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const pageText = await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  function: () => {
    const hostname = window.location.hostname;

    if (hostname.includes("wikipedia.org")) {
      return document.querySelector("#mw-content-text")?.innerText || document.body.innerText;
    } else if (hostname.includes("medium.com")) {
      return document.querySelector("article")?.innerText || document.body.innerText;
    } else if (hostname.includes("lemonde.fr")) {
      return document.querySelector("article")?.innerText || document.body.innerText;
    } else if (hostname.includes("nytimes.com")) {
      return document.querySelector("section[name='articleBody']")?.innerText || document.body.innerText;
    } else if (hostname.includes("bbc.com")) {
      return document.querySelector("main")?.innerText || document.body.innerText;
    } else if (hostname.includes("francetvinfo.fr")) {
      return document.querySelector("article")?.innerText || document.body.innerText;
    } else if (hostname.includes("liberation.fr")) {
      return document.querySelector("article")?.innerText || document.body.innerText;
    } else if (hostname.includes("cnews.fr")) {
      return document.querySelector("article")?.innerText || document.body.innerText;
    } else if (hostname.includes("blogspot.") || hostname.includes("wordpress.")) {
      return document.querySelector("article")?.innerText || document.body.innerText;
    } else {
      return document.body.innerText;
    }
  }
});


    const textToSummarize = pageText[0].result;
    console.log("Texte extrait de la page :", textToSummarize);

    // APPEL VIA BACKEND RENDER
    const response = await fetch("https://webnotes-hf.onrender.com/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: textToSummarize.slice(0, 3000) // On limite à 3000 caractères
      })
    });

    const result = await response.json();
    console.log("Réponse backend Render :", result);

    let summary = result.summary;

    if (!summary) {
      throw new Error("Résumé non trouvé dans la réponse");
    }

    // Laisse l'utilisateur modifier le résumé avant sauvegarde
    const editedSummary = prompt("Modifier le résumé avant sauvegarde :", summary);
    if (!editedSummary) {
      alert("Résumé non sauvegardé.");
      return;
    }

    let allNotes = await new Promise(resolve =>
      chrome.storage.local.get({ notes: [] }, result => resolve(result.notes))
    );

    allNotes.unshift({
      title: tab.title,
      url: tab.url,
      text: editedSummary,
      date: new Date().toISOString()
    });

    chrome.storage.local.set({ notes: allNotes }, () => {
      alert("Résumé rapide sauvegardé !");
    });

  } catch (error) {
    console.error(error);
    alert("Erreur lors de la génération du résumé : " + error.message);
  } finally {
    loading.style.display = "none";
  }
});
});

