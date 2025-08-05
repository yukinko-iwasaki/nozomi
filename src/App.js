import React, { useState, useEffect } from 'react';


const App = () => {
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [loadingImages, setLoadingImages] = useState({}); // State to track loading for each character

  // Initial character data with prompts for image generation
  const [characters, setCharacters] = useState({
    mermaid: {
      image: 'https://placehold.co/400x600/40CFFF/000000?text=🧜‍♀️+Generating...',
      icon: 'fas fa-water',
      alt: 'Your sister as a Mermaid',
      prompt: 'A woman with long black hair and a joyful smile, with the exact same face, facial features, hairstyle, and expression as the woman in the photo nozomi.jpeg (yellow skirt), transformed into a magical mermaid with a shimmering tail, seashell crown, and flowing hair. The background is an underwater birthday party with colorful fish, balloons, confetti, and a big birthday cake. Photorealistic, festive, birthday party atmosphere.',
    },
    pirate: {
      image: 'https://placehold.co/400x600/8B4513/FFFFFF?text=🎈+Generating...',
      icon: 'fas fa-gift',
      alt: 'Your sister as a Pirate',
      prompt: 'A woman with long black hair and a friendly smile, with the exact same face, facial features, hairstyle, and expression as the woman in the photo nozomi.jpeg (yellow skirt), dressed as a pirate, with a red bandana, striped shirt, and a playful eye patch. The background is a birthday party on a ship, with balloons, presents, and confetti. Photorealistic, festive, birthday party atmosphere.',
    },
    princess: {
      image: 'https://placehold.co/400x600/FFC0CB/000000?text=🎂+Generating...',
      icon: 'fas fa-crown',
      alt: 'Your sister as a Princess',
      prompt: 'A woman with long black hair and a gentle smile, with the exact same face, facial features, hairstyle, and expression as the woman in the photo nozomi.jpeg (yellow skirt), dressed as a fairytale princess in a flowing gown, possibly in shades of blue or pink, with a small tiara. The background is a magical birthday garden with cakes, candles, and confetti. Photorealistic, festive, birthday party atmosphere.',
    },
    chef: {
      image: 'https://placehold.co/400x600/F5F5DC/000000?text=🎊+Generating...',
      icon: 'fas fa-ice-cream',
      alt: 'Your sister as a Chef',
      prompt: 'A woman with long black hair and a confident, warm smile, with the exact same face, facial features, hairstyle, and expression as the woman in the photo nozomi.jpeg (yellow skirt), dressed as a professional chef in a clean white chef\'s coat and hat, holding a whisk. The background is a bright kitchen decorated for a birthday, with cupcakes, balloons, and confetti. Photorealistic, festive, birthday party atmosphere.',
    },
  });


  // State for new character form
  const [newCharacterName, setNewCharacterName] = useState("");

  // State for API key modal
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState("");



  // Handler to add a new character
  const handleAddCharacter = (e) => {
    e.preventDefault();
    if (!newCharacterName.trim()) return;
    const key = newCharacterName.trim().toLowerCase().replace(/\s+/g, "_");
    setCharacters(prev => ({
      ...prev,
      [key]: {
        image: 'https://placehold.co/400x600/FFD1DC/000000?text=🎁+Generating...',
        icon: 'fas fa-birthday-cake',
        alt: newCharacterName,
        prompt: `Make ${newCharacterName.trim()} version. The background is decorated for a birthday party with balloons, confetti, and cake. Festive, birthday party atmosphere.`,
      }
    }));
    setNewCharacterName("");
  };



  // Function to call Gemini 2.0 Flash Preview Image Generation using fetch (image-to-image)
  // Always uses nozomi2.jpeg as the reference image
  const generateCharacterImage = async (characterName, prompt) => {
    setLoadingImages(prev => ({ ...prev, [characterName]: true }));
    try {
      // Helper to fetch and encode a JPEG as base64
      const fetchBase64 = async (filename) => {
        const responseImg = await fetch(process.env.PUBLIC_URL + '/' + filename);
        if (!responseImg.ok) {
          throw new Error(`Failed to fetch ${filename}: ${responseImg.status} ${responseImg.statusText}`);
        }
        const blob = await responseImg.blob();
        if (blob.size === 0) {
          throw new Error(`${filename} is empty or corrupted.`);
        }
        const reader = new FileReader();
        return await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      let base64ImageData;
      try {
        base64ImageData = await fetchBase64('nozomi2.jpeg');
        if (!base64ImageData || !base64ImageData.startsWith('data:image/jpeg')) {
          throw new Error('nozomi2.jpeg is not a valid JPEG image.');
        }
      } catch (imgErr) {
        setCharacters(prev => ({
          ...prev,
          [characterName]: { ...prev[characterName], image: `https://placehold.co/400x600/cccccc/000000?text=Reference+Image+Error` }
        }));
        setLoadingImages(prev => ({ ...prev, [characterName]: false }));
        return;
      }
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64ImageData.split(',')[1],
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      };
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      let imageUrl = `https://placehold.co/400x600/cccccc/000000?text=Error`;
      try {
        const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
        if (base64Data) {
          imageUrl = `data:image/png;base64,${base64Data}`;
        }
      } catch (e) {
        // fallback to error placeholder
      }
      setCharacters(prev => ({
        ...prev,
        [characterName]: { ...prev[characterName], image: imageUrl }
      }));
    } catch (error) {
      setCharacters(prev => ({
        ...prev,
        [characterName]: { ...prev[characterName], image: `https://placehold.co/400x600/cccccc/000000?text=Error` }
      }));
      console.error(error);
    } finally {
      setLoadingImages(prev => ({ ...prev, [characterName]: false }));
    }
  };



  const handleCharacterClick = (characterName) => {
    setSelectedCharacter(characterName);
    if (!loadingImages[characterName] && apiKey) {
      generateCharacterImage(characterName, characters[characterName].prompt);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-200 flex flex-col items-center justify-center p-4 font-inter">
      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center border-4 border-pink-300 min-w-[320px]">
            <h2 className="text-2xl font-bold text-pink-600 mb-4">Enter Password</h2>
            <input
              type="password"
              placeholder="Your Password here"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              className="border border-pink-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-pink-300 mb-4 w-full"
            />
            <button
              className="bg-pink-500 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-pink-600 transition w-full"
              onClick={() => {
                setApiKey(apiKeyInput);
                setShowApiKeyModal(false);
              }}
              disabled={!apiKeyInput.trim()}
            >
              Start
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">Your API key is only stored in this browser session.</p>
          </div>
        </div>
      )}
      {/* Tailwind CSS CDN for styling */}
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      {/* Font Awesome CDN for icons */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" />

      <h1 className="text-5xl md:text-6xl font-extrabold text-pink-600 mb-4 text-center drop-shadow-lg flex flex-col items-center">
        <span className="text-7xl mb-2 animate-bounce">🎉</span>
        Happy Birthday Nozomi!
      </h1>
      <h2 className="text-2xl md:text-3xl font-bold text-pink-500 mb-8 text-center">Create magical birthday looks for your loved one! 🎂🎈</h2>



      {/* Add new character form */}
      <form onSubmit={handleAddCharacter} className="w-full max-w-lg mx-auto mb-8 flex flex-col md:flex-row items-center gap-4 p-4 bg-pink-50 rounded-xl shadow-md border-2 border-pink-200">
        <input
          type="text"
          placeholder="New character name (e.g. Astronaut)"
          value={newCharacterName}
          onChange={e => setNewCharacterName(e.target.value)}
          className="flex-1 border border-pink-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
        />
        <button
          type="submit"
          className="bg-pink-500 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-pink-600 transition"
        >
          Add
        </button>
      </form>

      {/* Character selection buttons */}
      <div className="flex flex-wrap justify-center gap-6 mb-12">
        {Object.keys(characters).map((characterName) => (
          <div key={characterName} className="flex flex-col items-center">
            <button
              onClick={() => handleCharacterClick(characterName)}
              className={`
                flex flex-col items-center p-4 rounded-xl shadow-lg transition-all duration-300 ease-in-out border-2
                ${selectedCharacter === characterName ? 'bg-pink-500 text-white transform scale-105 ring-4 ring-pink-300 border-pink-400' : 'bg-white text-pink-700 hover:bg-pink-50 hover:shadow-xl border-pink-200'}
                focus:outline-none focus:ring-4 focus:ring-pink-300
              `}
              disabled={loadingImages[characterName]}
            >
              <i className={`${characters[characterName].icon} text-4xl mb-2`}></i>
              <span className="text-lg font-semibold capitalize">{characterName}</span>
              {loadingImages[characterName] && (
                <span className="text-sm mt-1 animate-pulse">Loading...</span>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Display area for the selected character's image */}
      <div className="w-full max-w-md bg-pink-50 rounded-xl shadow-2xl p-6 flex flex-col items-center justify-center min-h-[400px] border-2 border-pink-200">
        {selectedCharacter ? (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-pink-600 mb-4 capitalize flex items-center gap-2">
              <span role="img" aria-label="party">🎈</span> {selectedCharacter} Birthday Version <span role="img" aria-label="cake">🎂</span>
            </h2>
            {loadingImages[selectedCharacter] ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                <p className="mt-4 text-gray-600">Generating image...</p>
              </div>
            ) : (
              <img
                src={characters[selectedCharacter].image}
                alt={characters[selectedCharacter].alt}
                className="w-full h-auto rounded-lg shadow-md border-4 border-blue-400 object-cover"
                style={{ maxHeight: '500px' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://placehold.co/400x600/cccccc/000000?text=Image+Not+Found";
                  console.error(`Failed to load image for ${selectedCharacter}`);
                }}
              />
            )}
            <p className="text-pink-500 mt-4 text-base font-semibold">
              Click another icon or add your own to create more birthday magic! 🎁
            </p>
          </div>
        ) : (
          <div className="text-center text-pink-400">
            <p className="text-2xl mb-4 font-bold">🎉 Click an icon above to see a magical birthday transformation! 🎉</p>
            <i className="fas fa-birthday-cake text-6xl text-pink-400 animate-bounce"></i>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
