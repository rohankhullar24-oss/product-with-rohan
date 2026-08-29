# Real-Time AI Voice Agent (Nova)

This project contains the complete implementation for building a fully production-ready, ultra-low latency AI Voice Agent from scratch using Python and LiveKit.

## Architecture Component Blueprint

1. **Transport & Orchestration Layer:** Powered by **LiveKit Agents SDK**. Handles WebRTC audio streaming, network resilience, and state management.
2. **Voice Activity Detection (VAD):** Powered by **Silero VAD**. Operates locally on the audio chunks to immediately detect when the user is speaking or interrupting.
3. **Speech-to-Text (STT):** Powered by **Deepgram Nova-2**. Selected for industry-leading transcription speeds and accuracy under background noise.
4. **Brain (LLM):** Powered by **OpenAI GPT-4o-mini**. Optimizes cost, accuracy, and token-generation latency.
5. **Text-to-Speech (TTS):** Powered by **OpenAI TTS (Alloy voice)**. Generates highly natural conversational inflections streamed as raw audio buffers.

---

## Step-by-Step Setup Guide

### 1. Prerequisites & API Accounts
Create accounts and secure API keys from the following providers:
* **LiveKit Cloud:** [Sign up at LiveKit](https://livekit.io) to get a free development project sandbox.
* **OpenAI Developer Platform:** [Sign up at OpenAI](https://platform.openai.com) for your LLM and TTS infrastructure.
* **Deepgram Console:** [Sign up at Deepgram](https://console.deepgram.com) for real-time transcription.

### 2. Environment Configuration
Create a file named `.env` in your project root directory and paste your API tokens:
```env
LIVEKIT_URL=wss://your-project-domain.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
OPENAI_API_KEY=sk-proj-yourOpenAiKey...
DEEPGRAM_API_KEY=your_deepgram_api_key...
```

### 3. Installation
Install the necessary system and Python packages.

On macOS (requires Homebrew for audio utilities):
```bash
brew install python-tk
```

Install python dependencies:
```bash
pip install livekit-agents livekit-plugins-openai livekit-plugins-deepgram livekit-plugins-silero python-dotenv
```

### 4. Running the Agent
Execute your agent code script to start the local worker instance:
```bash
python agent.py start
```

### 5. Test Your Voice Agent Live
1. Open the [LiveKit Agent Playground](https://agents-playground.livekit.io/).
2. Paste your `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`.
3. Click **Connect** and start talking to your custom agent!
