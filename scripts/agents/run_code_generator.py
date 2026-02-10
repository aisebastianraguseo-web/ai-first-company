#!/usr/bin/env python3
"""
Code Generator Agent - Manual Execution

Usage:
  python3 run_code_generator.py <product-name> --manual
  
Example:
  python3 run_code_generator.py smart-bookmark-manager --manual
"""

import os
import sys
from pathlib import Path
from anthropic import Anthropic
from dotenv import load_dotenv
from rich import print as rprint
from rich.prompt import Confirm
import click

# Load environment
load_dotenv()

# Initialize Anthropic client
client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))

@click.command()
@click.argument('product_name')
@click.option('--manual', is_flag=True, help='Manual mode')
@click.option('--auto', is_flag=True, help='Auto mode (Phase 3)')
def main(product_name, manual, auto):
    """Run Code Generator Agent"""
    
    # Paths
    project_root = Path.cwd()
    product_dir = project_root / 'products' / product_name
    specs_dir = product_dir / 'specs'
    agent_file = project_root / 'scripts' / 'agents' / 'code_generator_agent.md'
    generated_dir = product_dir / 'generated'
    
    # Validate
    if not specs_dir.exists() or not list(specs_dir.glob('*.md')):
        rprint(f"[red]✗ No specs found in:[/red] {specs_dir}")
        rprint("Run spec writer first!")
        sys.exit(1)
    
    if not agent_file.exists():
        rprint(f"[red]✗ Agent definition not found:[/red] {agent_file}")
        sys.exit(1)
    
    if not generated_dir.exists():
        rprint(f"[red]✗ Generated directory not found:[/red] {generated_dir}")
        rprint("Create Next.js project first: cd products/{product_name} && npx create-next-app generated")
        sys.exit(1)
    
    # Read inputs
    rprint("[blue]Reading specs...[/blue]")
    
    # Collect all specs
    specs_content = {}
    for spec_file in sorted(specs_dir.glob('*.md')):
        specs_content[spec_file.name] = spec_file.read_text()
    
    agent_instructions = agent_file.read_text()
    
    # Build prompt
    specs_text = "\n\n".join([
        f"=== {filename} ===\n{content}"
        for filename, content in specs_content.items()
    ])
    
    prompt = f"""
{agent_instructions}

---

INPUT - PRODUCT SPECIFICATIONS:

{specs_text}

---

CONTEXT:
- Product Name: {product_name}
- Tech Stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, Clerk, Supabase, Anthropic Claude
- Target Directory: products/{product_name}/generated/
- Next.js project already initialized (package.json exists)
- Dependencies already installed: @clerk/nextjs, @supabase/supabase-js, anthropic, date-fns, lucide-react

---

TASK: Generate COMPLETE codebase based on specifications.

Output each file using this format:

=== FILE: app/page.tsx ===
[complete file content]
=== END FILE ===

Include ALL files needed for a working MVP:
- All pages (/, /dashboard, /dashboard/add)
- All API routes (/api/bookmarks, /api/categorize)
- All components (BookmarkCard, BookmarksList, AddBookmarkForm, Header)
- All lib files (supabase.ts, anthropic.ts, utils.ts)
- Updated layout.tsx (with Clerk)

IMPORTANT:
- Complete implementations (no TODOs)
- Proper error handling everywhere
- Loading states in all components
- Mobile-responsive
- TypeScript strict mode
""".strip()
    
    if manual:
        rprint("\n[yellow]═══ MANUAL MODE ═══[/yellow]\n")
        rprint("[dim]This will send a large prompt to Claude (expensive).[/dim]\n")
        
        # Estimate
        input_tokens = len(prompt) // 4
        estimated_output_tokens = 8000  # Full codebase
        estimated_cost = (input_tokens * 3 + estimated_output_tokens * 15) / 1_000_000
        
        rprint(f"[yellow]Estimated cost:[/yellow] ~${estimated_cost:.4f}")
        rprint(f"[dim]Input: ~{input_tokens} tokens, Output: ~{estimated_output_tokens} tokens[/dim]")
        
        # Show prompt preview
        rprint("\n[cyan]Prompt preview (first 500 chars):[/cyan]")
        rprint("[dim]" + prompt[:500] + "...[/dim]\n")
        
        # Confirm
        if not Confirm.ask("[yellow]Execute API call?[/yellow]", default=True):
            rprint("[red]Cancelled[/red]")
            sys.exit(0)
        
        # Execute
        rprint("\n[blue]Calling Claude API...[/blue]")
        rprint("[dim]This may take 60-120 seconds (large output)...[/dim]\n")
        
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
            actual_cost = (message.usage.input_tokens * 3 + message.usage.output_tokens * 15) / 1_000_000
            
            rprint(f"[green]✓ API call successful![/green]")
            rprint(f"[yellow]Actual cost:[/yellow] ${actual_cost:.4f}")
            rprint(f"[dim]Input: {message.usage.input_tokens} tokens, Output: {message.usage.output_tokens} tokens[/dim]\n")
            
            # Parse and save
            rprint("[blue]Parsing and saving files...[/blue]")
            files_saved = parse_and_save_code_files(response_text, generated_dir)
            
            if files_saved:
                rprint(f"\n[green]✓ Saved {len(files_saved)} files:[/green]")
                for file_path in sorted(files_saved):
                    rprint(f"  - {file_path.relative_to(generated_dir)}")
                
                rprint("\n[yellow]Next steps:[/yellow]")
                rprint(f"1. cd products/{product_name}/generated")
                rprint("2. npm run dev")
                rprint("3. Open http://localhost:3000")
                rprint("4. Test the application")
                rprint("5. If working: git add . && git commit -m 'Generate MVP code'")
            else:
                rprint("[yellow]⚠ No files parsed.[/yellow]")
                save_raw_response(response_text, generated_dir)
                
        except Exception as e:
            rprint(f"[red]✗ API Error:[/red] {e}")
            sys.exit(1)
    
    elif auto:
        rprint("[yellow]Auto mode not implemented yet[/yellow]")
        sys.exit(1)
    
    else:
        rprint("[red]Specify --manual or --auto[/red]")
        sys.exit(1)

def parse_and_save_code_files(response_text, generated_dir):
    """Parse Claude's response and save code files"""
    files_saved = []
    
    # Split by file markers
    parts = response_text.split("=== FILE: ")
    
    for part in parts[1:]:
        if "=== END FILE ===" not in part:
            continue
        
        # Extract filename and content
        lines = part.split("\n")
        filename = lines[0].strip()
        
        # Find content
        content_lines = []
        in_code_block = False
        for line in lines[1:]:
            if line.strip() == "=== END FILE ===":
                break
            # Handle markdown code blocks
            if line.strip().startswith("```") and not in_code_block:
                in_code_block = True
                # Skip language identifier line
                if line.strip() != "```":
                    continue
                continue
            if line.strip().startswith("```") and in_code_block:
                in_code_block = False
                continue
            content_lines.append(line)
        
        content = "\n".join(content_lines).strip()
        
        if content:
            file_path = generated_dir / filename
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content)
            files_saved.append(file_path)
    
    return files_saved

def save_raw_response(response_text, generated_dir):
    """Save raw response for manual inspection"""
    raw_file = generated_dir / 'claude-response.txt'
    raw_file.write_text(response_text)
    rprint(f"[dim]Raw response saved to: {raw_file.relative_to(generated_dir.parent.parent)}[/dim]")
    rprint("[dim]You can manually extract files from it.[/dim]")

if __name__ == '__main__':
    main()
