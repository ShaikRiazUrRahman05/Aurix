import React, { useContext, useEffect, useRef, useState } from "react";
import { userDataContext } from "./context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import aiImg from "./assets/ai.gif";
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import userImg from "./assets/user.gif";

function Home() {
  const { userData, serverUrl, setUserData, getGeminiResponse } =
    useContext(userDataContext);
  const navigate = useNavigate();

  const [listening, setListening] = useState(false);
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [ham, setHam] = useState(false);

  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const isRecognizingRef = useRef(false);
  const fallbackIntervalRef = useRef(null);
  const hasGreetedRef = useRef(false);
  const shouldStartRecognition = useRef(true);
  const synth = window.speechSynthesis;

  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, {
        withCredentials: true,
      });
      setUserData(null);
      navigate("/signin");
    } catch (error) {
      console.log(error);
    }
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "hi-IN";
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find((v) => v.lang === "hi-IN");
    if (hindiVoice) {
      utterance.voice = hindiVoice;
    }

    isSpeakingRef.current = true;
    utterance.onend = () => {
      setAiText("");
      isSpeakingRef.current = false;
      setTimeout(() => {
        if (!isRecognizingRef.current && shouldStartRecognition.current) {
          recognitionRef.current?.start();
        }
      }, 500);
    };

    synth.speak(utterance);
  };

  const handleCommand = async (data) => {
    const { type, userInput, response } = data;
    speak(response);

    const openURL = (url) => window.open(url, "_blank");
    const query = encodeURIComponent(userInput || "");

    switch (type) {
      case "google_search":
        openURL(`https://www.google.com/search?q=${query}`);
        break;
      case "calculator_open":
        openURL(`https://www.google.com/search?q=calculator`);
        break;
      case "instagram_open":
        openURL(`https://www.instagram.com/`);
        break;
      case "facebook_open":
        openURL(`https://www.facebook.com/`);
        break;
      case "linkedin_open":
        openURL(`https://www.linkedin.com/search?q=${query}`);
        break;
      case "youtube_search":
      case "youtube_play":
        openURL(`https://www.youtube.com/results?search_query=${query}`);
        break;
      case "weather-show":
        openURL(`https://www.google.com/search?q=weather`);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    shouldStartRecognition.current = true;

    const safeStart = () => {
      if (
        shouldStartRecognition.current &&
        !isSpeakingRef.current &&
        !isRecognizingRef.current
      ) {
        try {
          recognitionRef.current.start();
          isRecognizingRef.current = true;
          console.log("Recognition requested to start");
        } catch (err) {
          if (err.name !== "InvalidStateError") {
            console.error("Recognition start error:", err);
          }
        }
      }
    };

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setListening(true);
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      setListening(false);
      if (!isSpeakingRef.current) {
        setTimeout(() => safeStart(), 1000);
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        console.warn("Recognition error:", event.error);
      }
      isRecognizingRef.current = false;
      setListening(false);
      if (event.error !== "aborted" && !isSpeakingRef.current) {
        setTimeout(() => safeStart(), 1000);
      }
    };

    recognition.onresult = async (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim();

      if (
        userData?.assistantName &&
        transcript.toLowerCase().includes(userData.assistantName.toLowerCase())
      ) {
        setAiText("");
        setUserText(transcript);
        recognition.stop(); // pause recognition
        isRecognizingRef.current = false;
        setListening(false);
        const data = await getGeminiResponse(transcript);
        if (data?.response) {
          handleCommand(data);
          setAiText(data.response);
          setUserText("");
        } else {
          speak("Sorry, I didn't understand that.");
        }
      }
    };

    // greeting
    const greetUser = () => {
      if (userData?.name && !hasGreetedRef.current) {
        hasGreetedRef.current = true;

        const greeting = new SpeechSynthesisUtterance(
          `Hello ${userData.name}, how can I help you?`
        );
        greeting.lang = "hi-IN";
        const voices = synth.getVoices();
        const hindiVoice = voices.find((v) => v.lang === "hi-IN");
        if (hindiVoice) greeting.voice = hindiVoice;

        greeting.onend = () => {
          setTimeout(() => {
            safeStart();
          }, 500);
        };

        synth.speak(greeting);
      }
    };

    const voices = synth.getVoices();
    if (voices.length > 0) {
      setTimeout(() => greetUser(), 300);
    } else {
      synth.onvoiceschanged = () => {
        greetUser();
        synth.onvoiceschanged = null;
      };
    }

    fallbackIntervalRef.current = setInterval(() => {
      if (!isSpeakingRef.current && !isRecognizingRef.current) {
        console.log("Fallback trying to restart recognition");
        safeStart();
      }
    }, 15000);

    return () => {
      shouldStartRecognition.current = false;
      recognition.stop();
      clearInterval(fallbackIntervalRef.current);
      isRecognizingRef.current = false;
      setListening(false);
      synth.onvoiceschanged = null;
    };
  }, [userData, getGeminiResponse]);

  return (
    <div className="w-full h-[100vh] bg-gradient-to-t from-[black] to-[#3d0802] flex justify-center items-center flex-col gap-[15px]">
      <CgMenuRight
        className="lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]"
        onClick={() => setHam(true)}
      />

      <div
        className={`absolute top-0 lg:hidden right-0 w-full h-full bg-[#00000053] backdrop-blur-lg p-[20px] flex flex-col gap-[20px] items-start transition-all duration-300 transform ${
          ham ? "translate-x-0" : "translate-x-full transition-transform"
        }`}
      >
        <RxCross1
          className=" text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]"
          onClick={() => setHam(false)}
        />

        <button
          className="min-w-[150px] h-[60px]  bg-white rounded-full cursor-pointer text-black font-semibold mt-[30px]"
          onClick={handleLogOut}
        >
          Log Out
        </button>

        <button
          className="min-w-[150px] h-[60px] bg-white rounded-full cursor-pointer text-black font-semibold text-[19px] px-[20px] py-[10px]"
          onClick={() => navigate("/customize")}
        >
          Customize Your Assistant
        </button>

        <div className="w-full h-[2px] bg-gray-400"></div>

        <h1 className="text-white font-semibold text-[19px]">History</h1>

        <div className="w-full h-[60%] overflow-y-auto flex flex-col gap-y-5 pr-2">
          {userData.history?.map((his, index) => (
            <span key={index} className="text-gray-200 text-[18px] truncate">
              {his}
            </span>
          ))}
        </div>
      </div>

      <button
        className="min-w-[150px] h-[40px] bg-white rounded-full cursor-pointer text-black font-semibold absolute hidden lg:block top-[20px] right-[20px]"
        onClick={handleLogOut}
      >
        Log Out
      </button>

      <button
        className="min-w-[150px] h-[40px] bg-white absolute top-[100px] right-[20px] rounded-full cursor-pointer text-black font-semibold text-[19px] px-[20px] py-[10px] hidden lg:block"
        onClick={() => navigate("/customize")}
      >
        Customize Your Assistant
      </button>

      <div className="w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg cursor-pointer">
        <img
          src={userData?.assistantImage}
          alt=""
          className="h-full object-cover"
        />
      </div>

      <h1 className="text-white text-[18px] font-semibold">
        I'm {userData?.assistantName}
      </h1>

      {!aiText && <img src={userImg} alt="" className="w-[200px]" />}
      {aiText && <img src={aiImg} alt="" className="w-[200px]" />}

      <h1 className="text-white text-[18px] font-semibold text-wrap">
        {userText ? userText : aiText ? aiText : null}
      </h1>
    </div>
  );
}

export default Home;
