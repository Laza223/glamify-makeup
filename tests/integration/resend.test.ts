import { describe, it, expect, vi } from "vitest";
import { sendEmail } from "@/lib/email/resend";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

describe("sendEmail", () => {
  it("postea a Resend cuando hay API key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "email-1" }));
    const r = await sendEmail(
      { to: "ana@example.com", subject: "Hola", html: "<p>hi</p>", from: "Glamify <p@glamify.site>" },
      { fetch: fetchMock, apiKey: "re_test" },
    );
    expect(r).toEqual({ id: "email-1", logged: false });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain("api.resend.com/emails");
    expect((opts as RequestInit).headers).toMatchObject({ Authorization: "Bearer re_test" });
  });
  it("manda reply_to cuando RESEND_REPLY_TO está configurada", async () => {
    vi.stubEnv("RESEND_REPLY_TO", "duena@gmail.com");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "email-2" }));
    await sendEmail({ to: "ana@example.com", subject: "Hola", html: "<p>hi</p>" }, { fetch: fetchMock, apiKey: "re_test" });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.reply_to).toBe("duena@gmail.com");
    vi.unstubAllEnvs();
  });
  it("sin RESEND_REPLY_TO no manda reply_to", async () => {
    vi.stubEnv("RESEND_REPLY_TO", "");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "email-3" }));
    await sendEmail({ to: "ana@example.com", subject: "Hola", html: "<p>hi</p>" }, { fetch: fetchMock, apiKey: "re_test" });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).not.toHaveProperty("reply_to");
    vi.unstubAllEnvs();
  });
  it("RESEND_REPLY_TO con espacios o saltos de línea se recorta; solo espacios no manda reply_to", async () => {
    const send = async (value: string) => {
      vi.stubEnv("RESEND_REPLY_TO", value);
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "email-4" }));
      await sendEmail({ to: "ana@example.com", subject: "Hola", html: "<p>hi</p>" }, { fetch: fetchMock, apiKey: "re_test" });
      return JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    };
    expect((await send("  duena@gmail.com\n")).reply_to).toBe("duena@gmail.com");
    expect(await send("   ")).not.toHaveProperty("reply_to");
    vi.unstubAllEnvs();
  });
  it("sin API key en producción → console.error además del log", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    await sendEmail({ to: "ana@example.com", subject: "Hola", html: "<p>hi</p>" }, { fetch: vi.fn(), apiKey: "" });
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("RESEND_API_KEY no configurada"));
    errSpy.mockRestore();
    infoSpy.mockRestore();
    vi.unstubAllEnvs();
  });
  it("sin API key → loguea y no postea", async () => {
    const fetchMock = vi.fn();
    const logSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const r = await sendEmail({ to: "ana@example.com", subject: "Hola", html: "<p>hi</p>" }, { fetch: fetchMock, apiKey: "" });
    expect(r).toEqual({ id: null, logged: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
