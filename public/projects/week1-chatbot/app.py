#!/usr/bin/env python3
"""
Applied AI Course - Week 1 Project: Customer Support Chatbot
Build an AI chatbot that answers questions about a product.

This is starter code. Customize the PRODUCT_INFO to match your product.
"""

import os
from anthropic import Anthropic

# Initialize the Anthropic client
client = Anthropic()

# Product information - CUSTOMIZE THIS for your product
PRODUCT_INFO = {
    "name": "CloudSync Pro",
    "description": "Real-time cloud synchronization platform for teams",
    "features": [
        "Instant file syncing across all devices",
        "Real-time collaboration on documents",
        "Military-grade encryption",
        "Version history and rollback",
        "Team collaboration workspace",
    ],
    "pricing": {
        "free": "Up to 5GB storage, basic features",
        "pro": "$9.99/month - 100GB, advanced features",
        "enterprise": "Custom pricing, dedicated support",
    },
    "support_hours": "24/7 support via chat and email",
    "uptime_sla": "99.99% uptime guarantee",
}


def get_system_prompt() -> str:
    """
    Create the system prompt for the chatbot.
    This defines the chatbot's role and knowledge base.
    """
    product_details = f"""
You are a helpful customer support assistant for {PRODUCT_INFO['name']}.
You help customers learn about our product and resolve their issues.

Product Information:
- Name: {PRODUCT_INFO['name']}
- Description: {PRODUCT_INFO['description']}
- Features: {', '.join(PRODUCT_INFO['features'])}
- Pricing: {PRODUCT_INFO['pricing']}
- Support Hours: {PRODUCT_INFO['support_hours']}
- Uptime SLA: {PRODUCT_INFO['uptime_sla']}

Guidelines:
1. Be helpful, friendly, and professional
2. Answer questions about the product accurately
3. If you don't know something, say so and offer to connect them with support
4. Keep responses concise (under 150 words)
5. Ask clarifying questions if needed
6. Suggest relevant features based on customer needs
7. If they have billing questions, provide info from pricing section
8. Always maintain a positive, solution-focused tone
"""
    return product_details


def create_chatbot():
    """
    Main chatbot function that handles the conversation loop.
    """
    print(f"🤖 Welcome to {PRODUCT_INFO['name']} Support Chat!")
    print("=" * 60)
    print("Type 'quit' or 'exit' to end the conversation")
    print("=" * 60)
    print()

    # Initialize conversation history
    conversation_history = []

    while True:
        # Get user input
        user_input = input("\nYou: ").strip()

        # Exit conditions
        if user_input.lower() in ["quit", "exit", "bye", "goodbye"]:
            print("\n🤖: Thank you for chatting with us! Have a great day! 👋")
            break

        if not user_input:
            print("Please enter a message.")
            continue

        # Add user message to conversation history
        conversation_history.append({"role": "user", "content": user_input})

        try:
            # Make API call to Claude
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=500,
                system=get_system_prompt(),
                messages=conversation_history,
            )

            # Extract the assistant's response
            assistant_message = response.content[0].text

            # Add assistant response to conversation history
            conversation_history.append({"role": "assistant", "content": assistant_message})

            # Display the response
            print(f"\n🤖 Support: {assistant_message}")

        except KeyError:
            print("❌ Error: ANTHROPIC_API_KEY not found. Please set it in your environment.")
            print("Run: export ANTHROPIC_API_KEY='your-key-here'")
            break
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            print("Please try again or contact support.")


def demo_mode():
    """
    Demonstration mode - shows sample conversation without requiring API key.
    Useful for testing without API access.
    """
    print(f"🤖 {PRODUCT_INFO['name']} Support Chat (Demo Mode)")
    print("=" * 60)
    print("This is demo mode - no API calls are made.")
    print()

    sample_interactions = [
        {
            "user": "What is CloudSync Pro?",
            "bot": f"{PRODUCT_INFO['name']} is a real-time cloud synchronization platform that helps teams work together seamlessly. You can sync files, collaborate on documents, and enjoy military-grade encryption.",
        },
        {
            "user": "How much does it cost?",
            "bot": "We offer three plans: Free (5GB), Pro ($9.99/month for 100GB), and Enterprise with custom pricing. Which plan interests you?",
        },
        {
            "user": "Is my data secure?",
            "bot": "Absolutely! We use military-grade encryption to protect your data. We also maintain a 99.99% uptime SLA and have 24/7 support available.",
        },
    ]

    for i, interaction in enumerate(sample_interactions, 1):
        print(f"\nExample {i}:")
        print(f"You: {interaction['user']}")
        print(f"🤖 Support: {interaction['bot']}")
        print("-" * 60)


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "demo":
        demo_mode()
    else:
        # Check if API key is available
        if not os.getenv("ANTHROPIC_API_KEY"):
            print("⚠️  ANTHROPIC_API_KEY not set!")
            print("\nChoose one of:")
            print("1. Set your API key: export ANTHROPIC_API_KEY='sk-ant-...'")
            print("2. Run demo mode: python app.py demo")
            print("\nTry demo mode first:")
            print("  python app.py demo\n")
            sys.exit(1)

        create_chatbot()
