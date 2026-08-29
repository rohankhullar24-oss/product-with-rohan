import asyncio
import os
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import deepgram, openai, silero

# Load environment variables from a .env file
load_dotenv()

async def entrypoint(ctx: JobContext):
    """
    Main entry point for the LiveKit Voice Assistant Agent.
    This function initializes the components and starts the voice loop.
    """
    print(f"Connecting to room: {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # 1. Define the Agent's Persona and Rules
    system_prompt = (
        "You are 'Nova', a highly competent, empathetic, and professional AI Executive Assistant. "
        "Your job is to assist the user with scheduling, general knowledge, and task management. "
        "Keep your responses concise, clear, and perfectly suited for spoken conversation. "
        "Never use markdown formatting like bullet points or bold text in your speech. "
        "Always adopt a friendly, helpful, and natural tone."
    )

    # 2. Initialize the Core Components
    # LLM: Handles the conversational logic and brain of the agent
    llm_plugin = openai.LLM(
        model="gpt-4o-mini",
        system_prompt=system_prompt,
    )

    # STT: Converts user speech into text in real-time
    stt_plugin = deepgram.STT()

    # TTS: Converts agent text responses back into realistic audio
    tts_plugin = openai.TTS(voice="alloy")

    # VAD: Voice Activity Detection helps the agent know when the user starts/stops talking
    vad_plugin = silero.VAD.load()

    # 3. Create the Voice Assistant Orchestrator
    assistant = VoiceAssistant(
        vad=vad_plugin,
        stt=stt_plugin,
        llm=llm_plugin,
        tts=tts_plugin,
        chat_ctx=llm.ChatContext(),
    )

    # Start the assistant loop inside the room
    assistant.start(ctx.room)
    
    # Greet the user when they join the session
    await assistant.say("Hello! I am Nova, your AI assistant. How can I help you today?", allow_interruptions=True)

if __name__ == "__main__":
    # Run the worker CLI to handle connection events from the LiveKit server
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
