#!/usr/bin/env python3
"""
Test Anthropic API Connection
"""

import os
from anthropic import Anthropic
from dotenv import load_dotenv
from rich import print as rprint

# Load environment variables
load_dotenv()

# Get API key
api_key = os.getenv('ANTHROPIC_API_KEY')

if not api_key:
    rprint("[red]✗ Kein API Key gefunden![/red]")
    rprint("Stelle sicher dass .env existiert und ANTHROPIC_API_KEY gesetzt ist")
    exit(1)

rprint("[blue]Testing Anthropic API...[/blue]")

# Initialize client
client = Anthropic(api_key=api_key)

# Test message
try:
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=100,
        messages=[{
            "role": "user",
            "content": "Antworte mit exakt: API Test erfolgreich!"
        }]
    )
    
    response_text = message.content[0].text
    rprint(f"[green]✓ API funktioniert![/green]")
    rprint(f"[yellow]Claude sagt:[/yellow] {response_text}")
    rprint(f"[dim]Tokens used: {message.usage.input_tokens} in, {message.usage.output_tokens} out[/dim]")
    
except Exception as e:
    rprint(f"[red]✗ API Fehler:[/red] {e}")
    exit(1)
