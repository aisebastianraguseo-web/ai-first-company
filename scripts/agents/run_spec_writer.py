#!/usr/bin/env python3
"""
Spec Writer Agent - Manual Execution

Usage:
  python3 run_spec_writer.py <product-name> --manual
  
Example:
  python3 run_spec_writer.py smart-bookmark-manager --manual
"""

import os
import sys
from pathlib import Path
from anthropic import Anthropic
from dotenv import load_dotenv
from rich import print as rprint
from rich.prompt import Prompt, Confirm
import click

# Load environment
load_dotenv()

# Initialize Anthropic client
client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))

@click.command()
@click.argument('product_name')
@click.option('--manual', is_flag=True, help='Manual mode: show prompt, wait for execution')
@click.option('--auto', is_flag=True, help='Auto mode: execute via API immediately')
def main(product_name, manual, auto):
    """Run Spec Writer Agent for a product"""
    
    # Paths
    project_root = Path.cwd()
    product_dir = project_root / 'products' / product_name
    vision_file = product_dir / 'VISION.md'
    agent_file = project_root / 'scripts' / 'agents' / 'spec_writer_agent.md'
    specs_dir = product_dir / 'specs'
    
    # Validate
    if not vision_file.exists():
        rprint(f"[red]✗ Vision file not found:[/red] {vision_file}")
        rprint("Create it first: products/{product_name}/VISION.md")
        sys.exit(1)
    
    if not agent_file.exists():
        rprint(f"[red]✗ Agent definition not found:[/red] {agent_file}")
        sys.exit(1)
    
    # Read inputs
    rprint("[blue]Reading inputs...[/blue]")
    vision_content = vision_file.read_text()
    agent_instructions = agent_file.read_text()
    
    # Build prompt
    prompt = f"""
{agent_instructions}

---

INPUT - PRODUCT VISION:

{vision_content}

---

TASK: Execute your role as Spec Writer Agent.

Generate ALL required specification files according to your instructions.

For each file, use this format: 

=== FILE: specs/filename.md ===
[file content here]
=== END FILE ===

This makes it easy to parse and save files.
""".strip()
    
    if manual:
        # Manual mode: Show prompt, let user execute
        rprint("\n[yellow]═══ MANUAL MODE ═══[/yellow]\n")
        rprint("[dim]The following prompt will be sent to Claude API.[/dim]")
        rprint("[dim]Review it, then confirm to execute.[/dim]\n")
        
        rprint("[cyan]" + "="*80 + "[/cyan]")
        rprint(prompt)
        rprint("[cyan]" + "="*80 + "[/cyan]")
        
        # Estimate cost
        input_tokens = len(prompt) // 4  # rough estimate: 1 token ≈ 4 chars
        estimated_output_tokens = 4000  # specs are usually long
        estimated_cost = (input_tokens * 3 + estimated_output_tokens * 15) / 1_000_000
        
        rprint(f"\n[yellow]Estimated cost:[/yellow] ~${estimated_cost:.4f}")
        rprint(f"[dim]Input: ~{input_tokens} tokens, Output: ~{estimated_output_tokens} tokens (estimated)[/dim]")
        
        # Confirm
        if not Confirm.ask("\n[yellow]Execute API call?[/yellow]", default=True):
            rprint("[red]Cancelled[/red]")
            sys.exit(0)
        
        # Execute
        rprint("\n[blue]Calling Claude API...[/blue]")
        rprint("[dim]This may take 30-60 seconds...[/dim]\n")
        
        try:
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=8000,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            response_text = message.content[0].text
            
            # Show cost
            actual_input = message.usage.input_tokens
            actual_output = message.usage.output_tokens
            actual_cost = (actual_input * 3 + actual_output * 15) / 1_000_000
            
            rprint(f"[green]✓ API call successful![/green]")
            rprint(f"[yellow]Actual cost:[/yellow] ${actual_cost:.4f}")
            rprint(f"[dim]Input: {actual_input} tokens, Output: {actual_output} tokens[/dim]\n")
            
            # Parse and save files
            rprint("[blue]Parsing response and saving files...[/blue]")
            specs_dir.mkdir(exist_ok=True, parents=True)
            
            files_saved = parse_and_save_files(response_text, specs_dir)
            
            if files_saved:
                rprint(f"\n[green]✓ Saved {len(files_saved)} spec files:[/green]")
                for file_path in files_saved:
                    rprint(f"  - {file_path.relative_to(project_root)}")
                
                rprint("\n[yellow]Next steps:[/yellow]")
                rprint("1. Review generated specs in specs/ directory")
                rprint("2. Iterate if needed (edit VISION.md and re-run)")
                rprint("3. Commit to git:")
                rprint(f"   git add products/{product_name}/specs/")
                rprint(f"   git commit -m \"Generate specs for {product_name}\"")
            else:
                rprint("[yellow]⚠ No files parsed. Check response format.[/yellow]")
                rprint("\n[dim]Raw response:[/dim]")
                rprint(response_text[:500] + "..." if len(response_text) > 500 else response_text)
                
        except Exception as e:
            rprint(f"[red]✗ API Error:[/red] {e}")
            sys.exit(1)
    
    elif auto:
        rprint("[yellow]Auto mode not implemented yet (comes in Phase 3)[/yellow]")
        sys.exit(1)
    
    else:
        rprint("[red]Specify --manual or --auto[/red]")
        sys.exit(1)

def parse_and_save_files(response_text, specs_dir):
    """Parse Claude's response and save individual files"""
    files_saved = []
    
    # Split by file markers
    parts = response_text.split("=== FILE: ")
    
    for part in parts[1:]:  # skip first (before any file marker)
        if "=== END FILE ===" not in part:
            continue
        
        # Extract filename and content
        lines = part.split("\n")
        filename = lines[0].strip().replace("specs/", "")  # Remove specs/ prefix if present
        
        # Find content between filename and END FILE
        content_lines = []
        in_content = False
        for line in lines[1:]:
            if line.strip() == "=== END FILE ===":
                break
            if line.strip().startswith("```") and not in_content:
                in_content = True
                continue
            if line.strip().startswith("```") and in_content:
                in_content = False
                continue
            if in_content or (not line.strip().startswith("```")):
                content_lines.append(line)
        
        content = "\n".join(content_lines).strip()
        
        if content:
            file_path = specs_dir / filename
            file_path.write_text(content)
            files_saved.append(file_path)
    
    return files_saved

if __name__ == '__main__':
    main()
