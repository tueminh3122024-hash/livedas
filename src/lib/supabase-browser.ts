'use client';

import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;

async function pickSupabaseUrl(): Promise<string> {
  const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const candidates = [
    anonUrl,
    'http://127.0.0.1:54341',
    'http://127.0.0.1:54342',
    'http://localhost:54341',
    'http://localhost:54342',
  ].filter(Boolean) as string[];

  const healthPaths = [
    '/auth/v1/health',
    '/auth/v1/token',
  ];

  for (const candidate of candidates) {
    for (const path of healthPaths) {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1500);

      try {
        const res = await fetch(`${candidate}${path}`, {
          method: 'GET',
          signal: controller.signal,
        });

        // Nếu endpoint trả về 200/400/401 thì coi như Supabase API đang up.
        // (Token endpoint thường cần query; nhưng nếu connect được thì fetch sẽ không ECONNREFUSED)
        if (res.ok || res.status === 400 || res.status === 401) {
          // eslint-disable-next-line no-console
          console.log('[supabase-browser] selected URL:', candidate, 'path:', path, 'status:', res.status);
          clearTimeout(t);
          return candidate;
        }
      } catch {
        // ignore and try next candidate
      } finally {
        clearTimeout(t);
      }
    }
  }

  throw new Error(
    'Cannot connect to Supabase auth API. Tried: ' + candidates.join(', ')
  );
}

export function getSupabaseBrowser() {
  // createBrowserClient cần sync, nhưng việc chọn URL cần async.
  // Vì vậy cache theo biến URL đã chọn.
  if (!_client) {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Login cannot call Supabase.');
    }

    // Khởi tạo tạm client với URL env để không crash ngay khi build;
    // Sau đó sẽ "nắn" lại URL bằng cách refresh lại trang nếu cần.
    // Tuy nhiên để giải quyết triệt để ECONNREFUSED, ta dùng cách: chọn URL qua Promise và gán lại client.
    const init = async () => {
      const chosenUrl = await pickSupabaseUrl();
      _client = createBrowserClient(chosenUrl, anonKey, {
        auth: {
          flowType: 'implicit',
        },
      });
    };

    // Fire-and-forget; UI sẽ retry khi promise hoàn tất (Supabase client sẽ hoạt động).
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    init().catch((e) => {
      // eslint-disable-next-line no-console
      console.error('[supabase-browser] init failed:', e);
    });

    // Return a placeholder to keep type; real value will replace when init completes.
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54341',
      anonKey,
      { auth: { flowType: 'implicit' } }
    );
  }
  return _client;
}

/** Đăng xuất trên trình duyệt */
export async function signOut() {
  const sb = getSupabaseBrowser();
  await sb.auth.signOut();
  window.location.href = '/login';
}

/** Lấy user hiện tại trên client */
export async function getCurrentUser() {
  const sb = getSupabaseBrowser();
  const { data: { user } } = await sb.auth.getUser();
  return user;
}
