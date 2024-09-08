import React, { useState, useEffect, useRef } from "react";
import "./App.css";


const sendRequest = async (endpoint, data, callback = null) => {
  /**
   *    Send info to Flask API
   */

  try {
    const response = await fetch(`http://localhost:5173${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const responseData = await response.json();
    if (callback && typeof callback === 'function') {
      callback(responseData);
    }
    return responseData;
  } catch (error) {
    console.error('Error in sendRequest:', error);
    throw error; // rethrow the error for further handling if needed
  }
};


const getFeedbackString = (feedback) => {
  /**
   *    Returns a string representation of the feedback colors
   *    worldle.py sends format "green", App.jsx expects format "g"
   */
  return feedback.map(color => {
    switch (color) {
      case 'green':
        return 'g';
      case 'yellow':
        return 'y';
      case 'gray':
        return 'b'; // Assuming 'b' represents gray in your string
      default:
        return '_'; // Handle other cases as needed
    }
  }).join('');
};


const WordleGame = () => {
  const [wordList, setWordList] = useState([]);
  const [TARGET_WORD, setTargetWord] = useState('');
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [userPreviousGuesses, setUserPreviousGuesses] = useState([]);
  const [botPreviousGuesses, setBotPreviousGuesses] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [suggestedWord, setSuggestedWord] = useState("");
  const [botColor, setBotColor] = useState("bbbbb");
  const [isBotTurn, setIsBotTurn] = useState(false); 
  let hasRunEffect = false; 
  

  useEffect(() => {
    /**
     *  Sets random target word
     */


    fetch('/five_letter_words.txt') 
    .then(response => response.text()) // Converts txt file to string

    .then(text => {
      // Split text into array of lowercase words
      const wordsArray = text.split('\n').map(word => word.trim().toLowerCase());

      setWordList(wordsArray.filter(word => word.length === 5)); // Finds all 5 letter words
      const randomIndex = Math.floor(Math.random() * wordsArray.length);
      setTargetWord(wordsArray[randomIndex]);
    })

    .catch(error => console.error("Error fetching word list:", error));
  }, []);



  let guessedWords = [[]];
  let availableSpace = 1;

  let word = "white"; 
  let guessWordCount = 0;

  /**
   *    Create user board, bot board, and key listeners
   */
   useEffect(() => {

    attachKeyListeners();

    if (!hasRunEffect) {
        console.log("cus");
        createUserSquares();
        createBotSquares();
        hasRunEffect = true;
        console.log(hasRunEffect);
    }

    return () => removeKeyListeners();
   }, []);

  /**
   * Returns the color of a given tile 
   * 
   * @param char letter: letter contained in given tile
   * @param int index: index of letter in word 
   * @return array [(string of rgb value of given index), (letter char in form "g", "y", "b")]
  */  
  function getTileColor(letter, index) {
    const isCorrectLetter = word.includes(letter);

    if(!isCorrectLetter) {
        return ["rgb(58, 58, 60)", "b"];
    }

    const letterInThatPosition = word.charAt(index);
    const isCorrectPosition = (letter === letterInThatPosition);

    if (isCorrectPosition) {
        return ["rgb(83, 141, 78)", "g"];
    }

    return ["rgb(181, 159, 59)", "y"];
  };


  /**
   * When user hits enter, grabs current word, animates row, push current word to guessedWords
   */
   const handleUserWord = () => {
      const currentWordArr = getCurrentWordArr();
      if (currentWordArr.length !== 5) {
          window.alert("Not enough letters");
          return;
      }

      const currentWord = currentWordArr.join("")
      const firstLetterID = guessWordCount * 5 + 1;
      const interval = 300;
    
      let currentColors = []

      // Loop through each letter in user word array
      currentWordArr.forEach((letter, index) => {
          setTimeout(() => {
              const tileArr = getTileColor(letter, index);
              const tileColorRGB = tileArr[0];  // in form "rgb(83, 141, 78)"
              const tileColorChar = tileArr[1]; // in form "g"

              currentColors.push(tileColorChar);

              const letterID = firstLetterID + index;
              console.log("letterID: ", firstLetterID + index);
              const letterEl = document.getElementById(letterID);
              console.log("letterEl: ", letterEl);
              letterEl.classList.add("animate__flipInX");
              letterEl.style = `background-color:${tileColorRGB};border-color:${tileColorRGB}`;
          }, interval * index);
      });

      guessWordCount += 1;

      if (currentWord === word) {
          window.alert("Congratuations!");
      }

      if (guessedWords.length === 6) {
          window.alert(`You lost :( The word is ${word}`);
      }

      guessedWords.push([]);
        
      // Wait for all the setTimeouts to complete before joining arrays
      setTimeout(() => {

          
          const currentColorsStr = currentColors.join("");
          const backendSendMaybe = [currentWord, currentColorsStr]  // ["slate", "bbgyb"]
          console.log("backendSendMaybe: ", backendSendMaybe)
          // handleBotWord(); 
          console.log("attempts: ", attempts);
          // handleBotGuess();
          setIsBotTurn(true);  // Set bot's turn after the user makes a guess
      }, interval * currentWordArr.length);
  }

  /**
   * Runs handleBotGuess() once the user makes their guess
   *
   * Used to align attempt states due to setTimeout() 
   */
  useEffect(() => {
    if (isBotTurn) {
        handleBotGuess();
        // setAttempts(prevAttempt => prevAttempt + 1);
        setIsBotTurn(false);  // Reset after the bot makes its guess
    }
  }, [isBotTurn]);  // Trigger only when it's the bot's turn


  function handleDeleteLetter() {
      const currentWordArr = getCurrentWordArr()
      const removedLetter = currentWordArr.pop()

      guessedWords[guessedWords.length - 1] = currentWordArr

      const lastLetterEl = document.getElementById(String(availableSpace))

      lastLetterEl.textContent = ''
      availableSpace = availableSpace - 1
  }


  function attachKeyListeners() {
      const keys = document.querySelectorAll('.keyboard-row button');
      for (let i = 0; i < keys.length; i++) {
          console.log("Keys[", i, "]: ", keys[i]);
          keys[i].onclick = (event) => {
              const letter = event.target.getAttribute("data-key");

              if (letter === 'enter') {
                  handleUserWord();
                  return;
              }

              if (letter === 'del'){
                  handleDeleteLetter();
                  return;
              }

              updateGuessedWords(letter)

              console.log(letter);
          };
      }
  }


  function removeKeyListeners() {
      const keys = document.querySelectorAll('.keyboard-row button');
      for (let i = 0; i < keys.length; i++) {
          keys[i].onclick = null; // Remove onclick listener
      }
  }


  function getCurrentWordArr() {
      const numberOfGuessedWords = guessedWords.length
      return guessedWords[numberOfGuessedWords - 1]
  }


  function updateGuessedWords(letter) {
      const currentWordArr = getCurrentWordArr()

      if (currentWordArr && currentWordArr.length < 5) {
          currentWordArr.push(letter)

          const availableSpaceEl = document.getElementById(String(availableSpace))
          console.log("availableSpace: ", availableSpace);
          console.log("availableSpaceEl: ", availableSpaceEl);

          availableSpace = availableSpace + 1

          availableSpaceEl.textContent = letter;
      }
  }


  function createUserSquares() {
      const gameBoard = document.getElementById("board");
      console.log("createUserSquares");
      for (let index = 0; index < 30; index++) {
          let square = document.createElement("div");
          square.classList.add("square");
          square.classList.add("animate__animated");
          // let idStr = (index + 1).toString() + "_userID";
          square.setAttribute("id", index + 1);
          gameBoard.appendChild(square);

      }
  }

  function createBotSquares() {
    const gameBoard = document.getElementById("bot-board");

    for (let index = 0; index < 30; index++) {
        let square = document.createElement("div");
        square.classList.add("square");
        square.classList.add("animate__animated");
        let idStr = (index + 1).toString() + "_botID";
        console.log(idStr);
        square.setAttribute("id", idStr);
        gameBoard.appendChild(square);

    }
  }

 
    // NEW ABOVE, OLD BELOW

    
  const handleInputChange = (event) => {
    /**
     *   Handles user input
     */

    setGuess(event.target.value.trim().toLowerCase().substr(0, 5));
  };


  const handlePlayerGuess = () => {
    /**
     *    Checks user guess
     *    Updates previousUserGuesses array
     *    Checks if user won
     */

    // Checks if over
    if (!wordList.includes(guess) || gameOver) return;

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    // Apply colors
    const newMatchedLetters = checkMatchedLetters(guess);

    // Update previous guess with current guess + feedback
    setUserPreviousGuesses(prevGuesses => [...prevGuesses, { guess, feedback: newMatchedLetters }]);
    setGuess('');

    // Checks if user won
    if ((newMatchedLetters.every(matched => matched === 'green')) || (newAttempts === 6)) {
      setGameOver(true);
    } else {
      console.log("attempts: ", attempts);
      handleBotGuess();
    }
  };


  const handleBotGuess = async () => {
    /**
     *    Directs API calls to makeBotGuess() regarding the bots guesses   
     * 
     *    Calls startWordle() first iteration - processBotGuess() after
     *       - Calls makeBotGuess
     */
    console.log("handleBotGuess1: "); 
    if (gameOver) return;
    console.log("handleBotGuess2: "); 
        
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    console.log("newAttempts: ", newAttempts);

    // First iteration
    if (newAttempts === 1) {
      
      console.log("PreSuggestedWord");
      const suggestedWord = await startWordle(); // Await the suggested word

      console.log("postSuggestedWord: ", suggestedWord);


            // Test Animation
    const firstLetterID = guessWordCount * 5 + 1;
    const interval = 300;
    
    let currentColors = []
    // Loop through each letter in user word array
      const currentWordArr = suggestedWord.split('');
      currentWordArr.forEach((letter, index) => {
          setTimeout(() => {
              const tileArr = getTileColor(letter, index);
              const tileColorRGB = tileArr[0];  // in form "rgb(83, 141, 78)"
              const tileColorChar = tileArr[1]; // in form "g"

              currentColors.push(tileColorChar);

              const letterID = (firstLetterID + index).toString() + "_botID";
              console.log("letterID: ", letterID);
              const letterEl = document.getElementById(letterID);
              console.log("letterEl: ", letterEl);
              letterEl.classList.add("animate__flipInX");
              letterEl.style = `background-color:${tileColorRGB};border-color:${tileColorRGB}`;
          }, interval * index);
      });


      makeBotGuess(suggestedWord);

    } else {   // Every non-first Iteration

      console.log("botPreviousGuesses: ", botPreviousGuesses);
      // pulls last string out of botPreviousGuesses array
      const lastGuess = botPreviousGuesses[botPreviousGuesses.length - 1].guess;

      const suggestedWord = await processBotGuess(lastGuess, botColor, () => {});

      console.log("nonfirstSuggestedWord: ", suggestedWord);

            
            // Test Animation
    const firstLetterID = guessWordCount * 5 + 1;
    const interval = 300;
    
    let currentColors = []
    // Loop through each letter in user word array
      const currentWordArr = suggestedWord.split('');
      currentWordArr.forEach((letter, index) => {
          setTimeout(() => {
              const tileArr = getTileColor(letter, index);
              const tileColorRGB = tileArr[0];  // in form "rgb(83, 141, 78)"
              const tileColorChar = tileArr[1]; // in form "g"

              currentColors.push(tileColorChar);

              const letterID = firstLetterID + index;
              console.log("letterID: ", letterID);
              const letterEl = document.getElementById(letterID);
              console.log("letterEl: ", letterEl);
              letterEl.classList.add("animate__flipInX");
              letterEl.style = `background-color:${tileColorRGB};border-color:${tileColorRGB}`;
          }, interval * index);
      });


      makeBotGuess(suggestedWord);

    }

    
};



  const makeBotGuess = (botGuessedWord) => {
    /**
     *    Update bots previous guesses
     *    Check bot win status
     */

    const newBotMatchedLetters = checkMatchedLetters(botGuessedWord);
    console.log("matchedLetters: ", newBotMatchedLetters);
  
    // Update previous guesses with the current guess and feedback
    setTimeout(setBotPreviousGuesses(prevGuesses => [...prevGuesses, { guess: botGuessedWord, feedback: newBotMatchedLetters }]), 2000);


    // Check if the bot has won or if the game is over due to maximum attempts reached
    if (newBotMatchedLetters.every(matched => matched === 'green') || attempts >= 6) {
      setGameOver(true);
      // Additional logic if needed when the game is over
      console.log('Game Over. Bot guessed the word or max attempts reached.');
    } else {
      // Prepare for the next turn
      setBotColor(getFeedbackString(newBotMatchedLetters));
    }
  };


  useEffect(() => {
    /**
     *    Makes bot guess whenever suggestWord is updated in API calls
     */
    if (suggestedWord) {
      makeBotGuess(suggestedWord);
    }
  }, [suggestedWord]); 


  const startWordle = async () => {
    /**
     *    Grab bots starter guess from backend
     */

    try {
      console.log("startWordle1: ")
      // Makes POST call to backend
      const response = await fetch("http://localhost:5173/api/start", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log("startWordle2: ")
      // Set data to Flask output
      const data = await response.json();
            
      console.log("startWordle3: ")
      return data.suggestedWord;

    } catch (error) {
      console.error('Error starting Wordle:', error);
      return ""; // Return an empty string or handle the error appropriately
    }
  };
  

  const processBotGuess = async (currentGuess, letterColors) => {
    /**
     *    Grab bots calculated guess from backend using callback
     */

    try {

      sendRequest('/api/guess', { currentGuess, letterColors }, (response) => {

        // Grabs return of optimal word from process_guess()
        setSuggestedWord(response.nextGuess);

      });
    } catch (error) {
      console.error('Error processing guess:', error);
    }
  };


  const handleEnterKey = (event) => {
    /**
     *    Handle Enter key press
     */

    if (event.key === 'Enter') {
      handlePlayerGuess();
    }
  };


  useEffect(() => {
    /**
     *    Handle Enter key press
     */

    document.addEventListener('keydown', handleEnterKey);
    return () => {
      document.removeEventListener('keydown', handleEnterKey);
    };
  }, [handlePlayerGuess]);


  const checkMatchedLetters = (guessWord) => {
    /**
     *    Returns array of guesses matching colors 
     */

    const newMatchedLetters = Array(5).fill(null);

    console.log("TARGET_WORD: ", TARGET_WORD);
    // Loops through every letter in wordle word
    for (let i = 0; i < TARGET_WORD.length; i++) {
      if (guessWord[i] === TARGET_WORD[i]) {
        newMatchedLetters[i] = 'green';
      } else if (TARGET_WORD.includes(guessWord[i])) {
        newMatchedLetters[i] = 'yellow';
      }
      else{
        newMatchedLetters[i] = 'gray';
      }
    }

    return newMatchedLetters;
  };


  const resetGame = () => {
    /**
     *    Resets game
     */
    setGuess('');
    setAttempts(0);
    setGameOver(false);
    setUserPreviousGuesses([]);
    setBotPreviousGuesses([]);
    const randomIndex = Math.floor(Math.random() * wordList.length);
    setTargetWord(wordList[randomIndex]);
  };


  // Displays UIs
  return (
    <div className="wordle-game-container">

      <div className="game-container">


        <div className="player-game">
          <h1>Player's Game</h1>

          <div id="board-container">
                <div id="board"></div>
          </div>

          {/* TEMP */}
          <button onClick={() => { setGuess('slate'); handlePlayerGuess(); }} disabled={gameOver}>
            slate
          </button>

          {userPreviousGuesses.length > 0 && (
            <div>
              {userPreviousGuesses.map((prevGuess, index) => (
                <div key={index}>
                  <h1>
                    {prevGuess.guess.toUpperCase().split('').map((letter, idx) => (
                      <span
                        key={idx}
                        className={prevGuess.feedback[idx]} // Apply the class based on feedback color
                      >
                        {letter}
                      </span>
                    ))}
                  </h1>
                </div>
              ))}
            </div>
          )}

          <input
            type="text"
            maxLength={5}
            value={guess}
            onChange={handleInputChange}
            disabled={gameOver}
          />

          <p>Attempts: {attempts}</p>
          <button onClick={handlePlayerGuess} disabled={gameOver}>
            Guess
          </button>

          <button onClick={resetGame} disabled={gameOver} id="Reset_Button">
            Reset Game
          </button>

          {gameOver && (
            <p className="game-over">

              {userPreviousGuesses[userPreviousGuesses.length - 1].feedback.every(matched => matched === 'green')
                ? 'You guessed the word!'
                : 'You lost!'} The word was: {TARGET_WORD.toUpperCase()}
            </p>
          )}

        </div>
              

        <div className="bot-game">
          <h1>Bot's Game</h1>

          <div id="bot-board-container">
                <div id="bot-board"></div>
          </div>

          {botPreviousGuesses.length > 0 && (
            <div>
              {botPreviousGuesses.map((prevGuess, index) => (
                <div key={index}>
                  <h1> 
                    {prevGuess.guess.toUpperCase().split('').map((letter, idx) => (
                      <span
                        key={idx}
                        className={`${prevGuess.feedback[idx]} ${gameOver ? 'reveal-text' : ''}`} // Add 'reveal-text' if the game is over
                        // className={prevGuess.feedback[idx]} // Apply the class based on feedback color
                      >
                        {letter}
                      </span>
                    ))}
                  </h1>
                </div>
              ))}
            </div>
          )}

        </div>

 
      </div>

      <div id="keyboard-container">
          <div className="keyboard-row">
              <button data-key="q">q</button>
              <button data-key="w">w</button>
              <button data-key="e">e</button>
              <button data-key="r">r</button>
              <button data-key="t">t</button>
              <button data-key="y">y</button>
              <button data-key="u">u</button>
              <button data-key="i">i</button>
              <button data-key="o">o</button>
              <button data-key="p">p</button>
          </div>
          <div className="keyboard-row">
              <div className="spacer-half"></div>
              <button data-key="a">a</button>
              <button data-key="s">s</button>
              <button data-key="d">d</button>
              <button data-key="f">f</button>
              <button data-key="g">g</button>
              <button data-key="h">h</button>
              <button data-key="j">j</button>
              <button data-key="k">k</button>
              <button data-key="l">l</button>
              <div className="spacer-half"></div>
          </div>
          <div className="keyboard-row">
              <button data-key="enter" className="wide-button">Enter</button>
              <button data-key="z">z</button>
              <button data-key="x">x</button>
              <button data-key="c">c</button>
              <button data-key="v">v</button>
              <button data-key="b">b</button>
              <button data-key="n">n</button>
              <button data-key="m">m</button>
              <button data-key="del" className="wide-button">Del</button>
          </div>

        </div>

    </div>


  );
};

export default WordleGame;
