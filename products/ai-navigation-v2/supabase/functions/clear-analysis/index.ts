import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user via JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { dimensions, context } = await req.json();

    // Validate dimensions sum to 100
    const total = Object.values(dimensions as Record<string, number>).reduce((s, v) => s + v, 0);
    if (total !== 100) {
      return new Response(JSON.stringify({ error: 'Dimensions must sum to 100' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = buildPrompt(dimensions, context);

    // Call Claude
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const claudeData = await claudeRes.json();
    const recommendation = claudeData.content[0].text;

    // Estimate cost (Haiku: $0.80/MTok input, $4/MTok output)
    const inputTokens = claudeData.usage?.input_tokens ?? 0;
    const outputTokens = claudeData.usage?.output_tokens ?? 0;
    const costUsd = (inputTokens * 0.0000008) + (outputTokens * 0.000004);

    // Save to DB (use service role for insert — RLS insert policy allows user_id = auth.uid())
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: insertError } = await serviceSupabase
      .from('clear_analyses')
      .insert({
        user_id: user.id,
        dimensions,
        context: context || null,
        recommendation,
        cost_usd: costUsd,
      });

    if (insertError) console.error('Insert error:', insertError);

    return new Response(JSON.stringify({ recommendation, cost_usd: costUsd, created_at: new Date().toISOString() }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('clear-analysis error:', err);
    return new Response(JSON.stringify({ error: 'Analyse fehlgeschlagen. Bitte versuchen Sie es erneut.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildPrompt(dimensions: Record<string, number>, context: string): string {
  const dimLabels: Record<string, string> = {
    cost: 'Cost (Gesamtbetriebskosten)',
    latency: 'Latency (Antwortzeit)',
    efficiency: 'Efficiency (Token-Effizienz)',
    assurance: 'Assurance (Sicherheit & Compliance)',
    reliability: 'Reliability (Verfügbarkeit)',
  };

  const dimList = Object.entries(dimensions)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => `- ${dimLabels[k] ?? k}: ${v}%`)
    .join('\n');

  return `Du bist ein KI-Strategieberater. Analysiere die folgenden CLEAR-Dimensions-Gewichtungen und gib eine konkrete, datengestützte KI-Modellempfehlung.

CLEAR-Gewichtungen (höher = wichtiger für den Entscheider):
${dimList}

${context ? `Use-Case Kontext:\n${context}\n` : ''}
Antworte auf Deutsch. Strukturiere deine Antwort so:

**Empfohlenes Modell:** [Modellname und Anbieter]

**Begründung:** [2-3 Sätze warum dieses Modell am besten zu den Gewichtungen passt]

**Alternativen:**
- [Modell 2]: [Kurzbegründung]
- [Modell 3]: [Kurzbegründung]

**Risiken bei dieser Konfiguration:** [1-2 konkrete Hinweise]

Sei präzise und nenn konkrete Modelle (z.B. Claude Haiku, GPT-4o mini, Gemini Flash, Llama 3).`;
}
