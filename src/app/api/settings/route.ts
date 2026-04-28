import { NextRequest, NextResponse } from 'next/server';
import { getAllKeyStatus, setApiKey, deleteApiKey, SETTING_KEYS } from '@/lib/settings';
import { Provider } from '@/lib/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await getAllKeyStatus();
    return NextResponse.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { provider: Provider; apiKey: string };
    if (!body.provider || !(body.provider in SETTING_KEYS)) {
      return NextResponse.json({ error: 'Provider inválido' }, { status: 400 });
    }
    if (!body.apiKey || body.apiKey.length < 8) {
      return NextResponse.json({ error: 'Chave muito curta' }, { status: 400 });
    }
    await setApiKey(body.provider, body.apiKey.trim());
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get('provider') as Provider | null;
    if (!provider || !(provider in SETTING_KEYS)) {
      return NextResponse.json({ error: 'Provider inválido' }, { status: 400 });
    }
    await deleteApiKey(provider);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
