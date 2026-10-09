import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options }),
          );
        },
      },
    },
  );

  // Refresca la sesión (rota la cookie de auth si hace falta).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensa en profundidad: sin sesión, el panel admin ni se renderiza. El rol se
  // sigue chequeando con requireAdmin() en cada page, layout y server action
  // (acá no hay prisma); esto solo corta a los anónimos antes de llegar a Next.
  if (!user && isAdminPanelPath(request.nextUrl.pathname)) {
    const redirect = NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

/** /admin y todo lo que cuelga, salvo el login (que tiene que ser público). */
export function isAdminPanelPath(pathname: string): boolean {
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) return false;
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export const config = {
  matcher: ["/admin/:path*", "/cuenta/:path*", "/auth/:path*"],
};
