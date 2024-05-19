import { Streamlit, RenderData } from "streamlit-component-lib"
import CryptoES from 'crypto-es';

// TODO: Add tablet functionality using URL-schemes
// Force sync after adding

// TODO: Publish separate component

// Adds note to a deck
async function addFlashcard(deck: string, front: string, back: string, tags: string) {
  try {
    const note = {
      deckName: deck,
      modelName: 'PDF-Anki-Note',
      fields: { Front: front, Back: back },
      options: { allowDuplicate: false },
      tags: [tags],
    };
    const addNoteResponse = await fetch('http://localhost:11434', {
      method: 'POST',
      body: JSON.stringify({
        action: 'addNote',
        params: { note: note },
        version: 6,
      }),
    });

    const jsonResponse = await addNoteResponse.json();
    return jsonResponse.result;
  } catch (error) {
    throw new Error('Error: Unable to reach the server');
  }
}

// Adds note to a deck including image
async function addFlashcardWithImage(deck: string, image: Uint8Array, front: string, back: string, tags: string) {
  let binaryString = new TextDecoder().decode(image);
  let date = Date.now();
  let hash = CryptoES.SHA256(date.toString());
  try {
    const note = {
      deckName: deck,
      modelName: 'PDF-Anki-Note',
      fields: { Front: front, Back: back },
      options: { allowDuplicate: false },
      tags: [ tags ],
      picture: [{
        data: binaryString,
        filename: "pdf-anki-" + hash + ".jpg",
        fields: [ "Back" ]
      }]
    };
    const addNoteResponse = await fetch('http://localhost:11434', {
      method: 'POST',
      body: JSON.stringify({
        action: 'addNote',
        params: { note: note },
        version: 6,
      }),
    });

    const jsonResponse = await addNoteResponse.json();
    return jsonResponse.result;
  } catch (error) {
    throw new Error('Error: Unable to reach the server');
  }
}

// Checks if server reachable
async function reqPerm() {
  try {
    // Add the note to the deck
    const reqPermResponse = await fetch('http://localhost:11434', {
      method: 'POST',
      body: JSON.stringify({
        action: 'requestPermission',
        version: 6,
      }),
    });

    const jsonResponse = await reqPermResponse.json();
    return jsonResponse.result.permission;
  } catch (error) {
    return false
  }
}

async function checkModelExistence() {
  try {
    // Add the note to the deck
    const checkModelExistence = await fetch('http://localhost:11434', {
      method: 'POST',
      body: JSON.stringify({
        action: 'modelNames',
        version: 6,
      }),
    });

    const jsonResponse = await checkModelExistence.json();
    if (!jsonResponse.result.includes("PDF-Anki-Note")) {
      const createModel = await fetch('http://localhost:11434', {
      method: 'POST',
      body: JSON.stringify({
        action: "createModel",
        version: 6,
        params: {
          modelName: "PDF-Anki-Note",
          inOrderFields: ["Front", "Back"],
          isCloze: false,
          cardTemplates: [
            {
              Name: "My Card 1",
              Front: "{{Front}}",
              Back: "{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}<br><br>\n\nTags: {{Tags}}",
            },
          ],
        },
      }),
    });    

    const jsonResponse = await createModel.json();
    return jsonResponse.result;
    }
  } catch (error) {
    return false
  }
}

// Returns users decks
async function getDecks() {
  try {
    // Add the note to the deck
    const getDecksResponse = await fetch('http://localhost:11434', {
      method: 'POST',
      body: JSON.stringify({
        action: 'deckNames',
        version: 6,
      }),
    });

    const jsonResponse = await getDecksResponse.json();
    return jsonResponse.result;
  } catch (error) {
    return false
  }
}

/**
 * The component's render function. This will be called immediately after
 * the component is initially loaded, and then again every time the
 * component gets new data from Python.
 */
async function onRender(event: Event): Promise<void> {
  // Get the RenderData from the event
  const data = (event as CustomEvent<RenderData>).detail

  // RenderData.args is the JSON dictionary of arguments sent from the
  // Python script.
  let action = data.args["action"]
  let deck = data.args["deck"]
  let image = data.args["image"]
  let front = data.args["front"]
  let back = data.args["back"]
  let tags = data.args["tags"]

  try {
    switch (action) {
      case "reqPerm":
        // Initialization for checking if server reachable and model exists
        await reqPerm();
        const checkModel = await checkModelExistence();
        Streamlit.setComponentValue(checkModel)
        break;
      case "addCard":
        const success = await addFlashcard(deck, front, back, tags);
        Streamlit.setComponentValue(success)
        break;
      case "addCardWithImage":
        const response = await addFlashcardWithImage(deck, image, front, back, tags);
        Streamlit.setComponentValue(response)
        break;
      case "getDecks":
        const decks = await getDecks();
        Streamlit.setComponentValue(decks)
        break;
    }
  } catch (error) {
    Streamlit.setComponentValue("Error")
  }

  // We tell Streamlit to update our frameHeight after each render event, in
  // case it has changed. (This isn't strictly necessary for the example
  // because our height stays fixed, but this is a low-cost function, so
  // there's no harm in doing it redundantly.)
  Streamlit.setFrameHeight()
}

// Attach our `onRender` handler to Streamlit's render event.
Streamlit.events.addEventListener(Streamlit.RENDER_EVENT, onRender)

// Tell Streamlit we're ready to start receiving data. We won't get our
// first RENDER_EVENT until we call this function.
Streamlit.setComponentReady()

// Finally, tell Streamlit to update our initial height. We omit the
// `height` parameter here to have it default to our scrollHeight.
Streamlit.setFrameHeight()
