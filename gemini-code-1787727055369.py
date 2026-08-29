import asyncio
import os
import json
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import openai, silero, deepgram
from memory_manager import InspectionMemoryManager

load_dotenv()

# System prompt configured for Spinny Inspectors & Hinglish speech
SPINNY_SYSTEM_PROMPT = """
You are 'Spinny Co-Pilot', an AI automotive assistant for Spinny evaluators.
You assist evaluators completing the 200-Point Inspection Checklist.

RULES:
1. Speak in natural Hinglish (mix of conversational Hindi and English technical automotive terms).
2. Keep audio responses brief (max 2-3 sentences per reply) for field headsets.
3. Memory & Context: Connect current observations with earlier remarks in the 45-minute session.
4. When shown an image or described a fault:
   - Identify checklist section: [Engine, Exterior, Undercarriage, Tyres, Brakes, Electronics].
   - Assign defect severity: [Minor, Major, Critical].
   - State exact rating adjustment and estimated repair cost.
5. Do NOT use markdown symbols (*, #, _) in your spoken responses.
"""

async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Initialize session memory for the car evaluation
    memory = InspectionMemoryManager(car_id=ctx.room.name)
    
    # Configure Speech-to-Text (Hindi/Hinglish), LLM, and TTS
    assistant = VoiceAssistant(
        vad=silero.VAD.load(),
        stt=deepgram.STT(language="hi"), # Can also use Sarvam Saaras v3 REST API
        llm=openai.LLM(
            model="gpt-4o", # Multimodal model for simultaneous image + text reasoning
            system_prompt=SPINNY_SYSTEM_PROMPT
        ),
        tts=openai.TTS(voice="alloy"),
        chat_ctx=llm.ChatContext(),
    )

    @ctx.room.on("data_received")
    def on_data_received(data: bytes, participant, kind):
        """Receives photo payloads uploaded by inspector app during live voice call."""
        payload = json.loads(data.decode("utf-8"))
        if payload.get("type") == "INSPECTION_IMAGE":
            image_url = payload.get("image_url")
            component = payload.get("component", "unknown")
            print(f"[IMAGE RECEIVED] Component: {component}, URL: {image_url}")
            
            # Append image frame into the active conversation memory
            assistant.chat_ctx.messages.append(
                llm.ChatMessage(
                    role=llm.ChatRole.USER,
                    content=[
                        llm.ChatContentText(text=f"Inspector captured photo of {component}:"),
                        llm.ChatContentImage(image_url=image_url)
                    ]
                )
            )

    assistant.start(ctx.room)
    await assistant.say(
        "Namaste! Spinny Inspection Co-Pilot active hai. Kaunsi car ka evaluation shuru kar rahe hain?",
        allow_interruptions=True
    )

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))